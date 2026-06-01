#!/usr/bin/env tsx
/**
 * Apply breakfast content governance — tiers, copy, performance split.
 *
 *   npm run apply:breakfast-governance
 */
import fs from "node:fs";
import path from "node:path";
import {
  getAllBreakfastGovernanceRecords,
  isPerformanceBreakfastSlug,
  PERFORMANCE_BREAKFAST_SLUGS,
} from "../shared/breakfast-catalog/governance.js";
import { BREAKFAST_CATALOG_SLUGS } from "../shared/breakfast-catalog/slug-registry.js";
import {
  breakfastCatalogIndexSchema,
  breakfastRecipePageSchema,
  type BreakfastCatalogIndex,
  type BreakfastIndexEntry,
  type BreakfastRecipePage,
} from "../shared/breakfast-schema.js";
import {
  readBreakfastCatalogIndexFromDisk,
  writeBreakfastCatalogIndex,
  writeBreakfastPerformanceIndex,
} from "../server/breakfast-catalog/page-store.js";

const PAGES_DIR = path.join(process.cwd(), "client/public/catalog/breakfast/pages");
const ISO = new Date().toISOString();

function indexEntryFromPage(page: BreakfastRecipePage): BreakfastIndexEntry {
  return {
    slug: page.slug,
    title: page.title,
    subtitle: page.subtitle,
    description: page.description,
    filters: page.filters,
    tags: page.tags,
    totalTime: page.totalTime,
    heroImage: page.heroImage,
    thumbImage: page.thumbImage,
    publishedAt: page.publishedAt,
    collectionTier: page.collectionTier,
  };
}

function main(): void {
  const existingIndex = readBreakfastCatalogIndexFromDisk();
  const slugs = [...BREAKFAST_CATALOG_SLUGS];
  const existingCopy = Object.fromEntries(
    (existingIndex?.recipes ?? []).map((r) => [r.slug, { description: r.description, subtitle: r.subtitle }]),
  );
  // Include performance slugs that were removed from primary index.
  for (const slug of PERFORMANCE_BREAKFAST_SLUGS) {
    if (!existingCopy[slug]) {
      const pagePath = path.join(PAGES_DIR, `${slug}.json`);
      if (fs.existsSync(pagePath)) {
        const raw = JSON.parse(fs.readFileSync(pagePath, "utf8")) as BreakfastRecipePage;
        existingCopy[slug] = { description: raw.description, subtitle: raw.subtitle };
      }
    }
  }
  const records = getAllBreakfastGovernanceRecords(slugs, existingCopy);
  const recordBySlug = Object.fromEntries(records.map((r) => [r.slug, r]));

  if (records.length !== slugs.length) {
    const missing = slugs.filter((s) => !recordBySlug[s]);
    throw new Error(`Missing governance records for: ${missing.join(", ")}`);
  }

  const updatedPages: BreakfastRecipePage[] = [];

  for (const slug of slugs) {
    const pagePath = path.join(PAGES_DIR, `${slug}.json`);
    if (!fs.existsSync(pagePath)) throw new Error(`Missing page JSON: ${slug}`);
    const raw = JSON.parse(fs.readFileSync(pagePath, "utf8")) as BreakfastRecipePage;
    const gov = recordBySlug[slug]!;

    const updated: BreakfastRecipePage = {
      ...raw,
      description: gov.description,
      subtitle:
        gov.subtitle ??
        (/A practical station breakfast|scales from 4 to 12|Breakfast at the station/i.test(raw.subtitle)
          ? gov.description.split(".")[0] + "."
          : raw.subtitle),
      collectionTier: gov.tier,
      updatedAt: ISO,
    };

    breakfastRecipePageSchema.parse(updated);
    fs.writeFileSync(pagePath, JSON.stringify(updated, null, 2), "utf8");
    updatedPages.push(updated);
  }

  const primaryPages = updatedPages.filter((p) => !isPerformanceBreakfastSlug(p.slug));
  const performancePages = updatedPages.filter((p) => isPerformanceBreakfastSlug(p.slug));

  const primaryIndex: BreakfastCatalogIndex = breakfastCatalogIndexSchema.parse({
    version: 1,
    generatedAt: ISO,
    recipeCount: primaryPages.length,
    collection: "primary",
    recipes: primaryPages.map(indexEntryFromPage).sort((a, b) => a.title.localeCompare(b.title)),
  });

  const performanceIndex: BreakfastCatalogIndex = breakfastCatalogIndexSchema.parse({
    version: 1,
    generatedAt: ISO,
    recipeCount: performancePages.length,
    collection: "performance",
    recipes: performancePages.map(indexEntryFromPage).sort((a, b) => a.title.localeCompare(b.title)),
  });

  writeBreakfastCatalogIndex(primaryIndex);
  writeBreakfastPerformanceIndex(performanceIndex);

  console.log(
    `[breakfast-governance] applied copy to ${updatedPages.length} pages — primary ${primaryPages.length}, performance ${performancePages.length}`,
  );
}

main();
