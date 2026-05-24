/**
 * Promote validated staging rows → recipe_catalog (Explore reads catalog, not staging).
 */

import { getRecipeById } from "../spoonacular.js";
import { convertSpoonacularToGenerateResponse, inferActualProtein } from "../spoonacular-converter.js";
import { upsertCatalogFromV2 } from "../recipe-catalog.js";
import { curatedInsertFromCanonical, curatedInsertFromIngestDraft } from "../curated-recipe-bridge.js";
import { upsertCuratedRecipe } from "../curated-recipe-store.js";
import { buildGenerateResponseFromDraft } from "./build-generate-response.js";
import { log } from "../logger.js";
import type { IngestRecipeDraft } from "../../shared/ingestion/recipe-ingest-schema.js";
import type { GenerateRequest } from "../../shared/schema.js";
import {
  getStagingByFingerprint,
  listStagingByStatus,
  updateStagingStatus,
} from "./ingestion-store.js";
import {
  enrichDraftForExpansion,
  evaluateExpansionPromoteGate,
} from "../expansion/recipe-expansion-service.js";
import { findExistingCuratedForDraft } from "../curated-recipe-store.js";

function defaultHallRequest(draft: IngestRecipeDraft): GenerateRequest {
  const proteinMap: Record<string, GenerateRequest["protein"]> = {
    chicken: "chicken",
    beef: "beef",
    pork: "pork",
    turkey: "turkey",
    seafood: "seafood",
    fish: "fish",
    vegetarian: "vegetarian",
    mixed: "any",
  };
  const mealFormat = (draft.mealFormat || "random") as GenerateRequest["meal_format"];
  return {
    crew_size: Math.max(6, draft.servingsBase || 6),
    busy_level: "average",
    time_available: draft.totalMinutes <= 30 ? "20-30" : "30-45",
    appliances: ["stove", "oven"],
    protein: proteinMap[draft.protein] || "any",
    healthiness_preference: "balanced",
    allergens_to_avoid: [],
    cuisine_style: "any",
    meal_format: mealFormat,
    prefer_different_style: false,
  };
}

async function promotePublisherDraft(draft: IngestRecipeDraft): Promise<boolean> {
  try {
    const withRecipe = {
      ...draft,
      generateResponse: draft.generateResponse || buildGenerateResponseFromDraft(draft),
    };
    const insert = curatedInsertFromIngestDraft(withRecipe);
    insert.status = "published";
    upsertCuratedRecipe(insert);
    updateStagingStatus(draft.fingerprint, "promoted");
    log(`[ingestion] promoted publisher curated:${insert.slug} "${draft.title.slice(0, 40)}"`, "ingestion");
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[ingestion] publisher promote failed "${draft.title}": ${msg}`, "ingestion");
    updateStagingStatus(draft.fingerprint, "rejected", `promote_failed:${msg.slice(0, 80)}`);
    return false;
  }
}

export async function promoteDraftToCatalog(
  draft: IngestRecipeDraft,
  gateOptions: { minQuality?: number; preferPublisherImages?: boolean } = {},
): Promise<boolean> {
  const enriched = enrichDraftForExpansion(draft, draft.trendScore ?? 50);

  const existing = findExistingCuratedForDraft(enriched);
  if (existing?.status === "published") {
    log(`[ingestion] promote skip duplicate "${enriched.title.slice(0, 40)}"`, "ingestion");
    updateStagingStatus(enriched.fingerprint, "promoted");
    return false;
  }

  const gate = evaluateExpansionPromoteGate(enriched, {
    minQuality: gateOptions.minQuality ?? (enriched.source === "publisher" ? 48 : 52),
    preferPublisherImages: gateOptions.preferPublisherImages ?? false,
  });
  if (!gate.accept) {
    log(`[ingestion] promote gated "${enriched.title.slice(0, 40)}" — ${gate.reason}`, "ingestion");
    updateStagingStatus(enriched.fingerprint, "rejected", gate.reason || "expansion_gate");
    return false;
  }

  if (enriched.source === "publisher" && enriched.curatedSlug && (enriched.ingredients?.length || 0) >= 4) {
    return promotePublisherDraft(enriched);
  }

  if (!enriched.spoonacularId || enriched.spoonacularId <= 0) {
    log(`[ingestion] promote skip — no spoonacular id for "${enriched.title}"`, "ingestion");
    return false;
  }

  try {
    const detail = await getRecipeById(enriched.spoonacularId, false);
    const request = defaultHallRequest(enriched);
    const ingredientNames = (detail.extendedIngredients || []).map(
      (i) => i.name || i.original || "",
    );
    const chosenProtein =
      inferActualProtein(detail.title, ingredientNames) || enriched.protein;
    const recipe = convertSpoonacularToGenerateResponse(detail, request, chosenProtein);

    const canonical = await upsertCatalogFromV2({
      request,
      recipe,
      spoonacularId: enriched.spoonacularId,
      originalTitle: enriched.title,
      chosenProtein,
      sourceUrl: enriched.sourceUrl,
      image: enriched.heroImage,
      cuisines: detail.cuisines,
      readyInMinutes: detail.readyInMinutes,
      servings: detail.servings,
    });

    try {
      const insert = curatedInsertFromCanonical(canonical);
      insert.status = "published";
      upsertCuratedRecipe(insert);
    } catch (syncErr: unknown) {
      const syncMsg = syncErr instanceof Error ? syncErr.message : String(syncErr);
      log(`[ingestion] curated-db sync warn: ${syncMsg}`, "ingestion");
    }

    updateStagingStatus(enriched.fingerprint, "promoted");
    log(`[ingestion] promoted catalog spoonacular:${enriched.spoonacularId} "${enriched.title.slice(0, 40)}"`, "ingestion");
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[ingestion] promote failed "${enriched.title}": ${msg}`, "ingestion");
    updateStagingStatus(enriched.fingerprint, "rejected", `promote_failed:${msg.slice(0, 80)}`);
    return false;
  }
}

export async function promoteDraftByFingerprint(fingerprint: string): Promise<boolean> {
  const draft = getStagingByFingerprint(fingerprint);
  if (!draft) return false;
  updateStagingStatus(fingerprint, "validated");
  return promoteDraftToCatalog({ ...draft, fingerprint });
}

export async function promoteValidatedStaging(options: {
  limit?: number;
  minQuality?: number;
}): Promise<number> {
  const limit = options.limit ?? 20;
  const defaultMin = options.minQuality ?? 55;
  const drafts = listStagingByStatus("validated", limit * 2).filter((d) => {
    const min = d.source === "publisher" ? Math.min(defaultMin, 48) : defaultMin;
    return d.qualityScore >= min;
  }).slice(0, limit);

  let promoted = 0;
  for (const draft of drafts) {
    const ok = await promoteDraftToCatalog(draft);
    if (ok) promoted++;
    await new Promise((r) => setTimeout(r, 400));
  }
  return promoted;
}
