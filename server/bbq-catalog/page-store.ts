import fs from "node:fs";
import path from "node:path";
import type { GoldenCatalogIndex, GoldenRecipePage } from "../../shared/golden-100/recipe-page-schema.js";

const ROOT = path.join(process.cwd(), "client", "public", "catalog", "bbq");
const PAGES = path.join(ROOT, "pages");

function ensureDirs(): void {
  fs.mkdirSync(PAGES, { recursive: true });
}

export function writeBbqRecipePage(page: GoldenRecipePage): string {
  ensureDirs();
  const outPath = path.join(PAGES, `${page.slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(page, null, 2), "utf8");
  return outPath;
}

export function writeBbqCatalogIndex(index: GoldenCatalogIndex): string {
  ensureDirs();
  const outPath = path.join(ROOT, "index.json");
  fs.writeFileSync(outPath, JSON.stringify(index, null, 2), "utf8");
  return outPath;
}

export function readBbqRecipePageFromDisk(slug: string): GoldenRecipePage | null {
  try {
    const p = path.join(PAGES, `${slug}.json`);
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw) as GoldenRecipePage;
  } catch {
    return null;
  }
}
