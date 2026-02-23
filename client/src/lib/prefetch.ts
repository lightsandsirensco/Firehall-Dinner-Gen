import type { GenerateResponse } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { buildFilterKey, putCached, getAllCached, removeCached } from "@/lib/recipe-cache";

const POOL_SIZE = 2;
let activeFetches = 0;
const MAX_CONCURRENT = 2;

export function prefetchMeals(filters: Record<string, unknown>) {
  const filterKey = buildFilterKey(filters);
  const cached = getAllCached(filterKey);
  const needed = POOL_SIZE - cached.length;
  if (needed <= 0 || activeFetches >= MAX_CONCURRENT) return;

  const existingIds = cached.map((r) => r.template_id).filter((id): id is number => id != null);
  const lastUsed = filters.last_template_id as number | undefined;
  if (lastUsed != null && !existingIds.includes(lastUsed)) {
    existingIds.push(lastUsed);
  }

  let prevExclude = existingIds.length > 0 ? existingIds[existingIds.length - 1] : undefined;

  for (let i = 0; i < Math.min(needed, MAX_CONCURRENT - activeFetches); i++) {
    activeFetches++;
    const body = { ...filters };
    if (prevExclude != null) body.last_template_id = prevExclude;

    const capturedExclude = prevExclude;
    apiRequest("POST", "/api/generate", body)
      .then((res) => res.json())
      .then((data: GenerateResponse) => {
        putCached(filterKey, data);
      })
      .catch(() => {})
      .finally(() => {
        activeFetches--;
      });

    if (existingIds.length > 1) {
      prevExclude = existingIds[(existingIds.indexOf(capturedExclude ?? 0) + 1) % existingIds.length];
    }
  }
}

export function consumePrefetched(filters: Record<string, unknown>, excludeTemplateId?: number): GenerateResponse | null {
  const filterKey = buildFilterKey(filters);
  const cached = getAllCached(filterKey);
  const match = cached.find(
    (r) => excludeTemplateId == null || r.template_id !== excludeTemplateId
  );
  if (match && match.template_id != null) {
    removeCached(filterKey, match.template_id);
  }
  return match || null;
}
