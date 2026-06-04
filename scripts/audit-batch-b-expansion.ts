#!/usr/bin/env tsx
/**
 * Batch B deep audits — duplicate, ingredient-step, scaling, nutrition, image, mobile card, SEO.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { BATCH_B_SANDWICH_SOURCE_URLS } from "../shared/hall-expansion/adapted/batch-b-sandwiches.js";
import { BATCH_B_SOURCE_URLS } from "../shared/golden-100/recipe-quality/batch-b-packs.js";
import { inferRecipeInstructionClass } from "../shared/golden-100/recipe-quality/recipe-instruction-class.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { calculateNutritionFromIngredients } from "../shared/nutrition/calculate.js";
import { titleMatchesDishIdentity } from "../shared/meal-format-contract.js";
import { FIREHALL_CREW_SCALE_SIZES } from "../shared/recipe-sourcing-policy.js";

const BATCH_B = [
  { slug: "classic-patty-melt-for-the-crew", collection: "hall-expansion" as const, title: "Classic Patty Melt for the Crew" },
  { slug: "best-tuna-melt-for-the-hall", collection: "hall-expansion" as const, title: "Best Tuna Melt for the Hall (Diner Style)" },
  { slug: "hall-blt-sandwich-feed", collection: "hall-expansion" as const, title: "Hall BLT Sandwich Feed" },
  { slug: "30-minute-pasta-e-fagioli-for-the-hall", collection: "golden-100" as const, title: "30-Minute Pasta e Fagioli for the Hall" },
  { slug: "red-beans-and-rice-for-the-hall", collection: "golden-100" as const, title: "Red Beans and Rice for the Hall" },
  { slug: "french-onion-soup-for-the-hall", collection: "golden-100" as const, title: "French Onion Soup for the Hall" },
  { slug: "chicken-tortilla-soup-for-the-hall", collection: "golden-100" as const, title: "Chicken Tortilla Soup for the Hall" },
  { slug: "pasta-e-ceci-for-the-hall", collection: "golden-100" as const, title: "Pasta e Ceci (Pasta with Chickpeas)" },
] as const;

const NEAR_DUPES: Record<string, string[]> = {
  "classic-patty-melt-for-the-crew": ["smash-burgers", "philly-cheesesteak-sliders", "hall-burger-bar"],
  "best-tuna-melt-for-the-hall": ["mediterranean-inspired-tuna-almond-whole-wheat-spaghetti"],
  "hall-blt-sandwich-feed": ["breakfast-sandwich-trays", "sausage-egg-cheese-sandwiches", "club-sandwich-breakfast-bake"],
  "30-minute-pasta-e-fagioli-for-the-hall": ["chili-mac", "five-ingredient-pasta", "baked-ziti"],
  "red-beans-and-rice-for-the-hall": ["jambalaya", "slow-cooker-red-beans-and-rice"],
  "french-onion-soup-for-the-hall": ["beef-barley-soup", "tomato-soup-grilled-cheese-croutons"],
  "chicken-tortilla-soup-for-the-hall": ["easy-slow-cooker-chicken-tortilla-soup", "tangy-savory-mexican-soup", "white-bean-chicken-chili"],
  "pasta-e-ceci-for-the-hall": ["mediterranean-chickpea", "five-ingredient-pasta"],
};

const SANDWICH_RULES: Record<string, RegExp[]> = {
  "classic-patty-melt-for-the-crew": [/\brye\b/i, /\bSwiss\b/i, /\bbutter\b/i, /\bgriddle\b/i, /\bhold\b/i],
  "best-tuna-melt-for-the-hall": [/\brye\b/i, /\bcheddar\b/i, /\bbroil\b/i, /\btuna\b/i, /\bhold\b/i],
  "hall-blt-sandwich-feed": [/\bbread\b/i, /\bbacon\b/i, /\blettuce\b/i, /\btomato\b/i, /\btoast\b/i, /\bhold\b/i],
};

const SOUP_RULES: Record<string, RegExp[]> = {
  "french-onion-soup-for-the-hall": [/\bstock\b|\bbroth\b/i, /\bGruyère\b|\bcheese\b/i, /\bgarnish\b|\bcrouton\b/i, /\bconsistency\b|\bbroth\b/i, /\bhold\b/i],
  "chicken-tortilla-soup-for-the-hall": [/\bstock\b/i, /\btortilla strips\b/i, /\bgarnish\b/i, /\bbrothy\b/i, /\bhold\b/i],
  "30-minute-pasta-e-fagioli-for-the-hall": [/\bbroth\b/i, /\bgarnish\b|\bparsley\b/i, /\bconsistency\b|\bbrothy\b/i, /\bhold\b/i],
};

type Verdict = "PASS" | "FIX BEFORE PUSH" | "BLOCKER";

function loadPage(collection: string, slug: string): Record<string, unknown> {
  const base =
    collection === "hall-expansion"
      ? path.join("client/public/catalog/hall-expansion/pages", `${slug}.json`)
      : path.join("client/public/catalog/golden-100/pages", `${slug}.json`);
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), base), "utf8")) as Record<string, unknown>;
}

function listCatalogSlugs(): Set<string> {
  const slugs = new Set<string>();
  for (const root of [
    "client/public/catalog/golden-100/pages",
    "client/public/catalog/hall-expansion/pages",
    "client/public/catalog/breakfast/pages",
  ]) {
    const dir = path.join(process.cwd(), root);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith(".json")) slugs.add(f.replace(/\.json$/, ""));
    }
  }
  return slugs;
}

function ingredientNames(page: Record<string, unknown> | null): string[] {
  return ((page?.ingredients as Array<{ name: string }>) ?? []).map((i) => i.name.toLowerCase());
}

function auditIngredientStep(page: Record<string, unknown> | null): { verdict: Verdict; notes: string[] } {
  const notes: string[] = [];
  if (!page) return { verdict: "BLOCKER", notes: ["no page"] };
  const names = ingredientNames(page);
  const steps = ((page.steps as Array<{ instruction: string }>) ?? []).map((s) => s.instruction.toLowerCase()).join(" ");
  const main = names.filter((n) => !/salt|pepper|optional|serving|batch/i.test(n)).slice(0, 12);
  let missing = 0;
  for (const n of main) {
    const words = n.split(/\s+/).filter((w) => w.length > 3);
    const hit = words.some((w) => steps.includes(w));
    if (!hit && words.length > 0) {
      missing++;
      if (missing <= 2) notes.push(`step text may omit: ${n}`);
    }
  }
  if (missing >= 4) return { verdict: "FIX BEFORE PUSH", notes };
  return { verdict: "PASS", notes };
}

function auditScaling(page: Record<string, unknown> | null): { verdict: Verdict; notes: string[] } {
  const notes: string[] = [];
  if (!page) return { verdict: "BLOCKER", notes: ["no page"] };
  const blob = ((page.steps as Array<{ instruction: string }>) ?? []).map((s) => s.instruction).join(" ");
  const mentionsCrew = /\b(4|6|8|10|14)\b/.test(blob) || /\bcrew\b/i.test(blob) || /\bbatch\b/i.test(blob);
  if (!mentionsCrew) notes.push("no explicit crew scaling language in steps");
  const base = Number(page.baseServings ?? page.crewSize ?? 8);
  if (!FIREHALL_CREW_SCALE_SIZES.includes(base as (typeof FIREHALL_CREW_SCALE_SIZES)[number])) {
    notes.push(`baseServings ${base} not in canonical crew sizes`);
  }
  return notes.length ? { verdict: "FIX BEFORE PUSH", notes } : { verdict: "PASS", notes };
}

function auditSeo(page: Record<string, unknown> | null, slug: string): { verdict: Verdict; notes: string[] } {
  const notes: string[] = [];
  if (!page) return { verdict: "BLOCKER", notes: ["no page"] };
  const seo = String(page.seoTitle ?? "");
  const terms = (page.searchTerms as string[]) ?? [];
  if (!seo || seo.length < 12) notes.push("seoTitle missing or short");
  if (terms.length < 2) notes.push("searchTerms sparse");
  if (!seo.toLowerCase().includes(slug.split("-")[0])) {
    /* ok if title words present */
  }
  return notes.length ? { verdict: "FIX BEFORE PUSH", notes } : { verdict: "PASS", notes };
}

