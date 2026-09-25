/**
 * Server-side (pre-hydration) SEO tag injection for every public route
 * that ISN'T `/recipes/:slug` (see `recipe-html-injection.ts` for that one).
 *
 * Without this, a non-JS crawler hitting `/breakfast/:slug`, `/smoothies/:slug`,
 * `/guides/:slug`, an SEO landing page, a product page, `/families`, or even
 * `/` only ever sees the static `client/index.html` shell — correct enough
 * for the homepage's own title/description, but wrong (or entirely absent)
 * canonical/OG/JSON-LD for every other route, and duplicate title/description
 * for every non-recipe page. This mirrors the exact pattern already proven
 * out for recipes, reusing the same `shared/seo/*` builders the client uses.
 */

import type { GuidesClusterId, PageSeoConfig } from "../../shared/seo/metadata.js";
import {
  buildAboutSeo,
  buildExploreSeo,
  buildFamiliesSeo,
  buildFaqSeo,
  buildFirefighterRedLeadRecipeSeo,
  buildGeneratorSeo,
  buildGuideArticleSeo,
  buildGuidesClusterSeo,
  buildGuidesIndexSeo,
  buildHallOfFameSeo,
  buildHomeSeo,
  buildHowWeTestRecipesSeo,
  buildPizzaNightSeo,
  buildPrivacySeo,
  buildProductSeoPageSeo,
  buildSeoLandingPageSeo,
  buildTermsSeo,
  buildTopRatedRecipesSeo,
  buildWheelSeo,
  defaultOgImage,
} from "../../shared/seo/metadata.js";
import {
  buildBreakfastIndexSeo,
  buildBreakfastPerformanceIndexSeo,
  buildBreakfastRecipeSchema,
  buildBreakfastRecipeSeo,
  buildFuelRecipeSchema,
  buildSmoothieRecipeSeo,
  buildSmoothiesIndexSeo,
} from "../../shared/seo/fuel-metadata.js";
import {
  buildArticleSchema,
  buildBreadcrumbListSchema,
  buildFaqPageSchema,
  buildGuideArticleBreadcrumbs,
  buildHomeRecipeCollectionSchema,
  buildOrganizationSchema,
  buildSoftwareApplicationSchema,
  buildWebSiteSchema,
} from "../../shared/seo/schema.js";
import { absoluteImageUrl, absoluteUrl, recipePath } from "../../shared/seo/urls.js";
import { SEO_TWITTER_HANDLE } from "../../shared/seo/constants.js";
import { HOME_FAQ_ITEMS } from "../../shared/seo/home-faq-items.js";
import { FIREHALL_CATEGORY_LABEL, type FirehallCategoryId } from "../../shared/firehall-categories.js";
import { firehallCategoryExplorePath } from "../../shared/browse-canonical.js";
import { APPROVED_CATALOG_TOTAL } from "../../shared/meal-catalog/curated-count.js";
import { PIZZA_NIGHT_COUNT, PIZZA_NIGHT_RECIPES } from "../../shared/pizza-night/manifest.js";
import { getSeoLandingPage, SEO_LANDING_PAGES } from "../../shared/seo/landing-pages-data.js";
import { getProductSeoPage, PRODUCT_SEO_PAGES } from "../../shared/seo/product-pages-data.js";
import { isPerformanceBreakfastSlug } from "../../shared/breakfast-catalog/governance-types.js";
import { pickRelatedBreakfastEntries } from "../../shared/fuel-catalog/breakfast-related.js";
import type { BreakfastIndexEntry } from "../../shared/breakfast-schema.js";
import {
  readBreakfastRecipePageFromDisk,
  readBreakfastPerformanceIndexFromDisk,
} from "../breakfast-catalog/page-store.js";
import { readSmoothieRecipePage } from "../fuel-catalog/page-store.js";
import { SMOOTHIE_CATALOG_ITEMS } from "../../shared/fuel-catalog/smoothies/catalog-data.js";
import { readEditorialArticle } from "../editorial/page-store.js";
import { getEditorialArticleBySlug, EDITORIAL_ARTICLES } from "../../shared/editorial/articles-data.js";
import { guidePath } from "../../shared/editorial/content-schema.js";
import { guidesInCluster } from "../../shared/editorial/topic-clusters.js";
import { getApprovedCatalog } from "../approved-catalog-cache.js";
import { approvedCatalogRecipePath } from "../../shared/approved-catalog.js";
import { applySeoTagsToHtml, applyNotFoundSeoToHtml, injectJsonLdIntoHtml, injectBodyContentIntoHtml } from "./apply-seo-tags.js";
import {
  breakfastRecipeSnapshot,
  editorialArticleSnapshot,
  fallbackIndexSnapshot,
  fuelRecipeSnapshot,
  h1FromSeoTitle,
  productSeoPageSnapshot,
  renderArticleSnapshotHtml,
  renderIndexSnapshotHtml,
  renderRecipeSnapshotHtml,
  seoLandingPageSnapshot,
  type IndexSnapshotLink,
  type IndexSnapshotSection,
} from "./content-snapshot.js";
import { pathShouldNoindex } from "./sitemap.js";
import type { InjectionResult } from "./recipe-html-injection.js";
import { GOLDEN_100_RECIPES } from "../../shared/golden-100/manifest.js";
import { readBreakfastCatalogIndexFromDisk } from "../breakfast-catalog/page-store.js";

