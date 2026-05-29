import type { FuelCatalogIndex, FuelRecipePage } from "../fuel-catalog/schema.js";
import { smoothiesIndexPath, smoothieRecipePath, breakfastIndexPath, performanceFuelPath } from "../fuel-catalog/paths.js";
import { SEO_SITE_NAME, SEO_TARGET_KEYWORDS } from "./constants.js";
import type { PageSeoConfig } from "./metadata.js";

function clipDescription(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

function titleWithBrand(pageTitle: string): string {
  const base = pageTitle.trim();
  if (base.includes(SEO_SITE_NAME)) return base;
  return `${base} | ${SEO_SITE_NAME}`;
}

export function buildSmoothiesIndexSeo(count = 10): PageSeoConfig {
  return {
    title: titleWithBrand("Healthy Smoothies for Firefighters"),
    description: clipDescription(
      `${count} hall-tested smoothies — protein, recovery, breakfast, and green blends with realistic ingredients and one-jar cleanup.`,
    ),
    canonicalPath: smoothiesIndexPath(),
    ogType: "website",
    keywords: [
      "healthy smoothies",
      "smoothies for firefighters",
      "firefighter breakfast ideas",
      "recovery smoothies",
      "shift work nutrition",
      "station blender recipes",
      ...SEO_TARGET_KEYWORDS,
    ],
  };
}

export function buildSmoothieRecipeSeo(page: FuelRecipePage): PageSeoConfig {
  return {
    title: titleWithBrand(page.seoTitle),
    description: clipDescription(`${page.intro} ${page.shiftNote}`),
    canonicalPath: smoothieRecipePath(page.slug),
    ogType: "article",
    ogImage: page.heroImage,
    keywords: [
      "healthy smoothies",
      "smoothies for firefighters",
      page.title.toLowerCase(),
      page.taxonomyLabel.toLowerCase(),
      ...page.searchTerms.slice(0, 6),
    ],
  };
}

export function buildBreakfastIndexSeo(): PageSeoConfig {
  return {
    title: titleWithBrand("Firefighter Breakfast & Shift Fuel"),
    description: clipDescription(
      "High-protein breakfasts, quick shift meals, and hall morning lines — separate from dinner recipes, built for crews on tour.",
    ),
    canonicalPath: breakfastIndexPath(),
    ogType: "website",
    keywords: [
      "firefighter breakfast ideas",
      "firehall breakfast",
      "shift breakfast",
      "high protein breakfast",
      ...SEO_TARGET_KEYWORDS,
    ],
  };
}

export function buildPerformanceFuelSeo(mealCount = 50, smoothieCount = 10): PageSeoConfig {
  return {
    title: titleWithBrand("Performance Fuel — Meals & Smoothies"),
    description: clipDescription(
      `Performance nutrition for firefighters: ${mealCount} healthy crew dinners and ${smoothieCount} hall smoothies — recovery, protein, and shift-friendly fuel.`,
    ),
    canonicalPath: performanceFuelPath(),
    ogType: "website",
    keywords: [
      "firefighter nutrition",
      "performance meals",
      "recovery smoothies",
      "shift work nutrition",
      ...SEO_TARGET_KEYWORDS,
    ],
  };
}

export function buildPerformanceFuelRecipeSeo(
  title: string,
  slug: string,
  description: string,
): PageSeoConfig {
  return {
    title: titleWithBrand(`${title} | Performance Meal`),
    description: clipDescription(description),
    canonicalPath: `/performance-fuel/${slug}`,
    ogType: "article",
    keywords: [
      "performance meal",
      "healthy firefighter dinner",
      "firehall nutrition",
      title.toLowerCase(),
    ],
  };
}

export type { FuelCatalogIndex };
