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
import { loadCanonicalCatalogPageForDisplay } from "./canonical-page.js";

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
  if (result.slug && result.reasons.includes("title_mismatch")) {
    const pageTitle = loadCanonicalCatalogPageForDisplay(result.slug)?.title?.trim();
    if (pageTitle && pageTitle === (ctx.title || "").trim()) {
      result.reasons = result.reasons.filter((r) => r !== "title_mismatch");
      result.approved = result.reasons.length === 0;
    }
  }
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
    hero_image_alt?: string;
    hero_image_status?: string;
    title: string;
    hall_curated?: boolean;
  };
  const page = loadCanonicalCatalogPageForDisplay(slug);
  if (page) {
    if (page.title?.trim()) gated.title = page.title.trim();
    if (page.heroVerified && page.heroImage) {
      gated.hero_image = page.heroImage;
      gated.hero_image_alt = page.heroImageAlt || gated.title;
    } else {
      gated.hero_image = "";
      gated.hero_image_status = "unavailable";
    }
  }
  const plate = (gated as Record<string, unknown>).meal_plate as { display_title?: string } | undefined;
  if (plate && typeof plate === "object") {
    (gated as Record<string, unknown>).meal_plate = { ...plate, display_title: gated.title };
  }
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
