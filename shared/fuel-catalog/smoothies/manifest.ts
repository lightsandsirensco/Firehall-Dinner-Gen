import { SMOOTHIE_CATALOG_ITEMS } from "./catalog-data.js";

export const SMOOTHIE_CATALOG_SLUGS = SMOOTHIE_CATALOG_ITEMS.map((r) => r.slug) as readonly string[];

export const SMOOTHIE_CATALOG_COUNT = SMOOTHIE_CATALOG_ITEMS.length;
