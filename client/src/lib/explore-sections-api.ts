import type { ExploreEditorialSection } from "@shared/explore-editorial";
import { normalizeExploreRecipeList } from "@/lib/explore-recipe";

export interface ExploreSectionsResponse {
  sections: ExploreEditorialSection[];
  _editorial?: boolean;
}

export interface ExploreSectionsParams {
  diet?: string;
  intolerances?: string;
  excludeIngredients?: string;
  seen?: number[];
}

export async function fetchExploreSections(
  params: ExploreSectionsParams = {},
): Promise<ExploreSectionsResponse> {
  const qs = new URLSearchParams();
  if (params.diet) qs.set("diet", params.diet);
  if (params.intolerances) qs.set("intolerances", params.intolerances);
  if (params.excludeIngredients) qs.set("excludeIngredients", params.excludeIngredients);
  if (params.seen?.length) qs.set("seen", params.seen.join(","));

  const res = await fetch(`/api/explore/sections?${qs.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Failed to load explore sections");
  }

  const data = (await res.json()) as ExploreSectionsResponse;
  return {
    ...data,
    sections: (data.sections || []).map((section) => ({
      ...section,
      recipes: normalizeExploreRecipeList(section.recipes || [], `section-${section.id}`),
    })),
  };
}