const HOME_CATEGORY_CLUSTERS: FirehallCategoryId[] = [
  "crew_favorites",
  "quick_meals",
  "healthy_options",
  "bbq_smoker",
];

/** Real, crawlable recipe detail links — every `/recipes/:slug` page already
 * carries its own full content snapshot, so linking to a sample of them from
 * index pages gives non-JS crawlers a real path deeper into the catalog. */
function popularRecipeLinks(count: number): IndexSnapshotSection {
  return {
    heading: "Popular recipes",
    links: GOLDEN_100_RECIPES.slice(0, count).map((r) => ({
      label: r.title,
      path: recipePath(r.classicSlug || r.slug),
    })),
  };
}

/** Every Explore-eligible recipe across every catalog (golden/performance/
 * expansion/pizza/bbq/breakfast/smoothies), grouped by category, as real
 * crawlable links. Explore's raw-HTML snapshot previously sampled only 15
 * Golden 100 titles via `popularRecipeLinks` — the other ~375+ Explore-
 * eligible recipes had no crawlable path from Explore at all, so /explore
 * (the site's single source of truth for the full catalog — see the
 * Generator/Explore parity work) wasn't actually exposing that catalog to
 * non-JS crawlers. */
function fullCatalogLinkSections(): IndexSnapshotSection[] {
  const { recipes } = getApprovedCatalog();
  const byCategory = new Map<string, IndexSnapshotLink[]>();
  for (const r of recipes) {
    const key = r.categoryLabel || "Recipes";
    const list = byCategory.get(key) ?? [];
    list.push({ label: r.title, path: approvedCatalogRecipePath(r.slug) });
    byCategory.set(key, list);
  }
  return [...byCategory.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([heading, links]) => ({ heading, links }));
}

/** Breakfast recipes have no precomputed `relatedSlugs` (unlike the dinner
 * catalogs/smoothies) — `pickRelatedBreakfastEntries` (shared with the
 * client's own "Related breakfasts" section, see `breakfast-recipe-page.tsx`)
 * picks genuinely similar recipes by shared-filter overlap instead of a
 * random/arbitrary set, so both surfaces render the same related set. */
function computeRelatedBreakfastLinks(
  currentSlug: string,
  allEntries: BreakfastIndexEntry[],
  count = 6,
): IndexSnapshotLink[] {
  return pickRelatedBreakfastEntries(currentSlug, allEntries, count).map((entry) => ({
    label: entry.title,
    path: isPerformanceBreakfastSlug(entry.slug)
      ? `/breakfast/performance/${entry.slug}`
      : `/breakfast/${entry.slug}`,
  }));
}

