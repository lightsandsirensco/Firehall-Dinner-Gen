import type { GoldenCatalogIndex, GoldenRecipePage } from "@shared/golden-100/recipe-page-schema";
import { goldenCatalogIndexPath, goldenPageJsonPath } from "@shared/golden-100/recipe-page-paths";

const API_INDEX = "/api/catalog/golden-100";
const API_PAGE = (slug: string) => `/api/catalog/golden-100/${encodeURIComponent(slug)}`;

export async function fetchGoldenCatalogIndex(): Promise<GoldenCatalogIndex> {
  try {
    const res = await fetch(API_INDEX);
    if (res.ok) return res.json();
  } catch {
    /* static fallback */
  }
  const res = await fetch(goldenCatalogIndexPath());
  if (!res.ok) throw new Error(`Catalog index ${res.status}`);
  return res.json();
}

export async function fetchGoldenRecipePage(slug: string): Promise<GoldenRecipePage> {
  try {
    const res = await fetch(API_PAGE(slug));
    if (res.ok) return res.json();
    if (res.status !== 404) throw new Error(`Recipe ${res.status}`);
  } catch (e) {
    if (e instanceof Error && !e.message.includes("404")) {
      /* try static */
    }
  }
  const res = await fetch(goldenPageJsonPath(slug));
  if (!res.ok) throw new Error("Recipe not found");
  return res.json();
}
