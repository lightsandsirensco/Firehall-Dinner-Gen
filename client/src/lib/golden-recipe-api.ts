import type { GoldenCatalogIndex, GoldenRecipePage } from "@shared/golden-100/recipe-page-schema";
import { goldenCatalogIndexPath, goldenPageJsonPath } from "@shared/golden-100/recipe-page-paths";
import { performanceCatalogIndexPath, performancePageJsonPath } from "@shared/performance-meals/recipe-page-paths";
import { mergeHallCatalogIndexes } from "@shared/meal-catalog/unified-index";
import { hallCatalogIndexPath } from "@shared/hall-catalog/paths";

const API_INDEX = "/api/catalog/golden-100";
const API_PAGE = (slug: string) => `/api/catalog/golden-100/${encodeURIComponent(slug)}`;

async function loadStaticCatalogIndex(): Promise<GoldenCatalogIndex> {
  // Preferred: unified hall file (Golden + Performance, breakfast excluded).
  try {
    const hallRes = await fetch(hallCatalogIndexPath());
    if (hallRes.ok) return hallRes.json();
  } catch {
    /* fall through */
  }

  const goldenRes = await fetch(goldenCatalogIndexPath());
  if (!goldenRes.ok) throw new Error(`Catalog index ${goldenRes.status}`);
  const golden = (await goldenRes.json()) as GoldenCatalogIndex;
  try {
    const perfRes = await fetch(performanceCatalogIndexPath());
    if (perfRes.ok) {
      const performance = (await perfRes.json()) as GoldenCatalogIndex;
      return mergeHallCatalogIndexes(golden, performance);
    }
  } catch {
    /* performance index optional offline */
  }
  return golden;
}

export async function fetchGoldenCatalogIndex(): Promise<GoldenCatalogIndex> {
  try {
    const res = await fetch(API_INDEX);
    if (res.ok) return res.json();
  } catch {
    /* static fallback */
  }
  return loadStaticCatalogIndex();
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
  let res = await fetch(goldenPageJsonPath(slug));
  if (res.ok) return res.json();
  res = await fetch(performancePageJsonPath(slug));
  if (!res.ok) throw new Error("Recipe not found");
  return res.json();
}
