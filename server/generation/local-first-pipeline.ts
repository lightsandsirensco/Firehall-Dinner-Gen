/**
 * Local-first /api/generate resolution chain.
 *
 * A. curated editorial recipes
 * B. Golden 100 local recipes
 * C. cached / catalog hits
 * D. seeded emergency fallback pools
 * E. live API (Spoonacular) — last resort, hard timeout → D
 */

import type { GenerateRequest, GenerateResponse } from "@shared/schema";
import { buildCacheKey, getCachedRecipe, setCachedRecipe } from "../cache-store.js";
import { log } from "../logger.js";
import { pickCatalogRecipeForGenerate } from "../recipe-ranker.js";
import { runV2Generate } from "../recipe-engine-v2.js";
import { runCuratedGenerationFallback } from "../curated-generation-fallback.js";
import { runV2Fallback } from "../v2-fallback.js";
import { withTimeout, liveGenerationTimeoutMs } from "../generation-timeout.js";
import { isTemplateFallbackAllowed } from "../recipe-fallback-policy.js";
import { computeSignature, isBlockedByRecentVariety } from "../validateRecipe.js";
import type { RecipeValidationContext } from "../validateRecipe.js";
import { generateCuratedVariation } from "../ai.js";
import { runRealismFirewall } from "./realism-firewall.js";
import {
  pickEditorialCuratedForGenerate,
  pickGolden100ForGenerate,
  type LocalRecipePick,
} from "./pick-local-recipes.js";
import { buildEmergencyFallbackRecipe } from "./emergency-fallback.js";
import {
  logGenerateTelemetry,
  sourceKindForLayer,
  type GenerateFallbackLayer,
  type GenerateTelemetry,
} from "./generation-telemetry.js";

export interface LocalFirstPipelineContext {
  request: GenerateRequest;
  v2SessionKey: string;
  catalogPickOptions: Parameters<typeof pickCatalogRecipeForGenerate>[1];
  varietySeed: number;
  recentSignatures?: string[];
  currentRecipeSignature?: string;
  preferDifferentStyle: boolean;
  startTime: number;
}

export interface LocalFirstPipelineHit {
  layer: GenerateFallbackLayer;
  recipe: GenerateResponse;
  protein: string;
  originalTitle: string;
  extras: Record<string, unknown>;
  cacheKey: string;
  cacheHit: boolean;
  aiInvoked: boolean;
  telemetry: GenerateTelemetry;
  spoonacularId?: number;
}

function hitFromEditorial(
  pick: LocalRecipePick,
  layer: "curated_editorial" | "golden_100",
  ctx: LocalFirstPipelineContext,
): LocalFirstPipelineHit {
  const cacheKey = buildCacheKey("v2", ctx.request, pick.protein);
  setCachedRecipe(cacheKey, 0, pick.recipe);
  return {
    layer,
    recipe: pick.recipe,
    protein: pick.protein,
    originalTitle: pick.originalTitle,
    extras: {
      _source: layer,
      _catalog_id: pick.catalogId,
      _recipe_source: pick.recipeSource,
      _fallback: false,
    },
    cacheKey,
    cacheHit: false,
    aiInvoked: false,
    telemetry: {
      layer,
      sourceKind: sourceKindForLayer(layer),
      durationMs: Date.now() - ctx.startTime,
      cacheHit: false,
      aiInvoked: false,
      catalogId: pick.catalogId,
    },
    spoonacularId: undefined,
  };
}

function trySessionCache(ctx: LocalFirstPipelineContext, protein: string): LocalFirstPipelineHit | null {
  const cacheKey = buildCacheKey("v2", ctx.request, protein);
  const sessionCached = getCachedRecipe(cacheKey);
  if (!sessionCached?.title || sessionCached._fallback || ctx.preferDifferentStyle) {
    return null;
  }

  const varietyCtx: RecipeValidationContext = {
    chosenProtein: protein,
    meal_style: sessionCached.meal_style || ctx.request.meal_format || "random",
    cuisine: ctx.request.cuisine_style || "any",
    appliances: ctx.request.appliances,
    allergens: ctx.request.allergens_to_avoid || [],
    recentSignatures: ctx.recentSignatures,
    currentRecipeSignature: ctx.currentRecipeSignature,
  };

  const sessionSig = computeSignature(sessionCached);
  if (isBlockedByRecentVariety(sessionSig, varietyCtx)) {
    log("[generate:cache] skip: recent variety", "generate");
    return null;
  }

  return {
    layer: "cache",
    recipe: sessionCached,
    protein,
    originalTitle: sessionCached.title,
    extras: {
      _source: "session_cache",
      _recipe_source: sessionCached._recipe_source,
      _fallback: false,
    },
    cacheKey,
    cacheHit: true,
    aiInvoked: false,
    telemetry: {
      layer: "cache",
      sourceKind: "cache",
      durationMs: Date.now() - ctx.startTime,
      cacheHit: true,
      aiInvoked: false,
      detail: "session_cache",
    },
  };
}

