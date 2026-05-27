/**
 * Recipe archetype (family) persistence — seeded from hall archetype definitions.
 */

import {
  HALL_ARCHETYPE_DEFINITIONS,
  type HallArchetypeFamily,
} from "../shared/meal-archetype-system.js";
import {
  archetypeSlugFromFamilyKey,
  buildArchetypeMetadata,
  defaultBaseStructureForFamily,
  type RecipeArchetype,
  type RecipeBaseStructure,
} from "../shared/curated-recipe/families/index.js";
import { getSharedLocalDb } from "./sqlite.js";
import { log } from "./logger.js";

function archetypeIdForFamily(family: HallArchetypeFamily): string {
  return `arch:${family}`;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function rowToArchetype(row: Record<string, unknown>): RecipeArchetype {
  const familyKey = String(row.family_key) as HallArchetypeFamily;
  return {
    archetypeId: String(row.archetype_id),
    slug: String(row.slug),
    familyKey,
    displayName: String(row.display_name),
    tagline: String(row.tagline || ""),
    legacyMealArchetype: String(row.legacy_meal_archetype),
    explorePools: parseJson<string[]>(row.explore_pools_json as string, []),
    metadata: parseJson(row.metadata_json as string, buildArchetypeMetadata(familyKey)),
    baseStructure: parseJson<RecipeBaseStructure>(
      row.base_structure_json as string,
      defaultBaseStructureForFamily(familyKey),
    ),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function ensureRecipeArchetypesSeeded(): Promise<number> {
  const db = await getSharedLocalDb();
  let inserted = 0;
  const upsert = db.prepare(
    `INSERT INTO recipe_archetypes (
      archetype_id, slug, family_key, display_name, tagline, legacy_meal_archetype,
      metadata_json, base_structure_json, explore_pools_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(archetype_id) DO UPDATE SET
      display_name = excluded.display_name,
      tagline = excluded.tagline,
      legacy_meal_archetype = excluded.legacy_meal_archetype,
      metadata_json = COALESCE(recipe_archetypes.metadata_json, excluded.metadata_json),
      base_structure_json = COALESCE(recipe_archetypes.base_structure_json, excluded.base_structure_json),
      explore_pools_json = excluded.explore_pools_json,
      updated_at = datetime('now')`,
  );

  const exists = db.prepare(`SELECT 1 FROM recipe_archetypes WHERE archetype_id = ?`);

  for (const def of HALL_ARCHETYPE_DEFINITIONS) {
    const id = archetypeIdForFamily(def.id);
    const had = Boolean(exists.get(id));
    const metadata = buildArchetypeMetadata(def.id);
    const base = defaultBaseStructureForFamily(def.id);
    upsert.run(
      id,
      archetypeSlugFromFamilyKey(def.id),
      def.id,
      def.displayName,
      def.tagline,
      def.legacyArchetype,
      JSON.stringify(metadata),
      JSON.stringify(base),
      JSON.stringify(def.explorePools),
    );
    if (!had) inserted++;
  }

  if (inserted > 0) {
    log(`[archetypes] seeded ${inserted} recipe archetypes`, "catalog");
  }
  return inserted;
}

export async function getRecipeArchetypeById(archetypeId: string): Promise<RecipeArchetype | null> {
  const db = await getSharedLocalDb();
  const row = db
    .prepare(`SELECT * FROM recipe_archetypes WHERE archetype_id = ?`)
    .get(archetypeId) as Record<string, unknown> | undefined;
  return row ? rowToArchetype(row) : null;
}

export async function getRecipeArchetypeByFamily(
  familyKey: HallArchetypeFamily,
): Promise<RecipeArchetype | null> {
  return getRecipeArchetypeById(archetypeIdForFamily(familyKey));
}

export async function listRecipeArchetypes(): Promise<RecipeArchetype[]> {
  const db = await getSharedLocalDb();
  const rows = db
    .prepare(`SELECT * FROM recipe_archetypes ORDER BY display_name`)
    .all() as Record<string, unknown>[];
  return rows.map(rowToArchetype);
}

export function archetypeIdFromFamilyKey(family: HallArchetypeFamily): string {
  return archetypeIdForFamily(family);
}
