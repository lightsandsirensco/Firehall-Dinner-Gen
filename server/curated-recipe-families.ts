/**
 * Curated recipe ↔ archetype family linking and variant similarity audits.
 */

import type { CuratedRecipe } from "../shared/curated-recipe/types.js";
import type {
  LinkableRecipe,
  ProposedFamilyLink,
  RecipeFamilyLink,
  VariantSimilarityResult,
} from "../shared/curated-recipe/families/index.js";
import {
  findNearDuplicatePairs,
  proposeFamilyLinksForCatalog,
  resolveFamilyContext,
  type RecipeSimilarityInput,
} from "../shared/curated-recipe/families/index.js";
import { getCuratedRecipeById } from "./curated-recipe-store.js";
import { getSharedLocalDb } from "./sqlite.js";
import { getRecipeArchetypeById, listRecipeArchetypes } from "./recipe-archetype-store.js";

export function curatedToLinkable(recipe: CuratedRecipe): LinkableRecipe {
  return {
    recipeId: recipe.recipeId,
    slug: recipe.slug,
    title: recipe.title,
    summary: recipe.summary,
    mealFormat: recipe.mealFormat,
    protein: recipe.protein,
    tags: recipe.tags,
    archetypeFamily: recipe.archetypeFamily,
    qualityScore: recipe.scores.quality,
    ingredients: recipe.ingredients.map((i) => ({ name: i.name })),
    steps: recipe.instructions.map((s) => ({
      heading: s.heading,
      body: s.body,
    })),
    equipment: recipe.metadata?.equipment,
  };
}

export function recipeToFamilyLink(recipe: CuratedRecipe, byId: Map<string, CuratedRecipe>): RecipeFamilyLink {
  const parent = recipe.parentRecipeId ? byId.get(recipe.parentRecipeId) : undefined;
  return {
    recipeId: recipe.recipeId,
    slug: recipe.slug,
    title: recipe.title,
    archetypeId: recipe.archetypeId,
    familyKey: recipe.archetypeFamily as RecipeFamilyLink["familyKey"],
    recipeRole: recipe.recipeRole ?? "standalone",
    parentRecipeId: recipe.parentRecipeId,
    parentSlug: parent?.slug,
    parentTitle: parent?.title,
    variantKey: recipe.variantKey,
    archetypeVariation: recipe.archetypeVariation,
  };
}

export function buildFamilyLinks(recipes: CuratedRecipe[]): RecipeFamilyLink[] {
  const byId = new Map(recipes.map((r) => [r.recipeId, r]));
  return recipes.map((r) => recipeToFamilyLink(r, byId));
}

export async function applyProposedFamilyLinks(links: ProposedFamilyLink[]): Promise<number> {
  const db = await getSharedLocalDb();
  const stmt = db.prepare(
    `UPDATE curated_recipes SET
      archetype_id = ?,
      parent_recipe_id = ?,
      recipe_role = ?,
      variant_key = ?,
      archetype_family = ?,
      archetype_variation = ?,
      updated_at = datetime('now')
    WHERE recipe_id = ?`,
  );
  const txn = db.transaction(() => {
    for (const l of links) {
      stmt.run(
        l.archetypeId,
        l.parentRecipeId ?? null,
        l.recipeRole,
        l.variantKey ?? null,
        l.familyKey,
        l.archetypeVariation ?? null,
        l.recipeId,
      );
    }
  });
  txn();
  return links.length;
}

export async function autoLinkCuratedFamilies(recipes: CuratedRecipe[]): Promise<{
  proposed: ProposedFamilyLink[];
  applied: number;
}> {
  const linkable = recipes.map(curatedToLinkable);
  const proposed = proposeFamilyLinksForCatalog(linkable);
  const applied = await applyProposedFamilyLinks(proposed);
  return { proposed, applied };
}

export async function auditVariantDuplicates(
  recipes: CuratedRecipe[],
): Promise<VariantSimilarityResult[]> {
  const inputs: RecipeSimilarityInput[] = recipes.map((r) => ({
    recipeId: r.recipeId,
    slug: r.slug,
    title: r.title,
    mealFormat: r.mealFormat,
    equipment: r.metadata?.equipment,
    ingredients: r.ingredients.map((i) => ({ name: i.name })),
    steps: r.instructions.map((s) => ({ heading: s.heading, body: s.body })),
  }));
  const archetypeById = new Map(recipes.map((r) => [r.recipeId, r.archetypeId || ""]));
  return findNearDuplicatePairs(inputs, { sameArchetypeOnly: true, archetypeById });
}

export async function getRecipeFamilyContext(recipeId: string): Promise<{
  recipe: CuratedRecipe;
  archetype: Awaited<ReturnType<typeof getRecipeArchetypeById>>;
  family: ReturnType<typeof resolveFamilyContext>;
  nearDuplicates: VariantSimilarityResult[];
} | null> {
  const recipe = getCuratedRecipeById(recipeId);
  if (!recipe) return null;

  if (!recipe.archetypeId) {
    return { recipe, archetype: null, family: resolveFamilyContext(recipeId, buildFamilyLinks([recipe])), nearDuplicates: [] };
  }

  const db = await getSharedLocalDb();
  const rows = db
    .prepare(
      `SELECT recipe_id FROM curated_recipes
       WHERE status != 'archived' AND archetype_id = ?
       ORDER BY quality_score DESC`,
    )
    .all(recipe.archetypeId) as { recipe_id: string }[];

  const peers: CuratedRecipe[] = [];
  for (const row of rows) {
    if (row.recipe_id === recipeId) continue;
    const p = getCuratedRecipeById(String(row.recipe_id));
    if (p && p.archetypeId === recipe.archetypeId) peers.push(p);
  }

  const allInFamily = [recipe, ...peers];
  const links = buildFamilyLinks(allInFamily);
  const family = resolveFamilyContext(recipeId, links);
  const archetype = recipe.archetypeId
    ? await getRecipeArchetypeById(recipe.archetypeId)
    : null;
  const nearDuplicates = (await auditVariantDuplicates(allInFamily)).filter(
    (p) => p.recipeIdA === recipeId || p.recipeIdB === recipeId,
  );

  return { recipe, archetype, family, nearDuplicates };
}

export async function listArchetypeCatalogSummary(): Promise<
  Array<{
    archetype: Awaited<ReturnType<typeof listRecipeArchetypes>>[number];
    recipeCount: number;
    canonicalCount: number;
    variantCount: number;
  }>
> {
  const archetypes = await listRecipeArchetypes();
  const db = await getSharedLocalDb();
  const out = [];
  for (const arch of archetypes) {
    const stats = db
      .prepare(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN recipe_role = 'canonical' THEN 1 ELSE 0 END) AS canonicals,
          SUM(CASE WHEN recipe_role = 'variant' THEN 1 ELSE 0 END) AS variants
        FROM curated_recipes WHERE archetype_id = ? AND status != 'archived'`,
      )
      .get(arch.archetypeId) as { total: number; canonicals: number; variants: number };
    out.push({
      archetype: arch,
      recipeCount: Number(stats?.total) || 0,
      canonicalCount: Number(stats?.canonicals) || 0,
      variantCount: Number(stats?.variants) || 0,
    });
  }
  return out;
}
