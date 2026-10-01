/**
 * Invariant: a retired recipe (one whose slug redirects elsewhere) is never returned
 * by a user-facing discovery or recommendation path, its URL still resolves to an
 * active replacement, and no related-recipe card points at it.
 *
 * Usage: npm run test:retired-discovery
 */
import fs from "node:fs";
import path from "node:path";
import {
  getCuratedRecipeBySlug,
  getCuratedRecipeCategoryKeysBySlug,
  getCuratedStoreStats,
  initCuratedRecipeStore,
  listCuratedForExplorePool,
  listCuratedHeldForExplore,
  listCuratedRecipeSummaries,
  listCuratedRecipeSummariesForFirehallCategory,
  type CuratedRecipeListQuery,
} from "../server/curated-recipe-store.js";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import { hallCatalogExploreCards } from "../server/meal-catalog/search-golden.js";
import { pickCuratedExploreSearchCard } from "../server/recipe-ranker.js";
import { loadFirehallCategoryPool } from "../server/generation/firehall-category-pools.js";
import { pickGolden100ForGenerate } from "../server/generation/pick-local-recipes.js";
import { releaseSqliteTimersForTests } from "../server/sqlite.js";
import { RETIRED_CATALOG_SLUGS, resolveCatalogSlug } from "../shared/catalog-slug-redirects.js";
import { FIREHALL_CATEGORY_IDS } from "../shared/firehall-categories.js";
import { getCatalogTitle, isApprovedCatalogSlug, searchHallCatalog } from "../shared/hall-catalog/gate.js";
import { createDefaultGenerateRequest } from "../shared/generate-request-defaults.js";
import type { GenerateRequest } from "../shared/schema.js";

const RETIRED = new Set(RETIRED_CATALOG_SLUGS);
const errors: string[] = [];
let checks = 0;

function expectNoRetired(surface: string, slugs: Iterable<string | undefined>): void {
  checks++;
  for (const slug of slugs) {
    if (slug && RETIRED.has(slug)) errors.push(`${surface} returned retired slug ${slug}`);
  }
}

const ORDERS: NonNullable<CuratedRecipeListQuery["orderBy"]>[] = ["quality", "publisherFirst", "trending", "served", "recent"];
const STATUSES: CuratedRecipeListQuery["status"][] = [undefined, "published", "review", ["published", "review"]];

