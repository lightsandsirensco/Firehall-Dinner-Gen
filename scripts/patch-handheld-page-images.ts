#!/usr/bin/env tsx
/** Sync hero/thumb/mobile/rail paths on handheld batch pages after imagery generation. */
import fs from "node:fs";
import path from "node:path";
import { hallExpansionPageImageSet } from "../shared/hall-expansion/recipe-page-paths.js";

const HANDHELD = [
  "chicken-caesar-wraps",
  "buffalo-chicken-wraps",
  "greek-chicken-pitas",
  "beef-gyros-for-the-hall",
  "chicken-shawarma-pitas",
  "sausage-peppers-on-buns",
] as const;

const PUBLIC = path.join(process.cwd(), "client/public");

for (const slug of HANDHELD) {
  const pagePath = path.join(PUBLIC, "catalog/hall-expansion/pages", `${slug}.json`);
  const images = hallExpansionPageImageSet(slug);
  const page = JSON.parse(fs.readFileSync(pagePath, "utf8")) as Record<string, unknown>;
  Object.assign(page, images);
  fs.writeFileSync(pagePath, `${JSON.stringify(page, null, 2)}\n`, "utf8");
  console.log(`  ✓ ${slug}`);
}

const goldenPath = path.join(PUBLIC, "catalog/golden-100/pages/chicken-dumpling-soup.json");
const g = JSON.parse(fs.readFileSync(goldenPath, "utf8")) as Record<string, unknown>;
g.heroImage = "/images/golden-100/chicken-dumpling-soup.jpg";
g.thumbImage = "/images/thumbs/chicken-dumpling-soup.jpg";
g.mobileImage = "/images/mobile/chicken-dumpling-soup.jpg";
g.railImage = "/images/rails/chicken-dumpling-soup.jpg";
fs.writeFileSync(goldenPath, `${JSON.stringify(g, null, 2)}\n`, "utf8");
console.log("  ✓ chicken-dumpling-soup");

// Refresh hall-expansion index entries
const indexPath = path.join(PUBLIC, "catalog/hall-expansion/index.json");
const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as {
  recipes: Array<Record<string, unknown>>;
};
for (const slug of HANDHELD) {
  const images = hallExpansionPageImageSet(slug);
  const row = index.recipes.find((r) => r.slug === slug);
  if (row) Object.assign(row, images);
}
fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
console.log("[patch-handheld-page-images] index updated");
