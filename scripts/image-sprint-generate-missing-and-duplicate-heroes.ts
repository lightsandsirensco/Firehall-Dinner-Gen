#!/usr/bin/env tsx
/**
 * IMAGE INTEGRITY SPRINT — generate real, accurate, unique hero imagery for
 * every recipe identified by scripts/audit-full-catalog-image-integrity.ts as:
 *
 *   1. "missing" — no hero/thumb/mobile/rail file at all (performance-meals
 *      batch-06/07 + a handful of older batches were shipped with image
 *      fields intentionally blanked, pending photography that never ran).
 *   2. "duplicate_conflict" — hero file bytes identical (MD5) to another,
 *      unrelated recipe's hero (bootstrap-donor mass-copy bug from an
 *      earlier sprint). Every member of every duplicate cluster gets a
 *      brand-new, distinct, accurate image — we never assume one member of
 *      a cluster is "the real one" without vision proof.
 *
 * For performance-meals targets, after generating real files this also
 * un-blanks the heroImage/mobileImage/thumbImage/railImage fields in the
 * page JSON (back to their canonical slug-locked paths) and rebuilds the
 * collection's index.json — the root cause is not just "no pixels", it's
 * that the catalog metadata was written with permanently-blank fields, so
 * generating pixels alone will not fix Explore/detail pages.
 *
 * Usage:
 *   npx tsx scripts/image-sprint-generate-missing-and-duplicate-heroes.ts --dry-run
 *   npx tsx scripts/image-sprint-generate-missing-and-duplicate-heroes.ts
 *   npx tsx scripts/image-sprint-generate-missing-and-duplicate-heroes.ts --only=slug-a,slug-b
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

applyDevOpenAiTlsIfAllowed();

import { buildEditorialImagePrompt, buildEditorialModelPrompt } from "../server/imagery/build-image-prompt.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";
import {
  writeEditorialImageVariants,
  writeHallExpansionCatalogImageVariants,
  writeBreakfastCatalogImageVariants,
} from "../server/imagery/variants.js";
import {
  performancePageHeroPath,
  performancePageMobilePath,
  performancePageThumbPath,
  performancePageRailPath,
} from "../shared/performance-meals/recipe-page-paths.js";
import { goldenRecipePageSchema, goldenCatalogIndexSchema } from "../shared/golden-100/recipe-page-schema.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const DRY_RUN = process.argv.includes("--dry-run");
const ONLY = process.argv
  .find((a) => a.startsWith("--only="))
  ?.replace("--only=", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const REPORT_OUT = path.join(ROOT, "review", "image-sprint-generation-report.json");

type Collection = "golden-100" | "hall-expansion" | "breakfast" | "performance-meals";

interface Target {
  collection: Collection;
  slug: string;
  reason: "missing" | "duplicate_conflict";
}

// Duplicate clusters — every member regenerated (bootstrap-donor bug; none verified correct).
const DUPLICATE_TARGETS: Target[] = [
  { collection: "golden-100", slug: "big-chili", reason: "duplicate_conflict" },
  { collection: "hall-expansion", slug: "burnt-ends-chili-crew", reason: "duplicate_conflict" },
  { collection: "hall-expansion", slug: "pasta-e-fagioli-hall", reason: "duplicate_conflict" },
  { collection: "hall-expansion", slug: "white-chicken-chili-crock", reason: "duplicate_conflict" },

  { collection: "golden-100", slug: "bulgogi-bowls", reason: "duplicate_conflict" },
  { collection: "hall-expansion", slug: "firehall-korean-beef-bowls", reason: "duplicate_conflict" },
  { collection: "hall-expansion", slug: "egg-roll-in-a-bowl-crew", reason: "duplicate_conflict" },
  { collection: "hall-expansion", slug: "korean-turkey-rice-bowls", reason: "duplicate_conflict" },

  { collection: "golden-100", slug: "teriyaki-donburi", reason: "duplicate_conflict" },
  { collection: "hall-expansion", slug: "teriyaki-chicken-rice-bowls", reason: "duplicate_conflict" },
  { collection: "hall-expansion", slug: "thai-peanut-chicken-crock", reason: "duplicate_conflict" },

  { collection: "golden-100", slug: "chicken-alfredo-bake", reason: "duplicate_conflict" },
  { collection: "golden-100", slug: "pancake-short-stack", reason: "duplicate_conflict" },

  { collection: "breakfast", slug: "huevos-rancheros-crew", reason: "duplicate_conflict" },
  { collection: "breakfast", slug: "shakshuka-for-the-hall", reason: "duplicate_conflict" },

  { collection: "breakfast", slug: "menemen-for-the-crew", reason: "duplicate_conflict" },
  { collection: "breakfast", slug: "migas-for-the-crew", reason: "duplicate_conflict" },
];

// Performance-meals recipes shipped with permanently blank image fields.
const MISSING_PERFORMANCE_SLUGS = [
  "thai-basil-ground-beef-skillet",
  "southwest-beef-sweet-potato-skillet",
  "beef-birria-with-consomme",
  "greek-beef-keftedes-lemon-orzo-tzatziki",
  "mediterranean-beef-kofta-bowls",
  "unstuffed-cabbage-roll-skillet",
  "cuban-beef-picadillo-bowls",
  "greek-spiced-beef-burger-bowls-tzatziki-slaw",
  "herb-marinated-flank-steak-chimichurri-farro",
  "one-pot-beef-orzo-skillet-spinach-feta",
  "filipino-chicken-adobo",
  "peruvian-sheet-pan-chicken-aji-verde",
  "kung-pao-chicken-rice-bowls",
  "vietnamese-caramel-braised-chicken-bowls",
  "trinidadian-curry-chicken-potatoes",
  "chicken-marsala-lightened",
  "cajun-chicken-dirty-rice-bowls",
  "sheet-pan-chimichurri-chicken-charred-vegetables",
  "high-protein-chicken-fried-rice",
  "general-tsos-baked-chicken",
  "mediterranean-chicken-white-bean-skillet",
  "italian-sausage-veg-sheet-pan",
  "lean-beef-broccoli-rice",
  "lean-turkey-bean-chili",
  "sheet-pan-chicken-fajitas-lite",
  "turkey-quinoa-stuffed-peppers",
];

const MISSING_TARGETS: Target[] = MISSING_PERFORMANCE_SLUGS.map((slug) => ({
  collection: "performance-meals",
  slug,
  reason: "missing",
}));

const ALL_TARGETS: Target[] = [...MISSING_TARGETS, ...DUPLICATE_TARGETS];

function pageRelPath(collection: Collection, slug: string): string {
  return `catalog/${collection}/pages/${slug}.json`;
}

function readPage(collection: Collection, slug: string): any {
  return JSON.parse(fs.readFileSync(path.join(PUBLIC, pageRelPath(collection, slug)), "utf8"));
}

function tagValue(tags: string[] | undefined, prefix: string): string | undefined {
  const hit = (tags || []).find((t) => t.startsWith(`${prefix}:`));
  return hit ? hit.slice(prefix.length + 1) : undefined;
}

function buildPromptInput(collection: Collection, page: any) {
  const ingredientHints = (page.ingredients || []).slice(0, 8).map((i: any) => i.name);
  if (collection === "golden-100" || collection === "performance-meals") {
    return {
      mealName: page.title,
      category: collection === "performance-meals" ? "performance_meals" : page.category,
      cuisine: page.cuisine,
      protein: tagValue(page.tags, "protein") || "mixed",
      mealFormat: tagValue(page.tags, "format") || page.category,
      ingredientHints,
      hookLine: page.whyCrewsLikeIt || page.subtitle,
    };
  }
  if (collection === "hall-expansion") {
    return {
      mealName: page.title,
      category: "hall_expansion",
      cuisine: page.cuisine,
      protein: tagValue(page.tags, "protein") || "mixed",
      mealFormat: tagValue(page.tags, "format") || "plated_main",
      ingredientHints,
      hookLine: page.whyCrewsLikeIt,
    };
  }
  // breakfast
  return {
    mealName: page.title,
    category: "breakfast",
    cuisine: "american",
    protein: (page.tags || []).find((t: string) => /bacon|sausage|egg|ham/i.test(t)) || "eggs",
    mealFormat: "breakfast_spread",
    ingredientHints,
    hookLine: page.subtitle,
  };
}

async function writeVariantsForCollection(collection: Collection, slug: string, buffer: Buffer): Promise<void> {
  if (collection === "golden-100" || collection === "performance-meals") {
    await writeEditorialImageVariants(slug, buffer, "comfort_firehall", 2, "golden100");
    return;
  }
  if (collection === "hall-expansion") {
    await writeHallExpansionCatalogImageVariants(slug, buffer, 2);
    return;
  }
  await writeBreakfastCatalogImageVariants(slug, buffer, 2);
}

/** Un-blank performance-meals page image fields + rebuild the collection index. */
function republishPerformanceMeals(fixedSlugs: string[]): void {
  if (fixedSlugs.length === 0) return;
  const pagesDir = path.join(PUBLIC, "catalog/performance-meals/pages");
  const allSlugs = fs
    .readdirSync(pagesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));

  for (const slug of fixedSlugs) {
    const file = path.join(pagesDir, `${slug}.json`);
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    raw.heroImage = performancePageHeroPath(slug);
    raw.mobileImage = performancePageMobilePath(slug);
    raw.thumbImage = performancePageThumbPath(slug);
    raw.railImage = performancePageRailPath(slug);
    const parsed = goldenRecipePageSchema.parse(raw);
    fs.writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  }

  // Rebuild the aggregate index from every page currently on disk.
  const pages = allSlugs.map((slug) =>
    goldenRecipePageSchema.parse(JSON.parse(fs.readFileSync(path.join(pagesDir, `${slug}.json`), "utf8"))),
  );
  const entries = pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    category: p.category,
    cuisine: p.cuisine,
    protein: p.tags.find((t: string) => t.startsWith("protein:"))?.replace("protein:", "") ?? "",
    mealFormat: p.tags.find((t: string) => t.startsWith("format:"))?.replace("format:", "") ?? "",
    cookTime: p.cookTime,
    difficulty: p.difficulty,
    heroImage: p.heroImage,
    thumbImage: p.thumbImage,
    tags: p.tags,
    firefighterScore: p.firefighterScore,
    popularityWeight: p.popularityWeight,
    searchTerms: p.searchTerms,
  }));
  const index = {
    version: 1,
    contentVersion: pages[0]?.contentVersion ?? 1,
    generatedAt: new Date().toISOString(),
    recipeCount: entries.length,
    recipes: entries,
  };
  goldenCatalogIndexSchema.parse(index);
  const indexFile = path.join(PUBLIC, "catalog/performance-meals/index.json");
  fs.writeFileSync(indexFile, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  console.log(`[image-sprint] republished ${fixedSlugs.length} performance-meals page(s); index → ${entries.length} recipes`);
}

