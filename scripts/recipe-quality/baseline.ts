#!/usr/bin/env tsx
/**
 * Recipe Quality Phase 1 — read-only baseline of the whole recipe library.
 *
 * Reads the on-disk catalog indexes + recipe page records and the same
 * selection logic production uses (approved gate, Explore image eligibility,
 * Generator default pool, Shift Planner pools). Writes nothing except the
 * report files under review/recipe-quality/.
 *
 *   npx tsx scripts/recipe-quality/baseline.ts
 */
import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore } from "../../server/curated-recipe-store.js";
import { buildAllApprovedCatalogEntries } from "../../server/approved-catalog.js";
import { buildCrossCatalogHeroAuditContext } from "../../server/cross-catalog-hero-index.js";
import { filterExploreEligibleCatalogEntries } from "../../shared/explore-image-mapping.js";
import { getDefaultGeneratorPoolSlugs } from "../../server/generation/pick-local-recipes.js";
import { loadCanonicalCatalogPage } from "../../server/meal-catalog/canonical-page.js";
import { readBreakfastRecipePageFromDisk } from "../../server/breakfast-catalog/page-store.js";
import { SMOOTHIE_CATALOG_ITEMS } from "../../shared/fuel-catalog/smoothies/catalog-data.js";
import { readPizzaNightRecipePage } from "../../server/pizza-night/page-store.js";
import { PHASE5_REMOVED_SLUGS } from "../../shared/catalog-consolidation/phase5-redirects.js";
import { goldenRecipePageSchema, type GoldenRecipePage } from "../../shared/golden-100/recipe-page-schema.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const OUT_DIR = path.join(ROOT, "review", "recipe-quality");

const COLLECTIONS: Array<[string, string]> = [
  ["golden-100", "catalog/golden-100"],
  ["performance-meals", "catalog/performance-meals"],
  ["hall-expansion", "catalog/hall-expansion"],
  ["pizza-night", "catalog/pizza-night"],
  ["breakfast", "catalog/breakfast"],
  ["breakfast-performance", "catalog/breakfast/performance"],
  ["bbq", "catalog/bbq"],
  ["smoothies", "catalog/smoothies"],
];

