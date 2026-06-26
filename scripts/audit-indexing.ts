#!/usr/bin/env tsx
/**
 * SEO indexing audit — sitemap, robots, recipe metadata, internal links.
 *
 *   npm run audit:indexing
 */
import fs from "node:fs";
import path from "node:path";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import { buildRobotsTxt, buildSitemapXml, resolvePublicSiteOrigin } from "../server/seo/sitemap.js";
import { SEO_CANONICAL_ORIGIN } from "../shared/seo/constants.js";
import { absoluteUrl } from "../shared/seo/urls.js";
import { approvedCatalogRecipePath } from "../shared/approved-catalog.js";
import { isPerformanceBreakfastSlug } from "../shared/breakfast-catalog/governance-types.js";
import {
  breakfastPerformanceRecipePath,
  breakfastRecipePath,
  smoothieRecipePath,
} from "../shared/fuel-catalog/paths.js";
import { guidePath } from "../shared/editorial/content-schema.js";
import { buildRecipePageSeo } from "../shared/seo/metadata.js";
import {
  buildBreakfastRecipeSeo,
  buildSmoothieRecipeSeo,
} from "../shared/seo/fuel-metadata.js";
import { buildRecipeLinkClusters } from "../shared/golden-100/internal-link-clusters.js";
import type { GoldenCatalogIndexEntry, GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";
import type { EditorialArticle } from "../shared/editorial/content-schema.js";
import type { BreakfastRecipePage } from "../shared/breakfast-schema.js";
import type { FuelRecipePage } from "../shared/fuel-catalog/schema.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const MD_OUT = path.join(ROOT, "review", "indexing-audit.md");
const JSON_OUT = path.join(ROOT, "review", "indexing-audit.json");

const REQUIRED_SITEMAP_PATHS = [
  "/",
  "/explore",
  "/wheel",
  "/pizza",
  "/guides",
] as const;

/** Valid guide cluster hubs (not individual article slugs). */
const GUIDE_TOPIC_HUB_PATHS = new Set([
  "/guides/topic/firefighter-meals",
  "/guides/topic/firehall-dinners",
  "/guides/topic/firefighter-nutrition",
  "/guides/topic/station-cooking",
]);

function readJson<T>(file: string): T | null {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function catalogSlugs(dir: string): Array<{ slug: string }> {
  const index = readJson<{ recipes?: Array<{ slug: string }> }>(path.join(dir, "index.json"));
  return index?.recipes ?? [];
}

function parseSitemapPaths(xml: string): string[] {
  const paths: string[] = [];
  for (const block of xml.split("<url>").slice(1)) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!loc) continue;
    try {
      const u = new URL(loc);
      paths.push(u.pathname.replace(/\/+$/, "") || "/");
    } catch {
      paths.push(loc);
    }
  }
  return paths;
}

/**
 * SEO canonical path per collection. Sitemap keys for breakfast/smoothies may still use
 * `/recipes/:slug` (legacy index URLs) while on-page canonicals point at dedicated hubs.
 */
function expectedRecipeCanonicalPath(collection: string, slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (collection === "smoothie") return smoothieRecipePath(normalized);
  if (collection === "breakfast") {
    // Breakfast hub owns canonical URLs — not `/recipes/:slug`.
    return isPerformanceBreakfastSlug(normalized)
      ? breakfastPerformanceRecipePath(normalized)
      : breakfastRecipePath(normalized);
  }
  return approvedCatalogRecipePath(normalized);
}

function pageJsonPathForSlug(slug: string, collection: string): string | null {
  const map: Record<string, string> = {
    golden: `catalog/golden-100/pages/${slug}.json`,
    performance: `catalog/performance-meals/pages/${slug}.json`,
    expansion: `catalog/hall-expansion/pages/${slug}.json`,
    breakfast: `catalog/breakfast/pages/${slug}.json`,
    smoothie: `catalog/smoothies/pages/${slug}.json`,
    pizza: `catalog/pizza-night/pages/${slug}.json`,
  };
  return map[collection] ?? null;
}

