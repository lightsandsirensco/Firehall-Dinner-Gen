/**
 * Category ↔ controlled tag relationships.
 */

import type { MasterCategoryId } from "./constants.js";
import { MASTER_CATEGORIES_BY_ID } from "./definitions.js";
import { slugifyTag } from "../recipe/tags.js";

/** All tag slugs owned by a master category (includes subcategory match tags) */
export function tagsForMasterCategory(categoryId: MasterCategoryId): string[] {
  const def = MASTER_CATEGORIES_BY_ID[categoryId];
  if (!def) return [];
  const tags = new Set<string>(def.tagSlugs.map(slugifyTag));
  for (const sub of def.subcategories) {
    for (const t of sub.matchTags) tags.add(slugifyTag(t));
  }
  return [...tags];
}

/** Reverse map: tag slug → category ids that claim it */
export function buildTagToCategoryMap(): Map<string, MasterCategoryId[]> {
  const map = new Map<string, MasterCategoryId[]>();
  for (const id of Object.keys(MASTER_CATEGORIES_BY_ID) as MasterCategoryId[]) {
    for (const tag of tagsForMasterCategory(id)) {
      const list = map.get(tag) || [];
      list.push(id);
      map.set(tag, list);
    }
  }
  return map;
}

const TAG_TO_CATEGORIES = buildTagToCategoryMap();

export function categoriesForTagSlug(tag: string): MasterCategoryId[] {
  return TAG_TO_CATEGORIES.get(slugifyTag(tag)) || [];
}

export function legacyPoolsForCategory(categoryId: MasterCategoryId): string[] {
  return [...(MASTER_CATEGORIES_BY_ID[categoryId]?.legacyExplorePools || [])];
}
