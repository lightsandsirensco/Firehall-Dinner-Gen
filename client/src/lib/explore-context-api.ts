/**
 * Lightweight recommendation context from the server (no extra feed compute).
 */

export interface ContextualCategorySuggestion {
  categoryId: string;
  displayName: string;
  reason: string;
  score: number;
}

export interface ExploreContextResponse {
  engineVersion: number;
  timeSlot: string;
  suggestions: ContextualCategorySuggestion[];
  hooks: string[];
}

export async function fetchExploreRecommendationContext(params?: {
  crewSize?: number;
  maxReadyMinutes?: number;
  performanceMode?: number;
}): Promise<ExploreContextResponse | null> {
  try {
    const qs = new URLSearchParams();
    if (params?.crewSize) qs.set("crew_size", String(params.crewSize));
    if (params?.maxReadyMinutes) qs.set("max_ready_minutes", String(params.maxReadyMinutes));
    if (params?.performanceMode != null) qs.set("performance_mode", String(params.performanceMode));

    const res = await fetch(`/api/recommendations/context?${qs.toString()}`);
    if (!res.ok) return null;
    return (await res.json()) as ExploreContextResponse;
  } catch {
    return null;
  }
}
