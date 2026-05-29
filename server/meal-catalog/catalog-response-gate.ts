/**
 * Server-side catalog response enforcement + telemetry.
 */

import type { GenerateResponse } from "../../shared/schema.js";
import {
  enforceCatalogIdentity,
  evaluateCatalogRecipe,
  isApprovedCatalogSlug,
  type CatalogGateResult,
} from "../../shared/hall-catalog/gate.js";
import { log } from "../logger.js";

export interface CatalogResponseContext {
  slug?: string | null;
  title?: string | null;
  heroImage?: string | null;
  source?: string | null;
  recipeSource?: GenerateResponse["_recipe_source"];
  score?: number | null;
}

export function logCatalogSourceTelemetry(
  result: CatalogGateResult,
  ctx: CatalogResponseContext,
): void {
  log(
    `[catalog-source] slug=${result.slug ?? "none"} title="${(ctx.title || result.catalogTitle || "").slice(0, 60)}" source=${ctx.source ?? "unknown"} matchedBy=${result.matchedBy ?? "none"} score=${result.score ?? "n/a"} isApprovedCatalogRecipe=${result.approved}${result.reasons.length ? ` reasons=[${result.reasons.join(",")}]` : ""}`,
    "catalog",
  );
}

export function evaluateOutboundCatalogRecipe(ctx: CatalogResponseContext): CatalogGateResult {
  const result = evaluateCatalogRecipe(
    {
      slug: ctx.slug,
      title: ctx.title,
      heroImage: ctx.heroImage,
      recipeSource: ctx.recipeSource,
      source: ctx.source,
    },
    { score: ctx.score ?? null },
  );
  logCatalogSourceTelemetry(result, ctx);
  return result;
}

export function applyCatalogGateToClientPayload<T extends Record<string, unknown>>(
  payload: T,
  ctx: CatalogResponseContext,
): T {
  const slug = ctx.slug;
  if (!slug || !isApprovedCatalogSlug(slug)) {
    return payload;
  }

  const gated = enforceCatalogIdentity(payload, slug) as T & {
    catalog_badge: string;
    _slug: string;
    hero_image: string;
    title: string;
    hall_curated?: boolean;
  };
  gated.hall_curated = true;
  delete (gated as Record<string, unknown>)._source;
  delete (gated as Record<string, unknown>)._fallback;
  return gated as T;
}

export function mustApproveCatalogRecipe(ctx: CatalogResponseContext): CatalogGateResult {
  const result = evaluateOutboundCatalogRecipe(ctx);
  if (!result.approved) {
    log(
      `[catalog-source] REJECTED slug=${result.slug ?? "none"} reasons=[${result.reasons.join(",")}]`,
      "catalog",
    );
  }
  return result;
}
