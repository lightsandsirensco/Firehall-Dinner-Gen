import type { FuelCatalogIndex, FuelRecipePage } from "@shared/fuel-catalog/schema";
import { smoothieCatalogIndexPath, smoothiePageJsonPath } from "@shared/fuel-catalog/paths";
import {
  performanceCatalogIndexPath,
  performancePageJsonPath,
} from "@shared/performance-meals/recipe-page-paths";
import type { GoldenCatalogIndex, GoldenRecipePage } from "@shared/golden-100/recipe-page-schema";

const API_SMOOTHIE_INDEX = "/api/catalog/smoothies";
const API_SMOOTHIE_PAGE = (slug: string) =>
  `/api/catalog/smoothies/${encodeURIComponent(slug)}`;
const API_PERFORMANCE_INDEX = "/api/catalog/performance-meals";
const API_PERFORMANCE_PAGE = (slug: string) =>
  `/api/catalog/performance-meals/${encodeURIComponent(slug)}`;

export async function fetchSmoothieCatalogIndex(): Promise<FuelCatalogIndex> {
  try {
    const res = await fetch(API_SMOOTHIE_INDEX);
    if (res.ok) return res.json();
  } catch {
    /* static fallback */
  }
  const res = await fetch(smoothieCatalogIndexPath());
  if (!res.ok) throw new Error(`Smoothie catalog ${res.status}`);
  return res.json();
}

export async function fetchSmoothieRecipePage(slug: string): Promise<FuelRecipePage> {
  try {
    const res = await fetch(API_SMOOTHIE_PAGE(slug));
    if (res.ok) return res.json();
    if (res.status !== 404) throw new Error(`Smoothie ${res.status}`);
  } catch {
    /* static */
  }
  const res = await fetch(smoothiePageJsonPath(slug));
  if (!res.ok) throw new Error("Smoothie not found");
  return res.json();
}

export async function fetchPerformanceCatalogIndex(): Promise<GoldenCatalogIndex> {
  try {
    const res = await fetch(API_PERFORMANCE_INDEX);
    if (res.ok) return res.json();
  } catch {
    /* static */
  }
  const res = await fetch(performanceCatalogIndexPath());
  if (!res.ok) throw new Error(`Performance catalog ${res.status}`);
  return res.json();
}

export async function fetchPerformanceRecipePage(slug: string): Promise<GoldenRecipePage> {
  try {
    const res = await fetch(API_PERFORMANCE_PAGE(slug));
    if (res.ok) return res.json();
    if (res.status !== 404) throw new Error(`Performance meal ${res.status}`);
  } catch {
    /* static */
  }
  const res = await fetch(performancePageJsonPath(slug));
  if (!res.ok) throw new Error("Performance meal not found");
  return res.json();
}