function tryCatalogCache(ctx: LocalFirstPipelineContext): LocalFirstPipelineHit | null {
  if (ctx.preferDifferentStyle) return null;
  const catalogHit = pickCatalogRecipeForGenerate(ctx.request, ctx.catalogPickOptions);
  if (!catalogHit?.recipe?.title) return null;

  const sig = computeSignature(catalogHit.recipe);
  if (
    ctx.currentRecipeSignature &&
    sig === ctx.currentRecipeSignature
  ) {
    return null;
  }
  if (ctx.recentSignatures?.includes(sig)) {
    return null;
  }

  const cacheKey = buildCacheKey("v2", ctx.request, catalogHit.protein);
  setCachedRecipe(cacheKey, 0, catalogHit.recipe);

  return {
    layer: "cache",
    recipe: catalogHit.recipe,
    protein: catalogHit.protein,
    originalTitle: catalogHit.originalTitle,
    extras: {
      _source: "catalog",
      _spoonacular_title: catalogHit.originalTitle,
      _catalog_id: catalogHit.catalogId,
      _recipe_source: catalogHit.recipeSource,
      _fallback: false,
    },
    cacheKey,
    cacheHit: true,
    aiInvoked: false,
    telemetry: {
      layer: "cache",
      sourceKind: "cache",
      durationMs: Date.now() - ctx.startTime,
      cacheHit: true,
      aiInvoked: false,
      catalogId: catalogHit.catalogId,
      detail: "catalog",
    },
    spoonacularId: catalogHit.spoonacularId,
  };
}

function emergencyHit(ctx: LocalFirstPipelineContext, reason: string): LocalFirstPipelineHit {
  const varietySeed = `${reason}:${ctx.varietySeed}:${ctx.request.protein}`;
  const built = buildEmergencyFallbackRecipe(ctx.request, varietySeed);
  const cacheKey = buildCacheKey("v2", ctx.request, built.protein);
  setCachedRecipe(cacheKey, 0, built.recipe);

  return {
    layer: "emergency_pool",
    recipe: built.recipe,
    protein: built.protein,
    originalTitle: built.recipe.title || built.seed.title,
    extras: {
      _fallback: true,
      _source: "emergency_pool",
      _recipe_source: built.recipeSource,
      _emergency_id: built.emergencyId,
    },
    cacheKey,
    cacheHit: false,
    aiInvoked: false,
    telemetry: {
      layer: "emergency_pool",
      sourceKind: "local",
      durationMs: Date.now() - ctx.startTime,
      cacheHit: false,
      aiInvoked: false,
      emergencyId: built.emergencyId,
      detail: reason,
    },
  };
}

