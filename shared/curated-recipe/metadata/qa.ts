import type { CuratedRecipeMetadata } from "./types.js";
import type { MetadataQaIssue } from "./types.js";

const REQUIRED_FOR_PUBLISH: Array<keyof CuratedRecipeMetadata> = [
  "protein",
  "cuisine",
  "difficulty",
  "cookTimeBucket",
  "mealStyle",
  "nutritionCategory",
];

export function metadataQaIssues(
  meta: CuratedRecipeMetadata | null | undefined,
  opts: { forPublish?: boolean } = {},
): MetadataQaIssue[] {
  const issues: MetadataQaIssue[] = [];
  if (!meta) {
    issues.push({ field: "metadata", severity: "error", message: "missing recipe metadata" });
    return issues;
  }

  if (meta.protein === "other") {
    issues.push({ field: "protein", severity: "warn", message: "protein not normalized (other)" });
  }
  if (meta.cuisine === "other") {
    issues.push({ field: "cuisine", severity: "warn", message: "cuisine not normalized (other)" });
  }
  if (!meta.equipment.length || (meta.equipment.length === 1 && meta.equipment[0] === "none")) {
    issues.push({ field: "equipment", severity: "warn", message: "no equipment inferred" });
  }
  if (meta.hallTested === "not_tested" && opts.forPublish) {
    issues.push({ field: "hallTested", severity: "warn", message: "not hall-tested" });
  }
  if (meta.leftoversQuality === "poor") {
    issues.push({ field: "leftoversQuality", severity: "warn", message: "poor leftovers quality" });
  }
  if (!meta.busyNightSuitable && meta.cookTimeBucket === "under_30") {
    issues.push({
      field: "busyNightSuitable",
      severity: "warn",
      message: "quick cook but not flagged busy-night",
    });
  }

  for (const key of REQUIRED_FOR_PUBLISH) {
    const v = meta[key];
    if (v == null || v === "") {
      issues.push({ field: String(key), severity: "error", message: `missing ${String(key)}` });
    }
  }

  return issues;
}

export function metadataCompletenessScore(meta: CuratedRecipeMetadata | null | undefined): number {
  if (!meta) return 0;
  let filled = 0;
  let total = 12;
  if (meta.protein && meta.protein !== "other") filled++;
  if (meta.cuisine && meta.cuisine !== "other") filled++;
  if (meta.difficulty) filled++;
  if (meta.cookTimeBucket) filled++;
  if (meta.cleanupDifficulty) filled++;
  if (meta.equipment?.length && meta.equipment[0] !== "none") filled++;
  if (meta.crewSize?.bucket) filled++;
  if (meta.leftoversQuality) filled++;
  if (meta.hallTested !== "not_tested") filled++;
  if (meta.mealStyle && meta.mealStyle !== "other") filled++;
  if (meta.nutritionCategory) filled++;
  if (meta.busyNightSuitable != null) filled++;
  return Math.round((filled / total) * 100);
}
