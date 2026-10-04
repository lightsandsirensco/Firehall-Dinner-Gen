#!/usr/bin/env tsx
/**
 * Content-integrity audit for every recipe "Pick Tonight's Meal" can return.
 *
 * Canonical record = the catalog page JSON (client/public/catalog/<collection>/pages/<slug>.json),
 * which is what the recipe detail page and Explore read. Every Tonight-eligible slug is checked
 * for identity, images, taxonomy, required fields and agreement with what /api/generate serves.
 *
 *   npx tsx scripts/audit-tonight-content-integrity.ts            # writes review/tonight-content-integrity-audit.{json,md}
 *   npx tsx scripts/audit-tonight-content-integrity.ts --check    # exits 1 on any blocking issue
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getDefaultGeneratorPoolSlugs } from "../server/generation/pick-local-recipes.js";
import { hydrateCatalogGenerateResponse } from "../server/meal-catalog/hydrate-golden-generate.js";
import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";
import { buildCrossCatalogHeroAuditContext } from "../server/cross-catalog-hero-index.js";
import { filterExploreEligibleCatalogEntries } from "../shared/explore-image-mapping.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { PERFORMANCE_ADAPTED_RECIPES } from "../shared/performance-meals/adapted/index.js";
import { HALL_EXPANSION_ADAPTED_RECIPES } from "../shared/hall-expansion/adapted/index.js";
import { BBQ_CATALOG_RECIPES } from "../shared/bbq-expansion/batch-25-bbq-recipes.js";
import { isApprovedCatalogSlug, resolveCatalogHeroPath } from "../shared/hall-catalog/gate.js";
import { canonicalExploreProtein, EXPLORE_CATEGORY_LABELS } from "../shared/explore-taxonomy.js";
import {
  CANONICAL_PAGE_DIRS,
  generatorProteinFamily,
  loadCanonicalCatalogPage,
  type CanonicalCatalogPage,
} from "../server/meal-catalog/canonical-page.js";
import { tonightFilterProtein, tonightIneligibleReason } from "../server/generation/tonight-eligibility.js";

const CHECK = process.argv.includes("--check");
const PUBLIC_ROOT = path.resolve("client/public");

type IssueCode =
  | "A_duplicate_id"
  | "B_duplicate_slug"
  | "C_missing_image"
  | "D_shared_image"
  | "E_title_image_mismatch"
  | "F_title_ingredient_mismatch"
  | "G_ingredient_instruction_mismatch"
  | "H_internal_tag_visible"
  | "I_invalid_taxonomy"
  | "J_points_to_other_recipe_image"
  | "K_missing_required_field"
  | "L_suspicious_fallback_image"
  | "M_tonight_content_drift"
  | "N_hidden_from_explore";

/** Issues that must never ship to Tonight. */
const BLOCKING: IssueCode[] = [
  "A_duplicate_id",
  "B_duplicate_slug",
  "C_missing_image",
  "F_title_ingredient_mismatch",
  "I_invalid_taxonomy",
  "J_points_to_other_recipe_image",
  "K_missing_required_field",
  "L_suspicious_fallback_image",
  "M_tonight_content_drift",
];

interface Issue {
  code: IssueCode;
  detail: string;
}

