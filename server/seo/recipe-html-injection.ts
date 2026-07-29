/**
 * Server-side (pre-hydration) SEO tag injection for recipe pages.
 *
 * Why this exists: the client applies title/meta/JSON-LD via a `useEffect`
 * after React Query resolves (see `client/src/lib/seo/apply-page-seo.ts`).
 * That works great for browsers, but crawlers/unfurlers that don't execute
 * JS (many link-preview bots, some social scrapers) only ever see the
 * static `client/index.html` shell — which ships the homepage's title/
 * description/OG image for every URL. This module rewrites that shell with
 * the real recipe's tags before it leaves the server, so a shared recipe
 * link always previews correctly and non-JS crawlers see accurate metadata.
 *
 * The client-side `useEffect` still runs on top of this and is harmless —
 * it just re-applies the same (now-correct) values once hydrated.
 */

import type { GoldenRecipePage } from "../../shared/golden-100/recipe-page-schema.js";
import { buildRecipePageSeo } from "../../shared/seo/metadata.js";
import {
  buildBreadcrumbListSchema,
  buildOrganizationSchema,
  buildRecipeSchema,
  buildWebSiteSchema,
} from "../../shared/seo/schema.js";
import { absoluteUrl } from "../../shared/seo/urls.js";
import { SEO_TWITTER_HANDLE } from "../../shared/seo/constants.js";
import { resolveHallRecipePage } from "../meal-catalog/load-index.js";
import { readPizzaNightRecipePage } from "../pizza-night/page-store.js";
import { isPizzaNightSlug } from "../../shared/pizza-night/manifest.js";
import { applySeoTagsToHtml, injectJsonLdIntoHtml } from "./apply-seo-tags.js";

const RECIPE_PATH_RE = /^\/recipes\/([a-z0-9-]+)\/?$/i;

/** Extract the `:slug` from a `/recipes/:slug` request path, if it matches. */
export function matchRecipeSlug(pathname: string): string | null {
  const match = RECIPE_PATH_RE.exec(pathname);
  return match?.[1]?.trim().toLowerCase() || null;
}

/** Resolve a recipe page across every catalog served at `/recipes/:slug`. */
export function resolveRecipeForSeo(slug: string): GoldenRecipePage | null {
  const normalized = slug.trim().toLowerCase();
  if (isPizzaNightSlug(normalized)) {
    return readPizzaNightRecipePage(normalized) ?? resolveHallRecipePage(normalized);
  }
  return resolveHallRecipePage(normalized) ?? readPizzaNightRecipePage(normalized);
}

/**
 * Rewrite `html` (the raw `index.html` shell) so a request for `/recipes/:slug`
 * carries the real recipe's title, description, canonical, OG/Twitter tags,
 * and Recipe/BreadcrumbList JSON-LD. No-ops (returns `html` unchanged) if the
 * slug doesn't resolve to a known recipe, so unknown slugs still fall through
 * to the client's own 404/not-found handling.
 */
export function injectRecipeSeoIntoHtml(html: string, origin: string, slug: string): string {
  const page = resolveRecipeForSeo(slug);
  if (!page) return html;

  const seo = buildRecipePageSeo(page, origin);
  const canonicalUrl = absoluteUrl(origin, seo.canonicalPath);

  let out = applySeoTagsToHtml(html, {
    title: seo.title,
    description: seo.description,
    canonicalUrl,
    ogType: "article",
    ogImage: seo.ogImage,
    twitterSite: SEO_TWITTER_HANDLE,
  });

  const jsonLd = [
    buildOrganizationSchema(origin),
    buildWebSiteSchema(origin),
    buildBreadcrumbListSchema(origin, [
      { name: "Home", path: "/" },
      { name: "Explore", path: "/explore" },
      { name: page.displayTitle || page.title, path: seo.canonicalPath },
    ]),
    buildRecipeSchema(origin, page),
  ];

  out = injectJsonLdIntoHtml(out, jsonLd);

  return out;
}
