import { log } from "./index";

const SPOONACULAR_BASE = "https://api.spoonacular.com";
const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DETAIL_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHE_SIZE = 500;
const DEFAULT_RESULTS_PER_REQUEST = 5;

const apiCache = new Map<string, { data: any; expires: number; ttl: number }>();

function getCached<T>(key: string): T | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    apiCache.delete(key);
    const expiresLabel = key.startsWith("detail:") ? "7d" : "24h";
    log(`[spoonacular-cache] Expired (TTL ${expiresLabel}): ${key.substring(0, 80)}`, "spoonacular");
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: any, ttlMs: number): void {
  if (apiCache.size >= MAX_CACHE_SIZE) {
    let oldestKey: string | null = null;
    let oldestExpires = Infinity;
    for (const [k, v] of apiCache) {
      if (v.expires < oldestExpires) {
        oldestExpires = v.expires;
        oldestKey = k;
      }
    }
    if (oldestKey) apiCache.delete(oldestKey);
  }
  const expires = Date.now() + ttlMs;
  apiCache.set(key, { data, expires, ttl: ttlMs });
  const expiresAt = new Date(expires).toISOString();
  log(`[spoonacular-cache] Stored: ${key.substring(0, 80)} | expires=${expiresAt}`, "spoonacular");
}

function getApiKey(): string {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) {
    throw new Error("SPOONACULAR_API_KEY is not configured. Please add it to your Replit secrets.");
  }
  return key;
}

export function getSpoonacularCacheStats(): { size: number; searchEntries: number; detailEntries: number } {
  let searchEntries = 0;
  let detailEntries = 0;
  for (const [key] of apiCache) {
    if (key.startsWith("search:")) searchEntries++;
    else if (key.startsWith("detail:")) detailEntries++;
  }
  return { size: apiCache.size, searchEntries, detailEntries };
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

export interface SearchOptions {
  cuisine?: string;
  diet?: string;
  type?: string;
  maxReadyTime?: number;
  number?: number;
  offset?: number;
  intolerances?: string;
  excludeIngredients?: string;
  includeIngredients?: string;
  equipment?: string;
  minServings?: number;
  maxServings?: number;
  sort?: string;
}

export async function searchRecipes(query: string, options: SearchOptions = {}): Promise<SpoonacularSearchResponse> {
  const apiKey = getApiKey();
  const requestCount = options.number || DEFAULT_RESULTS_PER_REQUEST;
  const params = new URLSearchParams({
    apiKey,
    query,
    number: String(requestCount),
    offset: String(options.offset || 0),
    addRecipeInformation: "true",
    fillIngredients: "false",
  });

  if (options.cuisine) params.set("cuisine", options.cuisine);
  if (options.diet) params.set("diet", options.diet);
  if (options.type) params.set("type", options.type);
  if (options.maxReadyTime) params.set("maxReadyTime", String(options.maxReadyTime));
  if (options.intolerances) params.set("intolerances", options.intolerances);
  if (options.excludeIngredients) params.set("excludeIngredients", options.excludeIngredients);
  if (options.includeIngredients) params.set("includeIngredients", options.includeIngredients);
  if (options.equipment) params.set("equipment", options.equipment);
  if (options.minServings) params.set("minServings", String(options.minServings));
  if (options.maxServings) params.set("maxServings", String(options.maxServings));
  if (options.sort) params.set("sort", options.sort);

  const cacheParams = new URLSearchParams(params);
  cacheParams.delete("apiKey");
  const cacheKey = `search:${cacheParams}`;
  const cached = getCached<SpoonacularSearchResponse>(cacheKey);
  if (cached) {
    log(`[spoonacular-cache] HIT search (${cached.results.length} results): query="${query}" | Spoonacular API called=no`, "spoonacular");
    return cached;
  }

  log(`[spoonacular-cache] MISS search: query="${query}" | Spoonacular API called=yes`, "spoonacular");
  const url = `${SPOONACULAR_BASE}/recipes/complexSearch?${params}`;
  log(`[spoonacular] Searching: query="${query}" cuisine=${options.cuisine || "any"} diet=${options.diet || "any"} limit=${requestCount}`, "spoonacular");

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
  log(`[spoonacular] Search returned ${result.results.length} recipes (total available: ${result.totalResults})`, "spoonacular");
  setCache(cacheKey, result, SEARCH_CACHE_TTL_MS);
  return result;
}

export async function getRecipeById(id: number, includeNutrition: boolean = false): Promise<SpoonacularRecipeDetail> {
  const cacheKey = `detail:${id}:nutrition=${includeNutrition}`;
  const cached = getCached<SpoonacularRecipeDetail>(cacheKey);
  if (cached) {
    log(`[spoonacular-cache] HIT detail: id=${id} | Spoonacular API called=no`, "spoonacular");
    return cached;
  }

  const apiKey = getApiKey();
  const nutritionParam = includeNutrition ? "true" : "false";
  const url = `${SPOONACULAR_BASE}/recipes/${id}/information?apiKey=${apiKey}&includeNutrition=${nutritionParam}`;

  log(`[spoonacular-cache] MISS detail: id=${id} | Spoonacular API called=yes | includeNutrition=${includeNutrition}`, "spoonacular");

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    log(`[spoonacular] Detail fetch failed: ${res.status} ${text}`, "spoonacular");
    throw new Error(`Spoonacular API error: ${res.status}`);
  }

  const data = await res.json();
  setCache(cacheKey, data, DETAIL_CACHE_TTL_MS);
  return data;
}

/**
 * Fetch full recipe details for a single recipe by id.
 * This is the V2 engine's primary detail fetch — called only for the selected candidate.
 */
export async function getRecipeDetails(id: number, includeNutrition: boolean = true): Promise<SpoonacularRecipeDetail> {
  return getRecipeById(id, includeNutrition);
}

export async function getRandomRecipes(tags?: string, number: number = 5): Promise<SpoonacularRecipeDetail[]> {
  const cacheKey = `random:${tags || "none"}:${number}`;
  const cached = getCached<SpoonacularRecipeDetail[]>(cacheKey);
  if (cached) {
    log(`[spoonacular-cache] HIT random: tags=${tags || "none"} (${cached.length} recipes) | Spoonacular API called=no`, "spoonacular");
    return cached;
  }

  const apiKey = getApiKey();
  const params = new URLSearchParams({
    apiKey,
    number: String(number),
  });
  if (tags) params.set("tags", tags);

  const url = `${SPOONACULAR_BASE}/recipes/random?${params}`;
  log(`[spoonacular-cache] MISS random: tags=${tags || "none"} | Spoonacular API called=yes`, "spoonacular");

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    log(`[spoonacular] Random fetch failed: ${res.status} ${text}`, "spoonacular");
    throw new Error(`Spoonacular API error: ${res.status}`);
  }

  const data = await res.json();
  const recipes = data.recipes || [];
  log(`[spoonacular] Random returned ${recipes.length} recipes`, "spoonacular");
  setCache(cacheKey, recipes, SEARCH_CACHE_TTL_MS);
  return recipes;
}