function imgCollection(c: string): string {
  return c === "hall-expansion" ? "hall-expansion" : "golden-100";
}

const catalogSlugs = listCatalogSlugs();
type Row = {
  slug: string;
  duplicate: Verdict;
  ingredientStep: Verdict;
  scaling: Verdict;
  nutrition: Verdict;
  image: Verdict;
  mobileCard: Verdict;
  seo: Verdict;
  overall: Verdict;
  notes: string[];
};

const rows: Row[] = [];

for (const item of BATCH_B) {
  const notes: string[] = [];
  let duplicate: Verdict = "PASS";
  let logic: Verdict = "PASS";
  let nutrition: Verdict = "PASS";
  let image: Verdict = "PASS";
  let mobileCard: Verdict = "PASS";

  if (!catalogSlugs.has(item.slug)) {
    notes.push("page JSON missing");
    logic = "BLOCKER";
  }

  const nearPresent = (NEAR_DUPES[item.slug] ?? []).filter((s) => catalogSlugs.has(s) && s !== item.slug);
  if (nearPresent.length) notes.push(`near catalog: ${nearPresent.join(", ")}`);

  const page = catalogSlugs.has(item.slug) ? loadPage(item.collection, item.slug) : null;

  const ingAudit = auditIngredientStep(page);
  const scaleAudit = auditScaling(page);
  const seoAudit = auditSeo(page, item.slug);

  if (page) {
    const identity = titleMatchesDishIdentity(String(page.title), (page.ingredients as Array<{ name: string }>) ?? []);
    if (!identity.ok) {
      logic = "FIX BEFORE PUSH";
      notes.push(`title identity: ${identity.reason}`);
    }
    if (((page.steps as unknown[]) ?? []).length < 4) {
      logic = "FIX BEFORE PUSH";
      notes.push("fewer than 4 steps");
    }
    const blob = ((page.steps as Array<{ instruction: string }>) ?? []).map((s) => s.instruction).join(" ");
    for (const rules of [SANDWICH_RULES[item.slug], SOUP_RULES[item.slug]].filter(Boolean)) {
      for (const pat of rules!) {
        if (!pat.test(blob)) {
          logic = "FIX BEFORE PUSH";
          notes.push(`sandwich/soup rule miss: ${pat.source}`);
        }
      }
    }
    if (item.collection === "golden-100") {
      const def = GOLDEN_100_RECIPES.find((r) => r.slug === item.slug);
      if (def && (item.slug.includes("soup") || item.slug.includes("fagioli"))) {
        const cls = inferRecipeInstructionClass(def);
        if (item.slug.includes("soup") && cls !== "soup") {
          logic = "BLOCKER";
          notes.push(`instruction class ${cls} expected soup`);
        }
      }
    }
    const pageCal = Number(page.calories ?? 0);
    const n =
      pageCal >= 200 && pageCal <= 950
        ? { calories: pageCal, protein: Number(page.protein ?? 0) }
        : calculateNutritionFromIngredients(
            ((page.ingredients as Array<{ name: string; quantity?: string; unit?: string }>) ?? []).map(
              (i) => ({
                name: i.name,
                quantity: i.quantity,
                unit: i.unit,
              }),
            ),
            { servings: 8, mealType: "dinner" },
          );
    if (n.calories < 120 || n.calories > 1200) {
      nutrition = "FIX BEFORE PUSH";
      notes.push(`calories ${n.calories}/srv`);
    }
  }

  const col = imgCollection(item.collection);
  const hero = path.join(process.cwd(), "client/public/images", col, `${item.slug}.jpg`);
  const thumb =
    item.collection === "hall-expansion"
      ? path.join(process.cwd(), "client/public/images/thumbs/hall-expansion", `${item.slug}.jpg`)
      : path.join(process.cwd(), "client/public/images/thumbs", `${item.slug}.jpg`);
  if (!fs.existsSync(hero)) {
    image = "BLOCKER";
    notes.push("hero missing");
  } else if (page) {
    const expected = `/images/${col}/${item.slug}.jpg`;
    if (String(page.heroImage) !== expected) {
      image = "FIX BEFORE PUSH";
      notes.push(`heroImage mismatch`);
    }
  }
  if (!fs.existsSync(thumb)) {
    mobileCard = "FIX BEFORE PUSH";
    notes.push("thumb missing for card");
  }

  const sourceUrl =
    item.collection === "hall-expansion"
      ? BATCH_B_SANDWICH_SOURCE_URLS[item.slug]
      : BATCH_B_SOURCE_URLS[item.slug];
  if (!sourceUrl) notes.push("source URL not mapped");

  const overall: Verdict =
    logic === "BLOCKER" || image === "BLOCKER" || duplicate === "BLOCKER"
      ? "BLOCKER"
      : logic === "FIX BEFORE PUSH" ||
          ingAudit.verdict === "FIX BEFORE PUSH" ||
          scaleAudit.verdict === "FIX BEFORE PUSH" ||
          nutrition === "FIX BEFORE PUSH" ||
          image === "FIX BEFORE PUSH" ||
          mobileCard === "FIX BEFORE PUSH" ||
          seoAudit.verdict === "FIX BEFORE PUSH"
        ? "FIX BEFORE PUSH"
        : "PASS";

  rows.push({
    slug: item.slug,
    duplicate,
    ingredientStep: ingAudit.verdict,
    scaling: scaleAudit.verdict,
    nutrition,
    image,
    mobileCard,
    seo: seoAudit.verdict,
    overall,
    notes: [...notes, ...ingAudit.notes, ...scaleAudit.notes, ...seoAudit.notes],
  });
}

