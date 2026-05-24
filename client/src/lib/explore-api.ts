/** Normalize Spoonacular recipe ids from search/discover cards. */
export function normalizeExploreRecipeId(id: unknown): number | null {
  const n = typeof id === "number" ? id : parseInt(String(id), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseApiMessage(text: string): string {
  try {
    const json = JSON.parse(text);
    if (typeof json.message === "string") return json.message;
  } catch {
    /* plain text */
  }
  return text || "Request failed";
}

export interface ExploreRecipeDetail {
  id: number;
  title: string;
  image: string;
  imageAlt?: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  summary: string;
  cuisines: string[];
  diets: string[];
  dishTypes: string[];
  ingredients: { name: string; amount: number; unit: string; original: string }[];
  steps: { number: number; step: string }[];
  macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

async function fetchWithRetry(url: string, attempts = 2): Promise<Response> {
  let lastRes: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, { credentials: "include" });
    lastRes = res;
    if (res.ok || res.status === 400 || res.status === 404) return res;
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  return lastRes!;
}

import { normalizeExploreRecipeDetail } from "@/lib/explore-recipe";

/** Fetch full recipe detail for Explore — image always tied to recipe id. */
export async function fetchExploreRecipeDetail(recipeId: number): Promise<ExploreRecipeDetail> {
  const validId = normalizeExploreRecipeId(recipeId);
  if (validId === null) {
    console.warn("[explore] Invalid recipe id — skipping detail fetch:", recipeId);
    throw new Error("Invalid recipe ID. Please pick another recipe from the list.");
  }

  const url = `/api/explore/recipe/${validId}?nutrition=true`;
  console.debug("[explore] Detail request:", { recipeId: validId, url });

  const res = await fetchWithRetry(url);
  console.debug("[explore] Detail response:", { recipeId: validId, status: res.status, ok: res.ok });

  if (!res.ok) {
    const text = await res.text();
    const message = parseApiMessage(text);
    console.warn("[explore] Detail fetch failed:", { recipeId: validId, status: res.status, message });
    throw new Error(message);
  }

  const data = normalizeExploreRecipeDetail(
    (await res.json()) as ExploreRecipeDetail,
    "client-detail",
  ) as ExploreRecipeDetail;

  if (data.id !== validId) {
    console.warn("[explore] Detail id mismatch:", { requested: validId, received: data.id });
  }

  console.debug("[explore] Detail parsed:", {
    recipeId: validId,
    id: data?.id,
    title: data?.title,
    ingredients: data?.ingredients?.length ?? 0,
    steps: data?.steps?.length ?? 0,
  });
  return data;
}
