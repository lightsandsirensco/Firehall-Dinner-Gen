/**
 * Load recipe metadata + ingredients for meal image trust audits.
 */

import fs from "node:fs";
import path from "node:path";
import { GOLDEN_100_RECIPES } from "../golden-100/manifest.js";
import { PERFORMANCE_ADAPTED_RECIPES } from "../performance-meals/adapted/index.js";
import { HALL_EXPANSION_ADAPTED_RECIPES } from "../hall-expansion/adapted/index.js";
import { PIZZA_NIGHT_RECIPES } from "../pizza-night/manifest.js";
import { SMOOTHIE_CATALOG_ITEMS } from "../fuel-catalog/smoothies/catalog-data.js";
import { goldenPageImageSet } from "../golden-100/recipe-page-paths.js";
import { performancePageImageSet } from "../performance-meals/recipe-page-paths.js";
import { hallExpansionPageImageSet } from "../hall-expansion/recipe-page-paths.js";
import { pizzaNightPageImageSet } from "../pizza-night/recipe-page-paths.js";
import type { GoldenRecipePageIngredient } from "../golden-100/recipe-page-schema.js";

export type TrustAuditCollection =
  | "golden_100"
  | "performance_meals"
  | "hall_expansion"
  | "breakfast"
  | "pizza_night"
  | "smoothies";

export type TrustAuditTarget = {
  collection: TrustAuditCollection;
  slug: string;
  title: string;
  protein: string;
  mealFormat: string;
  cuisine: string;
  heroImage: string;
  ingredients: GoldenRecipePageIngredient[];
  tonightSpread: string[];
  heroAlt?: string;
};

const PUBLIC = path.join(process.cwd(), "client/public");

function readJsonPage(relPath: string): Record<string, unknown> | null {
  const abs = path.join(PUBLIC, relPath.replace(/^\//, ""));
  if (!fs.existsSync(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function ingredientsFromPage(page: Record<string, unknown> | null): GoldenRecipePageIngredient[] {
  const raw = page?.ingredients;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      name: String(x.name || ""),
      quantity: String(x.quantity || ""),
      unit: String(x.unit || ""),
      group: x.group ? String(x.group) : undefined,
      notes: x.notes ? String(x.notes) : undefined,
    }))
    .filter((x) => x.name.trim());
}

function spreadFromPage(page: Record<string, unknown> | null): string[] {
  const raw = page?.tonightSpread;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const mains = Array.isArray(o.mains) ? o.mains.map(String) : [];
    const sides = Array.isArray(o.sides) ? o.sides.map(String) : [];
    return [...mains, ...sides].filter(Boolean);
  }
  return [];
}

function readBreakfastIndex(): Array<{ slug: string; title: string; protein?: string; mealFormat?: string }> {
  const file = path.join(PUBLIC, "catalog/breakfast/index.json");
  if (!fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as { recipes: Array<Record<string, string>> };
  return raw.recipes.map((r) => ({
    slug: r.slug,
    title: r.title,
    protein: r.protein,
    mealFormat: r.mealFormat,
  }));
}

export function loadTrustAuditTargets(collections?: Set<TrustAuditCollection>): TrustAuditTarget[] {
  const targets: TrustAuditTarget[] = [];
  const include = (c: TrustAuditCollection) => !collections || collections.has(c);

  if (include("golden_100")) {
    for (const def of GOLDEN_100_RECIPES) {
      const slug = def.classicSlug || def.slug;
      const page = readJsonPage(`/catalog/golden-100/pages/${slug}.json`);
      targets.push({
        collection: "golden_100",
        slug,
        title: def.title,
        protein: def.protein,
        mealFormat: def.mealFormat,
        cuisine: def.cuisine,
        heroImage: goldenPageImageSet(slug).heroImage,
        ingredients: ingredientsFromPage(page),
        tonightSpread: spreadFromPage(page),
      });
    }
  }

  if (include("performance_meals")) {
    for (const r of PERFORMANCE_ADAPTED_RECIPES) {
      const page = readJsonPage(`/catalog/performance-meals/pages/${r.manifest.slug}.json`);
      targets.push({
        collection: "performance_meals",
        slug: r.manifest.slug,
        title: r.manifest.title,
        protein: r.manifest.protein,
        mealFormat: r.manifest.mealFormat,
        cuisine: r.manifest.cuisine,
        heroImage: performancePageImageSet(r.manifest.slug).heroImage,
        ingredients: r.ingredients.length ? r.ingredients : ingredientsFromPage(page),
        tonightSpread: r.tonightSpread ?? spreadFromPage(page),
      });
    }
  }

  if (include("hall_expansion")) {
    for (const r of HALL_EXPANSION_ADAPTED_RECIPES) {
      const page = readJsonPage(`/catalog/hall-expansion/pages/${r.slug}.json`);
      targets.push({
        collection: "hall_expansion",
        slug: r.slug,
        title: r.title,
        protein: r.protein,
        mealFormat: r.mealFormat,
        cuisine: r.category || "american",
        heroImage: hallExpansionPageImageSet(r.slug).heroImage,
        ingredients: r.ingredients?.length ? r.ingredients : ingredientsFromPage(page),
        tonightSpread: spreadFromPage(page),
      });
    }
  }

  if (include("breakfast")) {
    for (const entry of readBreakfastIndex()) {
      const page = readJsonPage(`/catalog/breakfast/pages/${entry.slug}.json`);
      targets.push({
        collection: "breakfast",
        slug: entry.slug,
        title: entry.title,
        protein: entry.protein || "any",
        mealFormat: entry.mealFormat || "breakfast",
        cuisine: "american",
        heroImage: `/images/breakfast/${entry.slug}.jpg`,
        ingredients: ingredientsFromPage(page),
        tonightSpread: spreadFromPage(page),
      });
    }
  }

  if (include("pizza_night")) {
    for (const def of PIZZA_NIGHT_RECIPES) {
      const page = readJsonPage(`/catalog/pizza-night/pages/${def.slug}.json`);
      targets.push({
        collection: "pizza_night",
        slug: def.slug,
        title: def.title,
        protein: def.protein,
        mealFormat: def.mealFormat,
        cuisine: "italian",
        heroImage: pizzaNightPageImageSet(def.slug).heroImage,
        ingredients: ingredientsFromPage(page),
        tonightSpread: spreadFromPage(page),
      });
    }
  }

  if (include("smoothies")) {
    for (const item of SMOOTHIE_CATALOG_ITEMS) {
      targets.push({
        collection: "smoothies",
        slug: item.slug,
        title: item.title,
        protein: "vegetarian",
        mealFormat: "smoothie",
        cuisine: "american",
        heroImage: `/images/smoothies/${item.slug}.webp`,
        ingredients: [],
        tonightSpread: [],
      });
    }
  }

  return targets;
}

export function readHeroBuffer(publicPath: string): Buffer | null {
  const abs = path.join(PUBLIC, publicPath.replace(/^\//, ""));
  if (!fs.existsSync(abs)) {
    const alt = abs.replace(/\.jpg$/, ".webp");
    if (fs.existsSync(alt)) return fs.readFileSync(alt);
    return null;
  }
  return fs.readFileSync(abs);
}

export function resolveRegenCollection(slug: string): TrustAuditCollection | null {
  const targets = loadTrustAuditTargets();
  return targets.find((t) => t.slug === slug)?.collection ?? null;
}