function collectIndexableRecipes(): Map<string, { slug: string; collection: string }> {
  const paths = new Map<string, { slug: string; collection: string }>();
  const catalogs: Array<[string, string, (slug: string) => string]> = [
    ["golden", path.join(PUBLIC, "catalog", "golden-100"), approvedCatalogRecipePath],
    ["performance", path.join(PUBLIC, "catalog", "performance-meals"), approvedCatalogRecipePath],
    ["expansion", path.join(PUBLIC, "catalog", "hall-expansion"), approvedCatalogRecipePath],
    ["pizza", path.join(PUBLIC, "catalog", "pizza-night"), approvedCatalogRecipePath],
    ["breakfast", path.join(PUBLIC, "catalog", "breakfast"), approvedCatalogRecipePath],
    ["smoothie", path.join(PUBLIC, "catalog", "smoothies"), smoothieRecipePath],
  ];
  for (const [collection, dir, pathFn] of catalogs) {
    for (const { slug } of catalogSlugs(dir)) {
      const p = pathFn(slug);
      if (!paths.has(p)) paths.set(p, { slug, collection });
    }
  }
  return paths;
}

function loadGoldenIndexEntries(): GoldenCatalogIndexEntry[] {
  const index = readJson<{ recipes?: GoldenCatalogIndexEntry[] }>(
    path.join(PUBLIC, "catalog", "golden-100", "index.json"),
  );
  return index?.recipes ?? [];
}

function loadRecipePage(rel: string): GoldenRecipePage | null {
  return readJson<GoldenRecipePage>(path.join(PUBLIC, rel));
}

function loadBreakfastPage(slug: string): BreakfastRecipePage | null {
  return readJson<BreakfastRecipePage>(path.join(PUBLIC, "catalog", "breakfast", "pages", `${slug}.json`));
}

function loadSmoothiePage(slug: string): FuelRecipePage | null {
  return readJson<FuelRecipePage>(path.join(PUBLIC, "catalog", "smoothies", "pages", `${slug}.json`));
}

function buildRecipeSeo(
  collection: string,
  slug: string,
  origin: string,
): { title: string; description: string; canonicalPath: string } | null {
  if (collection === "breakfast") {
    const page = loadBreakfastPage(slug);
    if (!page) return null;
    const seo = buildBreakfastRecipeSeo(page);
    return { title: seo.title, description: seo.description, canonicalPath: seo.canonicalPath };
  }
  if (collection === "smoothie") {
    const page = loadSmoothiePage(slug);
    if (!page) return null;
    const seo = buildSmoothieRecipeSeo(page);
    return { title: seo.title, description: seo.description, canonicalPath: seo.canonicalPath };
  }
  const rel = pageJsonPathForSlug(slug, collection);
  const page = rel ? loadRecipePage(rel) : null;
  if (!page) return null;
  const seo = buildRecipePageSeo(page, origin);
  return { title: seo.title, description: seo.description, canonicalPath: seo.canonicalPath };
}

function collectGuideRecipeSlugs(): Set<string> {
  const slugs = new Set<string>();
  const guides = readJson<{ articles?: EditorialArticle[] }>(
    path.join(PUBLIC, "content", "guides", "index.json"),
  );
  for (const meta of guides?.articles ?? []) {
    const article = readJson<EditorialArticle>(
      path.join(PUBLIC, "content", "guides", "pages", `${meta.slug}.json`),
    );
    if (!article) continue;
    for (const m of article.mealRecommendations ?? []) {
      if (m.slug?.trim()) slugs.add(m.slug.trim().toLowerCase());
    }
    for (const e of article.embeddedRecipes ?? []) {
      if (e.id?.trim()) slugs.add(e.id.trim().toLowerCase());
    }
  }
  return slugs;
}

function countOutboundInternalLinks(slug: string, goldenIndex: GoldenCatalogIndexEntry[]): number {
  const current = goldenIndex.find((e) => e.slug === slug);
  if (!current) return 0;
  const clusters = buildRecipeLinkClusters(current, goldenIndex, { maxPerCluster: 4, minPerCluster: 2 });
  return clusters.reduce((n, c) => n + c.links.length, 0);
}

