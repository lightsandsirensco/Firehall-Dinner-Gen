/**
 * Recipe trust pipeline — normalize → repair → validate → quality gate.
 * Single entry for server/client-bound recipe payloads.
 */

import type { GenerateResponse } from "../schema.js";
import { normalizeGenerateResponse } from "./normalize.js";
import { repairGenerateResponse } from "./repair.js";
import { validateRecipe, type RecipeValidationReport } from "./validate.js";
import { computeRecipeTrustQuality, type RecipeTrustQualityReport } from "./quality.js";
import {
  createTrustLogBuffer,
  trustLog,
  type RecipeTrustLogEntry,
  type RecipeTrustLogSink,
} from "./logger.js";

export interface RecipeTrustPipelineOptions {
  mealFormat: string;
  protein: string;
  cuisine?: string;
  crewSize?: number;
  heroImagePath?: string;
  importedSource?: boolean;
  legacyValidationOk?: boolean;
  /** Skip repair pass (e.g. already curated) */
  skipRepair?: boolean;
  logSink?: RecipeTrustLogSink;
}

export interface RecipeTrustPipelineResult {
  sendable: boolean;
  recipe: GenerateResponse;
  validation: RecipeValidationReport;
  quality: RecipeTrustQualityReport;
  repairs: string[];
  logs: RecipeTrustLogEntry[];
  rejectReasons: string[];
}

export function runRecipeTrustPipeline(
  recipe: GenerateResponse,
  options: RecipeTrustPipelineOptions,
): RecipeTrustPipelineResult {
  const buffer = createTrustLogBuffer();
  const sink = options.logSink || buffer.sink;
  const repairs: string[] = [];
  const rejectReasons: string[] = [];

  const norm = normalizeGenerateResponse(
    recipe,
    {
      mealFormat: options.mealFormat,
      protein: options.protein,
      cuisine: options.cuisine,
      crewSize: options.crewSize,
    },
    sink,
  );
  repairs.push(...norm.repairs);
  let current = norm.recipe;

  let quality = computeRecipeTrustQuality(current, {
    mealFormat: options.mealFormat,
    protein: options.protein,
    heroImagePath: options.heroImagePath,
    importedSource: options.importedSource,
    crewSize: options.crewSize,
  });

  let validation = validateRecipe(current, {
    mealFormat: options.mealFormat,
    protein: options.protein,
    heroImagePath: options.heroImagePath,
    legacyValidationOk: options.legacyValidationOk,
    importedSource: options.importedSource,
  });

  if ((!validation.ok || !quality.pass) && !options.skipRepair) {
    const repaired = repairGenerateResponse(current, validation, quality, {
      mealFormat: options.mealFormat,
      protein: options.protein,
      cuisine: options.cuisine,
    }, sink);
    repairs.push(...repaired.repairs);
    current = repaired.recipe;

    validation = validateRecipe(current, {
      mealFormat: options.mealFormat,
      protein: options.protein,
      heroImagePath: options.heroImagePath,
      legacyValidationOk: options.legacyValidationOk,
      importedSource: options.importedSource,
    });
    quality = computeRecipeTrustQuality(current, {
      mealFormat: options.mealFormat,
      protein: options.protein,
      heroImagePath: options.heroImagePath,
      importedSource: options.importedSource,
      crewSize: options.crewSize,
    });
  }

  if (!validation.ok) {
    for (const e of validation.errors) {
      rejectReasons.push(e.code);
      trustLog(sink, "validate_fail", `${e.code}: ${e.message}`);
    }
  }
  for (const w of validation.warnings) {
    trustLog(sink, "validate_warn", `${w.code}: ${w.message}`);
  }

  if (!quality.pass) {
    rejectReasons.push(...quality.blockingIssues);
    trustLog(sink, "quality_low", `composite=${quality.composite} blocking=${quality.blockingIssues.join(",")}`);
  }

  const sendable =
    (options.importedSource && quality.composite >= 52 && validation.errors.length === 0) ||
    (validation.ok && quality.pass);

  if (!sendable) {
    trustLog(sink, "rejected", rejectReasons.slice(0, 8).join(";") || "trust_gate");
  } else {
    trustLog(sink, "sendable", `composite=${quality.composite} title="${(current.title || "").slice(0, 40)}"`);
  }

  return {
    sendable,
    recipe: current,
    validation,
    quality,
    repairs,
    logs: buffer.entries,
    rejectReasons,
  };
}
