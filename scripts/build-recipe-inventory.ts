#!/usr/bin/env tsx
/**
 * Read-only inventory of curated catalog recipes (client/public/catalog/<collection>).
 * Index entries supply id/title/category/cuisine/protein; recipe pages supply ingredients.
 * Collections with no page files (e.g. `hall`, `breakfast-meals`) are aggregate listings of
 * recipes owned by other collections — recorded as `alsoListedIn`, not as separate recipes.
 *
 *   npx tsx scripts/build-recipe-inventory.ts
 */
import fs from "node:fs";
import path from "node:path";

const CATALOG_ROOT = "client/public/catalog";
const OUT = "data/recipe-discovery/existing-recipes.json";

type Rec = Record<string, unknown>;

interface InventoryRecipe {
  id: string;
  name: string;
  collection: string;
  cuisine: string | null;
  category: string | null;
  mainProtein: string | null;
  ingredients: string[];
  sources: string[];
  alsoListedIn: string[];
}

const listings: Array<{ collection: string; entry: Rec }> = [];

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function indexEntries(raw: unknown): Rec[] {
  if (Array.isArray(raw)) return raw as Rec[];
  if (raw && typeof raw === "object") {
    for (const key of ["recipes", "items", "entries", "meals"]) {
      const v = (raw as Rec)[key];
      if (Array.isArray(v)) return v as Rec[];
    }
  }
  return [];
}

function ingredientNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const names: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") names.push(item.trim());
    else if (item && typeof item === "object") {
      const o = item as Rec;
      const name = str(o.name) ?? str(o.item) ?? str(o.ingredient);
      if (name) names.push(name);
      else if (Array.isArray(o.items)) names.push(...ingredientNames(o.items));
    }
  }
  return names.filter(Boolean);
}

function listPageFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listPageFiles(full));
    else if (entry.name.endsWith(".json") && entry.name !== "index.json") out.push(full);
  }
  return out;
}

const recipes: InventoryRecipe[] = [];
const issues: string[] = [];

for (const collection of fs.readdirSync(CATALOG_ROOT).sort()) {
  const dir = path.join(CATALOG_ROOT, collection);
  if (!fs.statSync(dir).isDirectory()) continue;

  const pages = new Map<string, { file: string; data: Rec }>();
  for (const file of listPageFiles(dir)) {
    try {
      const data = readJson(file) as Rec;
      const slug = str(data.slug) ?? path.basename(file, ".json");
      if (pages.has(slug)) issues.push(`${collection}: two page files for slug "${slug}"`);
      pages.set(slug, { file, data });
    } catch (err) {
      issues.push(`${file}: unreadable JSON (${(err as Error).message})`);
    }
  }

  const indexFile = path.join(dir, "index.json");
  const entries = fs.existsSync(indexFile) ? indexEntries(readJson(indexFile)) : [];
  const seenInIndex = new Set<string>();

  if (pages.size === 0) {
    for (const entry of entries) listings.push({ collection, entry });
    continue;
  }

  for (const entry of entries) {
    const id = str(entry.slug) ?? str(entry.id);
    if (!id) {
      issues.push(`${collection}/index.json: entry without slug/id`);
      continue;
    }
    seenInIndex.add(id);
    const page = pages.get(id);
    const pageData = page?.data ?? {};
    const ingredients = ingredientNames(pageData.ingredients ?? entry.ingredients);
    recipes.push({
      id,
      name: str(entry.title) ?? str(pageData.title) ?? id,
      collection,
      cuisine: str(entry.cuisine) ?? str(pageData.cuisine),
      category: str(entry.category) ?? str(pageData.category) ?? str(entry.taxonomyCategory),
      // Page-level `protein` is grams per serving; only the index string is the main protein.
      mainProtein: str(entry.protein) ?? str(entry.mainProtein) ?? str(pageData.mainProtein),
      ingredients,
      sources: page ? ["index", "page"] : ["index"],
      alsoListedIn: [],
    });
  }

  for (const [slug, { data }] of pages) {
    if (seenInIndex.has(slug)) continue;
    recipes.push({
      id: slug,
      name: str(data.title) ?? slug,
      collection,
      cuisine: str(data.cuisine),
      category: str(data.category) ?? str(data.taxonomyCategory),
      mainProtein: str(data.mainProtein),
      ingredients: ingredientNames(data.ingredients),
      sources: ["page"],
      alsoListedIn: [],
    });
  }
}

const unresolvedListings: string[] = [];
for (const { collection, entry } of listings) {
  const id = str(entry.slug) ?? str(entry.id);
  const target = id ? recipes.find((r) => r.id === id) : undefined;
  if (target) target.alsoListedIn.push(collection);
  else unresolvedListings.push(`${collection}/${id ?? "(no slug)"}`);
}
if (unresolvedListings.length) {
  issues.push(`${unresolvedListings.length} listing entries point to no recipe: ${unresolvedListings.join(", ")}`);
}

function duplicates(key: (r: InventoryRecipe) => string) {
  const groups = new Map<string, InventoryRecipe[]>();
  for (const r of recipes) {
    const k = key(r);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([value, list]) => ({ value, count: list.length, entries: list.map((r) => `${r.collection}/${r.id}`) }));
}

const duplicateIds = duplicates((r) => r.id.toLowerCase());
const duplicateTitles = duplicates((r) => r.name.trim().toLowerCase());

const summary = {
  total: recipes.length,
  byCollection: Object.fromEntries(
    [...new Set(recipes.map((r) => r.collection))].map((c) => [c, recipes.filter((r) => r.collection === c).length]),
  ),
  listingCollections: Object.fromEntries(
    [...new Set(listings.map((l) => l.collection))].map((c) => [c, listings.filter((l) => l.collection === c).length]),
  ),
  indexOnly: recipes.filter((r) => r.sources.length === 1 && r.sources[0] === "index").length,
  pageOnly: recipes.filter((r) => r.sources.length === 1 && r.sources[0] === "page").length,
  missingIngredients: recipes.filter((r) => r.ingredients.length === 0).length,
  missingCuisine: recipes.filter((r) => !r.cuisine).length,
  missingCategory: recipes.filter((r) => !r.category).length,
  missingMainProtein: recipes.filter((r) => !r.mainProtein).length,
  duplicateIdGroups: duplicateIds.length,
  duplicateTitleGroups: duplicateTitles.length,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  JSON.stringify(
    { generatedAt: new Date().toISOString(), source: CATALOG_ROOT, summary, duplicateIds, duplicateTitles, issues, recipes },
    null,
    2,
  ),
);

console.log(
  JSON.stringify(
    {
      out: OUT,
      summary,
      duplicateIds: duplicateIds.slice(0, 15),
      duplicateTitles: duplicateTitles.slice(0, 15),
      issues: issues.map((i) => (i.length > 400 ? `${i.slice(0, 400)}…` : i)),
    },
    null,
    2,
  ),
);
