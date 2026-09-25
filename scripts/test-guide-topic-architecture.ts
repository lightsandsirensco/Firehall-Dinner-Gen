#!/usr/bin/env tsx
/**
 * SEO PHASE 3 — guide topic architecture + internal links regression test.
 *
 * Verifies, independent of any live server:
 *   1. Each valid `/guides/topic/:id` cluster contains ONLY guides whose own
 *      canonical `topic` field resolves to that cluster (no over-broad
 *      matching, no guide missing from its real cluster).
 *   2. No two topic clusters render an identical guide set.
 *   3. An invalid topic id produces a real 404 from the generic page
 *      injector (both client-route and server-snapshot behavior share the
 *      same underlying resolver).
 *   4. Every guide's `mealRecommendations[].slug` resolves to a real,
 *      current catalog (approved/breakfast/breakfast-performance/smoothie)
 *      recipe — i.e. no guide links to a retired or nonexistent recipe.
 *   5. Every SEO landing page's `recipeSlugs` (flat grid + any
 *      `recipeSections`) resolves to a real, current catalog recipe, with
 *      no duplicate slug within the same page.
 *   6. A meaningful share of guides carry a deliberate, VARIED contextual
 *      landing-page link (not the same link repeated on every guide).
 *   7. No guide's on-disk `slug` field (its URL) drifted from its filename —
 *      i.e. this phase didn't accidentally change any guide URL.
 *
 * Usage:
 *   npx tsx scripts/test-guide-topic-architecture.ts
 */
import fs from "node:fs";
import path from "node:path";
import { isApprovedCatalogSlug } from "../shared/hall-catalog/gate.js";
import { isSmoothieCatalogSlug, SMOOTHIE_CATALOG_ITEMS } from "../shared/fuel-catalog/smoothies/catalog-data.js";
import { isPizzaNightSlug } from "../shared/pizza-night/manifest.js";
import { SEO_LANDING_PAGES } from "../shared/seo/landing-pages-data.js";
import type { GuidesClusterId } from "../shared/seo/metadata.js";
import { resolveGuideClusterId, guidesInCluster } from "../shared/editorial/topic-clusters.js";
import { getGuideLandingLink } from "../shared/seo/guide-authority-links.js";
import { injectGenericPageSeoIntoHtml } from "../server/seo/generic-page-injection.js";

const ROOT = process.cwd();
const GUIDES_INDEX = path.join(ROOT, "client", "public", "content", "guides", "index.json");
const GUIDES_PAGES_DIR = path.join(ROOT, "client", "public", "content", "guides", "pages");

const failures: string[] = [];
function fail(msg: string) {
  failures.push(msg);
}
function pass(msg: string) {
  console.log(`  [PASS] ${msg}`);
}

