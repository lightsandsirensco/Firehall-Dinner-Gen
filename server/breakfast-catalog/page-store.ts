import fs from "node:fs";
import path from "node:path";
import type { BreakfastCatalogIndex, BreakfastRecipePage } from "../../shared/breakfast-schema.js";

const ROOT = path.join(process.cwd(), "client", "public", "catalog", "breakfast");
const PAGES = path.join(ROOT, "pages");
const PERFORMANCE_ROOT = path.join(ROOT, "performance");

function ensureDirs(): void {
  fs.mkdirSync(PAGES, { recursive: true });
  fs.mkdirSync(PERFORMANCE_ROOT, { recursive: true });
}

export function writeBreakfastRecipePage(page: BreakfastRecipePage): string {
  ensureDirs();
  const outPath = path.join(PAGES, `${page.slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(page, null, 2), "utf8");
  return outPath;
}

export function writeBreakfastCatalogIndex(index: BreakfastCatalogIndex): string {
  ensureDirs();
  const outPath = path.join(ROOT, "index.json");
  fs.writeFileSync(outPath, JSON.stringify(index, null, 2), "utf8");
  return outPath;
}

export function writeBreakfastPerformanceIndex(index: BreakfastCatalogIndex): string {
  ensureDirs();
  const outPath = path.join(PERFORMANCE_ROOT, "index.json");
  fs.writeFileSync(outPath, JSON.stringify(index, null, 2), "utf8");
  return outPath;
}

export function readBreakfastRecipePageFromDisk(slug: string): BreakfastRecipePage | null {
  try {
    const p = path.join(PAGES, `${slug}.json`);
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw) as BreakfastRecipePage;
  } catch {
    return null;
  }
}

export function readBreakfastCatalogIndexFromDisk(): BreakfastCatalogIndex | null {
  try {
    const raw = fs.readFileSync(path.join(ROOT, "index.json"), "utf8");
    return JSON.parse(raw) as BreakfastCatalogIndex;
  } catch {
    return null;
  }
}

export function readBreakfastPerformanceIndexFromDisk(): BreakfastCatalogIndex | null {
  try {
    const raw = fs.readFileSync(path.join(PERFORMANCE_ROOT, "index.json"), "utf8");
    return JSON.parse(raw) as BreakfastCatalogIndex;
  } catch {
    return null;
  }
}