function pageThrough(fetchPage: (offset: number) => { slug: string }[]): string[] {
  const out: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = fetchPage(offset);
    out.push(...page.map((r) => r.slug));
    if (page.length < 100) return out;
  }
}

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  if (RETIRED.size === 0) errors.push("canonical retirement data is empty");

  const retiredRows = RETIRED_CATALOG_SLUGS.map((s) => getCuratedRecipeBySlug(s)).filter(
    (r): r is NonNullable<typeof r> => Boolean(r),
  );
  const pools = new Set<string>();
  for (const s of RETIRED_CATALOG_SLUGS) getCuratedRecipeCategoryKeysBySlug(s).forEach((k) => pools.add(k));
  for (const slug of pageThrough((offset) => listCuratedRecipeSummaries({ limit: 100, offset }))) {
    getCuratedRecipeCategoryKeysBySlug(slug).forEach((k) => pools.add(k));
  }

  // Curated store discovery (/api/curated-recipes, Explore pools, held cards).
  for (const explorePool of [undefined, ...pools]) {
    for (const status of STATUSES) {
      expectNoRetired(
        `listCuratedRecipeSummaries(pool=${explorePool ?? "-"}, status=${String(status ?? "default")}) all pages`,
        pageThrough((offset) => listCuratedRecipeSummaries({ explorePool, status, limit: 100, offset })),
      );
    }
    for (const orderBy of ORDERS) {
      expectNoRetired(
        `listCuratedRecipeSummaries(pool=${explorePool ?? "-"}, orderBy=${orderBy}, minQuality=30)`,
        listCuratedRecipeSummaries({ explorePool, orderBy, minQuality: 30, limit: 60 }).map((r) => r.slug),
      );
    }
    if (explorePool) {
      expectNoRetired(`listCuratedForExplorePool(${explorePool})`, listCuratedForExplorePool(explorePool, 100).map((r) => r.slug));
      expectNoRetired(`listCuratedHeldForExplore(${explorePool})`, listCuratedHeldForExplore(explorePool, 100).map((r) => r.slug));
    }
  }
  for (const row of retiredRows) {
    expectNoRetired(
      `listCuratedRecipeSummaries(protein=${row.protein}, category=${row.category})`,
      pageThrough((offset) => listCuratedRecipeSummaries({ protein: row.protein, category: row.category, limit: 100, offset })),
    );
  }
  expectNoRetired("listCuratedRecipeSummaries(featured)", listCuratedRecipeSummaries({ featured: true, limit: 100 }).map((r) => r.slug));

  // Generator category pools.
  for (const id of FIREHALL_CATEGORY_IDS) {
    for (const status of STATUSES) {
      expectNoRetired(
        `listCuratedRecipeSummariesForFirehallCategory(${id}, status=${String(status ?? "default")}) all pages`,
        pageThrough((offset) => listCuratedRecipeSummariesForFirehallCategory(id, { status, limit: 100, offset })),
      );
    }
    for (const requireHero of [true, false]) {
      expectNoRetired(`loadFirehallCategoryPool(${id}, hero=${requireHero})`, loadFirehallCategoryPool([id], { requireHero }).rows.map((r) => r.slug));
    }
  }

  // Explore search / discover and the approved catalog.
  expectNoRetired("searchHallCatalog(\"\")", searchHallCatalog("", 100_000).map((h) => h.slug));
  expectNoRetired("hallCatalogExploreCards(\"\") (discover)", hallCatalogExploreCards("", 100_000).map((c) => c._curatedSlug));
  for (const slug of RETIRED_CATALOG_SLUGS) {
    const queries = new Set([slug, slug.replace(/-/g, " "), getCatalogTitle(slug) ?? "", getCuratedRecipeBySlug(slug)?.title ?? ""]);
    for (const q of queries) {
      if (!q) continue;
      expectNoRetired(`searchHallCatalog(${JSON.stringify(q)})`, searchHallCatalog(q, 100_000).map((h) => h.slug));
      expectNoRetired(`hallCatalogExploreCards(${JSON.stringify(q)}) (search)`, hallCatalogExploreCards(q, 100_000).map((c) => c._curatedSlug));
    }
  }
  const catalog = buildApprovedCatalog();
  expectNoRetired("buildApprovedCatalog", catalog.recipes.map((r) => r.slug));

  // Random / recommendation paths.
  for (let i = 0; i < 300; i++) expectNoRetired("pickCuratedExploreSearchCard", [pickCuratedExploreSearchCard()?.slug]);
  const scenarios: Partial<GenerateRequest>[] = [
    { protein: "chicken" },
    { protein: "beef" },
    { protein: "turkey" },
    { protein: "pork" },
    { protein: "any", meal_format: "random" },
    { healthiness_preference: "lean", firehall_category: "high_protein" },
    { healthiness_preference: "lean", firehall_category: "healthy_options" },
    { firehall_category: "bbq_smoker", protein: "pork" },
    { meal_format: "breakfast" },
  ];
  for (const [n, patch] of scenarios.entries()) {
    for (let i = 0; i < 20; i++) {
      const pick = pickGolden100ForGenerate(
        { ...createDefaultGenerateRequest(), ...patch } as GenerateRequest,
        { varietySeed: `retired:${n}:${i}`, recentSignatures: [], recentSlugs: [] },
      );
      expectNoRetired(`pickGolden100ForGenerate(${JSON.stringify(patch)})`, [pick?.slug]);
    }
  }

  // Filtering removes exactly the retired rows — nothing active is lost.
  const listed = pageThrough((offset) => listCuratedRecipeSummaries({ limit: 100, offset }));
  const publishedRetired = retiredRows.filter((r) => r.status === "published").length;
  checks++;
  if (listed.length !== getCuratedStoreStats().published - publishedRetired) {
    errors.push(
      `published listing count ${listed.length} != published rows ${getCuratedStoreStats().published} - retired ${publishedRetired}`,
    );
  }

  // Retired URLs resolve to active replacements that are still listed and published.
  const catalogSlugs = new Set(catalog.recipes.map((r) => r.slug));
  const pagesRoot = "client/public/catalog";
  const pageFiles = new Map<string, string>();
  for (const dir of fs.readdirSync(pagesRoot)) {
    const pd = path.join(pagesRoot, dir, "pages");
    if (fs.existsSync(pd)) for (const f of fs.readdirSync(pd)) pageFiles.set(f.replace(/\.json$/, ""), path.join(pd, f));
  }
  for (const slug of RETIRED_CATALOG_SLUGS) {
    checks++;
    const target = resolveCatalogSlug(slug);
    if (target === slug || RETIRED.has(target)) errors.push(`redirect ${slug} -> ${target} does not reach an active slug`);
    if (!isApprovedCatalogSlug(target)) errors.push(`redirect target ${target} (from ${slug}) is not an approved catalog slug`);
    if (!catalogSlugs.has(target)) errors.push(`redirect target ${target} (from ${slug}) missing from the approved catalog`);
    if (!pageFiles.has(target)) errors.push(`redirect target ${target} (from ${slug}) has no recipe page`);
    if (isApprovedCatalogSlug(slug)) errors.push(`retired slug ${slug} still passes the catalog gate`);
  }

  // Related-recipe cards on live pages never point at retired recipes.
  for (const [slug, file] of pageFiles) {
    if (RETIRED.has(slug)) continue;
    const page = JSON.parse(fs.readFileSync(file, "utf8")) as { relatedSlugs?: string[] };
    expectNoRetired(`relatedSlugs on ${slug}`, page.relatedSlugs ?? []);
  }

  console.log(
    `[test-retired-recipe-discovery] retired=${RETIRED.size} (db rows ${retiredRows.length}, published ${publishedRetired}) pools=${pools.size} checks=${checks} approvedCatalog=${catalog.recipeCount} errors=${errors.length}`,
  );
  releaseSqliteTimersForTests();
  if (errors.length) {
    const unique = [...new Set(errors)];
    const shown = process.argv.includes("--all") ? unique : unique.slice(0, 40);
    for (const e of shown) console.error(`  ✗ ${e}`);
    if (unique.length > shown.length) console.error(`  … ${unique.length - shown.length} more (--all to list)`);
    process.exit(1);
  }
  console.log("[test-retired-recipe-discovery] OK");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