function categoryLinkSection(): IndexSnapshotSection {
  return {
    heading: "Browse by category",
    links: HOME_CATEGORY_CLUSTERS.map((id) => ({
      label: FIREHALL_CATEGORY_LABEL[id],
      path: firehallCategoryExplorePath(id),
    })).concat([
      { label: "Breakfast", path: "/breakfast" },
      { label: "Smoothies", path: "/smoothies" },
      { label: "Pizza Night", path: "/pizza" },
      { label: "Guides", path: "/guides" },
    ]),
  };
}

/** Every SEO landing page (/firefighter-meals, /firehouse-recipes, …) and
 * product/tool page (/hall-meal-planner, /cost-per-plate-calculator, …),
 * plus a handful of one-off marketing/utility routes — none of these had
 * ANY crawlable inbound link anywhere on the site (confirmed via
 * `audit-crawlability`: 26 of 27 "static" sitemap URLs had zero inbound
 * links). The homepage is the one page guaranteed to be at depth 0, so
 * linking them all from here guarantees every one is at most depth 1. */
function moreResourcesLinkSections(): IndexSnapshotSection[] {
  return [
    {
      heading: "More firefighter meal resources",
      links: SEO_LANDING_PAGES.map((p) => ({ label: p.h1, path: p.path })),
    },
    {
      heading: "Tools",
      links: PRODUCT_SEO_PAGES.map((p) => ({ label: p.h1, path: p.path })),
    },
    {
      heading: "More",
      links: [
        { label: "Top Rated Recipes", path: "/top-rated-recipes" },
        { label: "Hall of Fame", path: "/hall-of-fame" },
        { label: "Generator", path: "/generator" },
        { label: "FAQ", path: "/faq" },
        { label: "About", path: "/about" },
        { label: "How We Test Recipes", path: "/how-we-test-recipes" },
        { label: "Firefighter Red Lead Recipe", path: "/firefighter-red-lead-recipe" },
      ],
    },
  ];
}

/** Every slug that resolves to a real, Explore-eligible catalog recipe —
 * used to guard every recipe-slug link built from hand-authored content
 * (guide `mealRecommendations`, landing/product page `recipeSlugs`) against
 * ever emitting a link to a stale/renamed/removed recipe (see
 * `audit-crawlability`'s "broken internal links" check). */
function knownRecipeSlugsSet(): Set<string> {
  return new Set(getApprovedCatalog().recipes.map((r) => r.slug));
}

interface ResolvedPageSeo {
  seo: PageSeoConfig;
  jsonLd: unknown[];
  bodyHtml?: string;
}

/**
 * `null` = path is a known private/auth/app-shell route (see
 * `pathShouldNoindex`) — 200 pass-through, client handles it. `"not_found"`
 * = either a known dynamic content pattern (e.g. `/breakfast/:slug`,
 * `/guides/topic/:clusterId`) whose slug/id doesn't resolve to real content,
 * OR a path that isn't a recognized route/pattern/private-prefix at all —
 * both cases should get a real 404 instead of a "soft 404" (200 + homepage
 * shell).
 */