function readIndexSlugs(dir: string): string[] {
  const file = path.join(PUBLIC, dir, "index.json");
  if (!fs.existsSync(file)) return [];
  const json = JSON.parse(fs.readFileSync(file, "utf8")) as { recipes?: Array<{ slug: string }> };
  return (json.recipes ?? []).map((r) => r.slug.toLowerCase());
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOP = new Set(["the", "a", "and", "with", "of", "for", "style", "firehouse", "firehall", "crew", "station", "easy", "classic", "big", "batch"]);
const titleTokens = (t: string) => new Set(norm(t).split(" ").filter((w) => w && !STOP.has(w)));

const PANTRY = /^(salt|kosher salt|black pepper|pepper|water|olive oil|vegetable oil|oil|cooking spray|ice)$/;
function ingredientKey(name: string): string {
  return norm(name)
    .replace(/\b(fresh|chopped|diced|minced|sliced|large|small|medium|boneless|skinless|ground|shredded|grated|dried|optional|to taste)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Form/cut words that never identify the ingredient on their own. */
const FORM_WORDS = new Set([
  "cloves", "clove", "stalks", "stalk", "fillets", "fillet", "florets", "floret", "kernels", "kernel", "balls", "ball",
  "leaves", "leaf", "bone", "skin", "sprigs", "sprig", "heads", "head", "bunch", "can", "cans",
  "uncooked", "cooked", "scrubbed", "peeled", "crumbled", "softened", "melted", "cold", "warm", "whole", "lean", "extra",
  "virgin", "low", "sodium", "reduced", "fat", "plain", "unsalted", "salted", "frozen", "canned", "drained", "rinsed",
]);
const stem = (w: string) => w.replace(/(ies)$/, "y").replace(/(oes|es|s)$/, "").slice(0, 6);
function ingredientMentioned(key: string, stepText: string): boolean {
  const words = key.split(" ").filter((w) => w.length > 2 && !FORM_WORDS.has(w));
  if (!words.length) return true;
  const stepStems = new Set(stepText.replace(/\bmayo\b/g, "mayonnaise").split(" ").map(stem));
  return words.some((w) => stepStems.has(stem(w)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function publicFileExists(webPath: string | undefined): boolean {
  if (!webPath) return false;
  const clean = webPath.split("?")[0]!.replace(/^\//, "");
  return fs.existsSync(path.join(PUBLIC, clean));
}

const VAGUE = /\b(until done|until cooked|cook through|until ready|as needed|season to taste)\b/i;
const AWKWARD_DECIMAL = /\b\d+\.\d{2,}\b|\b0\.(?:1|2|3|4|6|7|8|9)\d*\b/;

interface RecipeFinding {
  slug: string;
  title: string;
  collection: string;
  surfaces: string[];
  issues: string[];
  details: Record<string, string[]>;
}

const MEAT = /\b(chicken|beef|pork|turkey|sausage|chorizo|bacon|ham|steak|brisket|lamb|pepperoni|prosciutto|shrimp|salmon|tuna|fish|anchov)/i;
const VEG_CLAIM = /\b(veggie|vegetarian|vegan|meatless|plant[- ]based)\b/i;

async function main(): Promise<void> {
  await initCuratedRecipeStore();

  // ---- Inventory --------------------------------------------------------
  const bySourceCollection = new Map<string, string[]>();
  const collectionOf = new Map<string, string>();
  for (const [name, dir] of COLLECTIONS) {
    const slugs = readIndexSlugs(dir);
    bySourceCollection.set(name, slugs);
    for (const s of slugs) if (!collectionOf.has(s)) collectionOf.set(s, name);
  }
  const allSlugs = new Set(collectionOf.keys());
  const retiredRedirects = [...allSlugs].filter((s) => PHASE5_REMOVED_SLUGS.has(s));
  const publicPageSlugs = new Set([...allSlugs].filter((s) => !PHASE5_REMOVED_SLUGS.has(s)));

  const approvedAll = buildAllApprovedCatalogEntries();
  const approvedSlugs = new Set(approvedAll.map((e) => e.slug.toLowerCase()));
  const { recipes: exploreRecipes, report: imageReport } = filterExploreEligibleCatalogEntries(
    approvedAll,
    undefined,
    buildCrossCatalogHeroAuditContext(approvedAll),
  );
  const exploreSlugs = new Set(exploreRecipes.map((e) => e.slug.toLowerCase()));
  const { slugs: generatorPool, bySource: generatorBySource } = getDefaultGeneratorPoolSlugs();
  const generatorSlugs = new Set([...generatorPool].map((s) => s.toLowerCase()));
  // Shift Planner: dinner slots draw from the generator pool; breakfast slots from
  // Explore-visible breakfasts (shared/shift-plan/breakfast.ts via the approved catalog).
  const shiftBreakfast = new Set(exploreRecipes.filter((e) => e.mealFormat === "breakfast").map((e) => e.slug.toLowerCase()));
  const shiftSlugs = new Set([...generatorSlugs, ...shiftBreakfast]);
  const imageRowBySlug = new Map(imageReport.rows.map((r) => [r.slug.toLowerCase(), r]));
  const approvedBySlug = new Map(approvedAll.map((e) => [e.slug.toLowerCase(), e]));

  const surfacesOf = (slug: string) =>
    [
      publicPageSlugs.has(slug) && "public_page",
      exploreSlugs.has(slug) && "explore",
      generatorSlugs.has(slug) && "generator",
      shiftSlugs.has(slug) && "shift_planner",
    ].filter(Boolean) as string[];

  // ---- Per-recipe record checks -----------------------------------------
  const findings: RecipeFinding[] = [];
  const ingredientSets = new Map<string, Set<string>>();
  const counters: Record<string, number> = {};
  const bump = (k: string) => (counters[k] = (counters[k] ?? 0) + 1);
  const nutritionSources: Record<string, number> = {};
  const heroUsers = new Map<string, string[]>();
  const stepFingerprints = new Map<string, string>();
  const servingsBySlug = new Map<string, number>();

  for (const slug of [...publicPageSlugs].sort()) {
    const collection = collectionOf.get(slug)!;
    const issues: string[] = [];
    const details: Record<string, string[]> = {};
    let title = slug;

    if (collection === "smoothies") {
      const item = SMOOTHIE_CATALOG_ITEMS.find((s) => s.slug.toLowerCase() === slug);
      if (!item) issues.push("record_missing");
      else {
        title = item.title;
        if (item.ingredients.length < 3) issues.push("few_ingredients");
        if (item.instructions.length < 2) issues.push("few_steps");
        if (!publicFileExists(item.heroImage)) issues.push("hero_file_missing");
        ingredientSets.set(slug, new Set(item.ingredients.map((i) => ingredientKey(i.name)).filter((k) => !PANTRY.test(k))));
        nutritionSources["smoothie_highlights_text_only"] = (nutritionSources["smoothie_highlights_text_only"] ?? 0) + 1;
        issues.push("nutrition_not_structured");
      }
    } else {
      const raw = (loadCanonicalCatalogPage(slug) ??
        readBreakfastRecipePageFromDisk(slug) ??
        readPizzaNightRecipePage(slug)) as GoldenRecipePage | null;
      if (!raw) {
        issues.push("record_missing");
      } else {
        const parsed = goldenRecipePageSchema.safeParse(raw);
        if (!parsed.success) {
          issues.push(`schema_invalid:${[...new Set(parsed.error.issues.map((e) => e.path.join(".").replace(/\.\d+\./g, "[].")))].slice(0, 4).join("|")}`);
        }
        const page: GoldenRecipePage = {
          ...raw,
          ingredients: raw.ingredients ?? [],
          steps: raw.steps ?? [],
          equipment: raw.equipment ?? [],
        };
        title = page.title;
        const src = page.nutrition?.source ?? "unspecified";
        nutritionSources[src] = (nutritionSources[src] ?? 0) + 1;

        // Completeness
        if (!page.baseServings) issues.push("no_base_servings");
        if (page.baseServings && page.crewSize !== page.baseServings) issues.push("crew_size_ne_base_servings");
        if (page.prepTime == null) issues.push("no_prep_time");
        if (page.steps.length < 3) issues.push("fewer_than_3_steps");
        if (page.ingredients.length < 5) issues.push("fewer_than_5_ingredients");
        if (!page.equipment.length) issues.push("no_equipment");

        // Nutrition reliability
        const n = page.nutrition;
        if (!n || src === "estimated" || src === "unavailable" || src === "unspecified") issues.push(`nutrition_${src}`);
        if (n && n.calories > 0) {
          const energy = 4 * n.protein + 4 * n.carbs + 9 * n.fats;
          if (Math.abs(energy - n.calories) / n.calories > 0.2) issues.push("nutrition_macro_energy_mismatch");
          const isBreakfast = collection.startsWith("breakfast");
          if (!isBreakfast && (n.calories < 250 || n.calories > 1500)) issues.push("nutrition_calories_outlier");
        }
        if (n && (page.calories !== n.calories || page.protein !== n.protein)) issues.push("nutrition_top_level_mismatch");
        const approved = approvedBySlug.get(slug);
        if (approved && !approved.numericFilterEligible) bump("not_numeric_filter_eligible");

        // Ingredient / instruction consistency (heuristic preview of Phase 2/3)
        const stepText = norm(page.steps.map((s) => `${s.title} ${s.instruction}`).join(" "));
        const unused: string[] = [];
        let missingQty = 0;
        let awkward = 0;
        const seen = new Map<string, number>();
        for (const ing of page.ingredients) {
          const key = ingredientKey(ing.name);
          seen.set(key, (seen.get(key) ?? 0) + 1);
          if (!PANTRY.test(key) && !ingredientMentioned(key, stepText) && !(ing.group && stepText.includes(norm(ing.group)))) unused.push(ing.name);
          if (!ing.quantity && !ing.optional && !/to taste|pinch|for serving|garnish/i.test(`${ing.name} ${ing.notes ?? ""}`)) missingQty++;
          if (ing.quantity && AWKWARD_DECIMAL.test(ing.quantity)) awkward++;
        }
        if (unused.length) {
          issues.push(`ingredients_not_in_steps:${unused.length}`);
          details.ingredients_not_in_steps = unused;
        }
        if (missingQty) issues.push(`ingredients_missing_quantity:${missingQty}`);
        if (awkward) {
          issues.push(`awkward_decimal_quantities:${awkward}`);
          details.awkward_quantities = page.ingredients
            .filter((i) => i.quantity && AWKWARD_DECIMAL.test(i.quantity))
            .map((i) => `${i.quantity} ${i.unit ?? ""} ${i.name}`.replace(/\s+/g, " "));
        }
        const meatLines = page.ingredients.filter((i) => MEAT.test(i.name) && !/\b(broth|stock|bouillon)\b/i.test(i.name) && !/vegetable|veggie|plant/i.test(i.name));
        if (VEG_CLAIM.test(page.title) && meatLines.length) {
          issues.push("veg_title_contains_meat");
          details.veg_title_contains_meat = meatLines.map((i) => i.name);
        }
        stepFingerprints.set(slug, norm(page.steps.slice(0, 3).map((s) => s.instruction).join(" ")));
        servingsBySlug.set(slug, page.baseServings ?? page.crewSize);
        const dupes = [...seen.entries()].filter(([k, c]) => c > 1 && !PANTRY.test(k));
        if (dupes.length) issues.push(`duplicate_ingredient_lines:${dupes.length}`);
        if (page.steps.some((s) => VAGUE.test(s.instruction))) issues.push("vague_doneness_language");
        const meaty = /\b(chicken|turkey|pork|beef|steak|burger|sausage|meatball|ground)\b/.test(norm(`${page.title} ${page.ingredients.map((i) => i.name).join(" ")}`));
        if (meaty && !/\d{3}\s*°?\s*f\b|\d{3}°/i.test(page.steps.map((s) => s.instruction).join(" "))) issues.push("meat_without_internal_temp");
        if (/\boven\b/i.test(stepText) && !/\b\d{3}\s*°?\s*f\b|\d{3}°/i.test(page.steps.map((s) => s.instruction).join(" "))) issues.push("oven_without_temperature");

        // Images
        if (!publicFileExists(page.heroImage)) issues.push("hero_file_missing");
        const heroKey = page.heroImage.split("?")[0]!;
        heroUsers.set(heroKey, [...(heroUsers.get(heroKey) ?? []), slug]);

        ingredientSets.set(slug, new Set(page.ingredients.map((i) => ingredientKey(i.name)).filter((k) => k && !PANTRY.test(k))));
      }
    }

    const imageRow = imageRowBySlug.get(slug);
    if (imageRow && imageRow.status !== "correct") issues.push(`image_${imageRow.status}`);
    if (approvedSlugs.has(slug) && !exploreSlugs.has(slug)) issues.push("approved_but_hidden_from_explore");
    if (!approvedSlugs.has(slug)) issues.push("public_page_not_in_approved_catalog");

    for (const i of issues) bump(i.split(":")[0]!);
    findings.push({ slug, title, collection, surfaces: surfacesOf(slug), issues, details });
  }

  // Templated content: recipes whose first three steps are word-for-word identical.
  const byFingerprint = new Map<string, string[]>();
  for (const [slug, fp] of stepFingerprints) if (fp) byFingerprint.set(fp, [...(byFingerprint.get(fp) ?? []), slug]);
  const templatedClusters = [...byFingerprint.values()].filter((c) => c.length > 1);
  for (const cluster of templatedClusters) {
    for (const s of cluster) {
      const f = findings.find((x) => x.slug === s)!;
      f.issues.push("templated_steps");
      f.details.templated_with = cluster.filter((c) => c !== s).map((c) => `${c} (serves ${servingsBySlug.get(c)})`);
      bump("templated_steps");
    }
  }

  for (const [hero, users] of heroUsers) {
    if (users.length > 1) for (const s of users) findings.find((f) => f.slug === s)?.issues.push(`hero_shared_with:${users.filter((u) => u !== s).join(",")}`);
  }
  counters["hero_shared"] = [...heroUsers.values()].filter((u) => u.length > 1).reduce((a, u) => a + u.length, 0);

  // ---- Duplicates / near-duplicates -------------------------------------
  const exactTitle = new Map<string, string[]>();
  for (const f of findings) {
    const k = norm(f.title);
    exactTitle.set(k, [...(exactTitle.get(k) ?? []), f.slug]);
  }
  const exactDuplicates = [...exactTitle.values()].filter((v) => v.length > 1);
  const nearDuplicates: Array<{ a: string; b: string; titleSim: number; ingredientSim: number }> = [];
  const list = findings.filter((f) => ingredientSets.has(f.slug));
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]!;
      const b = list[j]!;
      const ts = jaccard(titleTokens(a.title), titleTokens(b.title));
      const is = jaccard(ingredientSets.get(a.slug)!, ingredientSets.get(b.slug)!);
      if (is >= 0.7 || (ts >= 0.6 && is >= 0.45)) {
        nearDuplicates.push({ a: a.slug, b: b.slug, titleSim: +ts.toFixed(2), ingredientSim: +is.toFixed(2) });
      }
    }
  }
  nearDuplicates.sort((x, y) => y.ingredientSim - x.ingredientSim);

  // ---- Report -----------------------------------------------------------
  const inventory = {
    on_disk_records_by_collection: Object.fromEntries([...bySourceCollection].map(([k, v]) => [k, v.length])),
    unique_slugs_on_disk: allSlugs.size,
    retired_redirect_slugs: retiredRedirects.length,
    public_recipe_pages: publicPageSlugs.size,
    approved_catalog: approvedSlugs.size,
    explore_visible: exploreSlugs.size,
    generator_default_pool: generatorSlugs.size,
    generator_pool_by_source: Object.fromEntries(Object.entries(generatorBySource).map(([k, v]) => [k, v.length])),
    shift_planner_pool: shiftSlugs.size,
    public_pages_not_in_explore: [...publicPageSlugs].filter((s) => !exploreSlugs.has(s)).length,
    generator_not_in_explore: [...generatorSlugs].filter((s) => !exploreSlugs.has(s)),
  };
  const report = {
    generatedAt: new Date().toISOString(),
    inventory,
    issue_counts: Object.fromEntries(Object.entries(counters).sort((a, b) => b[1] - a[1])),
    nutrition_sources: nutritionSources,
    exact_title_duplicates: exactDuplicates,
    templated_step_clusters: templatedClusters,
    near_duplicates: nearDuplicates,
    recipes_with_no_flags: findings.filter((f) => f.issues.length === 0).length,
    recipes: findings,
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "baseline.json"), JSON.stringify(report, null, 2));

  console.log(JSON.stringify({ ...report, recipes: undefined, near_duplicates: nearDuplicates.slice(0, 40), near_duplicate_total: nearDuplicates.length }, null, 2));
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
