#!/usr/bin/env tsx
/**
 * Fix publish blockers: missing hero assets + robotic titles.
 * Does NOT change slugs, steps, ingredients, or family links.
 */

import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Agent, fetch as undiciFetch } from "undici";
import { initCuratedRecipeStore, getCuratedRecipeById } from "../server/curated-recipe-store.js";
import { getSharedLocalDb, flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { searchRecipes } from "../server/spoonacular.js";
import { isRoboticTitle, suggestHumanMealTitle } from "../shared/generation-reliability.js";
import { scoreRecipeTitle } from "../shared/recipe-title-quality.js";
import { spoonacularHeroImage } from "../shared/classic-hall-meals.js";
import { getGoldenRecipeBySlug } from "../shared/golden-100/manifest.js";
import type { GoldenRecipeDefinition } from "../shared/golden-100/types.js";
import { findNearDuplicatePairs } from "../shared/curated-recipe/families/similarity.js";
import { listCuratedRecipesForEditorialQa } from "../server/curated-recipe-qa.js";
import { summarizeEditorialQaReports } from "../shared/curated-recipe/qa-engine/summarize.js";
import type { CuratedRecipe } from "../shared/curated-recipe/types.js";

const PUBLIC_IMAGES = path.join(process.cwd(), "client", "public", "images");
const REVIEW_ASSETS = path.join(process.cwd(), "review", "assets");

const tlsAgent =
  process.env.SPOONACULAR_INSECURE_TLS === "true" || process.env.REVIEW_INSECURE_TLS === "true"
    ? new Agent({ connect: { rejectUnauthorized: false } })
    : undefined;

async function fetchBuffer(url: string, timeoutMs = 20000): Promise<Buffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await undiciFetch(url, { signal: controller.signal, dispatcher: tlsAgent });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function publicRoots(): string[] {
  return [PUBLIC_IMAGES, path.join(process.cwd(), "public", "images")].filter((r) => fs.existsSync(r));
}

function siteImageExists(publicPath: string): boolean {
  if (!publicPath.startsWith("/images/")) return false;
  const rel = publicPath.replace(/^\/images\//, "");
  return publicRoots().some((root) => fs.existsSync(path.join(root, rel)));
}

function hashUrl(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
}

function titleCaseWords(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function slugToTitle(slug: string): string {
  return titleCaseWords(slug.replace(/-/g, " "));
}

function fixNytMispath(heroImage: string): string | null {
  const p = heroImage.trim();
  if (!p.startsWith("/images/")) return null;
  const rest = p.replace(/^\/images\//, "");
  if (!/^\d{4}\/\d{2}\/\d{2}\/dining\//.test(rest)) return null;
  return `https://static01.nyt.com/images/${rest}`;
}

function promoteReviewAsset(originalUrl: string, destRel: string): boolean {
  if (!fs.existsSync(REVIEW_ASSETS)) return false;
  const hash = hashUrl(originalUrl);
  const match = fs.readdirSync(REVIEW_ASSETS).find((f) => f.startsWith(hash));
  if (!match) return false;
  const destAbs = path.join(PUBLIC_IMAGES, destRel.replace(/^\/images\//, ""));
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  if (!fs.existsSync(destAbs)) fs.copyFileSync(path.join(REVIEW_ASSETS, match), destAbs);
  return fs.existsSync(destAbs);
}

async function resolveSpoonacularId(def: GoldenRecipeDefinition): Promise<number | null> {
  if (def.spoonacularId && def.spoonacularId > 0) return def.spoonacularId;
  const queries = [
    def.spoonacularSearch,
    def.title,
    `${def.protein} ${def.mealFormat}`.replace(/_/g, " "),
    def.title.split(/\s+/).slice(0, 3).join(" "),
    def.protein,
    def.mealFormat === "pizza" ? "pizza" : "",
    def.title.toLowerCase().includes("tuscan") ? "creamy chicken spinach" : "",
    def.title.toLowerCase().includes("philly") ? "philly steak sandwich" : "",
    def.title.toLowerCase().includes("cutlet") ? "chicken cutlet" : "",
    def.title.toLowerCase().includes("burrito") ? "breakfast burrito" : "",
    def.title.toLowerCase().includes("french toast") ? "french toast" : "",
  ]
    .map((q) => (q || "").trim())
    .filter(Boolean);
  const seen = new Set<string>();
  for (const query of queries) {
    const key = query.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    let results;
    try {
      results = await searchRecipes(query, { number: 8 });
    } catch {
      continue;
    }
    let bestId: number | null = null;
    let bestScore = -1;
    for (const hit of results.results || []) {
      const titleCheck = scoreRecipeTitle(hit.title || "", { protein: def.protein, cuisine: def.cuisine });
      const score = titleCheck.score + (hit.title?.toLowerCase().includes(def.protein) ? 8 : 0);
      if (score > bestScore && hit.id > 0) {
        bestScore = score;
        bestId = hit.id;
      }
    }
    if (bestId) return bestId;
  }
  return null;
}

async function ensureLocalHeroFile(
  slug: string,
  heroPath: string,
  recipeId: string,
): Promise<{ ok: boolean; action: string; note?: string }> {
  if (siteImageExists(heroPath)) return { ok: true, action: "already_ok" };

  const rel = heroPath.replace(/^\/images\//, "");
  const golden = getGoldenRecipeBySlug(slug);
  if (golden) {
    const spoonId = await resolveSpoonacularId(golden);
    if (spoonId) {
      const url = spoonacularHeroImage(spoonId, "636x393");
      if (promoteReviewAsset(url, rel)) return { ok: true, action: "promoted_review_asset", note: url };
      const buf = await fetchBuffer(url);
      if (buf && buf.length > 1000) {
        const destAbs = path.join(PUBLIC_IMAGES, rel);
        fs.mkdirSync(path.dirname(destAbs), { recursive: true });
        fs.writeFileSync(destAbs, buf);
        return { ok: true, action: "downloaded_spoonacular", note: url };
      }
    }
  }

  if (recipeId.startsWith("spoonacular:")) {
    const id = Number(recipeId.split(":")[1]);
    if (id) {
      const url = spoonacularHeroImage(id, "636x393");
      const buf = await fetchBuffer(url);
      if (buf && buf.length > 1000) {
        const destAbs = path.join(PUBLIC_IMAGES, rel);
        fs.mkdirSync(path.dirname(destAbs), { recursive: true });
        fs.writeFileSync(destAbs, buf);
        return { ok: true, action: "downloaded_spoonacular", note: url };
      }
    }
  }

  return { ok: false, action: "unresolved", note: "no source image found" };
}

function humanizeEditorialTitle(recipe: CuratedRecipe, usedTitles: Set<string>): string | null {
  const before = recipe.title.trim();
  if (!isRoboticTitle(before)) return null;

  const candidates: string[] = [];
  let stripped = before
    .replace(/^(one[- ]pot|sheet pan|oven baked)\s+/i, "")
    .replace(/\s*\(sheet pan\s*\)\s*/i, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped && stripped !== before) candidates.push(stripped);

  const hook = recipe.summary?.split(/[.!]/)[0]?.trim();
  if (hook && hook.length >= 12 && hook.length <= 60 && !isRoboticTitle(hook)) {
    candidates.push(hook);
  }

  candidates.push(
    suggestHumanMealTitle({
      protein: recipe.protein,
      mealFormat: recipe.mealFormat,
      fallbackTitle: before,
      cuisine: recipe.cuisine,
      flavorHint: stripped.split(/\s+/).find((w) => /cajun|fajita|alfredo|bulgogi|greek|mexican|nacho|teriyaki|smoky|lemon|garlic/i.test(w)),
      ingredients: recipe.ingredients.map((i) => ({ item: i.name, notes: i.originalText })),
    }),
  );

  const slugTitle = slugToTitle(recipe.slug);
  for (const flavor of ["Smoky", "Garlic", "Firehall", "Crispy", "Loaded"]) {
    candidates.push(`${flavor} ${slugTitle}`);
  }
  candidates.push(slugTitle);

  for (let raw of candidates) {
    if (!raw) continue;
    raw = raw.replace(/\s+/g, " ").trim();
    if (raw.length < 8 || raw === before || isRoboticTitle(raw)) continue;
    let candidate = raw;
    if (usedTitles.has(candidate.toLowerCase())) {
      const suffix = titleCaseWords(recipe.slug.split("-").slice(-2).join(" "));
      candidate = `${raw} — ${suffix}`;
    }
    if (candidate.length >= 8 && !isRoboticTitle(candidate) && !usedTitles.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return null;
}

function writeDuplicateReviewReport(recipes: CuratedRecipe[]): void {
  const inputs = recipes.map((r) => ({
    recipeId: r.recipeId,
    slug: r.slug,
    title: r.title,
    mealFormat: r.mealFormat,
    equipment: r.metadata?.equipment,
    ingredients: r.ingredients.map((i) => ({ name: i.name })),
    steps: r.instructions.map((s) => ({ heading: s.heading, body: s.body })),
  }));
  const archetypeById = new Map(recipes.map((r) => [r.recipeId, r.archetypeId || ""]));
  const pairs = findNearDuplicatePairs(inputs, { sameArchetypeOnly: true, archetypeById });

  const byFamily = new Map<string, typeof pairs>();
  for (const p of pairs) {
    const a = recipes.find((r) => r.recipeId === p.recipeIdA);
    const family = a?.archetypeId || a?.archetypeFamily || "unassigned";
    const list = byFamily.get(family) || [];
    list.push(p);
    byFamily.set(family, list);
  }

  const recommendations = pairs.map((p) => {
    let recommendation: "merge" | "rewrite" | "keep" = "keep";
    let rationale = "Similar but distinct enough to keep both variants.";
    if (p.overall >= 92) {
      recommendation = "merge";
      rationale = "Very high overlap — consider merging into one canonical recipe.";
    } else if (p.overall >= 85) {
      recommendation = "rewrite";
      rationale = "Strong overlap — differentiate steps or protein focus before publish.";
    }
    const a = recipes.find((r) => r.recipeId === p.recipeIdA);
    return {
      slugA: p.slugA,
      slugB: p.slugB,
      similarity: p.overall,
      family: a?.archetypeId || a?.archetypeFamily || "unassigned",
      recommendation,
      rationale,
    };
  });

  const outDir = path.join(process.cwd(), "review");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "variant-duplicate-review.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), pairCount: pairs.length, families: [...byFamily.entries()].map(([family, familyPairs]) => ({ family, pairs: familyPairs })), recommendations }, null, 2),
  );

  const mdLines = [
    "# Variant Near-Duplicate Review",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `**Pairs flagged (≥82% similarity, same family):** ${pairs.length}`,
    "",
  ];
  for (const [family, familyPairs] of [...byFamily.entries()].sort((a, b) => b[1].length - a[1].length)) {
    mdLines.push(`## ${family}`, "");
    for (const p of familyPairs) {
      const rec = recommendations.find((r) => r.slugA === p.slugA && r.slugB === p.slugB)!;
      mdLines.push(`- **${p.slugA}** vs **${p.slugB}** — ${p.overall}% → **${rec.recommendation.toUpperCase()}**: ${rec.rationale}`);
    }
    mdLines.push("");
  }
  fs.writeFileSync(path.join(outDir, "variant-duplicate-review.md"), mdLines.join("\n"));
  console.log(`[fix-blockers] wrote variant duplicate review (${pairs.length} pairs)`);
}

async function main(): Promise<void> {
  const beforeReport = JSON.parse(fs.readFileSync(path.join(process.cwd(), "review", "editorial-qa-report.json"), "utf8"));
  const beforeSummary = beforeReport.summary || summarizeEditorialQaReports(beforeReport.reports);

  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();

  const blockedSlugs = (beforeReport.reports as Array<{ slug: string; blockedReasons?: string[] }>)
    .filter((r) => r.blockedReasons?.includes("missing_local_image"))
    .map((r) => r.slug);

  const imageFixes: Array<{ slug: string; before: string; after: string; action: string; note?: string }> = [];

  for (const slug of blockedSlugs) {
    const row = db
      .prepare("SELECT recipe_id, hero_image FROM curated_recipes WHERE slug = ?")
      .get(slug) as { recipe_id: string; hero_image: string };
    const before = String(row.hero_image || "");
    let after = before;
    let action = "unresolved";

    const nytUrl = fixNytMispath(before);
    if (nytUrl) {
      after = nytUrl;
      action = "fixed_nyt_external_url";
      db.prepare("UPDATE curated_recipes SET hero_image = ?, updated_at = datetime('now') WHERE recipe_id = ?").run(after, row.recipe_id);
      imageFixes.push({ slug, before, after, action });
      continue;
    }

    if (before.startsWith("/images/")) {
      const result = await ensureLocalHeroFile(slug, before, row.recipe_id);
      if (result.ok) {
        action = result.action;
        imageFixes.push({ slug, before, after: before, action, note: result.note });
      } else {
        imageFixes.push({ slug, before, after: before, action: "unresolved", note: result.note });
      }
    } else {
      imageFixes.push({ slug, before, after: before, action: "skipped", note: "not a local path" });
    }
  }

  const allRecipes = await listCuratedRecipesForEditorialQa();
  const usedTitles = new Set(allRecipes.map((r) => r.title.trim().toLowerCase()));
  const titleFixes: Array<{ slug: string; before: string; after: string }> = [];

  for (const recipe of allRecipes) {
    const fix = humanizeEditorialTitle(recipe, usedTitles);
    if (!fix) continue;
    db.prepare("UPDATE curated_recipes SET title = ?, updated_at = datetime('now') WHERE recipe_id = ?").run(fix, recipe.recipeId);
    usedTitles.add(fix.toLowerCase());
    titleFixes.push({ slug: recipe.slug, before: recipe.title, after: fix });
  }

  writeDuplicateReviewReport(allRecipes);
  flushSqliteToDisk();

  const reportPath = path.join(process.cwd(), "review", "fix-publish-blockers-report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        before: beforeSummary,
        imageFixes,
        titleFixes,
      },
      null,
      2,
    ),
  );

  const okImages = imageFixes.filter((f) => f.action !== "unresolved" && f.action !== "skipped").length;
  console.log(`[fix-blockers] image actions: ${okImages}/${imageFixes.length}`);
  console.log(`[fix-blockers] title fixes: ${titleFixes.length}`);
  console.log(`[fix-blockers] unresolved images: ${imageFixes.filter((f) => f.action === "unresolved").length}`);
  console.log(`[fix-blockers] wrote ${reportPath}`);

  releaseSqliteTimersForTests();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