function main(): void {
  const origin = resolvePublicSiteOrigin();
  const sitemapPath = path.join(PUBLIC, "sitemap.xml");
  const robotsPath = path.join(PUBLIC, "robots.txt");

  const expectedSitemap = buildSitemapXml(origin);
  const expectedRobots = buildRobotsTxt(origin);
  let sitemapSynced = false;
  if (!fs.existsSync(sitemapPath) || fs.readFileSync(sitemapPath, "utf8") !== expectedSitemap) {
    fs.writeFileSync(sitemapPath, expectedSitemap, "utf8");
    fs.writeFileSync(robotsPath, expectedRobots, "utf8");
    sitemapSynced = true;
  }

  const sitemapXml = fs.readFileSync(sitemapPath, "utf8");
  const sitemapPaths = new Set(parseSitemapPaths(sitemapXml));
  const recipeMap = collectIndexableRecipes();
  const approved = buildApprovedCatalog();
  const approvedSlugs = new Set(approved.recipes.map((r) => r.slug.toLowerCase()));
  const guideSlugs = collectGuideRecipeSlugs();
  const goldenIndex = loadGoldenIndexEntries();
  const pizzaSlugs = new Set(
    catalogSlugs(path.join(PUBLIC, "catalog", "pizza-night")).map((r) => r.slug.toLowerCase()),
  );
  const breakfastSlugs = new Set(
    catalogSlugs(path.join(PUBLIC, "catalog", "breakfast")).map((r) => r.slug.toLowerCase()),
  );
  const performanceSlugs = new Set(
    catalogSlugs(path.join(PUBLIC, "catalog", "performance-meals")).map((r) => r.slug.toLowerCase()),
  );

  const guidesIndex = readJson<{ articles?: Array<{ slug: string }> }>(
    path.join(PUBLIC, "content", "guides", "index.json"),
  );
  const guideSlugsPublished = (guidesIndex?.articles ?? []).map((a) => a.slug);
  const guidePaths = guideSlugsPublished.map((s) => guidePath(s));

  // 1 — Required routes in sitemap
  const requiredMissing = REQUIRED_SITEMAP_PATHS.filter((p) => !sitemapPaths.has(p));

  // 2 — robots.txt
  const robots = fs.readFileSync(robotsPath, "utf8");
  const robotsChecks = {
    userAgentWildcard: /User-agent:\s*\*/i.test(robots),
    allowRoot: /Allow:\s*\//i.test(robots),
    sitemapDeclared: robots.includes("Sitemap:") && robots.includes("sitemap.xml"),
    recipesNotBlocked: !/Disallow:\s*\/recipes/i.test(robots),
    guidesNotBlocked: !/Disallow:\s*\/guides/i.test(robots),
    exploreNotBlocked: !/Disallow:\s*\/explore/i.test(robots),
  };
  const robotsOk = Object.values(robotsChecks).every(Boolean);

  // 3 — Recipe metadata
  const missingMetadata: Array<{ slug: string; path: string; reason: string }> = [];
  const duplicateTitles = new Map<string, string>();
  const duplicateDescriptions = new Map<string, string>();
  const duplicateTitleIssues: string[] = [];
  const duplicateDescIssues: string[] = [];
  const missingCanonical: string[] = [];
  const canonicalMismatch: string[] = [];

  for (const [p, { slug, collection }] of recipeMap) {
    const seo = buildRecipeSeo(collection, slug, origin);
    if (!seo) {
      missingMetadata.push({ slug, path: p, reason: "missing page JSON or SEO bundle" });
      continue;
    }
    if (!seo.title?.trim()) {
      missingMetadata.push({ slug, path: p, reason: "empty title" });
    }
    if (!seo.description?.trim()) {
      missingMetadata.push({ slug, path: p, reason: "empty meta description" });
    }
    if (!seo.canonicalPath?.trim()) {
      missingMetadata.push({ slug, path: p, reason: "empty canonical path" });
      missingCanonical.push(slug);
    } else {
      const canonical = absoluteUrl(origin, seo.canonicalPath);
      if (!canonical.startsWith(SEO_CANONICAL_ORIGIN)) {
        missingCanonical.push(slug);
      }
      const expectedCanonical = expectedRecipeCanonicalPath(collection, slug);
      if (seo.canonicalPath !== expectedCanonical) {
        canonicalMismatch.push(
          `${slug} (expected ${expectedCanonical}, got ${seo.canonicalPath})`,
        );
      }
    }

    if (seo.title) {
      const prev = duplicateTitles.get(seo.title);
      if (prev && prev !== slug) duplicateTitleIssues.push(`${slug} ↔ ${prev}: "${seo.title}"`);
      else duplicateTitles.set(seo.title, slug);
    }
    if (seo.description) {
      const prev = duplicateDescriptions.get(seo.description);
      if (prev && prev !== slug) duplicateDescIssues.push(`${slug} ↔ ${prev}`);
      else duplicateDescriptions.set(seo.description, slug);
    }
  }

  // 4 — Internal links
  const notInApprovedCatalog: string[] = [];
  const notLinkedFromGuides: string[] = [];
  const weakOnPageLinks: string[] = [];

  for (const [, { slug, collection }] of recipeMap) {
    if (!approvedSlugs.has(slug.toLowerCase())) {
      notInApprovedCatalog.push(slug);
    }
    if (!guideSlugs.has(slug.toLowerCase())) {
      notLinkedFromGuides.push(slug);
    }
    if (collection === "golden" || collection === "performance" || collection === "expansion") {
      const outbound = countOutboundInternalLinks(slug, goldenIndex);
      if (outbound < 2) weakOnPageLinks.push(slug);
    }
  }

  function isInternallyLinked(slug: string): boolean {
    const s = slug.toLowerCase();
    return (
      approvedSlugs.has(s) ||
      guideSlugs.has(s) ||
      pizzaSlugs.has(s) ||
      breakfastSlugs.has(s) ||
      performanceSlugs.has(s)
    );
  }

  const internallyUnreachable = [...recipeMap.values()]
    .filter(({ slug }) => !isInternallyLinked(slug))
    .map(({ slug }) => slug);

  const hubOnlyRecipes = [...recipeMap.values()]
    .filter(({ slug }) => !approvedSlugs.has(slug.toLowerCase()) && isInternallyLinked(slug))
    .map(({ slug, collection }) => ({
      slug,
      hub:
        pizzaSlugs.has(slug.toLowerCase())
          ? "/pizza"
          : breakfastSlugs.has(slug.toLowerCase())
            ? "/breakfast"
            : performanceSlugs.has(slug.toLowerCase())
              ? "performance-meals"
              : guideSlugs.has(slug.toLowerCase())
                ? "hall-guide"
                : collection,
    }));

  // 5 — Sitemap vs catalog
  const recipesMissingFromSitemap = [...recipeMap.keys()].filter((p) => !sitemapPaths.has(p));
  const guidesMissingFromSitemap = guidePaths.filter((p) => !sitemapPaths.has(p));
  const orphanSitemapUrls = [...sitemapPaths].filter((p) => {
    if (p.startsWith("/recipes/") || p.startsWith("/smoothies/")) {
      return !recipeMap.has(p);
    }
    if (GUIDE_TOPIC_HUB_PATHS.has(p)) return false;
    if (p.startsWith("/guides/") && p !== "/guides") {
      const slug = p.replace(/^\/guides\//, "");
      return !guideSlugsPublished.includes(slug);
    }
    return false;
  });

  const recipeUrlsInSitemap = [...recipeMap.keys()].filter((p) => sitemapPaths.has(p)).length;
  const guideUrlsInSitemap = [...sitemapPaths].filter(
    (p) => p.startsWith("/guides/") && p !== "/guides",
  ).length;

  const pass =
    requiredMissing.length === 0 &&
    robotsOk &&
    missingMetadata.length === 0 &&
    duplicateTitleIssues.length === 0 &&
    duplicateDescIssues.length === 0 &&
    missingCanonical.length === 0 &&
    canonicalMismatch.length === 0 &&
    recipesMissingFromSitemap.length === 0 &&
    guidesMissingFromSitemap.length === 0 &&
    orphanSitemapUrls.length === 0 &&
    internallyUnreachable.length === 0;

  const report = {
    generatedAt: new Date().toISOString(),
    origin: SEO_CANONICAL_ORIGIN,
    sitemapSynced,
    totals: {
      sitemapUrls: sitemapPaths.size,
      recipeUrls: recipeMap.size,
      recipeUrlsInSitemap,
      guideUrls: guidePaths.length,
      guideUrlsInSitemap,
      approvedCatalogRecipes: approved.recipeCount,
    },
    requiredRoutes: {
      checked: [...REQUIRED_SITEMAP_PATHS],
      missing: requiredMissing,
      pass: requiredMissing.length === 0,
    },
    robots: { ok: robotsOk, checks: robotsChecks },
    recipeMetadata: {
      audited: recipeMap.size,
      missingMetadata,
      duplicateTitles: duplicateTitleIssues.length,
      duplicateDescriptions: duplicateDescIssues.length,
      missingCanonical,
      canonicalMismatch,
    },
    internalLinks: {
      notInApprovedCatalog: notInApprovedCatalog.length,
      hubOnlyRecipes: hubOnlyRecipes.length,
      hubOnlySample: hubOnlyRecipes.slice(0, 20),
      notLinkedFromGuidesOnly: notLinkedFromGuides.length,
      weakOnPageOutboundLinks: weakOnPageLinks.length,
      internallyUnreachable,
    },
    sitemapCoverage: {
      recipesMissingFromSitemap,
      guidesMissingFromSitemap,
      orphanSitemapUrls,
    },
    pass,
  };

  fs.mkdirSync(path.dirname(MD_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2), "utf8");

  const md = `# SEO Indexing Audit

Generated: ${report.generatedAt}

Canonical origin: **${report.origin}**

${sitemapSynced ? "> Sitemap and robots.txt were regenerated to match \`buildSitemapXml()\` before this audit.\n" : ""}

## Executive summary

| Check | Status |
|-------|--------|
| Required routes in sitemap | ${report.requiredRoutes.pass ? "PASS" : "FAIL"} |
| robots.txt allows crawling | ${robotsOk ? "PASS" : "FAIL"} |
| Recipe unique title + meta + canonical | ${missingMetadata.length === 0 && duplicateTitleIssues.length === 0 && duplicateDescIssues.length === 0 && missingCanonical.length === 0 ? "PASS" : "NEEDS WORK"} |
| Recipes in sitemap | ${recipesMissingFromSitemap.length === 0 ? "PASS" : "FAIL"} |
| Internal discoverability | ${internallyUnreachable.length === 0 ? "PASS" : "NEEDS WORK"} |
| **Overall** | **${pass ? "PASS" : "NEEDS WORK"}** |

## URL counts

| Metric | Count |
|--------|------:|
| **Total URLs in sitemap** | ${report.totals.sitemapUrls} |
| **Total recipe URLs** (catalog indexes) | ${report.totals.recipeUrls} |
| Recipe URLs listed in sitemap | ${report.totals.recipeUrlsInSitemap} |
| **Total guide URLs** | ${report.totals.guideUrls} |
| Guide URLs listed in sitemap | ${report.totals.guideUrlsInSitemap} |
| Approved catalog (Explore / Recipes browse) | ${report.totals.approvedCatalogRecipes} |

## 1. Sitemap — required routes

| Route | In sitemap |
|-------|------------|
${REQUIRED_SITEMAP_PATHS.map((p) => `| \`${p}\` | ${sitemapPaths.has(p) ? "Yes" : "**No**"} |`).join("\n")}

