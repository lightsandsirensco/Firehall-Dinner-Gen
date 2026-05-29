/**
 * Read/write smoothie fuel catalog JSON under client/public/catalog/smoothies/
 */

import fs from "node:fs";
import path from "node:path";
import {
  fuelCatalogIndexSchema,
  fuelRecipePageSchema,
  FUEL_RECIPE_CONTENT_VERSION,
  type FuelCatalogIndex,
  type FuelRecipePage,
} from "../../shared/fuel-catalog/schema.js";
import { smoothieTaxonomyLabel } from "../../shared/fuel-catalog/smoothies/taxonomy.js";

export const SMOOTHIE_CATALOG_PUBLIC_DIR = path.join(
  process.cwd(),
  "client",
  "public",
  "catalog",
  "smoothies",
);

export const SMOOTHIE_CATALOG_PAGES_DIR = path.join(SMOOTHIE_CATALOG_PUBLIC_DIR, "pages");

export function writeSmoothieRecipePage(page: FuelRecipePage): string {
  const parsed = fuelRecipePageSchema.parse(page);
  fs.mkdirSync(SMOOTHIE_CATALOG_PAGES_DIR, { recursive: true });
  const file = path.join(SMOOTHIE_CATALOG_PAGES_DIR, `${parsed.slug}.json`);
  fs.writeFileSync(file, JSON.stringify(parsed, null, 2), "utf8");
  return file;
}

export function readSmoothieRecipePage(slug: string): FuelRecipePage | null {
  const file = path.join(SMOOTHIE_CATALOG_PAGES_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return fuelRecipePageSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return null;
  }
}

export function writeSmoothieCatalogIndex(pages: FuelRecipePage[]): string {
  const index: FuelCatalogIndex = {
    version: 1,
    contentVersion: FUEL_RECIPE_CONTENT_VERSION,
    generatedAt: new Date().toISOString(),
    catalogSet: "fuel_smoothie",
    recipeCount: pages.length,
    recipes: pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle,
      taxonomyCategory: p.taxonomyCategory as FuelCatalogIndex["recipes"][number]["taxonomyCategory"],
      taxonomyLabel: p.taxonomyLabel,
      heroImage: p.heroImage,
      thumbImage: p.thumbImage,
      calories: p.nutrition.calories,
      protein: p.nutrition.protein,
    })),
  };

  fuelCatalogIndexSchema.parse(index);
  fs.mkdirSync(SMOOTHIE_CATALOG_PUBLIC_DIR, { recursive: true });
  const file = path.join(SMOOTHIE_CATALOG_PUBLIC_DIR, "index.json");
  fs.writeFileSync(file, JSON.stringify(index, null, 2), "utf8");
  return file;
}

export function listSmoothiePageSlugs(): string[] {
  if (!fs.existsSync(SMOOTHIE_CATALOG_PAGES_DIR)) return [];
  return fs
    .readdirSync(SMOOTHIE_CATALOG_PAGES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}
