#!/usr/bin/env tsx
/**
 * Recipe image catalog audit — accuracy, consistency, technical.
 *
 * Inspects every LIVE recipe (listed in its collection index.json) by
 * looking at the actual hero pixels against the recipe data. Verdicts are
 * cached by image+recipe hash, so re-runs only pay for changed images.
 *
 * Usage:
 *   npx tsx scripts/audit-recipe-image-catalog.ts
 *   npx tsx scripts/audit-recipe-image-catalog.ts --only=monte-cristo-sandwiches
 *   npx tsx scripts/audit-recipe-image-catalog.ts --collections=breakfast,bbq
 *   npx tsx scripts/audit-recipe-image-catalog.ts --no-vision   # technical checks only
 *   npx tsx scripts/audit-recipe-image-catalog.ts --only=new-slug --fail-on=P0,P1   # pre-publish gate
 *
 * Output: scripts/output/recipe-image-audit.json (+ .md summary, review queue)
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createOpenAIClient, hasOpenAIKey } from "../server/openai-client.js";
import { titleIngredientConflicts } from "../server/imagery/recipe-image-prompt.js";
import {
  RECIPE_IMAGE_QA_VERSION,
  accuracyStatus,
  consistencyStatus,
  inspectRecipeImage,
  isObviousCritical,
  qaCacheKey,
  type AccuracyStatus,
  type ConsistencyStatus,
  type Priority,
  type QaRecipe,
  type VisionVerdict,
} from "../server/imagery/recipe-image-qa.js";
import { RECIPE_IMAGE_STANDARD } from "../shared/food-imagery/recipe-image-standard.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const OUT_DIR = path.join(ROOT, "scripts", "output");
const OUT_JSON = path.join(OUT_DIR, "recipe-image-audit.json");
const OUT_MD = path.join(OUT_DIR, "recipe-image-audit.md");
const OUT_QUEUE = path.join(OUT_DIR, "recipe-image-review-queue.json");
const CACHE_PATH = path.join(OUT_DIR, "recipe-image-audit-cache.json");

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const list = (v?: string) => v?.split(",").map((s) => s.trim()).filter(Boolean);
const ONLY = list(arg("only"));
const ONLY_COLLECTIONS = list(arg("collections"));
const NO_VISION = process.argv.includes("--no-vision");
const CONCURRENCY = Number(arg("concurrency")) || 6;

type VariantScheme = "breakfast" | "smoker-catalog" | "hall-expansion" | "editorial" | "smoothies";

const COLLECTIONS: Array<{ key: string; scheme: VariantScheme }> = [
  { key: "golden-100", scheme: "editorial" },
  { key: "performance-meals", scheme: "editorial" },
  { key: "pizza-night", scheme: "editorial" },
  { key: "hall-expansion", scheme: "hall-expansion" },
  { key: "breakfast", scheme: "breakfast" },
  { key: "bbq", scheme: "smoker-catalog" },
  { key: "smoothies", scheme: "smoothies" },
];

interface IndexEntry {
  slug: string;
  title?: string;
  heroImage?: string;
  thumbImage?: string;
}

interface AuditRecord {
  slug: string;
  collection: string;
  title: string;
  image: string;
  accuracy_status: AccuracyStatus | "ERROR" | "NOT_CHECKED";
  consistency_status: ConsistencyStatus | "ERROR" | "NOT_CHECKED";
  technical_status: "PASS" | "ISSUES";
  issues: string[];
  recommended_action: string;
  priority: Priority;
  visible_foods?: string[];
  camera_angle?: string;
  hero_sha256?: string;
}

const abs = (publicPath: string) => path.join(PUBLIC, publicPath.replace(/^\//, "").replace(/\//g, path.sep));
const exists = (publicPath?: string) => Boolean(publicPath) && fs.existsSync(abs(publicPath!));
const readJson = <T>(p: string): T | null => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return null;
  }
};

function expectedVariants(scheme: VariantScheme, slug: string, hero: string): { mobile: string; rail: string } {
  const base = path.basename(hero).replace(/\.(jpe?g|webp|png)$/i, "");
  switch (scheme) {
    case "breakfast":
    case "smoker-catalog":
    case "hall-expansion":
      return { mobile: `/images/mobile/${scheme}/${slug}.jpg`, rail: `/images/rails/${scheme}/${slug}.jpg` };
    default:
      return { mobile: `/images/mobile/${base}.jpg`, rail: `/images/rails/${base}.jpg` };
  }
}

async function runPool<T>(items: T[], n: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]!);
    }),
  );
}

interface Working {
  record: AuditRecord;
  recipe: QaRecipe;
  heroBuf?: Buffer;
  luminance?: number;
  warmth?: number;
  verdict?: VisionVerdict;
  techMajor: boolean;
  recipeConflict: boolean;
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const cache = readJson<Record<string, VisionVerdict>>(CACHE_PATH) ?? {};
  const work: Working[] = [];

  for (const col of COLLECTIONS) {
    if (ONLY_COLLECTIONS?.length && !ONLY_COLLECTIONS.includes(col.key)) continue;
    const index = readJson<{ recipes: IndexEntry[] }>(path.join(PUBLIC, "catalog", col.key, "index.json"));
    for (const entry of index?.recipes ?? []) {
      if (ONLY?.length && !ONLY.includes(entry.slug)) continue;
      const page = readJson<QaRecipe & { heroImage?: string; thumbImage?: string }>(
        path.join(PUBLIC, "catalog", col.key, "pages", `${entry.slug}.json`),
      );
      const issues: string[] = [];
      let techMajor = false;
      if (!page) {
        issues.push("technical: live index entry has no recipe page (orphan reference)");
        techMajor = true;
      }
      const hero = page?.heroImage || entry.heroImage || "";
      if (page?.heroImage && entry.heroImage && page.heroImage !== entry.heroImage) {
        issues.push(`technical: index heroImage ${entry.heroImage} differs from page ${page.heroImage}`);
      }
      if (!exists(hero)) {
        issues.push(`technical: hero missing or broken path (${hero || "none"})`);
        techMajor = true;
      }
      const thumb = entry.thumbImage || page?.thumbImage;
      if (!exists(thumb)) issues.push(`technical: thumbnail missing (${thumb || "none"})`);
      if (col.scheme !== "smoothies") {
        const v = expectedVariants(col.scheme, entry.slug, hero);
        if (!exists(v.mobile)) issues.push(`technical: mobile variant missing (${v.mobile})`);
        if (!exists(v.rail)) issues.push(`technical: rail variant missing (${v.rail})`);
        const pipelineWritesWebp = col.scheme === "breakfast" || col.scheme === "editorial";
        if (pipelineWritesWebp && /\.jpe?g$/i.test(hero) && !exists(hero.replace(/\.jpe?g$/i, ".webp"))) {
          issues.push("technical: hero WebP missing");
        }
      }
      if (!page?.imageAlt && !page?.heroImageAlt) issues.push("technical: alt text missing");

      const recipe: QaRecipe = { ...(page ?? { slug: entry.slug }), slug: entry.slug, title: page?.title || entry.title };
      const conflicts = titleIngredientConflicts(recipe);
      for (const c of conflicts) issues.push(`recipe-data: ${c}`);
      work.push({
        recipe,
        techMajor,
        recipeConflict: conflicts.length > 0,
        record: {
          slug: entry.slug,
          collection: col.key,
          title: recipe.title || entry.slug,
          image: hero,
          accuracy_status: "NOT_CHECKED",
          consistency_status: "NOT_CHECKED",
          technical_status: "PASS",
          issues,
          recommended_action: "",
          priority: "PASS",
        },
      });
    }
  }

  // Pixel-level technical checks (dimensions, hash, colour stats).
  await runPool(work, 12, async (w) => {
    if (!exists(w.record.image)) return;
    const buf = fs.readFileSync(abs(w.record.image));
    w.heroBuf = buf;
    w.record.hero_sha256 = createHash("sha256").update(buf).digest("hex");
    try {
      const img = sharp(buf);
      const meta = await img.metadata();
      const minSide = Math.min(meta.width ?? 0, meta.height ?? 0);
      if (minSide < RECIPE_IMAGE_STANDARD.technical.heroMinSidePx) {
        w.record.issues.push(`technical: hero ${meta.width}x${meta.height} below ${RECIPE_IMAGE_STANDARD.technical.heroMinSidePx}px standard`);
      }
      const { channels } = await img.stats();
      const [r, g, b] = channels.map((c) => c.mean);
      w.luminance = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
      w.warmth = r! - b!;
    } catch (err) {
      w.record.issues.push(`technical: hero unreadable (${(err as Error).message})`);
      w.techMajor = true;
    }
  });

  // Same file bytes on unrelated recipes can't be accurate for both.
  const byHash = new Map<string, Working[]>();
  for (const w of work) {
    if (!w.record.hero_sha256) continue;
    byHash.set(w.record.hero_sha256, [...(byHash.get(w.record.hero_sha256) ?? []), w]);
  }
  for (const group of byHash.values()) {
    const slugs = [...new Set(group.map((g) => g.record.slug))];
    if (slugs.length < 2) continue;
    for (const w of group) {
      w.record.issues.push(`technical: hero image identical to ${slugs.filter((s) => s !== w.record.slug).join(", ")}`);
    }
  }

  // Catalog-level colour/brightness outliers (>2.5σ).
  const zFlag = (key: "luminance" | "warmth", label: string) => {
    const vals = work.map((w) => w[key]).filter((v): v is number => typeof v === "number");
    const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length || 1)) || 1;
    for (const w of work) {
      const v = w[key];
      if (typeof v !== "number") continue;
      const z = (v - mean) / sd;
      if (Math.abs(z) > 2.5) w.record.issues.push(`consistency: ${label} outlier (${z > 0 ? "+" : ""}${z.toFixed(1)}σ vs catalog)`);
    }
  };
  zFlag("luminance", "brightness");
  zFlag("warmth", "colour temperature");

  // Vision inspection.
  const client = !NO_VISION && hasOpenAIKey() ? createOpenAIClient() : null;
  if (!NO_VISION && !client) console.warn("[audit] no OpenAI key — vision checks skipped");
  let done = 0;
  let cached = 0;
  const visionTargets = work.filter((w) => w.heroBuf);
  if (client) {
    await runPool(visionTargets, CONCURRENCY, async (w) => {
      const key = qaCacheKey(w.heroBuf!, w.recipe);
      let verdict = cache[key];
      if (verdict) cached++;
      for (let attempt = 0; !verdict && attempt < 3; attempt++) {
        try {
          verdict = await inspectRecipeImage(client, w.heroBuf!, w.recipe);
          cache[key] = verdict;
        } catch (err) {
          if (attempt === 2) w.record.issues.push(`audit: vision error (${(err as Error).message})`);
          else await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
      w.verdict = verdict;
      if (++done % 25 === 0) {
        console.log(`  ${done}/${visionTargets.length} inspected (${cached} cached)`);
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache), "utf8");
      }
    });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache), "utf8");
  }

  // Classify.
  for (const w of work) {
    const r = w.record;
    const v = w.verdict;
    if (v) {
      r.accuracy_status = accuracyStatus(v);
      r.consistency_status = consistencyStatus(v);
      r.visible_foods = v.visible_foods;
      r.camera_angle = v.camera_angle;
      for (const i of v.accuracy_issues) r.issues.push(`accuracy: ${i}`);
      if (r.consistency_status !== "PASS") {
        for (const i of v.consistency_issues) r.issues.push(`consistency: ${i}`);
        if (v.people_or_hands) r.issues.push("consistency: people or hands in frame");
        if (v.text_or_logo) r.issues.push("consistency: text or logo in frame");
        for (const a of v.ai_artifacts) r.issues.push(`consistency: AI artifact — ${a}`);
      }
      if (!v.alt_text_accurate) r.issues.push("technical: alt text does not match the visible food");
    } else if (client && w.heroBuf) {
      r.accuracy_status = "ERROR";
      r.consistency_status = "ERROR";
    }
    r.issues = [...new Set(r.issues)];
    const tech = r.issues.filter((i) => i.startsWith("technical:"));
    r.technical_status = tech.length ? "ISSUES" : "PASS";
    const hasConsistencyNote = r.issues.some((i) => i.startsWith("consistency:"));
    const duplicate = tech.some((i) => i.includes("identical to"));

    if (w.recipeConflict) {
      r.priority = "P1";
      r.recommended_action = "editorial: resolve recipe title vs ingredients first — do not regenerate the image until the recipe is fixed";
    } else if (r.accuracy_status === "CRITICAL" && v && isObviousCritical(v.accuracy_issues, w.recipe)) {
      r.priority = "P0";
      r.recommended_action = "auto-regenerate from recipe (npm run images:regen -- --from-audit)";
    } else if (
      r.accuracy_status === "CRITICAL" ||
      r.accuracy_status === "MAJOR" ||
      r.consistency_status === "REPLACE" ||
      w.techMajor
    ) {
      r.priority = "P1";
      r.recommended_action = w.techMajor
        ? "fix broken/missing hero, then re-audit"
        : `${r.accuracy_status === "CRITICAL" ? "confirm model call, then " : ""}regenerate after manual review (npm run images:regen -- --only=${r.collection}/${r.slug})`;
    } else if (r.consistency_status === "REVIEW" || hasConsistencyNote || duplicate || r.accuracy_status === "ERROR") {
      r.priority = "P2";
      r.recommended_action =
        r.accuracy_status === "ERROR" ? "re-run audit for this slug" : "manual review — keep unless reviewer confirms it is an outlier";
    } else if (r.accuracy_status === "MINOR" || tech.length) {
      r.priority = "P3";
      r.recommended_action = tech.length ? `cleanup: ${tech.map((t) => t.replace("technical: ", "")).join("; ")}` : "none required (harmless garnish)";
    } else {
      r.priority = r.accuracy_status === "NOT_CHECKED" ? "P3" : "PASS";
      r.recommended_action = r.accuracy_status === "NOT_CHECKED" ? "run vision audit" : "none";
    }
  }

  const records = work.map((w) => w.record);
  const order: Priority[] = ["P0", "P1", "P2", "P3", "PASS"];
  records.sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority) || a.slug.localeCompare(b.slug));
  const count = (p: Priority) => records.filter((r) => r.priority === p).length;
  const totals = {
    audited: records.length,
    PASS: count("PASS"),
    P0: count("P0"),
    P1: count("P1"),
    P2: count("P2"),
    P3: count("P3"),
    accuracy: Object.fromEntries(
      ["PASS", "MINOR", "MAJOR", "CRITICAL", "ERROR", "NOT_CHECKED"].map((s) => [s, records.filter((r) => r.accuracy_status === s).length]),
    ),
    consistency: Object.fromEntries(
      ["PASS", "REVIEW", "REPLACE", "ERROR", "NOT_CHECKED"].map((s) => [s, records.filter((r) => r.consistency_status === s).length]),
    ),
    technicalIssues: records.filter((r) => r.technical_status === "ISSUES").length,
  };

  // Partial runs merge into the existing report instead of truncating it.
  const partial = Boolean(ONLY?.length || ONLY_COLLECTIONS?.length);
  let finalRecords = records;
  if (partial) {
    const prev = readJson<{ records: AuditRecord[] }>(OUT_JSON)?.records ?? [];
    const fresh = new Set(records.map((r) => `${r.collection}/${r.slug}`));
    finalRecords = [...prev.filter((r) => !fresh.has(`${r.collection}/${r.slug}`)), ...records];
    finalRecords.sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority) || a.slug.localeCompare(b.slug));
  }
  const finalCount = (p: Priority) => finalRecords.filter((r) => r.priority === p).length;
  const finalTotals = partial
    ? { audited: finalRecords.length, PASS: finalCount("PASS"), P0: finalCount("P0"), P1: finalCount("P1"), P2: finalCount("P2"), P3: finalCount("P3") }
    : totals;

  const report = {
    generatedAt: new Date().toISOString(),
    qaVersion: RECIPE_IMAGE_QA_VERSION,
    model: NO_VISION ? null : process.env.RECIPE_IMAGE_QA_MODEL?.trim() || "gpt-4o",
    totals: finalTotals,
    records: finalRecords,
  };
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const queue = finalRecords
    .filter((r) => r.priority === "P1" || r.priority === "P2")
    .map((r) => ({ priority: r.priority, collection: r.collection, slug: r.slug, title: r.title, image: r.image, issues: r.issues, recommended_action: r.recommended_action }));
  fs.writeFileSync(OUT_QUEUE, `${JSON.stringify({ generatedAt: report.generatedAt, count: queue.length, queue }, null, 2)}\n`, "utf8");

  const row = (r: AuditRecord) =>
    `| ${r.priority} | \`${r.collection}/${r.slug}\` | ${r.accuracy_status} | ${r.consistency_status} | ${r.issues.slice(0, 3).join("; ").replace(/\|/g, "\\|")} |`;
  const md = [
    "# Recipe image catalog audit",
    "",
    `Generated ${report.generatedAt} — QA ${report.qaVersion}, model ${report.model ?? "none (technical only)"}`,
    "",
    `Audited **${finalTotals.audited}** live recipes: PASS ${finalTotals.PASS} · P0 ${finalTotals.P0} · P1 ${finalTotals.P1} · P2 ${finalTotals.P2} · P3 ${finalTotals.P3}`,
    "",
    "Priority: P0 materially wrong food · P1 major mismatch or poor image · P2 consistency review · P3 minor cleanup.",
    "",
    "## P0 / P1 / P2",
    "",
    "| Priority | Recipe | Accuracy | Consistency | Top issues |",
    "| --- | --- | --- | --- | --- |",
    ...finalRecords.filter((r) => ["P0", "P1", "P2"].includes(r.priority)).map(row),
    "",
  ].join("\n");
  fs.writeFileSync(OUT_MD, md, "utf8");

  console.log(`[audit] ${JSON.stringify(finalTotals)}`);
  console.log(`[audit] wrote ${path.relative(ROOT, OUT_JSON)}, ${path.relative(ROOT, OUT_MD)}, ${path.relative(ROOT, OUT_QUEUE)}`);

  const failOn = list(arg("fail-on"));
  const blocking = records.filter((r) => failOn?.includes(r.priority));
  if (blocking.length) {
    console.error(`[audit] publish gate: ${blocking.length} image(s) at ${failOn!.join("/")}:`);
    for (const r of blocking) console.error(`  ${r.priority} ${r.collection}/${r.slug} — ${r.issues.slice(0, 2).join("; ")}`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
