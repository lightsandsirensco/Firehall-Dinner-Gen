import type { GenerateResponse } from "@shared/schema";

const STORAGE_KEY = "firehall_recipe_cache";
const SIGNATURES_KEY = "firehall_recent_signatures";
const MAX_ENTRIES = 50;
const MAX_SIGNATURES = 10;
const TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  recipe: GenerateResponse;
  ts: number;
}

type CacheMap = Record<string, CacheEntry[]>;

const memoryCache: CacheMap = {};

function sortKey(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj)
    .sort()
    .reduce((acc, k) => {
      const v = obj[k];
      if (Array.isArray(v)) {
        acc[k] = [...v].sort();
      } else {
        acc[k] = v;
      }
      return acc;
    }, {} as Record<string, unknown>);
  return JSON.stringify(sorted);
}

export function buildFilterKey(filters: Record<string, unknown>): string {
  const { last_template_id, request_id, ...rest } = filters;
  return sortKey(rest);
}

function loadDisk(): CacheMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: CacheMap = JSON.parse(raw);
    const now = Date.now();
    for (const key of Object.keys(parsed)) {
      parsed[key] = parsed[key].filter((e) => now - e.ts < TTL_MS);
      if (parsed[key].length === 0) delete parsed[key];
    }
    return parsed;
  } catch {
    return {};
  }
}

function saveDisk(cache: CacheMap) {
  try {
    let total = 0;
    for (const entries of Object.values(cache)) total += entries.length;
    if (total > MAX_ENTRIES) {
      const all: { key: string; idx: number; ts: number }[] = [];
      for (const [key, entries] of Object.entries(cache)) {
        entries.forEach((e, idx) => all.push({ key, idx, ts: e.ts }));
      }
      all.sort((a, b) => a.ts - b.ts);
      const toRemove = all.slice(0, total - MAX_ENTRIES);
      for (const r of toRemove) {
        cache[r.key] = cache[r.key].filter((_, i) => i !== r.idx);
        if (cache[r.key].length === 0) delete cache[r.key];
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {}
}

function ensureMemory() {
  if (Object.keys(memoryCache).length === 0) {
    const disk = loadDisk();
    Object.assign(memoryCache, disk);
  }
}

export function buildSignature(recipe: GenerateResponse): string {
  const title = (recipe.title || "").toLowerCase().trim();
  const protein = (recipe.chosen_protein || "").toLowerCase().trim();
  const cuisine = (recipe.tags?.cuisine || "").toLowerCase().trim();
  const baseCarb = (recipe.tags?.base_carb || "").toLowerCase().trim();
  const method = (recipe.tags?.cooking_method || "").toLowerCase().trim();
  return `${title}|${protein}|${cuisine}|${baseCarb}|${method}`;
}

export function getRecentSignatures(): string[] {
  try {
    const raw = localStorage.getItem(SIGNATURES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function addRecentSignature(recipe: GenerateResponse) {
  const sig = buildSignature(recipe);
  const sigs = getRecentSignatures().filter((s) => s !== sig);
  sigs.unshift(sig);
  try {
    localStorage.setItem(SIGNATURES_KEY, JSON.stringify(sigs.slice(0, MAX_SIGNATURES)));
  } catch {}
}

export function getCached(filterKey: string, excludeTemplateId?: number, excludeSignatures?: string[]): GenerateResponse | null {
  ensureMemory();
  const entries = memoryCache[filterKey];
  if (!entries || entries.length === 0) return null;
  const now = Date.now();
  const sigSet = new Set(excludeSignatures || []);
  const valid = entries.filter(
    (e) =>
      now - e.ts < TTL_MS &&
      (excludeTemplateId == null || e.recipe.template_id !== excludeTemplateId) &&
      !sigSet.has(buildSignature(e.recipe))
  );
  if (valid.length === 0) return null;
  const pick = valid[Math.floor(Math.random() * valid.length)];
  return pick.recipe;
}

export function getAllCached(filterKey: string): GenerateResponse[] {
  ensureMemory();
  const entries = memoryCache[filterKey];
  if (!entries) return [];
  const now = Date.now();
  return entries.filter((e) => now - e.ts < TTL_MS).map((e) => e.recipe);
}

export function removeCached(filterKey: string, templateId: number) {
  ensureMemory();
  const entries = memoryCache[filterKey];
  if (!entries) return;
  memoryCache[filterKey] = entries.filter((e) => e.recipe.template_id !== templateId);
  if (memoryCache[filterKey].length === 0) delete memoryCache[filterKey];
  saveDisk(memoryCache);
}

export function putCached(filterKey: string, recipe: GenerateResponse) {
  ensureMemory();
  if (!memoryCache[filterKey]) memoryCache[filterKey] = [];
  const sig = buildSignature(recipe);
  const exists = memoryCache[filterKey].some(
    (e) => e.recipe.template_id === recipe.template_id || buildSignature(e.recipe) === sig
  );
  if (exists) return;
  memoryCache[filterKey].push({ recipe, ts: Date.now() });
  saveDisk(memoryCache);
}