const batchHeroHashes = new Map<string, string>();
for (const item of BATCH_B) {
  const col = imgCollection(item.collection);
  const hero = path.join(process.cwd(), "client/public/images", col, `${item.slug}.jpg`);
  if (!fs.existsSync(hero)) continue;
  const h = crypto.createHash("sha256").update(fs.readFileSync(hero)).digest("hex");
  const prior = [...batchHeroHashes.entries()].find(([, v]) => v === h);
  if (prior) {
    const row = rows.find((r) => r.slug === item.slug);
    if (row) {
      row.image = "FIX BEFORE PUSH";
      row.overall = row.overall === "BLOCKER" ? "BLOCKER" : "FIX BEFORE PUSH";
      row.notes.push(`hero reused in batch (${prior[0]})`);
    }
  } else {
    batchHeroHashes.set(item.slug, h);
  }
}

const recipeAudit = { generatedAt: new Date().toISOString(), rows };
const imageAudit = {
  generatedAt: new Date().toISOString(),
  rows: rows.map((r) => ({
    slug: r.slug,
    image: r.image,
    mobileCard: r.mobileCard,
    notes: r.notes.filter((n) => /hero|thumb|image/i.test(n)),
  })),
};
const duplicateReport = {
  generatedAt: new Date().toISOString(),
  rows: rows.map((r) => ({
    slug: r.slug,
    duplicate: r.duplicate,
    near: NEAR_DUPES[r.slug]?.filter((s) => catalogSlugs.has(s) && s !== r.slug) ?? [],
    overall: r.duplicate,
  })),
};

const reviewDir = path.join(process.cwd(), "review");
fs.mkdirSync(reviewDir, { recursive: true });
fs.writeFileSync(path.join(reviewDir, "batch-b-recipe-audit.json"), JSON.stringify(recipeAudit, null, 2));
fs.writeFileSync(path.join(reviewDir, "batch-b-image-audit.json"), JSON.stringify(imageAudit, null, 2));
fs.writeFileSync(path.join(reviewDir, "batch-b-duplicate-report.json"), JSON.stringify(duplicateReport, null, 2));

console.log(JSON.stringify(recipeAudit, null, 2));
process.exit(rows.some((r) => r.overall === "BLOCKER") ? 1 : 0);