function resolvePageSeo(origin: string, pathname: string): ResolvedPageSeo | "not_found" | null {
  const path = (pathname.split("?")[0] || "/").replace(/\/+$/, "") || "/";

  if (path === "/") {
    const seo = buildHomeSeo();
    return {
      seo,
      jsonLd: [
        buildOrganizationSchema(origin),
        buildWebSiteSchema(origin),
        buildBreadcrumbListSchema(origin, [{ name: "Home", path: "/" }]),
        buildHomeRecipeCollectionSchema(
          origin,
          APPROVED_CATALOG_TOTAL,
          HOME_CATEGORY_CLUSTERS.map((id) => ({
            name: FIREHALL_CATEGORY_LABEL[id],
            path: firehallCategoryExplorePath(id),
          })),
        ),
        buildFaqPageSchema(HOME_FAQ_ITEMS),
      ],
      bodyHtml: renderIndexSnapshotHtml({
        h1: "Firehall Meals",
        intro: seo.description,
        sections: [categoryLinkSection(), popularRecipeLinks(10), ...moreResourcesLinkSections()],
      }),
    };
  }

  if (path === "/families") {
    const seo = buildFamiliesSeo();
    return {
      seo,
      jsonLd: [
        buildOrganizationSchema(origin),
        buildWebSiteSchema(origin),
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Recipe families", path: seo.canonicalPath },
        ]),
      ],
    };
  }

  if (path === "/wheel") {
    const seo = buildWheelSeo();
    // "/classics-wheel" (a separate SEO explainer page for this same
    // feature) now 301-redirects here (see server/routes.ts) — reuse its
    // real problem/solution copy and FAQs so this page, not just that one,
    // ships substantive server-rendered content to non-JS clients.
    const classicsWheelProductPage = getProductSeoPage("classics-wheel");
    return {
      seo,
      jsonLd: [
        buildOrganizationSchema(origin),
        buildWebSiteSchema(origin),
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Classics Wheel", path: seo.canonicalPath },
        ]),
        ...(classicsWheelProductPage
          ? [
              buildSoftwareApplicationSchema(origin, {
                name: classicsWheelProductPage.appName,
                description: classicsWheelProductPage.description,
                path: seo.canonicalPath,
              }),
              buildFaqPageSchema(classicsWheelProductPage.faqs),
            ]
          : []),
      ],
      bodyHtml: classicsWheelProductPage
        ? renderArticleSnapshotHtml(
            origin,
            productSeoPageSnapshot(classicsWheelProductPage, knownRecipeSlugsSet()),
          )
        : undefined,
    };
  }

  if (path === "/explore") {
    const seo = buildExploreSeo(APPROVED_CATALOG_TOTAL);
    return {
      seo,
      jsonLd: [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Explore", path: "/explore" },
        ]),
      ],
      bodyHtml: renderIndexSnapshotHtml({
        h1: h1FromSeoTitle(seo.title),
        intro: seo.description,
        sections: [categoryLinkSection(), ...fullCatalogLinkSections()],
      }),
    };
  }

  if (path === "/top-rated-recipes") {
    return {
      seo: buildTopRatedRecipesSeo(),
      jsonLd: [
        buildWebSiteSchema(origin),
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Explore", path: "/explore" },
          { name: "Top Rated Recipes", path: "/top-rated-recipes" },
        ]),
      ],
    };
  }

  if (path === "/hall-of-fame") {
    return {
      seo: buildHallOfFameSeo(),
      jsonLd: [
        buildWebSiteSchema(origin),
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Hall of Fame", path: "/hall-of-fame" },
        ]),
      ],
    };
  }

  if (path === "/generator") {
    return {
      seo: buildGeneratorSeo(APPROVED_CATALOG_TOTAL),
      jsonLd: [buildOrganizationSchema(origin), buildWebSiteSchema(origin)],
    };
  }

  if (path === "/faq") {
    return {
      seo: buildFaqSeo(),
      jsonLd: [buildOrganizationSchema(origin), buildFaqPageSchema(HOME_FAQ_ITEMS)],
    };
  }

  if (path === "/about") {
    return {
      seo: buildAboutSeo(),
      jsonLd: [
        buildOrganizationSchema(origin),
        buildWebSiteSchema(origin),
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ]),
      ],
    };
  }

  if (path === "/how-we-test-recipes") {
    return {
      seo: buildHowWeTestRecipesSeo(),
      jsonLd: [
        buildOrganizationSchema(origin),
        buildWebSiteSchema(origin),
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "How We Test Recipes", path: "/how-we-test-recipes" },
        ]),
      ],
    };
  }

  // "/privacy" and "/terms" previously had no entry here at all, so a non-JS
  // crawler (or any raw HTML fetch) hitting either URL saw the untouched
  // `index.html` shell — homepage title, homepage canonical, homepage
  // description — instead of the real legal page's own metadata. The client
  // still applies its own tags post-hydration (see `privacy-page.tsx` /
  // `terms-page.tsx`), so this only fixes the pre-hydration/non-JS view.
  if (path === "/privacy") {
    return {
      seo: buildPrivacySeo(),
      jsonLd: [
        buildOrganizationSchema(origin),
        buildWebSiteSchema(origin),
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Privacy Policy", path: "/privacy" },
        ]),
      ],
    };
  }

  if (path === "/terms") {
    return {
      seo: buildTermsSeo(),
      jsonLd: [
        buildOrganizationSchema(origin),
        buildWebSiteSchema(origin),
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Terms of Service", path: "/terms" },
        ]),
      ],
    };
  }

  if (path === "/firefighter-red-lead-recipe") {
    return {
      seo: buildFirefighterRedLeadRecipeSeo(),
      jsonLd: [
        buildOrganizationSchema(origin),
        buildWebSiteSchema(origin),
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Firefighter Red Lead Recipe", path: "/firefighter-red-lead-recipe" },
        ]),
      ],
    };
  }

  if (path === "/pizza") {
    const seo = buildPizzaNightSeo(PIZZA_NIGHT_COUNT);
    return {
      seo,
      jsonLd: [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Pizza Night", path: "/pizza" },
        ]),
      ],
      bodyHtml: renderIndexSnapshotHtml({
        h1: h1FromSeoTitle(seo.title),
        intro: seo.description,
        sections: [
          {
            heading: "Pizza recipes",
            links: PIZZA_NIGHT_RECIPES.map((r) => ({ label: r.title, path: recipePath(r.slug) })),
          },
        ],
      }),
    };
  }

  if (path === "/smoothies") {
    const seo = buildSmoothiesIndexSeo(SMOOTHIE_CATALOG_ITEMS.length);
    return {
      seo,
      jsonLd: [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Smoothies", path: "/smoothies" },
        ]),
      ],
      bodyHtml: renderIndexSnapshotHtml({
        h1: h1FromSeoTitle(seo.title),
        intro: seo.description,
        sections: [
          {
            heading: "Smoothie recipes",
            links: SMOOTHIE_CATALOG_ITEMS.map((item) => ({
              label: item.title,
              path: `/smoothies/${item.slug}`,
            })),
          },
        ],
      }),
    };
  }

  if (path === "/breakfast") {
    const seo = buildBreakfastIndexSeo();
    const breakfastIndex = readBreakfastCatalogIndexFromDisk();
    const performanceIndex = readBreakfastPerformanceIndexFromDisk();
    return {
      seo,
      jsonLd: [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Breakfast", path: "/breakfast" },
        ]),
      ],
      bodyHtml: renderIndexSnapshotHtml({
        h1: h1FromSeoTitle(seo.title),
        intro: seo.description,
        sections: [
          {
            // Previously `.slice(0, 15)` — only 15 of 62 breakfast recipes
            // had ANY crawlable link anywhere on the site (confirmed against
            // raw production HTML: the other 47 had zero inbound links).
            heading: "Breakfast recipes",
            links: (breakfastIndex?.recipes ?? []).map((r) => ({
              label: r.title,
              path: `/breakfast/${r.slug}`,
            })),
          },
          {
            heading: "Performance breakfasts",
            links: [
              { label: "All performance breakfasts", path: "/breakfast/performance" },
              ...(performanceIndex?.recipes ?? []).map((r) => ({
                label: r.title,
                path: `/breakfast/performance/${r.slug}`,
              })),
            ],
          },
          {
            heading: "Cooking dinner tonight?",
            links: [
              { label: "Firefighter Meals hub", path: "/firefighter-meals" },
              { label: "Find Tonight's Meal", path: "/generator" },
            ],
          },
        ],
      }),
    };
  }

  if (path === "/breakfast/performance") {
    const seo = buildBreakfastPerformanceIndexSeo();
    // Performance breakfasts live in their own index (`/breakfast/performance/index.json`,
    // fetched client-side via `fetchBreakfastPerformanceCatalogIndex`) — the
    // plain breakfast index never contained them, so filtering it for
    // performance slugs (the old approach) always produced an empty list,
    // leaving this hub (and all 5 performance recipes) with zero crawlable
    // links anywhere on the site.
    const performanceIndex = readBreakfastPerformanceIndexFromDisk();
    return {
      seo,
      jsonLd: [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Breakfast", path: "/breakfast" },
          { name: "Performance Breakfasts", path: "/breakfast/performance" },
        ]),
      ],
      bodyHtml: renderIndexSnapshotHtml({
        h1: h1FromSeoTitle(seo.title),
        intro: seo.description,
        sections: [
          {
            heading: "Performance breakfast recipes",
            links: (performanceIndex?.recipes ?? []).map((r) => ({
              label: r.title,
              path: `/breakfast/performance/${r.slug}`,
            })),
          },
        ],
      }),
    };
  }

  if (path === "/guides") {
    const articleCount = EDITORIAL_ARTICLES.length;
    const seo = buildGuidesIndexSeo(articleCount);
    return {
      seo,
      jsonLd: [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
        ]),
      ],
      bodyHtml: renderIndexSnapshotHtml({
        h1: h1FromSeoTitle(seo.title),
        intro: seo.description,
        sections: [
          {
            heading: "Guide topics",
            links: [
              { label: "Firefighter Meals", path: "/guides/topic/firefighter-meals" },
              { label: "Firehall Dinner Ideas", path: "/guides/topic/firehall-dinners" },
              { label: "Firefighter Nutrition", path: "/guides/topic/firefighter-nutrition" },
              { label: "Station Cooking", path: "/guides/topic/station-cooking" },
            ],
          },
          {
            heading: "Guides",
            links: EDITORIAL_ARTICLES.map((a) => ({ label: a.title, path: guidePath(a.slug) })),
          },
        ],
      }),
    };
  }

  const GUIDES_CLUSTER_IDS: GuidesClusterId[] = [
    "firefighter-meals",
    "firehall-dinners",
    "firefighter-nutrition",
    "station-cooking",
  ];
  const guidesClusterMatch = /^\/guides\/topic\/([a-z0-9-]+)$/i.exec(path);
  if (guidesClusterMatch) {
    const rawId = guidesClusterMatch[1].trim().toLowerCase();
    const clusterId = GUIDES_CLUSTER_IDS.find((id) => id === rawId);
    // The route pattern matched ("/guides/topic/:something") but the id
    // isn't one of the four real clusters — e.g. "/guides/topic/bogus".
    // This used to fall all the way through to the final `return null`
    // below (a silent 200 + homepage shell "soft 404"). Since this pattern
    // IS ours to own, an unresolvable id is a real 404, not a pass-through.
    if (!clusterId) return "not_found";
    // Every guide has exactly one canonical `topic` (see content-schema.ts);
    // `guidesInCluster` maps that topic to the one cluster it genuinely
    // belongs to (see `shared/editorial/topic-clusters.ts` for the full
    // topic -> cluster mapping and the one ambiguous split it documents).
    // This used to link ALL 57 guides on every cluster's raw-HTML snapshot
    // (the same "topic pages are identical" bug the client page had) —
    // filter here too so non-JS crawlers see the real, topic-scoped list.
    const clusterArticles = guidesInCluster(EDITORIAL_ARTICLES, clusterId);
    const seo = buildGuidesClusterSeo(clusterId, clusterArticles.length);
    return {
      seo,
      jsonLd: [
        buildOrganizationSchema(origin),
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: clusterId, path: `/guides/topic/${clusterId}` },
        ]),
      ],
      bodyHtml: renderIndexSnapshotHtml({
        h1: h1FromSeoTitle(seo.title),
        intro: seo.description,
        sections: [
          {
            heading: "Guides in this topic",
            links: clusterArticles.map((a) => ({ label: a.title, path: guidePath(a.slug) })),
          },
        ],
      }),
    };
  }

  function allBreakfastLinkableEntries(): BreakfastIndexEntry[] {
    const regular = readBreakfastCatalogIndexFromDisk()?.recipes ?? [];
    const performance = readBreakfastPerformanceIndexFromDisk()?.recipes ?? [];
    return [...regular, ...performance];
  }

  const breakfastPerfMatch = /^\/breakfast\/performance\/([a-z0-9-]+)$/i.exec(path);
  if (breakfastPerfMatch) {
    const slug = breakfastPerfMatch[1].trim().toLowerCase();
    const page = readBreakfastRecipePageFromDisk(slug);
    if (!page) return "not_found";
    return {
      seo: buildBreakfastRecipeSeo(page),
      jsonLd: [
        buildBreakfastRecipeSchema(origin, page),
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Breakfast", path: "/breakfast" },
          { name: "Performance Breakfasts", path: "/breakfast/performance" },
          { name: page.title, path: `/breakfast/performance/${page.slug}` },
        ]),
      ],
      bodyHtml: renderRecipeSnapshotHtml(
        origin,
        breakfastRecipeSnapshot(page, computeRelatedBreakfastLinks(slug, allBreakfastLinkableEntries())),
      ),
    };
  }

  const breakfastMatch = /^\/breakfast\/([a-z0-9-]+)$/i.exec(path);
  if (breakfastMatch) {
    const slug = breakfastMatch[1].trim().toLowerCase();
    const page = readBreakfastRecipePageFromDisk(slug);
    if (!page) return "not_found";
    const isPerformance = isPerformanceBreakfastSlug(slug);
    return {
      seo: buildBreakfastRecipeSeo(page),
      jsonLd: [
        buildBreakfastRecipeSchema(origin, page),
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Breakfast", path: "/breakfast" },
          ...(isPerformance ? [{ name: "Performance Breakfasts", path: "/breakfast/performance" }] : []),
          { name: page.title, path: isPerformance ? `/breakfast/performance/${page.slug}` : `/breakfast/${page.slug}` },
        ]),
      ],
      bodyHtml: renderRecipeSnapshotHtml(
        origin,
        breakfastRecipeSnapshot(page, computeRelatedBreakfastLinks(slug, allBreakfastLinkableEntries())),
      ),
    };
  }

  const smoothieMatch = /^\/smoothies\/([a-z0-9-]+)$/i.exec(path);
  if (smoothieMatch) {
    const slug = smoothieMatch[1].trim().toLowerCase();
    const page = readSmoothieRecipePage(slug);
    if (!page) return "not_found";
    const canonicalPath = `/smoothies/${page.slug}`;
    return {
      seo: buildSmoothieRecipeSeo(page),
      jsonLd: [
        buildFuelRecipeSchema(origin, page, canonicalPath),
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Smoothies", path: "/smoothies" },
          { name: page.title, path: canonicalPath },
        ]),
      ],
      bodyHtml: renderRecipeSnapshotHtml(origin, fuelRecipeSnapshot(page)),
    };
  }

  const guideMatch = /^\/(?:guides|blog)\/([a-z0-9-]+)$/i.exec(path);
  if (guideMatch && guideMatch[1] !== "topic") {
    const slug = guideMatch[1].trim().toLowerCase();
    const article = readEditorialArticle(slug) ?? getEditorialArticleBySlug(slug) ?? null;
    if (!article) return "not_found";
    return {
      seo: buildGuideArticleSeo(article),
      jsonLd: [
        buildArticleSchema(origin, article),
        buildFaqPageSchema(article.faqs),
        buildBreadcrumbListSchema(origin, buildGuideArticleBreadcrumbs(origin, article)),
      ],
      bodyHtml: renderArticleSnapshotHtml(origin, editorialArticleSnapshot(article, knownRecipeSlugsSet())),
    };
  }

  // SEO landing pages and product pages are single-segment, e.g. "/firefighter-meals".
  const singleSegmentMatch = /^\/([a-z0-9-]+)$/i.exec(path);
  if (singleSegmentMatch) {
    const slug = singleSegmentMatch[1].trim().toLowerCase();

    const landing = getSeoLandingPage(slug);
    if (landing) {
      return {
        seo: buildSeoLandingPageSeo(landing),
        jsonLd: [
          buildOrganizationSchema(origin),
          buildWebSiteSchema(origin),
          buildBreadcrumbListSchema(origin, [
            { name: "Home", path: "/" },
            { name: landing.h1, path: landing.path },
          ]),
          buildFaqPageSchema(landing.faqs),
        ],
        bodyHtml: renderArticleSnapshotHtml(origin, seoLandingPageSnapshot(landing, knownRecipeSlugsSet())),
      };
    }

    const product = getProductSeoPage(slug);
    if (product) {
      return {
        seo: buildProductSeoPageSeo(product),
        jsonLd: [
          buildOrganizationSchema(origin),
          buildWebSiteSchema(origin),
          buildSoftwareApplicationSchema(origin, {
            name: product.appName,
            description: product.description,
            path: product.path,
          }),
          buildBreadcrumbListSchema(origin, [
            { name: "Home", path: "/" },
            { name: product.h1, path: product.path },
          ]),
          buildFaqPageSchema(product.faqs),
        ],
        bodyHtml: renderArticleSnapshotHtml(origin, productSeoPageSnapshot(product, knownRecipeSlugsSet())),
      };
    }
  }

  // Everything past this point is a path `resolvePageSeo` doesn't own. Two
  // very different things land here:
  //   1. Private/authenticated/app-shell routes (e.g. "/me", "/hall",
  //      "/tonight", "/admin", "/vote/:id") and the small number of
  //      known private redirect aliases under those same prefixes
  //      (e.g. "/hall/settings" -> "/hall"). These are real, working client
  //      routes — the client owns them entirely, and they're already kept
  //      out of the index via `X-Robots-Tag: noindex` (see `routes.ts`,
  //      using this same `pathShouldNoindex` prefix list). They must keep
  //      passing through as a plain 200 shell.
  //   2. Genuinely unknown public URLs (typos, dead links, bots probing
  //      random paths) that don't match ANY known route, prefix, or content
  //      pattern. These used to also fall through to a 200 + homepage title
  //      + homepage canonical "soft 404" — indistinguishable from a real
  //      page to a crawler. Those must be a real 404 instead.
  if (pathShouldNoindex(pathname)) return null;
  return "not_found";
}