${requiredMissing.length ? `\n**Missing:** ${requiredMissing.join(", ")}\n` : ""}

Hall guides index (\`/guides\`) plus **${guideUrlsInSitemap}** individual guide URLs. Explore catalog (\`/explore\`) plus **${recipeUrlsInSitemap}** recipe/smoothie detail URLs.

## 2. robots.txt

\`\`\`
${robots.trim()}
\`\`\`

| Rule | OK |
|------|:--:|
| \`User-agent: *\` | ${robotsChecks.userAgentWildcard ? "✓" : "✗"} |
| \`Allow: /\` | ${robotsChecks.allowRoot ? "✓" : "✗"} |
| Sitemap declared | ${robotsChecks.sitemapDeclared ? "✓" : "✗"} |
| \`/recipes\` not disallowed | ${robotsChecks.recipesNotBlocked ? "✓" : "✗"} |
| \`/guides\` not disallowed | ${robotsChecks.guidesNotBlocked ? "✓" : "✗"} |
| \`/explore\` not disallowed | ${robotsChecks.exploreNotBlocked ? "✓" : "✗"} |

## 3. Recipe page metadata

Audited **${recipeMap.size}** indexable recipe URLs.

| Issue | Count |
|-------|------:|
| Missing title, description, or canonical | ${missingMetadata.length} |
| Duplicate meta titles | ${duplicateTitleIssues.length} |
| Duplicate meta descriptions | ${duplicateDescIssues.length} |
| Invalid / missing canonical | ${missingCanonical.length} |
| Canonical path mismatch | ${canonicalMismatch.length} |

${missingMetadata.length ? `### Missing metadata\n\n${missingMetadata.slice(0, 30).map((r) => `- \`${r.slug}\` (\`${r.path}\`): ${r.reason}`).join("\n")}${missingMetadata.length > 30 ? `\n\n… and ${missingMetadata.length - 30} more.` : ""}\n` : ""}
${duplicateTitleIssues.length ? `### Duplicate titles (sample)\n\n${duplicateTitleIssues.slice(0, 15).map((l) => `- ${l}`).join("\n")}\n` : ""}
${duplicateDescIssues.length ? `### Duplicate meta descriptions (sample)\n\n${duplicateDescIssues.slice(0, 15).map((l) => `- ${l}`).join("\n")}\n` : ""}

## 4. Internal linking

Recipes should be reachable via **Explore / Recipes** (approved catalog) and/or **Hall Guide** meal picks. Golden/performance/expansion pages should expose **on-page related recipe clusters**.

| Signal | Count |
|--------|------:|
| In approved catalog (Explore / Recipes grid) | ${approved.recipeCount} |
| Hub-only (Pizza / Breakfast / Performance — not on Explore) | ${hubOnlyRecipes.length} |
| Not linked from any hall guide | ${notLinkedFromGuides.length} |
| Golden-family pages with &lt;2 outbound related links | ${weakOnPageLinks.length} |
| **True orphan recipes** (no catalog hub, no guide link) | **${internallyUnreachable.length}** |

${internallyUnreachable.length ? `### True orphan recipe slugs\n\n${internallyUnreachable.map((s) => `- \`${s}\``).join("\n")}\n` : "_No true orphans — every indexable recipe is reachable via Explore, a dedicated hub (/pizza, /breakfast), performance catalog, or a hall guide._\n"}
${hubOnlyRecipes.length ? `\n### Hub-only recipes (indexed, not on Explore)\n\n${hubOnlyRecipes.length} recipes live on dedicated hubs instead of the main catalog — expected for Pizza Night and some breakfast/performance entries. See \`hubOnlySample\` in JSON.\n` : ""}