async function tryLiveApis(ctx: LocalFirstPipelineContext): Promise<LocalFirstPipelineHit | null> {
  const liveMs = liveGenerationTimeoutMs();

  try {
    const v2Result = await withTimeout("spoonacular_v2", liveMs, () =>
      runV2Generate(ctx.request, { sessionKey: ctx.v2SessionKey }),
    );

    if (v2Result?.recipe?.title) {
      const cacheKey = buildCacheKey("v2", ctx.request, v2Result.protein);
      setCachedRecipe(cacheKey, 0, v2Result.recipe);
      return {
        layer: "spoonacular_live",
        recipe: v2Result.recipe,
        protein: v2Result.protein,
        originalTitle: v2Result.originalTitle,
        extras: {
          _source: "spoonacular_v2",
          _spoonacular_title: v2Result.originalTitle,
          _catalog_id: v2Result.catalogId,
          _recipe_source: v2Result.recipeSource,
          _fallback: false,
        },
        cacheKey,
        cacheHit: false,
        aiInvoked: false,
        telemetry: {
          layer: "spoonacular_live",
          sourceKind: "api",
          durationMs: Date.now() - ctx.startTime,
          cacheHit: false,
          aiInvoked: false,
          catalogId: v2Result.catalogId,
        },
        spoonacularId: v2Result.spoonacularId,
      };
    }

    const v2Relaxed = await withTimeout("spoonacular_v2_relaxed", liveMs, () =>
      runV2Generate(ctx.request, { sessionKey: ctx.v2SessionKey, relaxed: true }),
    );

    if (v2Relaxed?.recipe?.title) {
      const cacheKey = buildCacheKey("v2", ctx.request, v2Relaxed.protein);
      setCachedRecipe(cacheKey, 0, v2Relaxed.recipe);
      return {
        layer: "spoonacular_live",
        recipe: v2Relaxed.recipe,
        protein: v2Relaxed.protein,
        originalTitle: v2Relaxed.originalTitle,
        extras: {
          _source: "spoonacular_v2_relaxed",
          _spoonacular_title: v2Relaxed.originalTitle,
          _catalog_id: v2Relaxed.catalogId,
          _recipe_source: v2Relaxed.recipeSource,
          _fallback: false,
        },
        cacheKey,
        cacheHit: false,
        aiInvoked: false,
        telemetry: {
          layer: "spoonacular_live",
          sourceKind: "api",
          durationMs: Date.now() - ctx.startTime,
          cacheHit: false,
          aiInvoked: false,
          catalogId: v2Relaxed.catalogId,
          detail: "relaxed",
        },
        spoonacularId: v2Relaxed.spoonacularId,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[generate:live] API failed or timed out (${liveMs}ms): ${msg} — local fallback`, "generate");
  }

  try {
    const curated = await withTimeout("curated_fallback", 8_000, () =>
      runCuratedGenerationFallback(ctx.request, ctx.recentSignatures || [], "live_exhausted"),
    );
    if (curated?.recipe?.title) {
      return {
        layer: "cache",
        recipe: curated.recipe,
        protein: curated.protein,
        originalTitle: curated.recipe.title,
        extras: {
          _fallback: true,
          _source: "curated_fallback",
          _recipe_source: curated.recipeSource,
          _catalog_id: curated.catalogId,
          _classic_slug: curated.classicSlug,
        },
        cacheKey: buildCacheKey("v2", ctx.request, curated.protein),
        cacheHit: false,
        aiInvoked: false,
        telemetry: {
          layer: "cache",
          sourceKind: "local",
          durationMs: Date.now() - ctx.startTime,
          cacheHit: false,
          aiInvoked: false,
          catalogId: curated.catalogId,
          classicSlug: curated.classicSlug,
          detail: "curated_fallback",
        },
      };
    }
  } catch {
    /* fall through */
  }

  if (isTemplateFallbackAllowed()) {
    try {
      const fb = await withTimeout("template_fallback", 8_000, () =>
        runV2Fallback(ctx.request, "live_exhausted", ctx.recentSignatures || []),
      );
      const fbExtras = {
        _fallback: true,
        _source: "template_fallback",
        _recipe_source: fb.recipeSource,
      };
      const fbFw = runRealismFirewall(
        { ...fb.recipe, _fallback: true, meal_style: fb.structureDisplay },
        fbExtras,
      );
      if (fbFw && !fbFw.pass) {
        log("[generate] template_fallback rejected by realism firewall", "generate");
        return null;
      }
      return {
        layer: "template_fallback",
        recipe: { ...fb.recipe, _fallback: true, meal_style: fb.structureDisplay },
        protein: fb.protein,
        originalTitle: fb.recipe.title || "Hall Meal",
        extras: fbExtras,
        cacheKey: buildCacheKey("v2", ctx.request, fb.protein),
        cacheHit: false,
        aiInvoked: false,
        telemetry: {
          layer: "template_fallback",
          sourceKind: "local",
          durationMs: Date.now() - ctx.startTime,
          cacheHit: false,
          aiInvoked: false,
          detail: "template",
        },
      };
    } catch {
      /* emergency below */
    }
  }

  return null;
}

/**
 * Resolve a meal through the full local-first chain. Always returns a usable hit.
 */
export async function runLocalFirstGeneratePipeline(
  ctx: LocalFirstPipelineContext,
): Promise<LocalFirstPipelineHit> {
  const defaultProtein =
    ctx.request.protein === "any" ? "chicken" : (ctx.request.protein || "chicken");

  const golden = pickGolden100ForGenerate(ctx.request, {
    recentSignatures: ctx.recentSignatures,
    currentRecipeSignature: ctx.currentRecipeSignature,
    varietySeed: `golden:${ctx.varietySeed}`,
  });
  if (golden) {
    const hit = hitFromEditorial(golden, "golden_100", ctx);
    // Priority 2: AI variations of curated meals when filters mismatch.
    const wantProtein = ctx.request.protein || "any";
    const proteinMismatch = wantProtein !== "any" && wantProtein !== hit.protein;
    const allowVariation = process.env.CURATED_VARIATIONS_ENABLED !== "false";
    if (allowVariation && (proteinMismatch || ctx.request.allergens_to_avoid?.length)) {
      try {
        const chosenProtein = wantProtein === "any" ? hit.protein : wantProtein;
        const budget = ctx.request.budget_level || "standard";
        const variation = await withTimeout("curated_variation", 12_000, () =>
          generateCuratedVariation(hit.recipe, ctx.request, chosenProtein, budget),
        );
        if (variation?.recipe?.title) {
          const variedExtras = {
            _source: "ai_variation",
            _fallback: false,
            _recipe_source: hit.extras._recipe_source,
            _catalog_id: hit.extras._catalog_id,
            _base_source: "golden_100",
          };
          const fw = runRealismFirewall(variation.recipe, variedExtras);
          if (fw && !fw.pass) {
            log(
              `[generate] ai_variation rejected — serving base golden_100 meal`,
              "generate",
            );
            logGenerateTelemetry(hit.telemetry);
            return hit;
          }

          const cacheKey = buildCacheKey("v2", ctx.request, chosenProtein);
          setCachedRecipe(cacheKey, 0, variation.recipe);
          const varied: LocalFirstPipelineHit = {
            layer: "ai_variation",
            recipe: variation.recipe,
            protein: chosenProtein,
            originalTitle: variation.recipe.title,
            extras: variedExtras,
            cacheKey,
            cacheHit: false,
            aiInvoked: true,
            telemetry: {
              layer: "ai_variation",
              sourceKind: "ai",
              durationMs: Date.now() - ctx.startTime,
              cacheHit: false,
              aiInvoked: true,
              catalogId: String(hit.extras._catalog_id || ""),
              detail: proteinMismatch ? "protein_swap" : "allergen_or_filters",
            },
          };
          logGenerateTelemetry(varied.telemetry);
          return varied;
        }
      } catch {
        // fall through to serving the base curated meal
      }
    }
    logGenerateTelemetry(hit.telemetry);
    return hit;
  }

  const editorial = pickEditorialCuratedForGenerate(ctx.request, {
    recentSignatures: ctx.recentSignatures,
    currentRecipeSignature: ctx.currentRecipeSignature,
    varietySeed: `editorial:${ctx.varietySeed}`,
  });
  if (editorial) {
    const hit = hitFromEditorial(editorial, "curated_editorial", ctx);
    logGenerateTelemetry(hit.telemetry);
    return hit;
  }

  const sessionHit = trySessionCache(ctx, defaultProtein);
  if (sessionHit) {
    logGenerateTelemetry(sessionHit.telemetry);
    return sessionHit;
  }

  const catalogHit = tryCatalogCache(ctx);
  if (catalogHit) {
    logGenerateTelemetry(catalogHit.telemetry);
    return catalogHit;
  }

  const relaxedCatalog = pickCatalogRecipeForGenerate(ctx.request, {
    ...ctx.catalogPickOptions,
    relaxed: true,
  });
  if (relaxedCatalog?.recipe?.title) {
    const cacheKey = buildCacheKey("v2", ctx.request, relaxedCatalog.protein);
    setCachedRecipe(cacheKey, 0, relaxedCatalog.recipe);
    const hit: LocalFirstPipelineHit = {
      layer: "cache",
      recipe: relaxedCatalog.recipe,
      protein: relaxedCatalog.protein,
      originalTitle: relaxedCatalog.originalTitle,
      extras: {
        _source: "catalog_relaxed",
        _catalog_id: relaxedCatalog.catalogId,
        _recipe_source: relaxedCatalog.recipeSource,
        _fallback: false,
      },
      cacheKey,
      cacheHit: true,
      aiInvoked: false,
      telemetry: {
        layer: "cache",
        sourceKind: "cache",
        durationMs: Date.now() - ctx.startTime,
        cacheHit: true,
        aiInvoked: false,
        catalogId: relaxedCatalog.catalogId,
        detail: "catalog_relaxed",
      },
      spoonacularId: relaxedCatalog.spoonacularId,
    };
    logGenerateTelemetry(hit.telemetry);
    return hit;
  }

  const live = await tryLiveApis(ctx);
  if (live) {
    logGenerateTelemetry(live.telemetry);
    return live;
  }

  const emergency = emergencyHit(ctx, "chain_exhausted");
  logGenerateTelemetry(emergency.telemetry);
  return emergency;
}

/** Unconditional emergency meal — for outer catch blocks. */
export function resolveEmergencyGenerateHit(
  request: GenerateRequest,
  startTime: number,
  reason: string,
): LocalFirstPipelineHit {
  const ctx: LocalFirstPipelineContext = {
    request,
    v2SessionKey: "emergency",
    catalogPickOptions: {},
    varietySeed: Date.now(),
    preferDifferentStyle: false,
    startTime,
  };
  return emergencyHit(ctx, reason);
}