/**
 * Rewrite `html` for any route type covered by `resolvePageSeo`. Returns
 * `status: 200, html` unchanged for private/app-shell routes (they either
 * have their own injector — recipes/curated packages — or are client-owned
 * app/auth routes the client's own post-hydration rendering handles), and
 * `status: 404` both for a recognized content-slug pattern whose slug
 * doesn't resolve (dead/removed recipe, guide, smoothie, or guide-topic
 * links) and for any other genuinely unrecognized public URL — fixing
 * "soft 404s" (a real 404 status instead of a 200 + homepage-shell) in both
 * cases.
 */
export function injectGenericPageSeoIntoHtml(html: string, origin: string, pathname: string): InjectionResult {
  const resolved = resolvePageSeo(origin, pathname);
  if (resolved === "not_found") return { html: applyNotFoundSeoToHtml(html), status: 404 };
  if (!resolved) return { html, status: 200 };

  const canonicalUrl = absoluteUrl(origin, resolved.seo.canonicalPath);
  const ogImage = resolved.seo.ogImage
    ? absoluteImageUrl(origin, resolved.seo.ogImage)
    : defaultOgImage(origin);
  let out = applySeoTagsToHtml(html, {
    title: resolved.seo.title,
    description: resolved.seo.description,
    canonicalUrl,
    ogType: resolved.seo.ogType ?? "website",
    ogImage,
    twitterSite: SEO_TWITTER_HANDLE,
  });

  out = injectJsonLdIntoHtml(out, resolved.jsonLd);
  // Every route resolved here MUST ship real, server-visible body content —
  // a route with correct <head> tags but an empty `<div id="root">` is
  // still indistinguishable from every other route to a non-JS crawler.
  // Routes with a richer, page-specific snapshot use it; everything else
  // (marketing/landing/product pages) gets the generic fallback so no
  // indexable page in this table can ever ship with zero visible content.
  const bodyHtml = resolved.bodyHtml || renderIndexSnapshotHtml(fallbackIndexSnapshot(resolved.seo.title, resolved.seo.description));
  out = injectBodyContentIntoHtml(out, bodyHtml);

  return { html: out, status: 200 };
}
