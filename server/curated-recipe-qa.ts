import fs from "node:fs";
import path from "node:path";
import {
  runEditorialQa,
  runEditorialQaBatch,
  buildCatalogContext,
  type EditorialQaInput,
  type EditorialQaOverrides,
  type EditorialQaReport,
  type EditorialQaVariantPair,
} from "../shared/curated-recipe/qa-engine/index.js";
import { checkImageAvailability } from "../shared/curated-recipe/qa-engine/assets.js";
import { auditVariantDuplicates } from "./curated-recipe-families.js";
import type { CuratedRecipe } from "../shared/curated-recipe/types.js";
import { getCuratedRecipeById } from "./curated-recipe-store.js";
import { getSharedLocalDb } from "./sqlite.js";
import { deriveCuratedRecipeMetadata } from "../shared/curated-recipe/metadata/derive.js";
import { metadataCompletenessScore } from "../shared/curated-recipe/metadata/qa.js";

export function parseQaOverridesJson(raw: string | null | undefined): EditorialQaOverrides | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as EditorialQaOverrides;
    if (!parsed || typeof parsed !== "object") return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function createImageCheckContext(reviewAssetsDir?: string) {
  return { cwd: process.cwd(), reviewAssetsDir };
}

export function createAssetChecker(reviewAssetsDir?: string) {
  const imageContext = createImageCheckContext(reviewAssetsDir);
  return (heroImage: string, thumbImage?: string) => {
    const r = checkImageAvailability(heroImage, thumbImage, imageContext);
    return { heroProductionOk: r.heroProductionOk, thumbProductionOk: r.thumbProductionOk };
  };
}

export function curatedRecipeToQaInput(recipe: CuratedRecipe): EditorialQaInput {
  const thumb = recipe.images.find((i) => i.role === "thumb")?.url;
  const meta =
    recipe.metadata ??
    deriveCuratedRecipeMetadata({
      protein: recipe.protein,
      cuisine: recipe.cuisine,
      totalMinutes: recipe.totalMinutes,
      prepMinutes: recipe.prepMinutes,
      cookMinutes: recipe.cookMinutes,
      servingsBase: recipe.servingsBase,
      cleanupDifficulty: recipe.cleanupDifficulty,
      featured: recipe.featured,
      tags: recipe.tags,
      categories: recipe.categories,
      mealFormat: recipe.mealFormat,
      mealArchetype: recipe.mealArchetype,
      sourceKind: recipe.source?.kind,
      steps: recipe.instructions.map((s) => ({ heading: s.heading, body: s.body })),
      generateResponse: recipe.generateResponse ?? null,
    });
  return {
    recipeId: recipe.recipeId,
    slug: recipe.slug,
    status: recipe.status,
    title: recipe.title,
    summary: recipe.summary,
    heroImage: recipe.heroImage,
    thumbImage: thumb,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    totalMinutes: recipe.totalMinutes,
    servingsBase: recipe.servingsBase,
    cleanupDifficulty: recipe.cleanupDifficulty,
    protein: recipe.protein,
    cuisine: recipe.cuisine,
    mealFormat: recipe.mealFormat,
    tags: recipe.tags,
    ingredients: recipe.ingredients.map((i) => ({
      name: i.name,
      originalText: i.originalText,
    })),
    steps: recipe.instructions.map((s, idx) => ({
      n: s.stepNumber ?? idx + 1,
      heading: s.heading,
      body: s.body,
    })),
    metadata: meta,
    metadataCompleteness: metadataCompletenessScore(meta),
    qaOverrides: recipe.qaOverrides,
    archetypeId: recipe.archetypeId,
    recipeRole: recipe.recipeRole,
    parentRecipeId: recipe.parentRecipeId,
    variantKey: recipe.variantKey,
  };
}

function variantPairsFromAudit(
  pairs: Awaited<ReturnType<typeof auditVariantDuplicates>>,
): EditorialQaVariantPair[] {
  return pairs.map((p) => ({
    recipeIdA: p.recipeIdA,
    recipeIdB: p.recipeIdB,
    slugA: p.slugA,
    slugB: p.slugB,
    similarity: p.overall,
  }));
}

export async function getEditorialQaReportForRecipe(
  recipe: CuratedRecipe,
  catalog: CuratedRecipe[],
): Promise<EditorialQaReport> {
  const inputs = catalog.map(curatedRecipeToQaInput);
  const input = curatedRecipeToQaInput(recipe);
  const { titleCounts, peers } = buildCatalogContext(inputs);
  const sameFamily = catalog.filter((r) => r.archetypeId && r.archetypeId === recipe.archetypeId);
  const nearDupes = variantPairsFromAudit(await auditVariantDuplicates(sameFamily.length ? sameFamily : catalog));
  return runEditorialQa(input, {
    titleCounts,
    peers,
    imageContext: createImageCheckContext(),
    variantNearDuplicates: nearDupes,
  });
}

export async function listCuratedRecipesForEditorialQa(): Promise<CuratedRecipe[]> {
  const db = await getSharedLocalDb();
  const rows = db
    .prepare(`SELECT recipe_id FROM curated_recipes WHERE status != 'archived' ORDER BY title`)
    .all() as { recipe_id: string }[];
  const out: CuratedRecipe[] = [];
  for (const row of rows) {
    const recipe = getCuratedRecipeById(String(row.recipe_id));
    if (recipe) out.push(recipe);
  }
  return out;
}

export async function runCatalogEditorialQa(recipes: CuratedRecipe[]): Promise<EditorialQaReport[]> {
  const inputs = recipes.map(curatedRecipeToQaInput);
  const nearDupes = variantPairsFromAudit(await auditVariantDuplicates(recipes));
  return runEditorialQaBatch(inputs, {
    imageContext: createImageCheckContext(),
    variantNearDuplicates: nearDupes,
  });
}

export async function updateCuratedQaOverrides(input: {
  recipeId: string;
  overrides: EditorialQaOverrides;
}): Promise<void> {
  const db = await getSharedLocalDb();
  const row = db
    .prepare("SELECT recipe_id FROM curated_recipes WHERE recipe_id = ?")
    .get(input.recipeId) as { recipe_id?: string } | undefined;
  if (!row) throw new Error("Recipe not found");
  db.prepare(
    `UPDATE curated_recipes SET qa_overrides_json = ?, updated_at = datetime('now') WHERE recipe_id = ?`,
  ).run(JSON.stringify(input.overrides), input.recipeId);
}