interface Row {
  slug: string;
  title: string;
  collection: string;
  pool: "default" | "breakfast_format_only";
  heroImage: string;
  mobileImage: string;
  thumbImage: string;
  tonightHero: string;
  exploreHero: string | null;
  exploreEligible: boolean;
  /** null = Tonight can serve it; otherwise why the generator skips it. */
  tonightExcludedReason: string | null;
  issues: Issue[];
  proposedFix: string[];
  needsNewImage: boolean;
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function md5(publicPath: string): string | null {
  const abs = path.join(PUBLIC_ROOT, publicPath.split("?")[0]!.replace(/^\//, ""));
  if (!fs.existsSync(abs) || fs.statSync(abs).size === 0) return null;
  return crypto.createHash("md5").update(fs.readFileSync(abs)).digest("hex");
}

function fileSlug(p: string): string {
  return (p.split("?")[0]!.split("/").pop() || "").replace(/\.(jpe?g|png|webp)$/i, "").toLowerCase();
}

/** Title words that promise a specific ingredient, mapped to what must appear in the ingredient list. */
const BEEF_INGREDIENT = /\b(beef|steak|brisket|chuck|sirloin|ribeye|rib[- ]eye|flank|round|strip|skirt|picanha|tri[- ]tip|short ribs?|tenderloin|hanger|roast)\b/i;
const PORK_INGREDIENT = /\b(pork|bacon|ham|shoulder|butt|ribs?|loin|sausage|kielbasa|chorizo|andouille|prosciutto|pepperoni|salami|pancetta|hot dogs?|franks?)\b/i;
const TITLE_CLAIMS: Array<[RegExp, RegExp]> = [
  [/\bchicken\b/i, /\bchickens?\b/i],
  [/\b(steak|beef|brisket|bulgogi|ribeye|sirloin|flank|pot roast|meatloaf)\b/i, BEEF_INGREDIENT],
  [/\b(pork|carnitas|pulled pork|bacon|blt|ham)\b/i, PORK_INGREDIENT],
  [/\bturkey\b/i, /\bturkey\b/i],
  [/\bsalmon\b/i, /\bsalmon\b/i],
  [/\bshrimp\b/i, /\bshrimp|prawns?\b/i],
  [/\b(cod|tilapia|halibut|haddock)\b/i, /\b(cod|tilapia|halibut|haddock|white fish|whitefish)\b/i],
  [/\b(sausage|kielbasa|chorizo|andouille|bratwurst|brats)\b/i, /\b(sausage|kielbasa|chorizo|andouille|brat|bratwurst|linguica)\b/i],
  [/(?<!zucchini )\b(pasta|spaghetti|penne|rigatoni|ziti|linguine|fettuccine|mac|macaroni|lasagna|mostaccioli|noodles?)\b/i, /\b(pasta|spaghetti|penne|rigatoni|ziti|linguine|fettuccine|macaroni|elbow|lasagna|mostaccioli|noodles?|orzo|shells|cavatappi|rotini|egg noodles)\b/i],
  [/\brice\b/i, /\brice\b/i],
  [/\b(tacos?|burritos?|fajitas?|quesadillas?|enchiladas?)\b(?!\s+(bowls?|skillet|salad|soup|casserole|bake|dip|rice|pasta))/i, /\b(tortillas?|taco shells?|wraps?)\b/i],
  [/\b(potato|potatoes|fries|hash)\b/i, /\b(potato|potatoes|fries|tots|hash browns?|yukon|russet|sweet potato)\b/i],
  [/\b(lentils?)\b/i, /\blentils?\b/i],
  [/\b(chickpeas?)\b/i, /\bchickpeas?|garbanzo\b/i],
];

/** [word searched in steps (global), ingredient-list pattern that satisfies it] */
const PROTEIN_WORDS: Array<[string, RegExp, RegExp]> = [
  ["chicken", /\bchicken\b/gi, /\bchickens?\b/i],
  ["beef", /\bbeef\b/gi, BEEF_INGREDIENT],
  ["pork", /\bpork\b/gi, PORK_INGREDIENT],
  ["turkey", /\bturkey\b/gi, /\bturkey\b/i],
  ["salmon", /\bsalmon\b/gi, /\bsalmon\b/i],
  ["shrimp", /\bshrimp\b/gi, /\bshrimp|prawns?\b/i],
];

/** Distinctive foods a step can call for; pantry basics (salt, pepper, oil, water) are excluded. */
const STEP_FOODS: Array<[string, RegExp]> = [
  ["garlic", /\bgarlic\b/i], ["soy sauce", /\bsoy\b/i], ["green onion", /\b(green onions?|scallions?)\b/i],
  ["peanuts", /\bpeanuts?\b/i], ["parsley", /\bparsley\b/i], ["cilantro", /\bcilantro\b/i], ["basil", /\bbasil\b/i],
  ["lemon", /\blemons?\b/i], ["lime", /\blimes?\b/i], ["coconut milk", /\bcoconut milk\b/i], ["lemongrass", /\blemongrass\b/i],
  ["fish sauce", /\bfish sauce\b/i], ["brown sugar", /\bbrown sugar\b/i], ["honey", /\bhoney\b/i], ["mayo", /\bmayo(nnaise)?\b/i],
  ["sriracha", /\bsriracha\b/i], ["ginger", /\bginger\b/i], ["cucumber", /\bcucumbers?\b/i], ["tomato", /\btomato(es)?\b/i],
  ["mozzarella", /\bmozzarella\b/i], ["parmesan", /\bparmesan\b/i], ["cheddar", /\bcheddar\b/i], ["feta", /\bfeta\b/i],
  ["yogurt", /\byogurt\b/i], ["sour cream", /\bsour cream\b/i], ["butter", /\bbutter\b/i], ["cream cheese", /\bcream cheese\b/i],
  ["mustard", /\bmustard\b/i], ["ketchup", /\bketchup\b/i], ["vinegar", /\bvinegar\b/i], ["bbq sauce", /\b(bbq|barbecue) sauce\b/i],
  ["onion", /\bonions?\b/i], ["bell pepper", /\bbell peppers?\b/i], ["jalapeno", /\bjalape[nñ]os?\b/i], ["mushroom", /\bmushrooms?\b/i],
  ["corn", /\bcorn\b/i], ["beans", /\bbeans\b/i], ["rice", /\brice\b/i], ["potato", /\bpotato(es)?\b/i], ["bread", /\b(bread|buns?|rolls?|hoagies?)\b/i],
  ["tortilla", /\btortillas?\b/i], ["pasta", /\bpasta\b/i], ["egg", /\beggs?\b/i], ["bacon", /\bbacon\b/i], ["avocado", /\bavocados?\b/i],
  ["pesto", /\bpesto\b/i], ["balsamic", /\bbalsamic\b/i], ["chipotle", /\bchipotle\b/i], ["paprika", /\bpaprika\b/i], ["cumin", /\bcumin\b/i],
  ["oregano", /\boregano\b/i], ["thyme", /\bthyme\b/i], ["rosemary", /\brosemary\b/i], ["dill", /\bdill\b/i], ["mint", /\bmint\b/i],
];

const INTERNAL_VALUE = /(_|^(hall|random|any|none|null|undefined|seed|batch|v\d+|todo|tbd|internal|draft|fallback|stub)$)/i;
const INTERNAL_COPY = /\b(golden[ _]100|performance[ _]50|hall[ _]expansion|lorem ipsum|todo|tbd|placeholder)\b|\{\{|\bundefined\b/i;
const FALLBACK_IMAGE_PATH = /\/(fallback|fallbacks|placeholder|placeholders|generic|editorial-fallback|stock)\//i;
/** Every manifest protein value the generator's protein filter understands (see PROTEIN_FILTER_SYNONYMS). */
const VALID_GENERATOR_PROTEINS = new Set([
  "chicken", "beef", "turkey",
  "pork", "bacon", "sausage", "ham",
  "seafood", "fish", "salmon", "shrimp", "tuna", "cod", "shellfish", "crab", "lobster",
  "vegetarian", "plant", "vegan",
  "mixed", "lamb",
]);

function visionFailures(): Map<string, string[]> {
  const file = "review/hero-image-validation.json";
  const out = new Map<string, string[]>();
  if (!fs.existsSync(file)) return out;
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
    rows: Array<{ slug: string; hardFailures?: string[] }>;
  };
  for (const row of data.rows) {
    const v = (row.hardFailures || []).filter((f) => f.startsWith("vision:"));
    if (v.length) out.set(row.slug, v);
  }
  return out;
}

interface Universe {
  slug: string;
  collection: string;
  manifestTitle: string;
  manifestProtein: string;
}

function tonightUniverse(): Universe[] {
  const rows: Universe[] = [
    ...GOLDEN_100_RECIPES.map((r) => ({ slug: r.slug, collection: "golden_100", manifestTitle: r.title, manifestProtein: r.protein })),
    ...PERFORMANCE_ADAPTED_RECIPES.map((r) => ({ slug: r.manifest.slug, collection: "performance_50", manifestTitle: r.manifest.title, manifestProtein: r.manifest.protein })),
    ...HALL_EXPANSION_ADAPTED_RECIPES.map((r) => ({ slug: r.slug, collection: "hall_expansion", manifestTitle: r.title, manifestProtein: r.protein })),
    ...BBQ_CATALOG_RECIPES.map((r) => ({ slug: r.manifest.slug, collection: "bbq_catalog", manifestTitle: r.manifest.title, manifestProtein: r.manifest.protein })),
  ];
  return rows.filter((r) => isApprovedCatalogSlug(r.slug));
}

async function main(): Promise<void> {
  await initCuratedRecipeStore();

  const universe = tonightUniverse();
  const defaultPool = getDefaultGeneratorPoolSlugs().slugs;
  const vision = visionFailures();

  const exploreEntries = buildAllApprovedCatalogEntries();
  const exploreBySlug = new Map(exploreEntries.map((e) => [e.slug, e]));
  const crossCatalog = buildCrossCatalogHeroAuditContext(exploreEntries);
  const { report: exploreReport } = filterExploreEligibleCatalogEntries(exploreEntries, undefined, crossCatalog);
  const exploreRowBySlug = new Map(exploreReport.rows.map((r) => [r.slug, r]));

  // Slug occurrences across manifests and page directories (B).
  const slugManifestCount = new Map<string, string[]>();
  for (const u of universe) slugManifestCount.set(u.slug, [...(slugManifestCount.get(u.slug) || []), u.collection]);
  const slugPageDirs = new Map<string, string[]>();
  for (const dir of CANONICAL_PAGE_DIRS) {
    const pagesDir = path.join(PUBLIC_ROOT, "catalog", dir, "pages");
    if (!fs.existsSync(pagesDir)) continue;
    for (const f of fs.readdirSync(pagesDir)) {
      if (!f.endsWith(".json")) continue;
      const s = f.replace(/\.json$/, "");
      slugPageDirs.set(s, [...(slugPageDirs.get(s) || []), dir]);
    }
  }

  const uniqueSlugs = [...new Set(universe.map((u) => u.slug))];
  const pages = new Map<string, CanonicalCatalogPage | null>();
  for (const s of uniqueSlugs) pages.set(s, loadCanonicalCatalogPage(s));

  // Shared hero bytes (D).
  const heroHashToSlugs = new Map<string, string[]>();
  for (const s of uniqueSlugs) {
    const hero = pages.get(s)?.heroImage;
    const h = hero ? md5(hero) : null;
    if (h) heroHashToSlugs.set(h, [...(heroHashToSlugs.get(h) || []), s]);
  }

  // Hydrate once per slug for A / M.
  const hydrated = new Map<string, ReturnType<typeof hydrateCatalogGenerateResponse>>();
  const idToSlugs = new Map<string, string[]>();
  for (const s of uniqueSlugs) {
    const h = hydrateCatalogGenerateResponse(s, pages.get(s)?.crewSize || 6);
    hydrated.set(s, h);
    if (h?.catalogId) idToSlugs.set(h.catalogId, [...(idToSlugs.get(h.catalogId) || []), s]);
  }

  const rows: Row[] = [];
  const seen = new Set<string>();
  for (const u of universe) {
    if (seen.has(u.slug)) continue;
    seen.add(u.slug);
    const page = pages.get(u.slug) || null;
    const issues: Issue[] = [];
    const fixes: string[] = [];
    const add = (code: IssueCode, detail: string, fix?: string) => {
      issues.push({ code, detail });
      if (fix && !fixes.includes(fix)) fixes.push(fix);
    };

    const tonightHero = resolveCatalogHeroPath(u.slug);
    const explore = exploreBySlug.get(u.slug);
    const exploreRow = exploreRowBySlug.get(u.slug);
    const h = hydrated.get(u.slug);

    // A
    if (h?.catalogId && (idToSlugs.get(h.catalogId) || []).length > 1) {
      add("A_duplicate_id", `catalogId ${h.catalogId} shared with ${idToSlugs.get(h.catalogId)!.filter((x) => x !== u.slug).join(", ")}`, "give each slug its own curated recipe id");
    }
    // B
    const inManifests = slugManifestCount.get(u.slug) || [];
    if (inManifests.length > 1) add("B_duplicate_slug", `slug in manifests: ${inManifests.join(", ")}`, "keep one manifest owner for the slug");
    const inDirs = slugPageDirs.get(u.slug) || [];
    if (inDirs.length > 1) add("B_duplicate_slug", `page JSON in: ${inDirs.join(", ")}`, "remove the stale duplicate page JSON");

    if (!page) {
      add("K_missing_required_field", "no canonical page JSON", "build the catalog page for this slug or remove it from Tonight");
    } else {
      // K
      const missing: string[] = [];
      if (!page.title?.trim()) missing.push("title");
      if (!(page.description || page.shortDescription)?.trim()) missing.push("description");
      if (!page.heroImage?.trim()) missing.push("heroImage");
      if (!page.ingredients?.length) missing.push("ingredients");
      if (!page.steps?.length) missing.push("steps");
      if (!(Number(page.cookTime) > 0)) missing.push("cookTime");
      if (!(Number(page.prepTime) >= 0)) missing.push("prepTime");
      if (!(Number(page.crewSize || page.baseServings) > 0)) missing.push("servings");
      if (!page.category?.trim()) missing.push("category");
      if (missing.length) add("K_missing_required_field", missing.join(", "), "fill the missing canonical fields");

      // C / J / L
      const images: Array<[string, string | undefined]> = [
        ["hero", page.heroImage],
        ["mobile", page.mobileImage],
        ["thumb", page.thumbImage],
      ];
      for (const [kind, p] of images) {
        if (!p?.trim()) {
          if (kind !== "hero") add("C_missing_image", `${kind} image not set`, "set slug-locked mobile/thumb paths");
          continue;
        }
        if (!md5(p)) add("C_missing_image", `${kind} ${p} missing on disk`, "restore the file or flag as needing a new image");
        if (fileSlug(p) !== u.slug && !fileSlug(p).startsWith(`${u.slug}-`)) {
          add("J_points_to_other_recipe_image", `${kind} ${p} belongs to "${fileSlug(p)}"`, "point the image at this recipe's own slug file");
        }
        if (FALLBACK_IMAGE_PATH.test(p)) add("L_suspicious_fallback_image", `${kind} ${p}`, "replace generic fallback with the recipe's own image");
      }
      if (page.heroImage && tonightHero !== page.heroImage) {
        add("L_suspicious_fallback_image", `Tonight hero ${tonightHero} != canonical ${page.heroImage}`, "resolve Tonight hero from the canonical page");
      }
      if (explore && page.heroImage && explore.heroImage !== page.heroImage) {
        add("L_suspicious_fallback_image", `Explore hero ${explore.heroImage} != canonical ${page.heroImage}`, "resolve Explore hero from the canonical page");
      }

      // D
      const peers = (heroHashToSlugs.get(md5(page.heroImage || "") || "") || []).filter((s) => s !== u.slug);
      if (peers.length) add("D_shared_image", `identical hero bytes with ${peers.join(", ")}`, "needs its own image");

      // E
      const v = vision.get(u.slug);
      if (v) add("E_title_image_mismatch", v.join("; "), "flag for new photography (vision: image does not match recipe)");
      if (exploreRow && !exploreRow.exploreEligible) {
        add("E_title_image_mismatch", `Explore image mapping: ${exploreRow.status} ${exploreRow.issues.map((i) => i.message).join("; ")}`, "fix image identity before serving");
      }

      // F / G
      const ingText = (page.ingredients || []).map((i) => `${i.name} ${i.notes || ""}`).join(" | ");
      const stepText = (page.steps || []).map((s) => `${s.title || ""} ${s.instruction || ""}`).join(" | ");
      for (const [claim, need] of TITLE_CLAIMS) {
        const m = page.title.match(claim);
        if (m && !need.test(ingText)) {
          add("F_title_ingredient_mismatch", `title says "${m[0]}" but no matching ingredient`, "correct the title or the ingredient list");
        }
      }
      for (const [word, stepRe, ingRe] of PROTEIN_WORDS) {
        const mentions = stepText.match(stepRe)?.length ?? 0;
        if (mentions >= 2 && !ingRe.test(ingText) && !new RegExp(stepRe.source, "i").test(page.title)) {
          add("G_ingredient_instruction_mismatch", `steps mention ${word} ${mentions}x but it is not an ingredient`, "rewrite steps to match ingredients");
        }
      }
      const ingNames = (page.ingredients || []).map((i) => norm(i.name).split(" ").filter((w) => w.length > 3));
      const lowerSteps = stepText.toLowerCase();
      const unused = ingNames.filter((words) => words.length && !words.some((w) => lowerSteps.includes(w.replace(/s$/, ""))));
      if (ingNames.length >= 5 && unused.length / ingNames.length >= 0.4) {
        add("G_ingredient_instruction_mismatch", `${unused.length}/${ingNames.length} ingredients never referenced in steps`, "rewrite steps to use the listed ingredients");
      }
      const notListed = STEP_FOODS.filter(([, re]) => re.test(stepText) && !re.test(ingText)).map(([n]) => n);
      if (notListed.length >= 3) {
        add("G_ingredient_instruction_mismatch", `steps call for ${notListed.join(", ")} — not in ingredients`, "align ingredient list with steps");
      }

      // H
      if (page.cuisine && INTERNAL_VALUE.test(page.cuisine.trim())) {
        add("H_internal_tag_visible", `cuisine "${page.cuisine}"`, "use a customer-facing cuisine");
      }
      const copyFields: Array<[string, string | undefined]> = [
        ["title", page.title],
        ["subtitle", page.subtitle],
        ["description", page.description],
        ["shortDescription", page.shortDescription],
      ];
      for (const [field, value] of copyFields) {
        const m = value?.match(INTERNAL_COPY);
        if (m) add("H_internal_tag_visible", `${field} contains "${m[0]}"`, "remove internal wording from customer copy");
      }

      // I
      if (page.category && !EXPLORE_CATEGORY_LABELS[page.category]) {
        add("I_invalid_taxonomy", `category "${page.category}" not in Explore taxonomy`, "map to a valid category");
      }
      const rawProtein = String(u.manifestProtein || "").toLowerCase();
      const exploreLabel = canonicalExploreProtein(rawProtein, u.slug);
      const servedProtein = tonightFilterProtein(rawProtein, u.slug);
      if (!VALID_GENERATOR_PROTEINS.has(servedProtein)) {
        add("I_invalid_taxonomy", `Tonight protein "${servedProtein}" (manifest "${u.manifestProtein}") is not a generator protein`, "map to one canonical protein");
      }
      const exploreFamily = generatorProteinFamily(exploreLabel);
      if (exploreFamily && exploreFamily !== servedProtein) {
        add("I_invalid_taxonomy", `Tonight filters as "${servedProtein}" but Explore shows "${exploreLabel}"`, "use the canonical (Explore) protein for Tonight filtering and chips");
      }

      // M — what /api/generate builds for this slug vs the canonical page
      if (!h) {
        add("M_tonight_content_drift", "slug does not hydrate for Tonight", "hydrate from canonical page");
      } else {
        const r = h.recipe;
        if (h.title !== page.title) add("M_tonight_content_drift", `hydrated title "${h.title}" != "${page.title}"`, "hydrate Tonight from the canonical page");
        const pageSet = new Set((page.ingredients || []).map((i) => norm(i.name)));
        const hydSet = (r.ingredients || []).map((i) => norm(String(i.item)));
        const overlap = hydSet.filter((n) => pageSet.has(n)).length;
        const denom = Math.max(pageSet.size, hydSet.length, 1);
        if (overlap / denom < 0.9) {
          add("M_tonight_content_drift", `ingredients overlap ${overlap}/${denom} with canonical page`, "hydrate Tonight from the canonical page");
        }
        if ((r.steps || []).length !== (page.steps || []).length) {
          add("M_tonight_content_drift", `steps ${(r.steps || []).length} vs canonical ${(page.steps || []).length}`, "hydrate Tonight from the canonical page");
        }
        const pageTotal = Number(page.prepTime || 0) + Number(page.cookTime || 0);
        if (r.timing?.total_minutes && pageTotal && r.timing.total_minutes !== pageTotal) {
          add("M_tonight_content_drift", `total ${r.timing.total_minutes}m vs canonical ${pageTotal}m`, "hydrate Tonight from the canonical page");
        }
      }
    }

    // N
    const tonightExcludedReason = tonightIneligibleReason(u.slug);
    if (!exploreRow?.exploreEligible) {
      add("N_hidden_from_explore", explore ? "Explore excludes this recipe (image identity check)" : "not in Explore catalog", "apply Explore's eligibility gate to Tonight");
      if (!tonightExcludedReason) {
        add("K_missing_required_field", "hidden from Explore but still served by Tonight", "apply Explore's eligibility gate to Tonight");
      }
    }

    const needsNewImage = issues.some(
      (i) => i.code === "E_title_image_mismatch" || i.code === "D_shared_image" || i.code === "C_missing_image" || i.code === "J_points_to_other_recipe_image",
    );

    rows.push({
      slug: u.slug,
      title: page?.title || u.manifestTitle,
      collection: u.collection,
      pool: defaultPool.has(u.slug) ? "default" : "breakfast_format_only",
      heroImage: page?.heroImage || "",
      mobileImage: page?.mobileImage || "",
      thumbImage: page?.thumbImage || "",
      tonightHero,
      exploreHero: explore?.heroImage ?? null,
      exploreEligible: Boolean(exploreRow?.exploreEligible),
      tonightExcludedReason,
      issues,
      proposedFix: fixes,
      needsNewImage,
    });
  }

  const issueCounts: Record<string, number> = {};
  for (const r of rows) for (const code of new Set(r.issues.map((i) => i.code))) issueCounts[code] = (issueCounts[code] || 0) + 1;
  const flagged = rows.filter((r) => r.issues.length > 0);
  const served = rows.filter((r) => !r.tonightExcludedReason);
  const blocking = served.filter((r) => r.issues.some((i) => BLOCKING.includes(i.code)));

  const summary = {
    generatedAt: new Date().toISOString(),
    tonightEligible: rows.length,
    defaultPool: rows.filter((r) => r.pool === "default").length,
    servedByTonight: served.length,
    excludedFromTonight: rows.length - served.length,
    withIssues: flagged.length,
    servedWithIssues: served.filter((r) => r.issues.length > 0).length,
    withBlockingIssues: blocking.length,
    needsNewImage: rows.filter((r) => r.needsNewImage).length,
    issueCounts,
  };

  if (!CHECK) {
    fs.mkdirSync("review", { recursive: true });
    fs.writeFileSync("review/tonight-content-integrity-audit.json", JSON.stringify({ summary, rows }, null, 2));
  }

  const md: string[] = [
    "# Tonight content-integrity audit",
    "",
    `Generated: ${summary.generatedAt}`,
    "",
    `- Tonight-eligible recipes: **${summary.tonightEligible}** (default dinner pool ${summary.defaultPool})`,
    `- Served by Tonight after eligibility gate: **${summary.servedByTonight}**; excluded: **${summary.excludedFromTonight}**`,
    `- Recipes with any issue: **${summary.withIssues}** (served: ${summary.servedWithIssues}); blocking among served: **${summary.withBlockingIssues}**`,
    `- Recipes needing a new image: **${summary.needsNewImage}**`,
    "",
    "| Issue | Recipes |",
    "| --- | --- |",
    ...Object.entries(issueCounts).sort().map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "## Flagged recipes",
    "",
    "| Slug | Title | Tonight | Hero | Issues | Proposed fix |",
    "| --- | --- | --- | --- | --- | --- |",
    ...flagged.map(
      (r) =>
        `| \`${r.slug}\` | ${r.title} | ${r.tonightExcludedReason ? `excluded (${r.tonightExcludedReason.split(":")[0]})` : "served"} | \`${r.heroImage}\` | ${r.issues.map((i) => `${i.code}: ${i.detail}`.replace(/\|/g, "/")).join("<br>")} | ${r.proposedFix.join("; ")} |`,
    ),
    "",
    "## Recipes needing a new image",
    "",
    ...rows.filter((r) => r.needsNewImage).map((r) => `- \`${r.slug}\` — ${r.title} (\`${r.heroImage}\`)`),
    "",
  ];
  if (!CHECK) fs.writeFileSync("review/tonight-content-integrity-audit.md", md.join("\n"));

  console.log(JSON.stringify(summary, null, 2));
  if (CHECK && blocking.length > 0) {
    for (const r of blocking.slice(0, 40)) {
      console.error(`  ${r.slug}: ${r.issues.filter((i) => BLOCKING.includes(i.code)).map((i) => `${i.code} ${i.detail}`).join("; ")}`);
    }
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
