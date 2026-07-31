#!/usr/bin/env tsx
/**
 * IMAGE-CONTENT ACCURACY AUDIT — extra/unlisted ingredients.
 *
 * Existing tooling (scripts/audit-hero-images.ts, auditMealImageWithVision)
 * only checks for MISSING title ingredients/sides in the hero photo. It has
 * no check for the opposite failure mode: an image showing food that is NOT
 * in the recipe at all (e.g. a French Toast Bake hero with bacon and a
 * fried egg neither of which are ingredients). That gap is exactly what
 * let the French Toast Bake bug ship undetected.
 *
 * This script sends every recipe's hero image + its real ingredient list to
 * a vision model and asks specifically: what visible food items are NOT
 * explained by this ingredient list? It flags anything in high-risk
 * categories (pork/bacon/sausage/ham, plated whole/fried egg, cheese, cream
 * sauces, tree nuts/peanuts, shellfish) with extra weight when the flagged
 * category contradicts the recipe's own dietary flags (e.g. porkFree:true
 * but bacon is visible) — a direct dietary-filter trust violation.
 *
 * Covers all 7 collections (golden-100, hall-expansion, performance-meals,
 * breakfast, bbq, smoothies, pizza-night) — the existing trust-audit-target
 * loader omits bbq entirely.
 *
 * Usage:
 *   npx tsx scripts/audit-image-extra-ingredient-accuracy.ts
 *   npx tsx scripts/audit-image-extra-ingredient-accuracy.ts --only=slug-a,slug-b
 *   npx tsx scripts/audit-image-extra-ingredient-accuracy.ts --collections=breakfast,bbq
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createOpenAIClient, hasOpenAIKey } from "../server/openai-client.js";

const PUBLIC = path.join(process.cwd(), "client", "public");
const REPORT_JSON = path.join(process.cwd(), "review", "image-extra-ingredient-audit.json");
const REPORT_MD = path.join(process.cwd(), "review", "image-extra-ingredient-audit.md");

const ONLY = process.argv
  .find((a) => a.startsWith("--only="))
  ?.replace("--only=", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const ONLY_COLLECTIONS = process.argv
  .find((a) => a.startsWith("--collections="))
  ?.replace("--collections=", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const CONCURRENCY = 6;

type Collection = {
  key: string;
  label: string;
  pagesDir: string;
};

const COLLECTIONS: Collection[] = [
  { key: "golden-100", label: "Golden 100", pagesDir: "catalog/golden-100/pages" },
  { key: "hall-expansion", label: "Hall Expansion", pagesDir: "catalog/hall-expansion/pages" },
  { key: "performance-meals", label: "Performance Meals", pagesDir: "catalog/performance-meals/pages" },
  { key: "breakfast", label: "Breakfast", pagesDir: "catalog/breakfast/pages" },
  { key: "bbq", label: "BBQ", pagesDir: "catalog/bbq/pages" },
  { key: "smoothies", label: "Smoothies", pagesDir: "catalog/smoothies/pages" },
  { key: "pizza-night", label: "Pizza Night", pagesDir: "catalog/pizza-night/pages" },
];

interface RecipeTarget {
  collection: string;
  slug: string;
  title: string;
  ingredientNames: string[];
  heroImage: string;
  dietaryFlags?: Record<string, boolean>;
}

function toAbsolute(publicPath: string): string {
  const rel = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  return path.join(PUBLIC, rel.replace(/\//g, path.sep));
}

function loadTargets(): RecipeTarget[] {
  const targets: RecipeTarget[] = [];
  for (const col of COLLECTIONS) {
    if (ONLY_COLLECTIONS?.length && !ONLY_COLLECTIONS.includes(col.key)) continue;
    const dir = path.join(PUBLIC, col.pagesDir);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      let data: any;
      try {
        data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      } catch {
        continue;
      }
      const slug = String(data.slug || file.replace(/\.json$/, ""));
      if (ONLY?.length && !ONLY.includes(slug)) continue;
      const ingredientNames: string[] = Array.isArray(data.ingredients)
        ? data.ingredients.map((i: any) => String(i?.name || "")).filter(Boolean)
        : [];
      targets.push({
        collection: col.key,
        slug,
        title: String(data.title || slug),
        ingredientNames,
        heroImage: String(data.heroImage || ""),
        dietaryFlags: data.dietary?.flags,
      });
    }
  }
  return targets;
}

const RUBRIC = `You are auditing food photography for a meal-planning app where users filter recipes by allergen and dietary restrictions. Trust depends on the photo ONLY showing what's actually in the recipe.

You will be given a recipe TITLE, its full INGREDIENT LIST, and its hero photo. Identify any DISTINCT, CLEARLY VISIBLE food item in the photo that is NOT reasonably explained by the ingredient list.

Focus especially on these high-risk categories (flag if visible and NOT in the ingredient list):
- pork / bacon / sausage / ham / any cured or fried meat
- a plated whole, fried, or poached egg (a separate visible egg on the plate — NOT eggs blended invisibly into a batter/custard/dough)
- cheese (shredded, sliced, or melted)
- cream-based or cheese-based sauces (ranch, alfredo, queso, etc.)
- tree nuts or peanuts as a visible garnish
- shellfish (shrimp, crab, etc.)
- a completely different dish format than the title implies (e.g. pancakes shown for a "bake"/casserole, a bowl shown for a "sandwich")

Do NOT flag: garnishes of herbs/parsley, salt/pepper, oil sheen, standard plating props (napkins, cutlery), background kitchen staff, or ingredients that ARE in the ingredient list under a different phrasing (e.g. "cheddar" ingredient matches "cheese" visible).

Return JSON only:
{
  "extraItemsFound": boolean,
  "extraItems": [{ "item": string, "category": "pork_or_meat" | "egg" | "cheese" | "sauce" | "nuts" | "shellfish" | "wrong_dish_format" | "other", "confidence": 1-100 }],
  "imageMatchesRecipe": boolean,
  "notes": string
}`;

async function auditOne(client: ReturnType<typeof createOpenAIClient>, target: RecipeTarget) {
  const abs = toAbsolute(target.heroImage);
  if (!fs.existsSync(abs)) {
    return { target, skipped: true, reason: "hero_file_missing" as const };
  }
  const buf = fs.readFileSync(abs);
  const mime = buf[0] === 0xff ? "image/jpeg" : buf.slice(0, 4).toString("hex") === "52494646" ? "image/webp" : "image/png";
  const b64 = buf.toString("base64");

  try {
    const res = await client.chat.completions.create({
      model: process.env.FOOD_IMAGERY_VISION_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: RUBRIC },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `Title: "${target.title}"`,
                `Ingredient list: ${target.ingredientNames.join(", ") || "(none listed)"}`,
              ].join("\n"),
            },
            { type: "image_url", image_url: { url: `data:${mime};base64,${b64}`, detail: "low" } },
          ],
        },
      ],
    });
    const raw = res.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    return { target, skipped: false, result: parsed };
  } catch (err: any) {
    return { target, skipped: true, reason: `vision_error: ${err?.message || String(err)}` };
  }
}

async function runPool<T, R>(items: T[], concurrency: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]!, idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

function dietaryFlagForCategory(category: string): string | null {
  switch (category) {
    case "pork_or_meat":
      return "porkFree";
    case "egg":
      return "eggFree";
    case "cheese":
    case "sauce":
      return "dairyFree";
    case "nuts":
      return "nutFree";
    case "shellfish":
      return "shellfishFree";
    default:
      return null;
  }
}

async function main(): Promise<void> {
  if (!hasOpenAIKey()) {
    console.error("[audit:image-extra-ingredient] No OpenAI key configured — cannot run vision audit.");
    process.exit(1);
  }
  const client = createOpenAIClient();
  const targets = loadTargets();
  console.log(`[audit:image-extra-ingredient] auditing ${targets.length} recipe(s), concurrency=${CONCURRENCY}`);

  let done = 0;
  const outcomes = await runPool(targets, CONCURRENCY, async (target) => {
    const out = await auditOne(client, target);
    done++;
    if (out.skipped) {
      console.log(`  SKIP ${target.slug}: ${out.reason}`);
    }
    if (done % 25 === 0 || done === targets.length) {
      console.log(`  ${done}/${targets.length}…`);
    }
    return out;
  });

  const flagged: Array<{
    collection: string;
    slug: string;
    title: string;
    heroImage: string;
    extraItems: Array<{ item: string; category: string; confidence: number }>;
    dietaryConflicts: string[];
    notes: string;
  }> = [];

  let skippedCount = 0;
  const skippedDetails: Array<{ slug: string; collection: string; reason: string }> = [];
  for (const outcome of outcomes) {
    if (outcome.skipped) {
      skippedCount++;
      skippedDetails.push({
        slug: outcome.target.slug,
        collection: outcome.target.collection,
        reason: (outcome as any).reason || "unknown",
      });
      continue;
    }
    const result = outcome.result;
    if (!result?.extraItemsFound || !Array.isArray(result.extraItems) || result.extraItems.length === 0) continue;

    const target = outcome.target;
    const dietaryConflicts: string[] = [];
    for (const extra of result.extraItems) {
      const flagKey = dietaryFlagForCategory(extra.category);
      if (flagKey && target.dietaryFlags && target.dietaryFlags[flagKey] === true) {
        dietaryConflicts.push(`${extra.item} (${extra.category}) contradicts ${flagKey}=true`);
      }
    }

    flagged.push({
      collection: target.collection,
      slug: target.slug,
      title: target.title,
      heroImage: target.heroImage,
      extraItems: result.extraItems,
      dietaryConflicts,
      notes: result.notes || "",
    });
  }

  // Highest-priority first: dietary conflicts, then by max confidence.
  flagged.sort((a, b) => {
    if (a.dietaryConflicts.length !== b.dietaryConflicts.length) return b.dietaryConflicts.length - a.dietaryConflicts.length;
    const maxA = Math.max(0, ...a.extraItems.map((e) => e.confidence));
    const maxB = Math.max(0, ...b.extraItems.map((e) => e.confidence));
    return maxB - maxA;
  });

  const report = {
    generatedAt: new Date().toISOString(),
    totalAudited: targets.length,
    skipped: skippedCount,
    skippedDetails,
    flaggedCount: flagged.length,
    dietaryConflictCount: flagged.filter((f) => f.dietaryConflicts.length > 0).length,
    flagged,
  };

  fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
  fs.writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const md = [
    "# Image extra-ingredient accuracy audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `- Total recipes audited: **${report.totalAudited}**`,
    `- Skipped (missing file / vision error): **${report.skipped}**`,
    `- Flagged with extra/unlisted items: **${report.flaggedCount}**`,
    `- Dietary-flag conflicts (highest priority): **${report.dietaryConflictCount}**`,
    "",
    "## Flagged recipes",
    "",
    "| Slug | Collection | Title | Extra items | Dietary conflict |",
    "| --- | --- | --- | --- | --- |",
    ...flagged.map(
      (f) =>
        `| \`${f.slug}\` | ${f.collection} | ${f.title.replace(/\|/g, "\\|")} | ${f.extraItems
          .map((e) => `${e.item} (${e.category}, ${e.confidence}%)`)
          .join("; ")} | ${f.dietaryConflicts.join("; ") || "—"} |`,
    ),
    "",
  ].join("\n");
  fs.writeFileSync(REPORT_MD, md, "utf8");

  console.log(`[audit:image-extra-ingredient] done. flagged=${report.flaggedCount} dietaryConflicts=${report.dietaryConflictCount} skipped=${report.skipped}`);
  console.log(`[audit:image-extra-ingredient] wrote ${REPORT_JSON}`);
  console.log(`[audit:image-extra-ingredient] wrote ${REPORT_MD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
