import type { FuelCatalogIndex, FuelRecipePage } from "../fuel-catalog/schema.js";
import type { BreakfastRecipePage } from "../breakfast-schema.js";
import {
  smoothiesIndexPath,
  smoothieRecipePath,
  breakfastIndexPath,
  breakfastRecipePath,
  breakfastPerformanceIndexPath,
  breakfastPerformanceRecipePath,
  performanceFuelPath,
} from "../fuel-catalog/paths.js";
import { isPerformanceBreakfastSlug } from "../breakfast-catalog/governance-types.js";
import { SEO_SITE_NAME, SEO_TARGET_KEYWORDS } from "./constants.js";
import type { PageSeoConfig } from "./metadata.js";
import { buildStandaloneRecipeSchema } from "./schema.js";

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
      "Firehall classics, crew skillets, burritos, and casseroles — station breakfasts built for interruptions, not fitness blogs.",
    ),
    canonicalPath: breakfastIndexPath(),
    ogType: "website",
    keywords: [
      "firefighter breakfast ideas",
      "firehall breakfast",
      "shift breakfast",
      "crew breakfast",
      ...SEO_TARGET_KEYWORDS,
    ],
  };
}

export function buildBreakfastPerformanceIndexSeo(count = 5): PageSeoConfig {
  return {
    title: titleWithBrand("Performance Breakfasts for Firefighters"),
    description: clipDescription(
      `${count} macro-forward crew breakfasts — protein oats, parfaits, and training-day pancakes kept separate from firehall classics.`,
    ),
    canonicalPath: breakfastPerformanceIndexPath(),
    ogType: "website",
    keywords: [
      "performance breakfast",
      "high protein breakfast firefighters",
      "training day breakfast",
      "firehall performance meals",
      ...SEO_TARGET_KEYWORDS,
    ],
  };
}

const BOILERPLATE_BREAKFAST_DESC =
  "Breakfast at the station has to survive interruptions. This recipe is written for real timing, clear heat cues, and a workflow that keeps food hot while the board gets loud.";
const BOILERPLATE_BREAKFAST_SUBTITLE = "A practical station breakfast that scales from 4 to 12.";

function breakfastMetaDescription(page: BreakfastRecipePage): string {
  const desc = page.description?.trim() ?? "";
  const sub = page.subtitle?.trim() ?? "";
  if (desc && desc !== BOILERPLATE_BREAKFAST_DESC) return desc;
  if (sub && sub !== BOILERPLATE_BREAKFAST_SUBTITLE) {
    return `${page.title}. ${sub}`;
  }
  const step = page.steps[0];
  const stepHint = step
    ? `${step.title}: ${step.instruction.slice(0, 120)}`
    : page.tags.slice(0, 5).join(", ");
  return `${page.title} — firefighter breakfast for ${page.crewSize}. ${stepHint}`;
}

export function buildBreakfastRecipeSeo(page: BreakfastRecipePage): PageSeoConfig {
  const title = page.seoTitle?.trim() || page.title;
  const isPerformance = isPerformanceBreakfastSlug(page.slug);
  const canonicalPath = isPerformance
    ? breakfastPerformanceRecipePath(page.slug)
    : breakfastRecipePath(page.slug);
  return {
    title: titleWithBrand(title),
    description: clipDescription(breakfastMetaDescription(page)),
    canonicalPath,
    ogType: "article",
    ogImage: page.heroImage,
    keywords: [
      "firefighter breakfast recipes",
      "firehall breakfast",
      "shift breakfast",
      ...page.tags.slice(0, 6),
      ...SEO_TARGET_KEYWORDS,
    ],
  };
}

export function buildFuelRecipeSchema(origin: string, page: FuelRecipePage, canonicalPath: string) {
  return buildStandaloneRecipeSchema(origin, {
    path: canonicalPath,
    title: page.title,
    subtitle: page.subtitle,
    description: page.intro,
    heroImage: page.heroImage,
    prepTime: 5,
    cookTime: 5,
    crewSize: 1,
    recipeCategory: page.taxonomyLabel,
    recipeCuisine: "American",
    tags: page.tags,
    ingredients: page.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
    })),
    steps: page.steps.map((step) => ({
      stepNumber: step.stepNumber,
      title: `Step ${step.stepNumber}`,
      instruction: step.instruction,
    })),
    nutrition: {
      calories: page.nutrition.calories,
      protein: page.nutrition.protein,
      carbs: page.nutrition.carbs,
      fat: page.nutrition.fats,
    },
    generatedAt: page.generatedAt,
  });
}

export function buildBreakfastRecipeSchema(origin: string, page: BreakfastRecipePage) {
  const canonicalPath = isPerformanceBreakfastSlug(page.slug)
    ? breakfastPerformanceRecipePath(page.slug)
    : breakfastRecipePath(page.slug);
  return buildStandaloneRecipeSchema(origin, {
    path: canonicalPath,
    title: page.title,
    subtitle: page.subtitle,
    description: page.description,
    heroImage: page.heroImage,
    prepTime: page.prepTime,
    cookTime: page.cookTime,
    crewSize: page.crewSize,
    recipeCategory: "Breakfast",
    recipeCuisine: "American",
    tags: page.tags,
    ingredients: page.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      optional: ing.optional,
    })),
    steps: page.steps.map((step) => ({
      stepNumber: step.stepNumber,
      title: step.title,
      instruction: step.instruction,
      minutes: step.minutes,
    })),
    nutrition: {
      calories: page.nutrition.calories,
      protein: page.nutrition.protein,
      carbs: page.nutrition.carbs,
      fat: page.nutrition.fat,
    },
    generatedAt: page.publishedAt,
  });
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
