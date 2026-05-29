import type { EditorialArticle, EditorialCatalogIndex } from "@shared/editorial/content-schema";
import { editorialIndexPath, editorialPagePath } from "@shared/editorial/content-paths";

const API_INDEX = "/api/content/guides";
const API_PAGE = (slug: string) => `/api/content/guides/${encodeURIComponent(slug)}`;

export async function fetchEditorialIndex(): Promise<EditorialCatalogIndex> {
  try {
    const res = await fetch(API_INDEX);
    if (res.ok) return res.json();
  } catch {
    /* static fallback */
  }
  const res = await fetch(editorialIndexPath());
  if (!res.ok) throw new Error(`Guides index ${res.status}`);
  return res.json();
}

export async function fetchEditorialArticle(slug: string): Promise<EditorialArticle> {
  try {
    const res = await fetch(API_PAGE(slug));
    if (res.ok) return res.json();
    if (res.status !== 404) throw new Error(`Guide ${res.status}`);
  } catch {
    /* static */
  }
  const res = await fetch(editorialPagePath(slug));
  if (!res.ok) throw new Error("Guide not found");
  return res.json();
}
