/**
 * Production-safe parsing for canonical recipes.
 */

import type { ZodError } from "zod";
import { firehallRecipeSchema } from "./schema.js";
import { normalizeForValidation } from "./normalization.js";
import type { FirehallRecipe, RecipeParseResult } from "./types.js";

export function formatZodRecipeErrors(error: ZodError): {
  errors: string[];
  fieldErrors: Record<string, string[]>;
} {
  const fieldErrors: Record<string, string[]> = {};
  const errors: string[] = [];

  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "recipe";
    const msg = `${path}: ${issue.message}`;
    errors.push(msg);
    if (!fieldErrors[path]) fieldErrors[path] = [];
    fieldErrors[path].push(issue.message);
  }

  return { errors, fieldErrors };
}

export function parseFirehallRecipe(input: unknown): RecipeParseResult {
  const normalized = normalizeForValidation(input);
  const result = firehallRecipeSchema.safeParse(normalized);

  if (result.success) {
    return {
      ok: true,
      data: result.data,
      warnings: normalized.system?.validationStatus === "normalized"
        ? ["recipe_normalized_before_validation"]
        : [],
    };
  }

  const { errors, fieldErrors } = formatZodRecipeErrors(result.error);
  return { ok: false, errors, fieldErrors };
}

/** Parse without normalization — for already-valid catalog rows. */
export function parseFirehallRecipeStrict(input: unknown): RecipeParseResult {
  const result = firehallRecipeSchema.safeParse(input);
  if (result.success) {
    return { ok: true, data: result.data, warnings: [] };
  }
  const { errors, fieldErrors } = formatZodRecipeErrors(result.error);
  return { ok: false, errors, fieldErrors };
}

export function assertFirehallRecipe(input: unknown): FirehallRecipe {
  const parsed = parseFirehallRecipe(input);
  if (!parsed.ok) {
    throw new Error(`Invalid Firehall recipe: ${parsed.errors.slice(0, 5).join("; ")}`);
  }
  return parsed.data;
}

export function isValidFirehallRecipe(input: unknown): input is FirehallRecipe {
  return firehallRecipeSchema.safeParse(input).success;
}
