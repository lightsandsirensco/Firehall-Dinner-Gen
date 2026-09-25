#!/usr/bin/env tsx
/**
 * SEO PHASE 2.5 — sitemap integrity regression test.
 *
 * Rebuilds the canonical indexable RECIPE URL set independently, straight
 * from each catalog's own on-disk index.json (the same source of truth
 * `server/seo/sitemap.ts` reads), using the exact same canonical
 * path-builders production code uses (`approvedCatalogRecipePath`,
 * `smoothieRecipePath`) — then diffs it against the *actual* generated
 * `sitemap.xml`. Because this is rebuilt from the catalogs rather than
 * copied from `sitemap.ts`'s own internal merge logic, it will fail the
 * moment a catalog's slugs stop making it into the sitemap (the exact class
 * of bug this phase fixed for Pizza Night collisions, the 5
 * catalog-consolidation "phase5" false positives, and the
 * `/breakfast/performance` sub-catalog) — no hardcoded "should be N URLs"
 * assertion to go stale as the catalogs grow.
 *
 * Also verifies, straight from the generated sitemap.xml + robots.txt:
 *   - no duplicate <loc> entries
 *   - no noindex/private URL made it in (NOINDEX_PATH_PREFIXES)
 *   - every <loc> is on the canonical origin (no non-canonical URLs)
 *   - every <loc> resolves to a *known* page (a real catalog recipe, a
 *     published guide, or a recognized static/marketing/product route) —
 *     a proxy for "no known 404s" without needing a live server
 *   - robots.txt doesn't Disallow any path that's actually in the sitemap
 *
 * Usage:
 *   npx tsx scripts/test-sitemap-integrity.ts
 */
import fs from "node:fs";
import path from "node:path";
import { buildSitemapXml, buildRobotsTxt, NOINDEX_PATH_PREFIXES, resolvePublicSiteOrigin } from "../server/seo/sitemap.js";
import { SEO_CANONICAL_ORIGIN } from "../shared/seo/constants.js";
import { approvedCatalogRecipePath } from "../shared/approved-catalog.js";
import { smoothieRecipePath } from "../shared/fuel-catalog/paths.js";
import { guidePath } from "../shared/editorial/content-schema.js";
import { allSeoLandingPagePaths } from "../shared/seo/landing-pages-data.js";
import { allProductSeoPagePaths } from "../shared/seo/product-pages-data.js";
import { PHASE5_REMOVED_SLUGS } from "../shared/catalog-consolidation/phase5-redirects.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");

