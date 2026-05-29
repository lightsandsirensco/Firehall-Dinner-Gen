import type { BreakfastCatalogIndex, BreakfastRecipePage } from "@shared/breakfast-schema";

export async function fetchBreakfastCatalogIndex(): Promise<BreakfastCatalogIndex> {
  const res = await fetch("/catalog/breakfast/index.json", { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Failed breakfast index: ${res.status}`);
  return (await res.json()) as BreakfastCatalogIndex;
}

export async function fetchBreakfastRecipePage(slug: string): Promise<BreakfastRecipePage> {
  const res = await fetch(`/catalog/breakfast/pages/${slug}.json`, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Failed breakfast page: ${res.status}`);
  return (await res.json()) as BreakfastRecipePage;
}

