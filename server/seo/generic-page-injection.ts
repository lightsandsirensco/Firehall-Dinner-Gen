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
  buildProductSeoPageSeo,
  buildSeoLandingPageSeo,
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
import { getSeoLandingPage } from "../../shared/seo/landing-pages-data.js";
import { getProductSeoPage } from "../../shared/seo/product-pages-data.js";
import { isPerformanceBreakfastSlug } from "../../shared/breakfast-catalog/governance-types.js";
import { readBreakfastRecipePageFromDisk } from "../breakfast-catalog/page-store.js";
import { readSmoothieRecipePage } from "../fuel-catalog/page-store.js";
import { SMOOTHIE_CATALOG_ITEMS } from "../../shared/fuel-catalog/smoothies/catalog-data.js";
import { readEditorialArticle } from "../editorial/page-store.js";
import { getEditorialArticleBySlug, EDITORIAL_ARTICLES } from "../../shared/editorial/articles-data.js";
import { guidePath } from "../../shared/editorial/content-schema.js";
import { applySeoTagsToHtml, injectJsonLdIntoHtml, injectBodyContentIntoHtml } from "./apply-seo-tags.js";
import {
  breakfastRecipeSnapshot,
  editorialArticleSnapshot,
  fallbackIndexSnapshot,
  fuelRecipeSnapshot,
  h1FromSeoTitle,
  renderArticleSnapshotHtml,
  renderIndexSnapshotHtml,
  renderRecipeSnapshotHtml,
  type IndexSnapshotSection,
} from "./content-snapshot.js";
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

interface ResolvedPageSeo {
  seo: PageSeoConfig;
  jsonLd: unknown[];
  bodyHtml?: string;
}

/**
 * `null` = path isn't one we own (private/auth/redirect routes — 200
 * pass-through, client handles it). `"not_found"` = path matches a known
 * dynamic content pattern (e.g. `/breakfast/:slug`) but the slug doesn't
 * resolve to real content — caller should respond 404 instead of a "soft
 * 404" (200 + empty shell).
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
        sections: [categoryLinkSection(), popularRecipeLinks(10)],
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
    return {
      seo,
      jsonLd: [
        buildOrganizationSchema(origin),
        buildWebSiteSchema(origin),
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Classics Wheel", path: seo.canonicalPath },
        ]),
      ],
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
        sections: [popularRecipeLinks(15), categoryLinkSection()],
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
            links: PIZZA_NIGHT_RECIPES.slice(0, 12).map((r) => ({ label: r.title, path: recipePath(r.slug) })),
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
            heading: "Breakfast recipes",
            links: (breakfastIndex?.recipes ?? [])
              .slice(0, 15)
              .map((r) => ({ label: r.title, path: `/breakfast/${r.slug}` })),
          },
        ],
      }),
    };
  }

  if (path === "/breakfast/performance") {
    const seo = buildBreakfastPerformanceIndexSeo();
    const breakfastIndex = readBreakfastCatalogIndexFromDisk();
    const performanceEntries = (breakfastIndex?.recipes ?? []).filter((r) => isPerformanceBreakfastSlug(r.slug));
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
            links: performanceEntries
              .slice(0, 15)
              .map((r) => ({ label: r.title, path: `/breakfast/performance/${r.slug}` })),
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
    if (clusterId) {
      const seo = buildGuidesClusterSeo(clusterId, EDITORIAL_ARTICLES.length);
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
              heading: "Guides",
              links: EDITORIAL_ARTICLES.map((a) => ({ label: a.title, path: guidePath(a.slug) })),
            },
          ],
        }),
      };
    }
  }

  const breakfastPerfMatch = /^\/breakfast\/performance\/([a-z0-9-]+)$/i.exec(path);
  if (breakfastPerfMatch) {
    const page = readBreakfastRecipePageFromDisk(breakfastPerfMatch[1].trim().toLowerCase());
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
      bodyHtml: renderRecipeSnapshotHtml(origin, breakfastRecipeSnapshot(page)),
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
      bodyHtml: renderRecipeSnapshotHtml(origin, breakfastRecipeSnapshot(page)),
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
      bodyHtml: renderArticleSnapshotHtml(origin, editorialArticleSnapshot(article)),
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
      };
    }
  }

  return null;
}

/**
 * Rewrite `html` for any route type covered by `resolvePageSeo`. Returns
 * `status: 200, html` unchanged for routes not covered here (they either
 * have their own injector — recipes/curated packages — or fall through to
 * the client's own post-hydration `usePageSeo` for browsers/JS-executing
 * crawlers), and `status: 404` for a recognized content-slug pattern whose
 * slug doesn't resolve (fixes "soft 404s" — a real 404 status instead of a
 * 200 + empty shell for dead/removed recipe, guide, or smoothie links).
 */
export function injectGenericPageSeoIntoHtml(html: string, origin: string, pathname: string): InjectionResult {
  const resolved = resolvePageSeo(origin, pathname);
  if (resolved === "not_found") return { html, status: 404 };
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
