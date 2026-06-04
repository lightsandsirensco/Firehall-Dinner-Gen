#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";

type Entry = {
  slug: string;
  title: string;
  category?: string;
  mealFormat?: string;
  protein?: string;
  catalog: string;
};

function loadIndex(catalog: string, p: string): Entry[] {
  const j = JSON.parse(fs.readFileSync(p, "utf8")) as {
    recipes?: Array<Record<string, unknown>>;
    items?: Array<Record<string, unknown>>;
  };
  const rows = j.recipes ?? j.items ?? [];
  return rows.map((r) => ({
    slug: String(r.slug),
    title: String(r.title ?? r.displayTitle ?? ""),
    category: r.category ? String(r.category) : r.masterCategoryId ? String(r.masterCategoryId) : undefined,
    mealFormat: r.mealFormat ? String(r.mealFormat) : undefined,
    protein: r.protein ? String(r.protein) : undefined,
    catalog,
  }));
}

const catalogs: Record<string, string> = {
  golden100: "client/public/catalog/golden-100/index.json",
  performance: "client/public/catalog/performance-meals/index.json",
  breakfast: "client/public/catalog/breakfast/index.json",
  bbq: "client/public/catalog/bbq/index.json",
  hallExpansion: "client/public/catalog/hall-expansion/index.json",
  hall: "client/public/catalog/hall/index.json",
};

const all: Entry[] = [];
for (const [name, p] of Object.entries(catalogs)) {
  if (!fs.existsSync(p)) continue;
  all.push(...loadIndex(name, p));
}

const byCat = new Map<string, number>();
const byFormat = new Map<string, number>();
const byCatalog = new Map<string, number>();
for (const r of all) {
  byCat.set(r.category ?? "unknown", (byCat.get(r.category ?? "unknown") ?? 0) + 1);
  byFormat.set(r.mealFormat ?? "unknown", (byFormat.get(r.mealFormat ?? "unknown") ?? 0) + 1);
  byCatalog.set(r.catalog, (byCatalog.get(r.catalog) ?? 0) + 1);
}

const sandwich = all.filter(
  (r) =>
    r.mealFormat === "sandwich" ||
    /sandwich|hoagie|sub|panini|grilled cheese|club|melt|po.?boy/i.test(r.title) ||
    /sandwich|hoagie|sub|panini/i.test(r.slug),
);
const onePot = all.filter(
  (r) =>
    r.mealFormat === "one_pot" ||
    /one-pot|one_pot|skillet|casserole|dutch|jambalaya|chili-mac/i.test(r.slug) ||
    /one pot|skillet|casserole/i.test(r.title),
);
const rookie = all.filter((r) => r.category === "rookie_friendly");
const breakfastOnly = all.filter((r) => r.catalog === "breakfast");
const bbqOnly = all.filter((r) => r.catalog === "bbq");
const perfOnly = all.filter((r) => r.catalog === "performance");

console.log(JSON.stringify({
  total: all.length,
  byCatalog: Object.fromEntries([...byCatalog.entries()].sort((a, b) => b[1] - a[1])),
  byCategory: Object.fromEntries([...byCat.entries()].sort((a, b) => b[1] - a[1])),
  byMealFormat: Object.fromEntries([...byFormat.entries()].sort((a, b) => b[1] - a[1])),
  priorityGaps: {
    breakfastCatalog: breakfastOnly.length,
    rookieFriendlyTagged: rookie.length,
    sandwichHeuristic: sandwich.length,
    bbqCatalog: bbqOnly.length,
    performanceCatalog: perfOnly.length,
    onePotHeuristic: onePot.length,
  },
  rookieSlugs: rookie.map((r) => r.slug),
  breakfastSlugsSample: breakfastOnly.slice(0, 15).map((r) => r.slug),
}, null, 2));

// export slug list for dedupe
fs.writeFileSync(
  path.join("review", "catalog-slugs-expansion-dedupe.json"),
  JSON.stringify(all.map((r) => ({ slug: r.slug, title: r.title, catalog: r.catalog })), null, 2),
);
