import fs from "node:fs";
import path from "node:path";
import type { BreakfastCatalogIndex } from "../../shared/breakfast-schema.js";

const INDEX_PATH = path.join(process.cwd(), "client", "public", "catalog", "breakfast", "index.json");

export function readBreakfastCatalogIndexFromDisk(): BreakfastCatalogIndex | null {
  try {
    const raw = fs.readFileSync(INDEX_PATH, "utf8");
    return JSON.parse(raw) as BreakfastCatalogIndex;
  } catch {
    return null;
  }
}

