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
import { absoluteImageUrl, absoluteUrl } from "../../shared/seo/urls.js";
import { SEO_TWITTER_HANDLE } from "../../shared/seo/constants.js";
import { HOME_FAQ_ITEMS } from "../../shared/seo/home-faq-items.js";
import { FIREHALL_CATEGORY_LABEL, type FirehallCategoryId } from "../../shared/firehall-categories.js";
import { firehallCategoryExplorePath } from "../../shared/browse-canonical.js";
import { APPROVED_CATALOG_TOTAL } from "../../shared/meal-catalog/curated-count.js";
import { PIZZA_NIGHT_COUNT } from "../../shared/pizza-night/manifest.js";
import { getSeoLandingPage } from "../../shared/seo/landing-pages-data.js";
import { getProductSeoPage } from "../../shared/seo/product-pages-data.js";
import { isPerformanceBreakfastSlug } from "../../shared/breakfast-catalog/governance-types.js";
import { readBreakfastRecipePageFromDisk } from "../breakfast-catalog/page-store.js";
import { readSmoothieRecipePage } from "../fuel-catalog/page-store.js";
import { readEditorialArticle } from "../editorial/page-store.js";
import { getEditorialArticleBySlug, EDITORIAL_ARTICLES } from "../../shared/editorial/articles-data.js";
import { applySeoTagsToHtml, injectJsonLdIntoHtml } from "./apply-seo-tags.js";

const HOME_CATEGORY_CLUSTERS: FirehallCategoryId[] = [
  "crew_favorites",
  "quick_meals",
  "healthy_options",
  "bbq_smoker",
];

interface ResolvedPageSeo {
  seo: PageSeoConfig;
  jsonLd: unknown[];
}

function resolvePageSeo(origin: string, pathname: string): ResolvedPageSeo | null {
  const path = (pathname.split("?")[0] || "/").replace(/\/+$/, "") || "/";

  if (path === "/") {
    return {
      seo: buildHomeSeo(),
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
    return {
      seo: buildExploreSeo(APPROVED_CATALOG_TOTAL),
      jsonLd: [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Explore", path: "/explore" },
        ]),
      ],
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
    return {
      seo: buildPizzaNightSeo(PIZZA_NIGHT_COUNT),
      jsonLd: [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Pizza Night", path: "/pizza" },
        ]),
      ],
    };
  }

  if (path === "/smoothies") {
    return {
      seo: buildSmoothiesIndexSeo(10),
      jsonLd: [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Smoothies", path: "/smoothies" },
        ]),
      ],
    };
  }

  if (path === "/breakfast") {
    return {
      seo: buildBreakfastIndexSeo(),
      jsonLd: [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Breakfast", path: "/breakfast" },
        ]),
      ],
    };
  }

  if (path === "/breakfast/performance") {
    return {
      seo: buildBreakfastPerformanceIndexSeo(),
      jsonLd: [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Breakfast", path: "/breakfast" },
          { name: "Performance Breakfasts", path: "/breakfast/performance" },
        ]),
      ],
    };
  }

  if (path === "/guides") {
    const articleCount = EDITORIAL_ARTICLES.length;
    return {
      seo: buildGuidesIndexSeo(articleCount),
      jsonLd: [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
        ]),
      ],
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
      return {
        seo: buildGuidesClusterSeo(clusterId, EDITORIAL_ARTICLES.length),
        jsonLd: [
          buildOrganizationSchema(origin),
          buildBreadcrumbListSchema(origin, [
            { name: "Home", path: "/" },
            { name: "Guides", path: "/guides" },
            { name: clusterId, path: `/guides/topic/${clusterId}` },
          ]),
        ],
      };
    }
  }

  const breakfastPerfMatch = /^\/breakfast\/performance\/([a-z0-9-]+)$/i.exec(path);
  if (breakfastPerfMatch) {
    const page = readBreakfastRecipePageFromDisk(breakfastPerfMatch[1].trim().toLowerCase());
    if (page) {
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
      };
    }
  }

  const breakfastMatch = /^\/breakfast\/([a-z0-9-]+)$/i.exec(path);
  if (breakfastMatch) {
    const slug = breakfastMatch[1].trim().toLowerCase();
    const page = readBreakfastRecipePageFromDisk(slug);
    if (page) {
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
      };
    }
  }

  const smoothieMatch = /^\/smoothies\/([a-z0-9-]+)$/i.exec(path);
  if (smoothieMatch) {
    const slug = smoothieMatch[1].trim().toLowerCase();
    const page = readSmoothieRecipePage(slug);
    if (page) {
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
      };
    }
  }

  const guideMatch = /^\/(?:guides|blog)\/([a-z0-9-]+)$/i.exec(path);
  if (guideMatch && guideMatch[1] !== "topic") {
    const slug = guideMatch[1].trim().toLowerCase();
    const article = readEditorialArticle(slug) ?? getEditorialArticleBySlug(slug) ?? null;
    if (article) {
      return {
        seo: buildGuideArticleSeo(article),
        jsonLd: [
          buildArticleSchema(origin, article),
          buildFaqPageSchema(article.faqs),
          buildBreadcrumbListSchema(origin, buildGuideArticleBreadcrumbs(origin, article)),
        ],
      };
    }
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
 * Rewrite `html` for any route type covered by `resolvePageSeo`. No-ops
 * (returns `html` unchanged) for routes not covered here (they either have
 * their own injector — recipes — or fall through to the client's own
 * post-hydration `usePageSeo` for browsers/JS-executing crawlers).
 */
export function injectGenericPageSeoIntoHtml(html: string, origin: string, pathname: string): string {
  const resolved = resolvePageSeo(origin, pathname);
  if (!resolved) return html;

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
  return out;
}
