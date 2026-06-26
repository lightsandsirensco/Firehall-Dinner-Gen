/**
 * Runtime validation — picked recipe matches requested generator category.
 */
import type { GenerateRequest } from "./schema.js";
import {
  FIREHALL_CATEGORY_RULES,
  type FirehallCategoryId,
  slugMatchesFirehallCategory,
} from "./firehall-categories.js";

export interface CategoryRecipeMeta {
  slug: string;
  totalMinutes: number;
  mealFormat?: string;
  sourceKind?: string;
  categoryKeys: string[];
}

export function recipeMetaMatchesFirehallCategory(
  meta: CategoryRecipeMeta,
  categoryId: FirehallCategoryId,
): { ok: boolean; reason?: string } {
  if (!slugMatchesFirehallCategory(meta.categoryKeys, categoryId)) {
    return { ok: false, reason: `slug ${meta.slug} not tagged fh:${categoryId}` };
  }

  const rules = FIREHALL_CATEGORY_RULES[categoryId];
  if (rules.excludeBreakfast && meta.mealFormat === "breakfast") {
    return { ok: false, reason: `breakfast meal in non-breakfast category ${categoryId}` };
  }

  if (rules.maxMinutes && meta.totalMinutes > rules.maxMinutes + 5) {
    return {
      ok: false,
      reason: `${meta.totalMinutes}min exceeds ${rules.maxMinutes}min for ${categoryId}`,
    };
  }

  if (rules.preferPerformance && meta.sourceKind && !/performance|healthy/i.test(meta.sourceKind)) {
    // Soft rule — tagged recipes still pass; used for ranking not hard reject.
  }

  return { ok: true };
}

export function validatePickForCategory(
  request: GenerateRequest,
  slug: string,
  meta: CategoryRecipeMeta,
): { ok: boolean; reason?: string } {
  if (!request.firehall_category) return { ok: true };
  return recipeMetaMatchesFirehallCategory(meta, request.firehall_category);
}