## 5. Sitemap generation coverage

| Issue | Count |
|-------|------:|
| Indexable recipes missing from sitemap | ${recipesMissingFromSitemap.length} |
| Published guides missing from sitemap | ${guidesMissingFromSitemap.length} |
| Orphan sitemap URLs (no backing page) | ${orphanSitemapUrls.length} |

${recipesMissingFromSitemap.length ? `**Recipes missing from sitemap:** ${recipesMissingFromSitemap.slice(0, 20).join(", ")}${recipesMissingFromSitemap.length > 20 ? "…" : ""}\n` : ""}
${guidesMissingFromSitemap.length ? `**Guides missing:** ${guidesMissingFromSitemap.join(", ")}\n` : ""}
${orphanSitemapUrls.length ? `**Orphan sitemap paths:** ${orphanSitemapUrls.join(", ")}\n` : ""}

## 6. Remediation log (browse unification)

### Canonical path rules

| Collection | Valid canonical pattern |
|------------|-------------------------|
| Golden / performance / expansion / pizza | \`/recipes/:slug\` |
| Breakfast | \`/breakfast/:slug\` (performance: \`/breakfast/performance/:slug\`) |
| Smoothies | \`/smoothies/:slug\` |

Breakfast recipes stay in the sitemap at \`/recipes/:slug\` for legacy routing, but on-page SEO canonicals correctly use \`/breakfast/:slug\`.

### Orphan recipe guide links

Recipes excluded from Explore (duplicate hero imagery) are linked from hall guides:

| Recipe slug | Linked from |
|-------------|-------------|
| \`30-minute-pasta-e-fagioli-for-the-hall\` | \`/guides/easy-firehall-pasta-recipes\` |
| \`spaghetti-aglio-e-olio-for-the-hall\` | \`/guides/easy-firehall-pasta-recipes\` |
| \`crispy-chicken-cutlets\` | \`/guides/firehouse-comfort-meals\` |
| \`four-step-chicken-piccata\` | \`/guides/rookie-firefighter-meal-guide\` |
| \`french-onion-soup-for-the-hall\` | \`/guides/comfort-food-after-a-long-shift\` |
| \`tomato-soup-grilled-cheese-croutons\` | \`/guides/comfort-food-after-a-long-shift\` |
| \`sheet-pan-parmesan-dijon-chicken-thigh-dinner\` | \`/guides/fast-firehall-meals-under-30-minutes\` |
| \`turkey-burgers\` | \`/guides/healthy-firefighter-meals-fill-you-up\` |
| \`classic-patty-melt-for-the-crew\` | \`/guides/10-classic-firehall-meals\` |
| \`hall-blt-sandwich-feed\` | \`/guides/quick-meals-between-calls\` |

## Validation commands

\`\`\`bash
npm run audit:indexing
npm run catalog:generate-sitemap
npm run seo:audit-sitemap
\`\`\`
`;

  fs.writeFileSync(MD_OUT, md, "utf8");

  console.log("[audit:indexing] report →", MD_OUT);
  console.log(
    `[audit:indexing] sitemap=${report.totals.sitemapUrls} recipes=${report.totals.recipeUrls} guides=${report.totals.guideUrls} orphans=${internallyUnreachable.length} pass=${pass}`,
  );

  process.exit(pass ? 0 : 1);
}

main();
