#!/usr/bin/env tsx
/**
 * Batch A expansion audits — duplicate, logic, image trust, nutrition.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { BATCH_A_BREAKFAST_SOURCE_URLS } from "../shared/breakfast-expansion/batch-a-breakfast-pages.js";
import { BATCH_A_SOURCE_URLS } from "../shared/golden-100/recipe-quality/batch-a-packs.js";
import { inferRecipeInstructionClass } from "../shared/golden-100/recipe-quality/recipe-instruction-class.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { calculateNutritionFromIngredients } from "../shared/nutrition/calculate.js";
import { titleMatchesDishIdentity } from "../shared/meal-format-contract.js";

const BATCH_A = [
  { slug: "shakshuka-for-the-hall", collection: "breakfast", title: "Shakshuka for the Hall" },
  { slug: "menemen-for-the-crew", collection: "breakfast", title: "Menemen for the Crew" },
  { slug: "baked-oatmeal-mixed-berries", collection: "breakfast", title: "Baked Oatmeal with Mixed Berries" },
  { slug: "sheet-pan-parmesan-dijon-chicken-thigh-dinner", collection: "golden-100", title: "Sheet Pan Parmesan-Dijon Chicken Thigh Dinner" },
  { slug: "four-step-chicken-piccata", collection: "golden-100", title: "Four-Step Chicken Piccata" },
  { slug: "tomato-soup-grilled-cheese-croutons", collection: "golden-100", title: "Tomato Soup with Grilled Cheese Croutons" },
  { slug: "spaghetti-aglio-e-olio-for-the-hall", collection: "golden-100", title: "Spaghetti Aglio e Olio for the Hall" },
  { slug: "spicy-tomato-bisque-grilled-brie-toast", collection: "golden-100", title: "Spicy Tomato Bisque with Grilled Brie Toast" },
] as const;

const CHILI_WORDING =
  /\b(chili powder|kidney beans|bloom the spices|chili splatters|ground beef \(80\/20\))\b/i;

const NEAR_DUPES: Record<string, string[]> = {
  "shakshuka-for-the-hall": ["huevos-rancheros-crew", "southwest-egg-bake", "migas-for-the-crew"],
  "menemen-for-the-crew": ["migas-for-the-crew", "chorizo-breakfast-hash"],
  "baked-oatmeal-mixed-berries": ["apple-cinnamon-baked-oatmeal", "big-pot-savory-oats"],
  "sheet-pan-parmesan-dijon-chicken-thigh-dinner": ["sheet-pan-meal-prep", "honey-mustard-baked-chicken-thighs", "herb-roasted-thighs"],
  "four-step-chicken-piccata": ["chicken-parm", "crispy-chicken-cutlets", "creamy-tuscan-chicken"],
  "tomato-soup-grilled-cheese-croutons": ["beef-barley-soup", "chicken-dumpling-soup"],
  "spaghetti-aglio-e-olio-for-the-hall": ["five-ingredient-pasta", "garlic-butter-pasta"],
  "spicy-tomato-bisque-grilled-brie-toast": ["tomato-soup-grilled-cheese-croutons", "chili-garlic-bread"],
};

function fileHash(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function ingredientBlob(page: Record<string, unknown> | null): string {
  const ings = (page?.ingredients as Array<{ name: string }>) ?? [];
  return ings.map((i) => i.name.toLowerCase()).join(" ");
}

function loadPage(collection: string, slug: string): Record<string, unknown> {
  const base =
    collection === "breakfast"
      ? path.join("client/public/catalog/breakfast/pages", `${slug}.json`)
      : path.join("client/public/catalog/golden-100/pages", `${slug}.json`);
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), base), "utf8")) as Record<string, unknown>;
}

function listCatalogSlugs(): Set<string> {
  const slugs = new Set<string>();
  const roots = [
    "client/public/catalog/golden-100/pages",
    "client/public/catalog/breakfast/pages",
    "client/public/catalog/hall-expansion/pages",
    "client/public/catalog/performance-meals/pages",
    "client/public/catalog/bbq/pages",
  ];
  for (const root of roots) {
    const dir = path.join(process.cwd(), root);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith(".json")) slugs.add(f.replace(/\.json$/, ""));
    }
  }
  return slugs;
}

type Verdict = "PASS" | "FIX BEFORE PUSH" | "BLOCKER";

interface AuditRow {
  slug: string;
  duplicate: Verdict;
  logic: Verdict;
  image: Verdict;
  nutrition: Verdict;
  overall: Verdict;
  notes: string[];
}

const catalogSlugs = listCatalogSlugs();
const rows: AuditRow[] = [];

for (const item of BATCH_A) {
  const notes: string[] = [];
  let duplicate: Verdict = "PASS";
  let logic: Verdict = "PASS";
  let image: Verdict = "PASS";
  let nutrition: Verdict = "PASS";

  if (!catalogSlugs.has(item.slug)) {
    notes.push("page JSON missing");
    logic = "BLOCKER";
  }

  const near = NEAR_DUPES[item.slug] ?? [];
  const nearPresent = near.filter((s) => catalogSlugs.has(s) && s !== item.slug);
  if (nearPresent.length) {
    notes.push(`near catalog: ${nearPresent.join(", ")}`);
    if (item.slug === "baked-oatmeal-mixed-berries") {
      const pageEarly = catalogSlugs.has(item.slug) ? loadPage(item.collection, item.slug) : null;
      const applePage = catalogSlugs.has("apple-cinnamon-baked-oatmeal")
        ? loadPage("breakfast", "apple-cinnamon-baked-oatmeal")
        : null;
      const blob = ingredientBlob(pageEarly);
      const appleBlob = ingredientBlob(applePage);
      const distinctFruit =
        /\bberr/.test(blob) && !/\bapple/.test(blob) && /\bapple/.test(appleBlob);
      duplicate = distinctFruit ? "PASS" : "FIX BEFORE PUSH";
      if (!distinctFruit) notes.push("berry vs apple baked-oatmeal concept overlap");
    }
  }

  const page = catalogSlugs.has(item.slug) ? loadPage(item.collection, item.slug) : null;
  if (page) {
    const steps = (page.steps as Array<{ instruction: string }>) ?? [];
    const blob = steps.map((s) => s.instruction).join(" ");
    if (CHILI_WORDING.test(blob)) {
      logic = "BLOCKER";
      notes.push("chili template leak");
    }
    if (steps.length < 4) {
      logic = "FIX BEFORE PUSH";
      notes.push(`only ${steps.length} steps`);
    }
    const identity = titleMatchesDishIdentity(String(page.title), (page.ingredients as Array<{ name: string }>) ?? []);
    if (!identity.ok) {
      logic = "FIX BEFORE PUSH";
      notes.push(`title identity: ${identity.reason}`);
    }
    if (item.collection === "golden-100") {
      const def = GOLDEN_100_RECIPES.find((r) => r.slug === item.slug);
      if (def) {
        const cls = inferRecipeInstructionClass(def);
        if (item.slug.includes("soup") || item.slug.includes("bisque")) {
          if (cls !== "soup") {
            logic = "BLOCKER";
            notes.push(`instruction class ${cls} expected soup`);
          }
        }
      }
    }
    const n = calculateNutritionFromIngredients(
      ((page.ingredients as Array<{ name: string; quantity?: string; unit?: string }>) ?? []).map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
      })),
      { servings: 8, mealType: item.collection === "breakfast" ? "breakfast" : "dinner" },
    );
    if (n.calories < 120 || n.calories > 1200) {
      nutrition = "FIX BEFORE PUSH";
      notes.push(`calories ${n.calories}/srv looks off`);
    }
    if (n.protein < 5 && item.slug.includes("chicken")) {
      nutrition = "FIX BEFORE PUSH";
      notes.push(`protein ${n.protein}g low for chicken dish`);
    }
  }

  const imgCollection = item.collection === "breakfast" ? "breakfast" : "golden-100";
  const hero = path.join(process.cwd(), "client/public/images", imgCollection, `${item.slug}.jpg`);
  if (!fs.existsSync(hero)) {
    image = "BLOCKER";
    notes.push("hero image missing");
  } else {
    const pageHero = page ? String(page.heroImage ?? "") : "";
    const expectedHero = `/images/${imgCollection}/${item.slug}.jpg`;
    if (pageHero && pageHero !== expectedHero) {
      image = "FIX BEFORE PUSH";
      notes.push(`page heroImage ${pageHero} !== ${expectedHero}`);
    }
  }

  const sourceUrl =
    item.collection === "breakfast"
      ? BATCH_A_BREAKFAST_SOURCE_URLS[item.slug]
      : BATCH_A_SOURCE_URLS[item.slug];
  if (!sourceUrl) {
    notes.push("source URL not mapped");
  }

  const overall: Verdict =
    logic === "BLOCKER" || image === "BLOCKER" || duplicate === "BLOCKER"
      ? "BLOCKER"
      : logic === "FIX BEFORE PUSH" || image === "FIX BEFORE PUSH" || nutrition === "FIX BEFORE PUSH" || duplicate === "FIX BEFORE PUSH"
        ? "FIX BEFORE PUSH"
        : "PASS";

  rows.push({ slug: item.slug, duplicate, logic, image, nutrition, overall, notes });
}

const batchHeroHashes = new Map<string, string>();
for (const item of BATCH_A) {
  const imgCollection = item.collection === "breakfast" ? "breakfast" : "golden-100";
  const hero = path.join(process.cwd(), "client/public/images", imgCollection, `${item.slug}.jpg`);
  const h = fileHash(hero);
  if (!h) continue;
  const prior = [...batchHeroHashes.entries()].find(([, v]) => v === h);
  if (prior) {
    const row = rows.find((r) => r.slug === item.slug);
    if (row) {
      row.image = "FIX BEFORE PUSH";
      row.notes.push(`hero reused within batch (${prior[0]})`);
      row.overall =
        row.logic === "BLOCKER" || row.duplicate === "BLOCKER"
          ? "BLOCKER"
          : "FIX BEFORE PUSH";
    }
  } else {
    batchHeroHashes.set(item.slug, h);
  }
}

const out = { generatedAt: new Date().toISOString(), rows };
const outPath = path.join(process.cwd(), "review/batch-a-expansion-audit.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

console.log(JSON.stringify(out, null, 2));
const blockers = rows.filter((r) => r.overall === "BLOCKER");
process.exit(blockers.length ? 1 : 0);