function readJson<T>(file: string): T | null {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function catalogSlugs(dir: string): string[] {
  const index = readJson<{ recipes?: Array<{ slug: string }> }>(path.join(dir, "index.json"));
  return (index?.recipes ?? []).map((r) => r.slug);
}

// ---------------------------------------------------------------------------
// 1. Canonical indexable RECIPE URL set — rebuilt straight from the
//    catalogs, independent of server/seo/sitemap.ts's own merge logic.
// ---------------------------------------------------------------------------

interface RecipeEntry {
  slug: string;
  collection: string;
  path: string;
}

function buildCanonicalRecipeUrls(): Map<string, RecipeEntry> {
  const byPath = new Map<string, RecipeEntry>();
  const sources: Array<[string, string, (slug: string) => string]> = [
    ["golden-100", path.join(PUBLIC, "catalog", "golden-100"), approvedCatalogRecipePath],
    ["performance-meals", path.join(PUBLIC, "catalog", "performance-meals"), approvedCatalogRecipePath],
    ["hall-expansion", path.join(PUBLIC, "catalog", "hall-expansion"), approvedCatalogRecipePath],
    ["pizza-night", path.join(PUBLIC, "catalog", "pizza-night"), approvedCatalogRecipePath],
    ["breakfast", path.join(PUBLIC, "catalog", "breakfast"), approvedCatalogRecipePath],
    // Distinct on-disk index from plain breakfast — see server/seo/sitemap.ts
    // `readBreakfastPerformanceSlugs()`. This is exactly the catalog that
    // was previously invisible to the sitemap audit (5 recipes + hub page
    // misreported as "orphan_sitemap_url").
    ["breakfast-performance", path.join(PUBLIC, "catalog", "breakfast", "performance"), approvedCatalogRecipePath],
    ["smoothies", path.join(PUBLIC, "catalog", "smoothies"), smoothieRecipePath],
    ["bbq", path.join(PUBLIC, "catalog", "bbq"), approvedCatalogRecipePath],
  ];

  for (const [collection, dir, toPath] of sources) {
    for (const slug of catalogSlugs(dir)) {
      // Retired by catalog-consolidation ("phase5") in favor of a canonical
      // replacement slug — server/seo/sitemap.ts deliberately excludes
      // these from the sitemap, so the *expected* set must exclude them
      // too, or every one of them false-fails this test forever.
      if (PHASE5_REMOVED_SLUGS.has(slug)) continue;
      const p = toPath(slug);
      // Multiple catalogs intentionally share a slug/URL for cross-hub
      // browsing (e.g. 8 Pizza Night recipes also listed in Golden 100) —
      // dedupe by URL, first catalog listed wins. Either way it's the same
      // single canonical URL, so there is exactly one expected sitemap
      // entry for it either way.
      if (!byPath.has(p)) byPath.set(p, { slug, collection, path: p });
    }
  }
  return byPath;
}

// ---------------------------------------------------------------------------
// 2. Known static/marketing/tool routes + guides — used only for the
//    "every sitemap URL resolves to a known page" (proxy for "no known
//    404s") check below, not for the recipe-omission check above.
// ---------------------------------------------------------------------------

/** Core static/marketing/tool routes with real SEO setup (title, canonical,
 * schema) — see `STATIC_PATHS` in server/seo/sitemap.ts and the matching
 * `<Route>` entries in client/src/App.tsx. This list only needs to change
 * when a genuinely new static page is added (rare) — the catalogs (the part
 * that actually grows week to week) are handled dynamically above. */
const CORE_STATIC_PAGES = new Set([
  "/",
  "/explore",
  "/top-rated-recipes",
  "/hall-of-fame",
  "/generator",
  "/faq",
  "/guides",
  "/guides/topic/firefighter-meals",
  "/guides/topic/firehall-dinners",
  "/guides/topic/firefighter-nutrition",
  "/guides/topic/station-cooking",
  "/pizza",
  "/wheel",
  "/smoothies",
  "/breakfast",
  "/breakfast/performance",
  "/firefighter-red-lead-recipe",
  "/about",
  "/how-we-test-recipes",
  "/privacy",
  "/terms",
  "/families",
]);

function buildKnownPagePaths(): Set<string> {
  const known = new Set<string>(CORE_STATIC_PAGES);
  for (const p of allSeoLandingPagePaths()) known.add(p);
  for (const p of allProductSeoPagePaths()) known.add(p);

  const guidesIndex = readJson<{ articles?: Array<{ slug: string }> }>(
    path.join(PUBLIC, "content", "guides", "index.json"),
  );
  for (const a of guidesIndex?.articles ?? []) known.add(guidePath(a.slug));

  return known;
}

// ---------------------------------------------------------------------------
// 3. Sitemap + robots parsing
// ---------------------------------------------------------------------------

function parseSitemapLocs(xml: string): string[] {
  const locs: string[] = [];
  for (const block of xml.split("<url>").slice(1)) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (loc) locs.push(loc);
  }
  return locs;
}

function parseRobotsDisallows(robots: string): string[] {
  // Only the default "User-agent: *" block matters for whether a real
  // browser/crawler-of-record can reach the URL; the per-AI-crawler blocks
  // below it repeat the identical rule set (see buildRobotsTxt).
  const firstBlock = robots.split(/\nUser-agent:/)[0];
  return [...firstBlock.matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1]);
}

