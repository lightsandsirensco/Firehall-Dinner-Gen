import type { GenerateRequest, GenerateResponse } from "@shared/schema";
import { loadTemplates, filterTemplates, pickTemplate, chooseProtein } from "./templates";
import { generateRecipe } from "./ai";
import { buildCacheKey, getCachedRecipe, setCachedRecipe } from "./cache-store";
import { log } from "./index";

interface PoolEntry {
  recipe: GenerateResponse;
  cacheKey: string;
  templateId: number;
  estimatedCost: number;
  createdAt: number;
}

const COST_PER_1K_INPUT = 0.00015;
const COST_PER_1K_OUTPUT = 0.0006;
const DEFAULT_POOL_SIZE = 3;
const POOL_ENTRY_MAX_AGE_MS = 30 * 60 * 1000;

const pool: PoolEntry[] = [];
let refillPromise: Promise<void> | null = null;

const DEFAULT_REQUEST: GenerateRequest = {
  crew_size: 6,
  busy_level: "average",
  time_available: "25-40",
  appliances: ["stove", "oven"],
  protein: "any",
  healthiness_preference: "balanced",
  budget_level: "standard",
  cuisine_style: "any",
  allergens_to_avoid: [],
  vegetarian_swap_needed: false,
  use_what_we_have: false,
  ingredients_on_hand: [],
};

function pruneExpired() {
  const now = Date.now();
  for (let i = pool.length - 1; i >= 0; i--) {
    if (now - pool[i].createdAt >= POOL_ENTRY_MAX_AGE_MS) {
      pool.splice(i, 1);
    }
  }
}

function isDuplicateInPool(cacheKey: string): boolean {
  return pool.some((entry) => entry.cacheKey === cacheKey);
}

function isDefaultRequest(request: GenerateRequest): boolean {
  return (
    request.crew_size >= 4 && request.crew_size <= 8 &&
    request.busy_level === "average" &&
    !request.use_what_we_have &&
    request.allergens_to_avoid.length === 0 &&
    !request.vegetarian_swap_needed &&
    (request.budget_level || "standard") === "standard"
  );
}

export function getFromPool(request: GenerateRequest, lastTemplateId?: number): PoolEntry | null {
  if (!isDefaultRequest(request)) return null;

  pruneExpired();

  const requestProtein = request.protein.toLowerCase();

  const validIdx = pool.findIndex(
    (entry) =>
      (!lastTemplateId || entry.templateId !== lastTemplateId) &&
      (requestProtein === "any" || entry.recipe.chosen_protein.toLowerCase() === requestProtein)
  );

  if (validIdx === -1) return null;

  const entry = pool.splice(validIdx, 1)[0];
  log(`Pool HIT — served "${entry.recipe.title}" (protein: ${entry.recipe.chosen_protein}, pool remaining: ${pool.length})`, "pool");

  refillPool();

  return entry;
}

async function doRefill() {
  pruneExpired();
  if (pool.length >= DEFAULT_POOL_SIZE) return;

  const needed = DEFAULT_POOL_SIZE - pool.length;
  log(`Pool refilling: need ${needed} recipes (current: ${pool.length})`, "pool");

  const usedTemplateIds = pool.map((e) => e.templateId);

  for (let i = 0; i < needed; i++) {
    try {
      const templates = await loadTemplates();
      const candidates = filterTemplates(templates, DEFAULT_REQUEST);
      if (candidates.length === 0) break;

      const excludeId = usedTemplateIds.length > 0 ? usedTemplateIds[usedTemplateIds.length - 1] : undefined;
      const chosen = pickTemplate(candidates, excludeId);
      const chosenProtein = chooseProtein(chosen, DEFAULT_REQUEST.protein, DEFAULT_REQUEST.healthiness_preference);
      const cacheKey = buildCacheKey(chosen.template_id, DEFAULT_REQUEST, chosenProtein);

      if (isDuplicateInPool(cacheKey)) {
        log(`Pool dedupe: skipping duplicate cacheKey ${cacheKey}`, "pool");
        continue;
      }

      const cached = getCachedRecipe(cacheKey);
      if (cached) {
        pool.push({
          recipe: cached,
          cacheKey,
          templateId: parseInt(chosen.template_id),
          estimatedCost: 0,
          createdAt: Date.now(),
        });
        usedTemplateIds.push(parseInt(chosen.template_id));
        log(`Pool filled from cache: "${cached.title}"`, "pool");
        continue;
      }

      const { recipe, tokensIn, tokensOut } = await generateRecipe(chosen, DEFAULT_REQUEST, chosenProtein);
      const cost = (tokensIn / 1000) * COST_PER_1K_INPUT + (tokensOut / 1000) * COST_PER_1K_OUTPUT;
      setCachedRecipe(cacheKey, parseInt(chosen.template_id), recipe);

      pool.push({
        recipe,
        cacheKey,
        templateId: parseInt(chosen.template_id),
        estimatedCost: cost,
        createdAt: Date.now(),
      });
      usedTemplateIds.push(parseInt(chosen.template_id));
      log(`Pool filled with new recipe: "${recipe.title}" (~$${cost.toFixed(5)})`, "pool");
    } catch (err: any) {
      log(`Pool refill error: ${err.message}`, "pool");
    }
  }

  log(`Pool ready: ${pool.length} recipes`, "pool");
}

export function refillPool(): Promise<void> {
  if (refillPromise) return refillPromise;

  refillPromise = doRefill().finally(() => {
    refillPromise = null;
  });

  return refillPromise;
}

export function getPoolSize(): number {
  pruneExpired();
  return pool.length;
}
