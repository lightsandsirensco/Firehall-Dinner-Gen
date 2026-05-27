/**
 * Validate master category definitions and assignments.
 */

import type { ZodError } from "zod";
import {
  masterCategoryDefinitionSchema,
  categoryAssignmentSchema,
  recommendationIndexEntrySchema,
} from "./schema.js";
import { MASTER_CATEGORY_DEFINITIONS } from "./definitions.js";
import type { MasterCategoryId } from "./constants.js";
import { MASTER_CATEGORY_IDS } from "./constants.js";

export function formatCategoryValidationErrors(error: ZodError): string[] {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
}

export function validateAllMasterCategoryDefinitions(): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (MASTER_CATEGORY_DEFINITIONS.length !== 12) {
    errors.push(`expected 12 categories, got ${MASTER_CATEGORY_DEFINITIONS.length}`);
  }
  const ids = new Set<string>();
  for (const def of MASTER_CATEGORY_DEFINITIONS) {
    const result = masterCategoryDefinitionSchema.safeParse(def);
    if (!result.success) {
      errors.push(...formatCategoryValidationErrors(result.error));
      continue;
    }
    if (ids.has(def.id)) errors.push(`duplicate id ${def.id}`);
    ids.add(def.id);
  }
  for (const id of MASTER_CATEGORY_IDS) {
    if (!ids.has(id)) errors.push(`missing definition for ${id}`);
  }
  return { ok: errors.length === 0, errors };
}

export function parseCategoryAssignment(input: unknown) {
  return categoryAssignmentSchema.safeParse(input);
}

export function parseRecommendationIndexEntry(input: unknown) {
  return recommendationIndexEntrySchema.safeParse(input);
}

export function isMasterCategoryId(value: string): value is MasterCategoryId {
  return (MASTER_CATEGORY_IDS as readonly string[]).includes(value);
}