function pathDisallowed(p: string, disallows: string[]): string | null {
  for (const rule of disallows) {
    const bare = rule.replace(/\$$/, "");
    const anchored = rule.endsWith("$");
    if (anchored ? p === bare : p === bare || p.startsWith(bare)) return rule;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 4. Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const origin = resolvePublicSiteOrigin();
  const failures: string[] = [];

  const sitemapXml = buildSitemapXml(origin);
  const robotsTxt = buildRobotsTxt(origin);
  const locs = parseSitemapLocs(sitemapXml);
  const paths = locs.map((loc) => {
    try {
      return new URL(loc).pathname.replace(/\/+$/, "") || "/";
    } catch {
      return loc;
    }
  });
  const pathSet = new Set(paths);

  console.log(`[test-sitemap-integrity] target=${origin}`);
  console.log(`Sitemap URLs: ${locs.length}`);

  // --- Check 1: no duplicate sitemap URLs -----------------------------
  const seen = new Map<string, number>();
  for (const loc of locs) seen.set(loc, (seen.get(loc) ?? 0) + 1);
  const dupes = [...seen.entries()].filter(([, count]) => count > 1);
  if (dupes.length > 0) {
    failures.push(`${dupes.length} duplicate sitemap <loc> entries: ${dupes.map(([u]) => u).join(", ")}`);
  } else {
    console.log("  [PASS] no duplicate sitemap URLs");
  }

  // --- Check 2: canonical origin only ----------------------------------
  const nonCanonical = locs.filter((loc) => !loc.startsWith(SEO_CANONICAL_ORIGIN));
  if (nonCanonical.length > 0) {
    failures.push(`${nonCanonical.length} sitemap URL(s) not on canonical origin ${SEO_CANONICAL_ORIGIN}: ${nonCanonical.join(", ")}`);
  } else {
    console.log("  [PASS] every sitemap URL is on the canonical origin");
  }

  // --- Check 3: no noindex/private URLs --------------------------------
  const noindexHits = paths.filter((p) =>
    NOINDEX_PATH_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`)),
  );
  if (noindexHits.length > 0) {
    failures.push(`${noindexHits.length} sitemap URL(s) fall under a noindex/private prefix: ${noindexHits.join(", ")}`);
  } else {
    console.log("  [PASS] no noindex/private URLs in sitemap");
  }

  // --- Check 4: robots rules don't block sitemap URLs ------------------
  const disallows = parseRobotsDisallows(robotsTxt);
  const blocked = paths
    .map((p) => ({ p, rule: pathDisallowed(p, disallows) }))
    .filter((r): r is { p: string; rule: string } => r.rule !== null);
  if (blocked.length > 0) {
    failures.push(
      `${blocked.length} sitemap URL(s) blocked by robots.txt: ${blocked.map((b) => `${b.p} (Disallow: ${b.rule})`).join(", ")}`,
    );
  } else {
    console.log("  [PASS] robots.txt does not block any sitemap URL");
  }

  // --- Check 5: every expected canonical recipe URL is represented -----
  const recipeUniverse = buildCanonicalRecipeUrls();
  const missingRecipes = [...recipeUniverse.values()].filter((r) => !pathSet.has(r.path));
  console.log(`Canonical recipe URLs expected: ${recipeUniverse.size}`);
  if (missingRecipes.length > 0) {
    failures.push(
      `${missingRecipes.length} indexable recipe URL(s) missing from sitemap: ` +
        missingRecipes.map((r) => `${r.path} [${r.collection}/${r.slug}]`).join(", "),
    );
  } else {
    console.log("  [PASS] every expected canonical recipe URL is in the sitemap");
  }

  // --- Check 6: no known 404s — every sitemap URL resolves to a known page
  const knownPages = buildKnownPagePaths();
  const recipePathSet = new Set([...recipeUniverse.keys()]);
  const unresolved = paths.filter((p) => !knownPages.has(p) && !recipePathSet.has(p));
  if (unresolved.length > 0) {
    failures.push(
      `${unresolved.length} sitemap URL(s) don't resolve to any known catalog recipe, guide, or static route (possible 404): ${unresolved
        .slice(0, 20)
        .join(", ")}${unresolved.length > 20 ? ` (+${unresolved.length - 20} more)` : ""}`,
    );
  } else {
    console.log("  [PASS] every sitemap URL resolves to a known recipe, guide, or static route");
  }

  // --- Check 7: every core static/marketing page is actually IN the sitemap
  // (the inverse of check 6) — this is exactly the class of bug that left
  // `/families` (a fully SEO-configured public page) out of the sitemap:
  // nothing was "wrong" with the sitemap's own URLs, one just never got added.
  const missingStatic = [...CORE_STATIC_PAGES].filter((p) => !pathSet.has(p));
  if (missingStatic.length > 0) {
    failures.push(`${missingStatic.length} known static/marketing page(s) missing from sitemap: ${missingStatic.join(", ")}`);
  } else {
    console.log("  [PASS] every core static/marketing page is in the sitemap");
  }

  console.log("\nPer-collection recipe URL counts:");
  const byCollection = new Map<string, number>();
  for (const r of recipeUniverse.values()) byCollection.set(r.collection, (byCollection.get(r.collection) ?? 0) + 1);
  for (const [collection, count] of byCollection) console.log(`  - ${collection}: ${count}`);

  if (failures.length > 0) {
    console.error(`\n[test-sitemap-integrity] FAIL (${failures.length} check(s) failed):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log("\n[test-sitemap-integrity] OK — all sitemap integrity checks passed");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