async function main(): Promise<void> {
  let targets = ALL_TARGETS;
  if (ONLY?.length) targets = targets.filter((t) => ONLY.includes(t.slug));

  console.log(`[image-sprint] ${targets.length} targets (dryRun=${DRY_RUN})`);
  let ok = 0;
  let fail = 0;
  const fixedPerformanceSlugs: string[] = [];
  const results: Array<Record<string, unknown>> = [];

  for (const target of targets) {
    const { collection, slug, reason } = target;
    try {
      const page = readPage(collection, slug);
      const promptInput = buildPromptInput(collection, page);
      const prompt = buildEditorialModelPrompt(promptInput);

      if (DRY_RUN) {
        console.log(`  \u25cb ${slug} [${collection}/${reason}] — prompt ${prompt.length} chars`);
        results.push({ slug, collection, reason, action: "dry_run", promptLength: prompt.length });
        ok++;
        continue;
      }

      const buffer = await generateFoodImageBuffer(prompt);
      const heuristic = validateImageBufferHeuristic(buffer);
      if (!heuristic.ok) {
        console.warn(`  ! ${slug}: heuristic flagged: ${heuristic.reason} ${heuristic.notes ?? ""} — writing anyway (manual review queued)`);
      }

      await writeVariantsForCollection(collection, slug, buffer);
      if (collection === "performance-meals") fixedPerformanceSlugs.push(slug);

      console.log(`  \u2713 ${slug} [${collection}/${reason}]: wrote ${buffer.length} bytes`);
      results.push({
        slug,
        collection,
        reason,
        action: "generated",
        bytes: buffer.length,
        heuristicOk: heuristic.ok,
        heuristicReason: heuristic.ok ? undefined : heuristic.reason,
      });
      ok++;
      await new Promise((r) => setTimeout(r, 500));
    } catch (err: any) {
      fail++;
      const message = err?.message || String(err);
      console.error(`  \u2717 ${slug} [${collection}/${reason}]: ${message}`);
      results.push({ slug, collection, reason, action: "error", error: message });
    }
  }

  if (!DRY_RUN) {
    republishPerformanceMeals(fixedPerformanceSlugs);
  }

  fs.mkdirSync(path.dirname(REPORT_OUT), { recursive: true });
  fs.writeFileSync(
    REPORT_OUT,
    JSON.stringify({ generatedAt: new Date().toISOString(), dryRun: DRY_RUN, ok, fail, results }, null, 2),
  );
  console.log(`[image-sprint] done ok=${ok} fail=${fail}`);
  console.log(`[image-sprint] wrote ${REPORT_OUT}`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
