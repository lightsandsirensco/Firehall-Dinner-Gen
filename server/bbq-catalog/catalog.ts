import fs from "node:fs";
import path from "node:path";
import type { GoldenCatalogIndex } from "../../shared/golden-100/recipe-page-schema.js";

const INDEX_PATH = path.join(process.cwd(), "client", "public", "catalog", "bbq", "index.json");

export function readBbqCatalogIndexFromDisk(): GoldenCatalogIndex | null {
  try {
    const raw = fs.readFileSync(INDEX_PATH, "utf8");
    return JSON.parse(raw) as GoldenCatalogIndex;
  } catch {
    return null;
  }
}
