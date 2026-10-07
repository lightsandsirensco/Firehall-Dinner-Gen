import { createDefaultGenerateRequest } from "@shared/generate-request-defaults";
import type { ClientRecipeResponse, GenerateRequest } from "@shared/schema";
import { GENERATION_INTENT_PREFETCH } from "@shared/generation-intent";
import { apiRequest } from "@/lib/queryClient";
import {
  buildFilterKey,
  putCached,
  getAllCached,
  removeCachedRecipe,
  buildSignature,
  getRecentSignatures,
} from "@/lib/recipe-cache";
import { getRecentMealSlugs } from "@/lib/meal-rotation-memory";

/** Max background prefetches in flight — keeps burst budget for real clicks */
const POOL_SIZE = 1;
const PREFETCH_DELAY_MS = 4_000;

let activeFetches = 0;
let prefetchEpoch = 0;
let prefetchTimer: ReturnType<typeof setTimeout> | null = null;

const HAS_GENERATED_KEY = "firehall_has_generated";

export function hasUserGeneratedBefore(): boolean {
  try {
    return localStorage.getItem(HAS_GENERATED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markUserHasGenerated(): void {
  try {
    localStorage.setItem(HAS_GENERATED_KEY, "1");
  } catch {}
}

function makePrefetchRequestId(): string {
  return `prefetch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Cancel scheduled + in-flight prefetches (call when user starts a real generation). */
export function cancelActivePrefetches(): void {
  prefetchEpoch++;
  activeFetches = 0;
  if (prefetchTimer) {
    clearTimeout(prefetchTimer);
    prefetchTimer = null;
  }
  if (import.meta.env.DEV) console.log("[Prefetch] Cancelled background prefetches");
}

/**
 * Schedule at most one background prefetch after idle delay.
 * Does NOT run on page load — only after a successful user generation.
 */
export function schedulePrefetchAfterGeneration(filters: Record<string, unknown>): void {
  if (!hasUserGeneratedBefore()) return;

  cancelActivePrefetches();
  const epoch = prefetchEpoch;

  prefetchTimer = setTimeout(() => {
    prefetchTimer = null;
    if (epoch !== prefetchEpoch) return;
    prefetchMeals(filters, epoch);
  }, PREFETCH_DELAY_MS);
}

/** @deprecated Use schedulePrefetchAfterGeneration — no mount-time API spam */
export function prefetchMealsIfReturning(_filters: Record<string, unknown>): void {
  /* intentionally empty — mount prefetch burned rate limits */
}

function prefetchMeals(filters: Partial<GenerateRequest>, epoch: number): void {
  if (epoch !== prefetchEpoch) return;

  const filterKey = buildFilterKey(filters);
  const cached = getAllCached(filterKey);
  const needed = POOL_SIZE - cached.length;
  if (needed <= 0 || activeFetches >= 1) return;

  const existingIds = cached.map((r) => r.template_id).filter((id): id is number => id != null);
  const lastUsed = filters.last_template_id as number | undefined;
  if (lastUsed != null && !existingIds.includes(lastUsed)) {
    existingIds.push(lastUsed);
  }

  const body: GenerateRequest = {
    ...createDefaultGenerateRequest(),
    ...filters,
    generation_intent: GENERATION_INTENT_PREFETCH,
    request_id: makePrefetchRequestId(),
    ...(existingIds.length > 0
      ? { last_template_id: existingIds[existingIds.length - 1] }
      : {}),
  };

  activeFetches++;
  const rid = body.request_id;
  if (import.meta.env.DEV) console.log(`[Prefetch] Start rid=${rid}`);

  const recentSignatures = getRecentSignatures();
  apiRequest("POST", "/api/generate", {
    ...body,
    recentSlugs: getRecentMealSlugs(),
    recentSignatures,
    exclude_signatures: recentSignatures,
  })
    .then((res) => res.json())
    .then((data: ClientRecipeResponse) => {
      if (epoch !== prefetchEpoch) {
        if (import.meta.env.DEV) console.log(`[Prefetch] Discarded stale result rid=${rid}`);
        return;
      }
      putCached(filterKey, data);
      if (import.meta.env.DEV) console.log(`[Prefetch] Cached "${data.title}" rid=${rid}`);
    })
    .catch((err) => {
      if (import.meta.env.DEV) {
        console.log(`[Prefetch] Failed rid=${rid}:`, (err as Error).message?.slice(0, 80));
      }
    })
    .finally(() => {
      activeFetches--;
    });
}

export function consumePrefetched(
  filters: Record<string, unknown>,
  excludeTemplateId?: number,
): ClientRecipeResponse | null {
  const filterKey = buildFilterKey(filters);
  const cached = getAllCached(filterKey);
  const sigSet = new Set(getRecentSignatures());
  const slugSet = new Set(getRecentMealSlugs());
  const alreadySeen = (r: ClientRecipeResponse) =>
    sigSet.has(buildSignature(r)) ||
    slugSet.has(String((r as { _slug?: string })._slug || "").toLowerCase());

  for (const r of cached) {
    if (alreadySeen(r)) removeCachedRecipe(filterKey, r);
  }

  const match = cached.find(
    (r) =>
      !alreadySeen(r) &&
      (excludeTemplateId == null || r.template_id !== excludeTemplateId),
  );
  if (match) removeCachedRecipe(filterKey, match);
  return match ?? null;
}
