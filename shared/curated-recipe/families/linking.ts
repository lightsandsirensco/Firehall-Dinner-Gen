import type { HallArchetypeFamily } from "../../meal-archetype-system.js";
import { inferHallArchetypeFamily, pickArchetypeVariation } from "../../meal-archetype-system.js";
import { slugifyRecipeTitle } from "../ids.js";
import type { CuratedRecipeRole, RecipeFamilyLink } from "./types.js";
import {
  VARIANT_CLUSTER_THRESHOLD,
  type RecipeSimilarityInput,
  scoreVariantSimilarity,
} from "./similarity.js";

export interface LinkableRecipe {
  recipeId: string;
  slug: string;
  title: string;
  summary?: string;
  mealFormat?: string;
  protein?: string;
  tags?: string[];
  archetypeFamily?: string;
  qualityScore: number;
  ingredients: Array<{ name: string }>;
  steps: Array<{ heading?: string; body: string }>;
  equipment?: string[];
}

export interface ProposedFamilyLink {
  recipeId: string;
  archetypeId: string;
  familyKey: HallArchetypeFamily;
  recipeRole: CuratedRecipeRole;
  parentRecipeId?: string;
  variantKey?: string;
  archetypeVariation?: string;
}

function toSimilarityInput(r: LinkableRecipe): RecipeSimilarityInput {
  return {
    recipeId: r.recipeId,
    slug: r.slug,
    title: r.title,
    mealFormat: r.mealFormat,
    equipment: r.equipment,
    ingredients: r.ingredients,
    steps: r.steps,
  };
}

/** Cluster recipes within a family; pick canonical by quality score */
export function proposeFamilyLinksForGroup(
  recipes: LinkableRecipe[],
  archetypeId: string,
  familyKey: HallArchetypeFamily,
): ProposedFamilyLink[] {
  if (recipes.length === 0) return [];
  if (recipes.length === 1) {
    const r = recipes[0]!;
    return [
      {
        recipeId: r.recipeId,
        archetypeId,
        familyKey,
        recipeRole: "standalone",
        archetypeVariation: pickArchetypeVariation(familyKey, r.title),
      },
    ];
  }

  const sorted = [...recipes].sort((a, b) => b.qualityScore - a.qualityScore);
  const clusters: LinkableRecipe[][] = [];

  for (const recipe of sorted) {
    let placed = false;
    for (const cluster of clusters) {
      const canonical = cluster[0]!;
      const sim = scoreVariantSimilarity(toSimilarityInput(recipe), toSimilarityInput(canonical));
      if (sim.overall >= VARIANT_CLUSTER_THRESHOLD) {
        cluster.push(recipe);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([recipe]);
  }

  const out: ProposedFamilyLink[] = [];
  for (const cluster of clusters) {
    if (cluster.length === 1) {
      const r = cluster[0]!;
      out.push({
        recipeId: r.recipeId,
        archetypeId,
        familyKey,
        recipeRole: "standalone",
        archetypeVariation: pickArchetypeVariation(familyKey, r.title),
      });
      continue;
    }

    const canonical = [...cluster].sort((a, b) => b.qualityScore - a.qualityScore)[0]!;
    for (const r of cluster) {
      const isCanonical = r.recipeId === canonical.recipeId;
      out.push({
        recipeId: r.recipeId,
        archetypeId,
        familyKey,
        recipeRole: isCanonical ? "canonical" : "variant",
        parentRecipeId: isCanonical ? undefined : canonical.recipeId,
        variantKey: isCanonical ? undefined : variantKeyFromTitle(r.title, canonical.slug),
        archetypeVariation: pickArchetypeVariation(familyKey, r.title),
      });
    }
  }
  return out;
}

export function variantKeyFromTitle(title: string, parentSlug: string): string {
  const slug = slugifyRecipeTitle(title);
  if (slug.startsWith(parentSlug)) {
    const suffix = slug.slice(parentSlug.length).replace(/^-+/, "");
    if (suffix.length >= 2) return suffix;
  }
  return slug.slice(0, 48);
}

export function proposeFamilyLinksForCatalog(recipes: LinkableRecipe[]): ProposedFamilyLink[] {
  const byFamily = new Map<HallArchetypeFamily, LinkableRecipe[]>();
  for (const r of recipes) {
    const family = (r.archetypeFamily ||
      inferHallArchetypeFamily({
        title: r.title,
        summary: r.summary,
        mealFormat: r.mealFormat,
        tags: r.tags,
        protein: r.protein,
      })) as HallArchetypeFamily;
    const list = byFamily.get(family) ?? [];
    list.push({ ...r, archetypeFamily: family });
    byFamily.set(family, list);
  }

  const out: ProposedFamilyLink[] = [];
  for (const [familyKey, group] of byFamily) {
    const archetypeId = `arch:${familyKey}`;
    out.push(...proposeFamilyLinksForGroup(group, archetypeId, familyKey));
  }
  return out;
}

export function buildFamilyLinkIndex(links: RecipeFamilyLink[]): Map<string, RecipeFamilyLink> {
  return new Map(links.map((l) => [l.recipeId, l]));
}

export function resolveFamilyContext(
  recipeId: string,
  links: RecipeFamilyLink[],
): { link: RecipeFamilyLink; siblings: RecipeFamilyLink[]; variants: RecipeFamilyLink[] } | null {
  const byId = buildFamilyLinkIndex(links);
  const link = byId.get(recipeId);
  if (!link) return null;

  const parentId = link.parentRecipeId || (link.recipeRole === "canonical" ? link.recipeId : undefined);
  const siblings = links.filter(
    (l) =>
      l.recipeId !== recipeId &&
      (l.parentRecipeId === parentId || l.recipeId === parentId || l.parentRecipeId === link.recipeId),
  );
  const variants =
    link.recipeRole === "canonical"
      ? links.filter((l) => l.parentRecipeId === link.recipeId)
      : link.parentRecipeId
        ? links.filter((l) => l.parentRecipeId === link.parentRecipeId || l.recipeId === link.parentRecipeId)
        : [];

  return { link, siblings, variants };
}
