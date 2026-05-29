/**
 * Per-slug image subject lock — title, plating, cuisine bound to hero assets.
 */

import type { EditorialImageMetadata } from "./editorial-image-metadata.js";
import { inferPlatingType, type PlatingType } from "./plating-type.js";

export const SUBJECT_LOCK_SCHEMA_VERSION = 1 as const;

export interface ImageSubjectLockFields {
  lockedTitle?: string;
  lockedCuisine?: string;
  lockedMealFormat?: string;
  platingType?: PlatingType;
  subjectLockVersion?: number;
  imageIntegrityScore?: number;
  integrityFlags?: string[];
}

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buildSubjectLockFields(recipe: {
  title: string;
  cuisine?: string;
  mealFormat?: string;
}): ImageSubjectLockFields {
  return {
    lockedTitle: recipe.title.trim(),
    lockedCuisine: (recipe.cuisine || "").trim().toLowerCase(),
    lockedMealFormat: (recipe.mealFormat || "").trim().toLowerCase(),
    platingType: inferPlatingType(recipe.title, recipe.mealFormat),
    subjectLockVersion: 1,
  };
}

export function detectSubjectDrift(
  previous: {
    title: string;
    cuisine?: string;
    mealFormat?: string;
    editorialImage?: EditorialImageMetadata | null;
  },
  next: { title: string; cuisine?: string; mealFormat?: string },
): { drifted: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const lock = previous.editorialImage;

  if (lock?.lockedTitle && normalizeTitleKey(lock.lockedTitle) !== normalizeTitleKey(next.title)) {
    reasons.push("title_changed");
  } else if (!lock?.lockedTitle && normalizeTitleKey(previous.title) !== normalizeTitleKey(next.title)) {
    reasons.push("title_changed");
  }

  const prevFormat = (lock?.lockedMealFormat || previous.mealFormat || "").toLowerCase();
  const nextFormat = (next.mealFormat || "").toLowerCase();
  if (prevFormat && nextFormat && prevFormat !== nextFormat) {
    reasons.push("meal_format_changed");
  }

  const prevPlating = lock?.platingType || inferPlatingType(previous.title, previous.mealFormat);
  const nextPlating = inferPlatingType(next.title, next.mealFormat);
  if (prevPlating !== nextPlating) {
    reasons.push("plating_type_changed");
  }

  const prevCuisine = (lock?.lockedCuisine || previous.cuisine || "").toLowerCase();
  const nextCuisine = (next.cuisine || "").toLowerCase();
  if (prevCuisine && nextCuisine && prevCuisine !== nextCuisine) {
    reasons.push("cuisine_changed");
  }

  return { drifted: reasons.length > 0, reasons };
}

/** Invalidate approval + bump version when recipe identity drifts from locked hero. */
export function invalidateEditorialImageOnDrift(
  meta: EditorialImageMetadata,
  reasons: string[],
): EditorialImageMetadata {
  const version = (meta.imageVersion ?? 0) + 1;
  return {
    ...meta,
    imageApproved: false,
    imageVersion: version,
    subjectLockVersion: (meta.subjectLockVersion ?? 0) + 1,
    integrityFlags: [...new Set([...(meta.integrityFlags || []), "subject_drift", ...reasons])],
    delivery: meta.delivery
      ? { ...meta.delivery, cacheVersion: version }
      : meta.delivery,
  };
}

export function applySubjectLockToMetadata(
  meta: EditorialImageMetadata,
  recipe: { title: string; cuisine?: string; mealFormat?: string },
  integrity?: { score: number; flags: string[] },
): EditorialImageMetadata {
  const lock = buildSubjectLockFields(recipe);
  return {
    ...meta,
    ...lock,
    imageIntegrityScore: integrity?.score ?? meta.imageIntegrityScore,
    integrityFlags: integrity?.flags ?? meta.integrityFlags,
  };
}
