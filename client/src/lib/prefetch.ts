import type { GenerateResponse } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { buildFilterKey, putCached, getAllCached } from "@/lib/recipe-cache";

const POOL_SIZE = 2;
let activeFetches = 0;
const MAX_CONCURRENT = 2;

function buildRequestBody(filters: Record<string, unknown>, excludeIds: number[]): Record<string, unknown> {
  const body = { ...filters };
  if (excludeIds.length > 0) {
    body.last_template_id = excludeIds[excludeIds.length - 1];
  }
  return body;
}

export function prefetchMeals(filters: Record<string, unknown>) {
  const filterKey = buildFilterKey(filters);
  const cached = getAllCached(filterKey);
  const needed = POOL_SIZE - cached.length;
  if (needed <= 0 || activeFetches >= MAX_CONCURRENT) return;

  const existingIds = cached.map((r) => r.template_id).filter((id): id is number => id != null);

  for (let i = 0; i < Math.min(needed, MAX_CONCURRENT - activeFetches); i++) {
    activeFetches++;
    const excludeIds = [...existingIds];
    if (i > 0 && existingIds.length > 0) {
      excludeIds.push(existingIds[existingIds.length - 1] + i);
    }
    const body = buildRequestBody(filters, excludeIds);

    apiRequest("POST", "/api/generate", body)
      .then((res) => res.json())
      .then((data: GenerateResponse) => {
        putCached(filterKey, data);
      })
      .catch(() => {})
      .finally(() => {
        activeFetches--;
      });
  }
}

export function consumePrefetched(filters: Record<string, unknown>, excludeTemplateId?: number): GenerateResponse | null {
  const filterKey = buildFilterKey(filters);
  const cached = getAllCached(filterKey);
  const match = cached.find(
    (r) => excludeTemplateId == null || r.template_id !== excludeTemplateId
  );
  return match || null;
}
