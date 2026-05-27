/**
 * Structured logging for /api/generate fallback chain.
 */

import { log } from "../logger.js";

export type GenerateFallbackLayer =
  | "curated_editorial"
  | "golden_100"
  | "ai_variation"
  | "cache"
  | "emergency_pool"
  | "spoonacular_live"
  | "ai_live"
  | "template_fallback";

export type GenerateSourceKind = "local" | "cache" | "api" | "ai";

export interface GenerateTelemetry {
  layer: GenerateFallbackLayer;
  sourceKind: GenerateSourceKind;
  durationMs: number;
  cacheHit: boolean;
  aiInvoked: boolean;
  catalogId?: string;
  classicSlug?: string;
  emergencyId?: string;
  detail?: string;
}

export function logGenerateTelemetry(t: GenerateTelemetry): void {
  const fields = [
    `layer=${t.layer}`,
    `source=${t.sourceKind}`,
    `durationMs=${t.durationMs}`,
    `cacheHit=${t.cacheHit}`,
    `ai=${t.aiInvoked}`,
    t.catalogId ? `catalogId=${t.catalogId}` : null,
    t.classicSlug ? `classic=${t.classicSlug}` : null,
    t.emergencyId ? `emergency=${t.emergencyId}` : null,
    t.detail ? `detail=${t.detail}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  log(`[generate:telemetry] ${fields}`, "generate");
}

export function sourceKindForLayer(layer: GenerateFallbackLayer): GenerateSourceKind {
  switch (layer) {
    case "cache":
      return "cache";
    case "spoonacular_live":
      return "api";
    case "ai_live":
    case "ai_variation":
      return "ai";
    default:
      return "local";
  }
}
