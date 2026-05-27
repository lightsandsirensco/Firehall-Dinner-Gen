import type { HallArchetypeFamily } from "../../meal-archetype-system.js";
import { getArchetypeDefinition } from "../../meal-archetype-system.js";
import type { RecipeArchetypeMetadata } from "./types.js";

export function archetypeSlugFromFamilyKey(family: HallArchetypeFamily): string {
  return family.replace(/_/g, "-");
}

export function buildArchetypeMetadata(family: HallArchetypeFamily): RecipeArchetypeMetadata {
  const def = getArchetypeDefinition(family);
  const slug = archetypeSlugFromFamilyKey(family);
  return {
    slug,
    displayName: def.displayName,
    description: `${def.tagline}. Curated FirehallMeals recipes in the ${def.displayName} family.`,
    hubPath: `/families/${slug}`,
    keywords: [def.displayName, ...def.explorePools, ...def.proteins],
    schemaType: "CollectionPage",
    relatedFamilyKeys: def.explorePools
      .map((p) => p.replace(/-/g, "_") as HallArchetypeFamily)
      .filter((k) => k !== family)
      .slice(0, 3),
  };
}