async function main(): Promise<void> {
  console.log("[test-guide-topic-architecture]");

  const index = JSON.parse(fs.readFileSync(GUIDES_INDEX, "utf8")) as {
    articles: Array<{ slug: string; topic: string }>;
  };
  const articles = index.articles;
  console.log(`Total guides: ${articles.length}`);

  // -----------------------------------------------------------------------
  // 1 + 2. Topic cluster filtering — correct membership, no identical sets.
  // -----------------------------------------------------------------------
  const CLUSTER_IDS: GuidesClusterId[] = [
    "firefighter-meals",
    "firehall-dinners",
    "firefighter-nutrition",
    "station-cooking",
  ];

  const perCluster = new Map<GuidesClusterId, string[]>();
  for (const clusterId of CLUSTER_IDS) {
    const members = guidesInCluster(articles as any, clusterId).map((a) => a.slug);
    perCluster.set(clusterId, members);
  }

  // Every guide's cluster membership must match resolveGuideClusterId exactly.
  let membershipOk = true;
  for (const a of articles) {
    const resolved = resolveGuideClusterId(a as any);
    const membersOfResolved = perCluster.get(resolved) ?? [];
    if (!membersOfResolved.includes(a.slug)) {
      fail(`guide "${a.slug}" resolves to cluster "${resolved}" but is missing from that cluster's list`);
      membershipOk = false;
    }
    for (const clusterId of CLUSTER_IDS) {
      if (clusterId === resolved) continue;
      if ((perCluster.get(clusterId) ?? []).includes(a.slug)) {
        fail(`guide "${a.slug}" appears in cluster "${clusterId}" but its real cluster is "${resolved}"`);
        membershipOk = false;
      }
    }
  }
  if (membershipOk) pass("every guide appears in exactly its real topic cluster, no cross-contamination");

  const totalClustered = [...perCluster.values()].reduce((sum, list) => sum + list.length, 0);
  if (totalClustered !== articles.length) {
    fail(`cluster membership totals ${totalClustered}, expected exactly ${articles.length} (every guide clustered exactly once)`);
  } else {
    pass(`all ${articles.length} guides are clustered exactly once across the 4 topic pages`);
  }

  console.log("\nGuide counts by topic cluster:");
  for (const clusterId of CLUSTER_IDS) {
    console.log(`  - ${clusterId}: ${perCluster.get(clusterId)?.length ?? 0}`);
  }

  // No two clusters render an identical guide set (the exact bug being fixed).
  let anyIdentical = false;
  for (let i = 0; i < CLUSTER_IDS.length; i++) {
    for (let j = i + 1; j < CLUSTER_IDS.length; j++) {
      const a = new Set(perCluster.get(CLUSTER_IDS[i]));
      const b = perCluster.get(CLUSTER_IDS[j]) ?? [];
      const identical = a.size === b.length && b.every((s) => a.has(s));
      if (identical) {
        fail(`clusters "${CLUSTER_IDS[i]}" and "${CLUSTER_IDS[j]}" render an identical guide set`);
        anyIdentical = true;
      }
    }
  }
  if (!anyIdentical) pass("no two topic clusters render an identical guide set");

  // Every cluster must have at least one guide (a truly empty cluster page
  // would itself be a content/classification bug).
  for (const clusterId of CLUSTER_IDS) {
    const count = perCluster.get(clusterId)?.length ?? 0;
    if (count === 0) fail(`cluster "${clusterId}" has zero guides`);
  }
  if (CLUSTER_IDS.every((id) => (perCluster.get(id)?.length ?? 0) > 0)) {
    pass("every topic cluster has at least one guide");
  }

  // -----------------------------------------------------------------------
  // 3. Invalid topic id -> real 404 (shared resolver used by both the
  //    client route and the non-JS server snapshot).
  // -----------------------------------------------------------------------
  const origin = "https://example.test";
  const fakeHtml = "<html><head></head><body><div id=\"root\"></div></body></html>";
  const invalidResult = injectGenericPageSeoIntoHtml(fakeHtml, origin, "/guides/topic/bogus-topic-xyz");
  if (invalidResult.status !== 404) {
    fail(`"/guides/topic/bogus-topic-xyz" returned status ${invalidResult.status}, expected 404`);
  } else {
    pass('invalid topic id ("/guides/topic/bogus-topic-xyz") returns a real 404');
  }
  for (const clusterId of CLUSTER_IDS) {
    const validResult = injectGenericPageSeoIntoHtml(fakeHtml, origin, `/guides/topic/${clusterId}`);
    if (validResult.status !== 200) {
      fail(`valid topic id "/guides/topic/${clusterId}" returned status ${validResult.status}, expected 200`);
    }
  }
  pass("every real topic id still returns 200");

  // -----------------------------------------------------------------------
  // 4 + 7. Per-guide content checks: no broken recipe links, no URL drift.
  // -----------------------------------------------------------------------
  // A recipe slug is "valid" here if it actually resolves to a live detail
  // page — the same authoritative gate `resolveHallRecipePage` /
  // `approvedCatalogRecipePath` use (Golden 100 + Performance 50 + Hall
  // Expansion + Breakfast + BBQ, minus anything in `PHASE5_REMOVED_SLUGS`),
  // plus Smoothies and Pizza Night which have their own hub routes.
  // Deliberately NOT `getApprovedCatalog()` / `buildAllApprovedCatalogEntries()`
  // — those are scoped to *Explore-eligibility* (they exclude some real,
  // live Golden 100 recipes for cross-catalog hero-image dedup, e.g.
  // `breakfast-burrito-bar`), which is a narrower concern than "does this
  // guide link resolve to a real page."
  const isValidRecipeSlug = (slug: string): boolean =>
    isApprovedCatalogSlug(slug) || isSmoothieCatalogSlug(slug) || isPizzaNightSlug(slug);

  const brokenGuideLinks: string[] = [];
  const urlDrift: string[] = [];
  const files = fs.readdirSync(GUIDES_PAGES_DIR).filter((f) => f.endsWith(".json"));
  if (files.length !== articles.length) {
    fail(`guide page file count (${files.length}) does not match guide index count (${articles.length})`);
  }

  for (const f of files) {
    const filenameSlug = f.replace(/\.json$/, "");
    const data = JSON.parse(fs.readFileSync(path.join(GUIDES_PAGES_DIR, f), "utf8")) as {
      slug: string;
      mealRecommendations?: Array<{ slug: string }>;
    };
    if (data.slug !== filenameSlug) {
      urlDrift.push(`${f}: file slug "${filenameSlug}" !== JSON "slug" field "${data.slug}"`);
    }
    if (!articles.some((a) => a.slug === data.slug)) {
      urlDrift.push(`${data.slug}: present on disk but missing from guides/index.json`);
    }
    for (const m of data.mealRecommendations ?? []) {
      if (!isValidRecipeSlug(m.slug)) {
        brokenGuideLinks.push(`${data.slug} -> "${m.slug}"`);
      }
    }
  }

  if (brokenGuideLinks.length > 0) {
    fail(`${brokenGuideLinks.length} guide mealRecommendation link(s) point to a retired/nonexistent recipe: ${brokenGuideLinks.join(", ")}`);
  } else {
    pass("every guide's mealRecommendations resolve to a real, current catalog recipe");
  }

  if (urlDrift.length > 0) {
    fail(`${urlDrift.length} guide URL/slug inconsistency(ies) found: ${urlDrift.join(", ")}`);
  } else {
    pass(`all ${files.length} guide URLs (slugs) are unchanged and consistent with the index`);
  }

  // -----------------------------------------------------------------------
  // 5. Landing page recipe references resolve, no in-page duplicates.
  // -----------------------------------------------------------------------
  let landingBroken = 0;
  let landingDupes = 0;
  for (const page of SEO_LANDING_PAGES) {
    const flatBroken = page.recipeSlugs.filter((s) => !isValidRecipeSlug(s));
    if (flatBroken.length > 0) {
      fail(`landing page "${page.slug}" recipeSlugs has broken slug(s): ${flatBroken.join(", ")}`);
      landingBroken += flatBroken.length;
    }
    const flatSet = new Set(page.recipeSlugs);
    if (flatSet.size !== page.recipeSlugs.length) {
      fail(`landing page "${page.slug}" recipeSlugs has duplicate slug(s)`);
      landingDupes++;
    }
    for (const section of page.recipeSections ?? []) {
      const sectionBroken = section.recipeSlugs.filter((s) => !isValidRecipeSlug(s));
      if (sectionBroken.length > 0) {
        fail(`landing page "${page.slug}" section "${section.heading}" has broken slug(s): ${sectionBroken.join(", ")}`);
        landingBroken += sectionBroken.length;
      }
    }
  }
  if (landingBroken === 0) pass("every SEO landing page's recipe references resolve to a real, current catalog recipe");
  if (landingDupes === 0) pass("no SEO landing page duplicates a recipe slug merely to fill its grid");

  // -----------------------------------------------------------------------
  // 6. Contextual guide -> landing links exist and are genuinely varied.
  // -----------------------------------------------------------------------
  const linked = articles
    .map((a) => ({ slug: a.slug, link: getGuideLandingLink(a.slug) }))
    .filter((x): x is { slug: string; link: NonNullable<ReturnType<typeof getGuideLandingLink>> } => x.link !== null);
  const distinctDestinations = new Set(linked.map((x) => x.link.href));

  if (linked.length === 0) {
    fail("zero guides carry a contextual landing-page link");
  } else {
    pass(`${linked.length}/${articles.length} guides carry a deliberate contextual landing-page link`);
  }
  if (linked.length === articles.length) {
    fail("every single guide got a landing-page link — expected some guides to deliberately have none (no forced/blind linking)");
  } else {
    pass(`${articles.length - linked.length} guides deliberately have no landing-page link (no genuinely-fitting hub)`);
  }
  if (distinctDestinations.size < 5) {
    fail(`only ${distinctDestinations.size} distinct landing-page destination(s) used across all guides — expected real variety, not one link repeated`);
  } else {
    pass(`${distinctDestinations.size} distinct landing-page destinations used across linked guides (not one repeated link)`);
  }
  // Guard against a guide landing link pointing at a retired/renamed hub.
  const knownLandingPaths = new Set([...SEO_LANDING_PAGES.map((p) => p.path), "/smoothies"]);
  const badDestinations = linked.filter((x) => !knownLandingPaths.has(x.link.href));
  if (badDestinations.length > 0) {
    fail(`guide landing link(s) point at an unknown destination: ${badDestinations.map((x) => `${x.slug} -> ${x.link.href}`).join(", ")}`);
  } else {
    pass("every guide landing link points at a real, known hub/landing page");
  }

  // -----------------------------------------------------------------------
  console.log("");
  if (failures.length > 0) {
    console.error(`[test-guide-topic-architecture] FAIL (${failures.length} check(s) failed):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("[test-guide-topic-architecture] OK — all guide topic architecture checks passed");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
