/**
 * Server-side (pre-hydration) SEO tag injection for `/package/:slug` —
 * the "Classics Wheel" crew-package view of a recipe that already lives at
 * `/recipes/:slug`.
 *
 * This is intentionally-duplicated content by design (same recipe, a
 * different crew-size-picker presentation, linked to *from* the canonical
 * recipe page itself as "Open crew package"). Rather than fight that with a
 * redirect (which would break the dedicated package UI), this points the
 * canonical tag at the source `/recipes/:slug` page — the standard, correct
 * way to consolidate duplicate/near-duplicate content in search results
 * without losing the alternate view for users.
 */

import { getCuratedPackageDef, buildCuratedClientRecipe } from "../../shared/curated-hall-packages.js";
import { getClassicHallMeal, resolveClassicHeroImage } from "../../shared/classic-hall-meals.js";
import { isApprovedCatalogSlug } from "../../shared/hall-catalog/gate.js";
import { recipePath, absoluteUrl, absoluteImageUrl } from "../../shared/seo/urls.js";
import { SEO_TWITTER_HANDLE, SEO_SITE_NAME } from "../../shared/seo/constants.js";
import { buildBreadcrumbListSchema, buildOrganizationSchema, buildWebSiteSchema } from "../../shared/seo/schema.js";
import { applySeoTagsToHtml, injectJsonLdIntoHtml, injectBodyContentIntoHtml } from "./apply-seo-tags.js";
import { clientRecipeSnapshot, renderRecipeSnapshotHtml } from "./content-snapshot.js";
import type { InjectionResult } from "./recipe-html-injection.js";

const PACKAGE_PATH_RE = /^\/package\/([a-z0-9-]+)\/?$/i;

export function matchPackageSlug(pathname: string): string | null {
  const match = PACKAGE_PATH_RE.exec(pathname);
  return match?.[1]?.trim().toLowerCase() || null;
}

export function injectPackageSeoIntoHtml(html: string, origin: string, slug: string): InjectionResult {
  const def = getCuratedPackageDef(slug);
  if (!def) return { html, status: 404 };

  const title = `${def.displayTitle} — Crew Package | ${SEO_SITE_NAME}`;
  const description = [def.tagline, def.crewLine].filter(Boolean).join(" ").slice(0, 300) ||
    `A curated crew package for ${def.displayTitle}, scaled for the fire hall.`;

  // Canonical → the source recipe page when this package mirrors an approved
  // catalog recipe (true for every current package). Falls back to
  // self-canonical only if a future package has no catalog counterpart.
  const canonicalPath = isApprovedCatalogSlug(def.slug) ? recipePath(def.slug) : `/package/${def.slug}`;
  const canonicalUrl = absoluteUrl(origin, canonicalPath);

  const classicMeta = getClassicHallMeal(slug);
  const heroImage = classicMeta ? resolveClassicHeroImage(classicMeta) : def.heroImage;

  let out = applySeoTagsToHtml(html, {
    title,
    description,
    canonicalUrl,
    ogType: "article",
    ogImage: absoluteImageUrl(origin, heroImage),
    twitterSite: SEO_TWITTER_HANDLE,
  });

  const jsonLd = [
    buildOrganizationSchema(origin),
    buildWebSiteSchema(origin),
    buildBreadcrumbListSchema(origin, [
      { name: "Home", path: "/" },
      { name: "Classics Wheel", path: "/wheel" },
      { name: `${def.displayTitle} — Crew Package`, path: `/package/${def.slug}` },
    ]),
  ];
  out = injectJsonLdIntoHtml(out, jsonLd);

  const recipe = buildCuratedClientRecipe(def, 6);
  const snapshot = clientRecipeSnapshot(recipe, {
    title: `${def.displayTitle} — Crew Package`,
    heroImage,
    heroImageAlt: def.imageAlt,
    description,
  });
  out = injectBodyContentIntoHtml(out, renderRecipeSnapshotHtml(origin, snapshot));

  return { html: out, status: 200 };
}
