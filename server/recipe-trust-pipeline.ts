/**
 * Server adapter for shared recipe trust pipeline — structured logging only.
 */

import type { GenerateResponse } from "@shared/schema";
import {
  runRecipeTrustPipeline,
  type RecipeTrustPipelineResult,
  type RecipeTrustPipelineOptions,
} from "../shared/recipe/pipeline.js";
import type { ValidationResult } from "./validateRecipe.js";
import { log, clip, formatLogFields } from "./logger.js";
import { recordReliabilityEvent } from "./generation-reliability.js";

export type { RecipeTrustPipelineResult, RecipeTrustPipelineOptions };

export function processRecipeTrustPipeline(
  recipe: GenerateResponse,
  validation: ValidationResult,
  options: Omit<RecipeTrustPipelineOptions, "legacyValidationOk" | "logSink"> & {
    importedSource: boolean;
  },
): RecipeTrustPipelineResult {
  const result = runRecipeTrustPipeline(recipe, {
    ...options,
    legacyValidationOk: validation.ok,
    logSink: (entry) => {
      if (entry.event === "rejected" || entry.event === "validate_fail" || entry.event === "quality_low") {
        log(
          `[recipe-trust] ${entry.event} ${formatLogFields({
            detail: clip(entry.detail, 120),
            title: clip(recipe.title || "", 40),
          })}`,
          "generate",
        );
      }
    },
  });

  if (result.repairs.includes("title_repaired") || result.repairs.includes("title_normalized")) {
    recordReliabilityEvent("title_repaired", clip(result.recipe.title || "", 48));
  }
  if (result.repairs.some((r) => r.includes("ingredient"))) {
    recordReliabilityEvent("ingredients_used_filled");
  }
  if (!result.sendable) {
    recordReliabilityEvent("blocked_client_send", result.rejectReasons.slice(0, 5).join(","));
  }

  return result;
}
