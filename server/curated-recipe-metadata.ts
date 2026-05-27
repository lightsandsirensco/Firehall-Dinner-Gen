/**
 * Persist / hydrate curated recipe metadata (denormalized columns + JSON).
 */

import type { CuratedRecipe, CuratedRecipeInsert, CuratedMetadataFilter } from "../shared/curated-recipe/types.js";
import type { CuratedRecipeMetadata, CuratedRecipeMetadataOverrides } from "../shared/curated-recipe/metadata/types.js";
import {
  deriveMetadataFromCuratedInsert,
  deriveCuratedRecipeMetadata,
} from "../shared/curated-recipe/metadata/derive.js";
import { validateCuratedRecipeMetadata } from "../shared/curated-recipe/metadata/schema.js";
import { safeJsonParseNullable } from "./lib/safe-json.js";

export function resolveRecipeMetadata(
  insert: CuratedRecipeInsert,
  existing?: CuratedRecipeMetadata | null,
): CuratedRecipeMetadata {
  const overrides = insert.metadata?.overrides ?? existing?.overrides;
  if (insert.metadata) {
    const v = validateCuratedRecipeMetadata(insert.metadata);
    if (!v.ok) throw new Error(`Invalid metadata: ${v.errors.join("; ")}`);
    return overrides ? { ...v.data, overrides } : v.data;
  }
  return deriveMetadataFromCuratedInsert(insert, overrides);
}

export function metadataToDbColumns(meta: CuratedRecipeMetadata): {
  metadataJson: string;
  difficulty: string;
  cookTimeBucket: string;
  mealStyle: string;
  nutritionCategory: string;
  leftoversQuality: string;
  crewSizeBucket: string;
  hallTested: string;
  busyNightSuitable: number;
  equipmentJson: string;
  featured: number;
} {
  return {
    metadataJson: JSON.stringify(meta),
    difficulty: meta.difficulty,
    cookTimeBucket: meta.cookTimeBucket,
    mealStyle: meta.mealStyle,
    nutritionCategory: meta.nutritionCategory,
    leftoversQuality: meta.leftoversQuality,
    crewSizeBucket: meta.crewSize.bucket,
    hallTested: meta.hallTested,
    busyNightSuitable: meta.busyNightSuitable ? 1 : 0,
    equipmentJson: JSON.stringify(meta.equipment),
    featured: meta.featured ? 1 : 0,
  };
}

export function parseMetadataFromRow(row: Record<string, unknown>): CuratedRecipeMetadata | undefined {
  if (row.metadata_json) {
    const parsed = safeJsonParseNullable<CuratedRecipeMetadata>(String(row.metadata_json));
    if (parsed) {
      const v = validateCuratedRecipeMetadata(parsed);
      if (v.ok) return v.data;
    }
  }
  if (!row.difficulty) return undefined;
  const equipment = row.equipment_json
    ? (safeJsonParseNullable<string[]>(String(row.equipment_json)) ?? [])
    : [];
  return deriveCuratedRecipeMetadata({
    protein: String(row.protein || ""),
    cuisine: String(row.cuisine || ""),
    totalMinutes: Number(row.total_minutes) || 0,
    servingsBase: Number(row.servings_base) || 4,
    cleanupDifficulty: Number(row.cleanup_difficulty) as 1 | 2 | 3 | 4 | 5,
    featured: Boolean(row.featured),
    steps: [],
    overrides: {
      difficulty: String(row.difficulty) as CuratedRecipeMetadata["difficulty"],
      cookTimeBucket: String(row.cook_time_bucket) as CuratedRecipeMetadata["cookTimeBucket"],
      mealStyle: String(row.meal_style) as CuratedRecipeMetadata["mealStyle"],
      nutritionCategory: String(row.nutrition_category) as CuratedRecipeMetadata["nutritionCategory"],
      leftoversQuality: String(row.leftovers_quality) as CuratedRecipeMetadata["leftoversQuality"],
      crewSizeBucket: String(row.crew_size_bucket) as CuratedRecipeMetadata["crewSize"]["bucket"],
      hallTested: String(row.hall_tested) as CuratedRecipeMetadata["hallTested"],
      busyNightSuitable: Boolean(row.busy_night_suitable),
      equipment: equipment as CuratedRecipeMetadata["equipment"],
    },
  });
}

export function appendMetadataFilterSql(
  filter: CuratedMetadataFilter | undefined,
  conditions: string[],
  params: (string | number)[],
): void {
  if (!filter) return;
  const pushIn = (col: string, val: string | string[] | undefined) => {
    if (!val) return;
    const arr = Array.isArray(val) ? val : [val];
    if (!arr.length) return;
    conditions.push(`${col} IN (${arr.map(() => "?").join(",")})`);
    params.push(...arr);
  };

  pushIn("difficulty", filter.difficulty);
  pushIn("cook_time_bucket", filter.cookTimeBucket);
  pushIn("meal_style", filter.mealStyle);
  pushIn("nutrition_category", filter.nutritionCategory);
  pushIn("leftovers_quality", filter.leftoversQuality);
  pushIn("crew_size_bucket", filter.crewSizeBucket);
  pushIn("hall_tested", filter.hallTested);

  if (filter.protein) {
    const proteins = Array.isArray(filter.protein) ? filter.protein : [filter.protein];
    conditions.push(`protein IN (${proteins.map(() => "?").join(",")})`);
    params.push(...proteins);
  }
  if (filter.cuisine) {
    const cuisines = Array.isArray(filter.cuisine) ? filter.cuisine : [filter.cuisine];
    conditions.push(`cuisine IN (${cuisines.map(() => "?").join(",")})`);
    params.push(...cuisines);
  }
  if (filter.cleanupDifficultyMax != null) {
    conditions.push("cleanup_difficulty <= ?");
    params.push(filter.cleanupDifficultyMax);
  }
  if (filter.featured != null) {
    conditions.push("featured = ?");
    params.push(filter.featured ? 1 : 0);
  }
  if (filter.busyNightSuitable != null) {
    conditions.push("busy_night_suitable = ?");
    params.push(filter.busyNightSuitable ? 1 : 0);
  }
  if (filter.equipment) {
    conditions.push("equipment_json LIKE ?");
    params.push(`%"${filter.equipment}"%`);
  }
}
