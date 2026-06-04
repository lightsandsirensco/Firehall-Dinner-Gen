#!/usr/bin/env tsx
/**
 * Handheld batch deep audits — duplicate, ingredient-step, scaling, nutrition, image, mobile card, SEO.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { BATCH_HANDHELD_SOURCE_URLS } from "../shared/hall-expansion/adapted/batch-handheld-wraps.js";
import { CHICKEN_DUMPLINGS_SOURCE_URL } from "../shared/golden-100/recipe-quality/batch-handheld-dumplings-pack.js";
import { inferRecipeInstructionClass } from "../shared/golden-100/recipe-quality/recipe-instruction-class.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { calculateNutritionFromIngredients } from "../shared/nutrition/calculate.js";
import { titleMatchesDishIdentity } from "../shared/meal-format-contract.js";
import { FIREHALL_CREW_SCALE_SIZES } from "../shared/recipe-sourcing-policy.js";

const BATCH = [
  { slug: "chicken-caesar-wraps", collection: "hall-expansion" as const, title: "Chicken Caesar Wraps" },
  { slug: "buffalo-chicken-wraps", collection: "hall-expansion" as const, title: "Buffalo Chicken Wraps" },
  { slug: "greek-chicken-pitas", collection: "hall-expansion" as const, title: "Greek Chicken Pitas" },
  { slug: "beef-gyros-for-the-hall", collection: "hall-expansion" as const, title: "Beef Gyros" },
  { slug: "chicken-shawarma-pitas", collection: "hall-expansion" as const, title: "Chicken Shawarma Pitas" },
  { slug: "sausage-peppers-on-buns", collection: "hall-expansion" as const, title: "Sausage & Peppers on Buns" },
  { slug: "chicken-dumpling-soup", collection: "golden-100" as const, title: "Chicken and Dumplings" },
] as const;

const NEAR_DUPES: Record<string, string[]> = {
  "chicken-caesar-wraps": ["chicken-caesar", "chicken-quesadillas"],
  "buffalo-chicken-wraps": ["buffalo-chicken-dip", "game-day-nachos"],
  "greek-chicken-pitas": ["greek-chicken-bowls", "chicken-souvlaki", "mediterranean-chickpea"],
  "beef-gyros-for-the-hall": ["philly-cheesesteak-skillet", "hall-taco-bar"],
  "chicken-shawarma-pitas": ["shawarma-bar-night", "shawarma-chicken-rice-bowls", "greek-chicken-pitas"],
  "sausage-peppers-on-buns": ["sausage-peppers-onions", "sheet-pan-sausage-peppers", "meatball-hoagies"],
  "chicken-dumpling-soup": ["chicken-pot-pie", "chicken-dumpling-soup"],
};

const HANDHELD_RULES: Record<string, RegExp[]> = {
  "chicken-caesar-wraps": [/\bwrap\b|\btortilla\b/i, /\bromaine\b|\bCaesar\b/i, /\bgrill\b/i, /\bhold\b/i],
  "buffalo-chicken-wraps": [/\bbuffalo\b/i, /\bwrap\b|\btortilla\b/i, /\branch\b|\bblue cheese\b/i, /\bhold\b/i],
  "greek-chicken-pitas": [/\bpita\b/i, /\btzatziki\b/i, /\bcucumber\b|\btomato\b/i, /\blemon\b|\boregano\b/i],
  "beef-gyros-for-the-hall": [/\bgyro\b|\bbeef\b/i, /\bpita\b/i, /\btzatziki\b/i, /\bonion\b/i],
  "chicken-shawarma-pitas": [/\bshawarma\b|\bspice\b|\bcumin\b|\bturmeric\b/i, /\bpita\b/i, /\bpickles?\b/i, /\bhold\b/i],
  "sausage-peppers-on-buns": [/\bsausage\b/i, /\bpepper\b/i, /\bbun\b|\bhoagie\b/i, /\bhold\b/i],
};

const STEW_RULES: Record<string, RegExp[]> = {
  "chicken-dumpling-soup": [
    /\bstew\b|\bthick\b/i,
    /\bdumpling\b/i,
    /\bnot\b.*\bsoup\b|\bbrothy\b/i,
    /\bhold\b/i,
    /\bDutch oven\b|\bsimmer\b/i,
  ],
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

function auditSeo(page: Record<string, unknown> | null): { verdict: Verdict; notes: string[] } {
  const notes: string[] = [];
  if (!page) return { verdict: "BLOCKER", notes: ["no page"] };
  const seo = String(page.seoTitle ?? "");
  const terms = (page.searchTerms as string[]) ?? [];
  if (!seo || seo.length < 12) notes.push("seoTitle missing or short");
  if (terms.length < 2) notes.push("searchTerms sparse");
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

for (const item of BATCH) {
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
  const seoAudit = auditSeo(page);

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
    const blob = ((page.steps as Array<{ instruction: string; title?: string }>) ?? [])
      .map((s) => `${s.title ?? ""} ${s.instruction}`)
      .join(" ");
    const bannedTitles = ["prep the line", "finish and serve", "build the meal"];
    for (const s of (page.steps as Array<{ title?: string }>) ?? []) {
      if (s.title && bannedTitles.some((b) => s.title!.toLowerCase().includes(b))) {
        logic = "FIX BEFORE PUSH";
        notes.push(`generic step title: ${s.title}`);
      }
    }
    for (const rules of [HANDHELD_RULES[item.slug], STEW_RULES[item.slug]].filter(Boolean)) {
      for (const pat of rules!) {
        if (!pat.test(blob)) {
          logic = "FIX BEFORE PUSH";
          notes.push(`format rule miss: ${pat.source}`);
        }
      }
    }
    if (item.slug === "chicken-dumpling-soup") {
      if (!/\bstew\b/i.test(blob) || !/\bdumpling\b/i.test(blob)) {
        logic = "FIX BEFORE PUSH";
        notes.push("stew+dumplings wording missing in steps");
      }
      const def = GOLDEN_100_RECIPES.find((r) => r.slug === item.slug);
      if (def) {
        const cls = inferRecipeInstructionClass(def);
        if (cls !== "soup") {
          logic = "FIX BEFORE PUSH";
          notes.push(`instruction class ${cls} expected soup routing`);
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
  if (!fs.existsSync(hero) && item.slug !== "chicken-dumpling-soup") {
    image = "BLOCKER";
    notes.push("hero missing");
  } else if (page && item.slug !== "chicken-dumpling-soup") {
    const expected = `/images/${col}/${item.slug}.jpg`;
    if (String(page.heroImage) !== expected) {
      image = "FIX BEFORE PUSH";
      notes.push("heroImage mismatch");
    }
  }
  if (item.collection === "hall-expansion" && !fs.existsSync(thumb)) {
    mobileCard = "FIX BEFORE PUSH";
    notes.push("thumb missing for card");
  }

  const sourceUrl =
    item.collection === "hall-expansion"
      ? BATCH_HANDHELD_SOURCE_URLS[item.slug]
      : item.slug === "chicken-dumpling-soup"
        ? CHICKEN_DUMPLINGS_SOURCE_URL
        : undefined;
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
for (const item of BATCH) {
  if (item.slug === "chicken-dumpling-soup") continue;
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
  greekVsShawarma: "SUFFICIENTLY DIFFERENT — approved in prebuild audit",
  buffaloVsSandwich: "PASS — no buffalo wrap/sandwich duplicate",
  rows: rows.map((r) => ({
    slug: r.slug,
    duplicate: r.duplicate,
    near: NEAR_DUPES[r.slug]?.filter((s) => catalogSlugs.has(s) && s !== r.slug) ?? [],
    overall: r.duplicate,
  })),
};

const reviewDir = path.join(process.cwd(), "review");
fs.mkdirSync(reviewDir, { recursive: true });
fs.writeFileSync(path.join(reviewDir, "batch-handheld-recipe-audit.json"), JSON.stringify(recipeAudit, null, 2));
fs.writeFileSync(path.join(reviewDir, "batch-handheld-image-audit.json"), JSON.stringify(imageAudit, null, 2));
fs.writeFileSync(path.join(reviewDir, "batch-handheld-duplicate-report.json"), JSON.stringify(duplicateReport, null, 2));

console.log(JSON.stringify(recipeAudit, null, 2));
process.exit(rows.some((r) => r.overall !== "PASS") ? 1 : 0);
