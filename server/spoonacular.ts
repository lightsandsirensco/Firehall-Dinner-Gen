import { log } from "./index";

const SPOONACULAR_BASE = "https://api.spoonacular.com";
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_SIZE = 200;

const apiCache = new Map<string, { data: any; expires: number }>();

function getCached<T>(key: string): T | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    apiCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: any): void {
  if (apiCache.size >= MAX_CACHE_SIZE) {
    const oldest = apiCache.keys().next().value;
    if (oldest) apiCache.delete(oldest);
  }
  apiCache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

function getApiKey(): string {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) {
    throw new Error("SPOONACULAR_API_KEY is not configured. Please add it to your Replit secrets.");
  }
  return key;
}

export interface SpoonacularSearchResult {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  summary: string;
}

export interface SpoonacularSearchResponse {
  results: SpoonacularSearchResult[];
  totalResults: number;
}

export interface SpoonacularRecipeDetail {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  summary: string;
  instructions: string;
  extendedIngredients: {
    id: number;
    original: string;
    name: string;
    amount: number;
    unit: string;
  }[];
  analyzedInstructions: {
    name: string;
    steps: {
      number: number;
      step: string;
    }[];
  }[];
  nutrition?: {
    nutrients: {
      name: string;
      amount: number;
      unit: string;
    }[];
  };
  diets: string[];
  cuisines: string[];
  dishTypes: string[];
}

export async function searchRecipes(query: string, options: {
  cuisine?: string;
  diet?: string;
  type?: string;
  maxReadyTime?: number;
  number?: number;
  offset?: number;
} = {}): Promise<SpoonacularSearchResponse> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    apiKey,
    query,
    number: String(options.number || 12),
    offset: String(options.offset || 0),
    addRecipeInformation: "true",
    fillIngredients: "false",
  });

  if (options.cuisine) params.set("cuisine", options.cuisine);
  if (options.diet) params.set("diet", options.diet);
  if (options.type) params.set("type", options.type);
  if (options.maxReadyTime) params.set("maxReadyTime", String(options.maxReadyTime));

  const cacheKey = `search:${params}`;
  const cached = getCached<SpoonacularSearchResponse>(cacheKey);
  if (cached) {
    log(`[spoonacular] Cache hit for search: query="${query}"`, "spoonacular");
    return cached;
  }

  const url = `${SPOONACULAR_BASE}/recipes/complexSearch?${params}`;
  log(`[spoonacular] Searching: query="${query}" cuisine=${options.cuisine || "any"} diet=${options.diet || "any"}`, "spoonacular");

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    log(`[spoonacular] Search failed: ${res.status} ${text}`, "spoonacular");
    throw new Error(`Spoonacular API error: ${res.status}`);
  }

  const data = await res.json();
  const result: SpoonacularSearchResponse = {
    results: (data.results || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      image: r.image || "",
      readyInMinutes: r.readyInMinutes || 0,
      servings: r.servings || 0,
      sourceUrl: r.sourceUrl || "",
      summary: r.summary || "",
    })),
    totalResults: data.totalResults || 0,
  };
  setCache(cacheKey, result);
  return result;
}

export async function getRecipeById(id: number): Promise<SpoonacularRecipeDetail> {
  const cacheKey = `detail:${id}`;
  const cached = getCached<SpoonacularRecipeDetail>(cacheKey);
  if (cached) {
    log(`[spoonacular] Cache hit for recipe detail: id=${id}`, "spoonacular");
    return cached;
  }

  const apiKey = getApiKey();
  const url = `${SPOONACULAR_BASE}/recipes/${id}/information?apiKey=${apiKey}&includeNutrition=true`;

  log(`[spoonacular] Fetching recipe detail: id=${id}`, "spoonacular");

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    log(`[spoonacular] Detail fetch failed: ${res.status} ${text}`, "spoonacular");
    throw new Error(`Spoonacular API error: ${res.status}`);
  }

  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

export async function getRandomRecipes(tags?: string, number: number = 12): Promise<SpoonacularRecipeDetail[]> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    apiKey,
    number: String(number),
  });
  if (tags) params.set("tags", tags);

  const url = `${SPOONACULAR_BASE}/recipes/random?${params}`;
  log(`[spoonacular] Fetching random recipes: tags=${tags || "none"} count=${number}`, "spoonacular");

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    log(`[spoonacular] Random fetch failed: ${res.status} ${text}`, "spoonacular");
    throw new Error(`Spoonacular API error: ${res.status}`);
  }

  const data = await res.json();
  return data.recipes || [];
}
