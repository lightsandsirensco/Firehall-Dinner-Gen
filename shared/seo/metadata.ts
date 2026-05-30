import type { EditorialArticle } from "../editorial/content-schema.js";
import type { GoldenRecipePage } from "../golden-100/recipe-page-schema.js";
import type { SeoLandingPageDef } from "./landing-pages-data.js";
import { FIREFIGHTER_RED_LEAD_RECIPE } from "./firefighter-red-lead-recipe-data.js";
import { guidePath, guidesIndexPath } from "../editorial/content-schema.js";
import { FIREHALL_CATEGORY_LABEL, type FirehallCategoryId } from "../firehall-categories.js";
import {
  APPROVED_CATALOG_TOTAL,
  formatMarketingRecipeCount,
  marketingRecipeCountCopy,
} from "../meal-catalog/curated-count.js";
import {
  SEO_DEFAULT_DESCRIPTION,
  SEO_DEFAULT_OG_IMAGE_PATH,
  SEO_DEFAULT_TITLE,
  SEO_SITE_NAME,
  SEO_TARGET_KEYWORDS,
} from "./constants.js";
import { absoluteImageUrl, normalizePath, recipePath } from "./urls.js";

export interface PageSeoConfig {
  title: string;
  description: string;
  canonicalPath: string;
  ogType?: "website" | "article";
  ogImage?: string;
  twitterCard?: "summary" | "summary_large_image";
  robots?: string;
  keywords?: string[];
}

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

export function buildHomeSeo(): PageSeoConfig {
  return {
    title: SEO_DEFAULT_TITLE,
    description: SEO_DEFAULT_DESCRIPTION,
    canonicalPath: "/",
    ogType: "website",
    keywords: [...SEO_TARGET_KEYWORDS],
  };
}

export function buildGeneratorSeo(recipeCount = APPROVED_CATALOG_TOTAL): PageSeoConfig {
  return {
    title: `Find a Firefighter Meal for Tonight | Firehall Meals`,
    description: clipDescription(
      `Pick crew size, protein, and time — get a firefighter meal from the Firehall Meals catalog. Browse ${marketingRecipeCountCopy(recipeCount)} anytime.`,
    ),
    canonicalPath: "/generator",
    ogType: "website",
    keywords: [
      ...SEO_TARGET_KEYWORDS,
      "tonight's firefighter dinner",
      "crew meal picker",
    ],
  };
}

export function buildFaqSeo(): PageSeoConfig {
  return {
    title: `Firefighter & Firehall Meal FAQ | ${SEO_SITE_NAME}`,
    description:
      "Answers about firefighter meals, firehall dinner ideas, crew-sized firehouse cooking, and how Firehall Meals helps station kitchens.",
    canonicalPath: "/faq",
    ogType: "website",
    keywords: [...SEO_TARGET_KEYWORDS],
  };
}

export function buildExploreSeo(recipeCount = APPROVED_CATALOG_TOTAL): PageSeoConfig {
  return {
    title: `Browse Firefighter Meals & Recipes | Firehall Meals`,
    description: clipDescription(
      `Search ${formatMarketingRecipeCount(recipeCount)} firefighter meals and firehall recipes — healthy station plates, BBQ hall nights, quick shift dinners, and crew-sized firehouse favorites.`,
    ),
    canonicalPath: "/explore",
    ogType: "website",
    keywords: [...SEO_TARGET_KEYWORDS, "firefighter recipe catalog", "firehouse recipe collection"],
  };
}

export function buildRecipesIndexSeo(recipeCount = APPROVED_CATALOG_TOTAL): PageSeoConfig {
  return {
    title: `Firefighter Meals & Recipes (${recipeCount}+) | Firehall Meals`,
    description: clipDescription(
      `${recipeCount}+ firefighter meals and fire station recipes — crew portions, clear steps, and categories for quick shifts, BBQ nights, and healthy hall cooking.`,
    ),
    canonicalPath: "/recipes",
    ogType: "website",
    keywords: [...SEO_TARGET_KEYWORDS, "firefighter recipe index", "firehouse meal ideas"],
  };
}

export function buildFirehallCategorySeo(categoryId: FirehallCategoryId, recipeCount = 0): PageSeoConfig {
  const label = FIREHALL_CATEGORY_LABEL[categoryId] ?? "Category";
  const keywordLabel = label.toLowerCase();

  const descBase =
    categoryId === "quick_meals"
      ? "Firehall quick meals for busy nights — realistic timing, minimal fuss, crew-sized portions."
      : categoryId === "comfort_food"
        ? "Firefighter comfort food for tough shifts — warm, hearty, hall-tested dinners."
        : categoryId === "healthy_options"
          ? "Healthy firefighter meals that still taste good — practical station dinners, not diet culture."
          : categoryId === "bbq_smoker"
            ? "BBQ firehall meals for grill and smoker nights — crew-scale proteins and sides."
            : categoryId === "feed_a_crowd"
              ? "Meals for large crews — batch, tray, and line dinners built to feed the hall."
              : "Hall-tested meals organized by practical station nights.";

  const titlePrefix =
    categoryId === "healthy_options"
      ? "Healthy Firefighter Meals"
      : categoryId === "bbq_smoker"
        ? "BBQ Firefighter Recipes"
        : categoryId === "quick_meals"
          ? "Quick Firefighter Meals"
          : categoryId === "crew_favorites"
            ? "Popular Firefighter Recipes"
            : label;

  return {
    title: `${titlePrefix} | Firehall Meals`,
    description: clipDescription(recipeCount > 0 ? `${descBase} ${recipeCount} recipes.` : descBase),
    canonicalPath: `/categories/${categoryId}`,
    ogType: "website",
    keywords: [...SEO_TARGET_KEYWORDS, keywordLabel, "firehall meals", "firehouse meals"],
  };
}

export function buildAboutSeo(): PageSeoConfig {
  return {
    title: `About Firehall Meals | ${SEO_SITE_NAME}`,
    description: clipDescription(
      "Practical crew dinners, guides, and tools built for station kitchens — not home-cooking blogs.",
    ),
    canonicalPath: "/about",
    ogType: "website",
    keywords: [...SEO_TARGET_KEYWORDS],
  };
}

export function buildRecipePageSeo(page: GoldenRecipePage, origin: string): PageSeoConfig {
  const category = page.category.replace(/_/g, " ");
  const displayTitle = page.displayTitle || page.title;
  const description = clipDescription(
    [
      page.shortDescription?.trim() || page.subtitle?.trim(),
      page.whyCrewsLikeIt?.trim(),
      page.cookTime
        ? `About ${page.cookTime} minutes · ${page.difficulty} · sized for ${page.crewSize} at the table.`
        : undefined,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const title = titleWithBrand(page.seoTitle?.replace(/\s*\|\s*Firefighter Meal\s*$/i, "") || displayTitle);

  const hero = page.heroImage?.trim() || `/images/golden-100/${page.slug}.jpg`;

  return {
    title,
    description,
    canonicalPath: recipePath(page.slug),
    ogType: "article",
    ogImage: absoluteImageUrl(origin, hero),
    twitterCard: "summary_large_image",
    keywords: [
      ...SEO_TARGET_KEYWORDS,
      page.title.toLowerCase(),
      category,
      page.cuisine,
      "firehall recipe",
    ],
  };
}

export function buildGuidesIndexSeo(articleCount = 8): PageSeoConfig {
  return {
    title: `Firefighter Meal & Nutrition Guides | ${SEO_SITE_NAME}`,
    description: clipDescription(
      `${articleCount} guides for station meals, shift nutrition, hall culture, and crew cooking — with recipes that match real shift timing.`,
    ),
    canonicalPath: guidesIndexPath(),
    ogType: "website",
    keywords: [...SEO_TARGET_KEYWORDS, "firefighter cooking guide", "firehall tips"],
  };
}

export type GuidesClusterId =
  | "firefighter-meals"
  | "firehall-dinners"
  | "firefighter-nutrition"
  | "station-cooking";

export function buildGuidesClusterSeo(clusterId: GuidesClusterId, articleCount = 0): PageSeoConfig {
  const label =
    clusterId === "firefighter-meals"
      ? "Firefighter Meals"
      : clusterId === "firehall-dinners"
        ? "Firehall Dinner Ideas"
        : clusterId === "firefighter-nutrition"
          ? "Firefighter Nutrition"
          : "Station Cooking";

  const descBase =
    clusterId === "firefighter-meals"
      ? "Firefighter meals built for station kitchens — crew-sized, shift-friendly, and hall-tested."
      : clusterId === "firehall-dinners"
        ? "Firehall dinner ideas crews actually run: comfort, BBQ, big feeds, and quick shift plates."
        : clusterId === "firefighter-nutrition"
          ? "Firefighter nutrition for the job: recovery, high-protein meals, and performance habits that hold up."
          : "Station cooking systems: workflow, grocery strategy, and kitchen habits that survive interruptions.";

  return {
    title: `${label} Guides | ${SEO_SITE_NAME}`,
    description: clipDescription(
      articleCount > 0 ? `${descBase} ${articleCount} guides in this cluster.` : descBase,
    ),
    canonicalPath: `/guides/topic/${clusterId}`,
    ogType: "website",
    keywords: [
      ...SEO_TARGET_KEYWORDS,
      label.toLowerCase(),
      "firehouse meals",
      "healthy firefighter meals",
    ],
  };
}

export function buildGuideArticleSeo(article: EditorialArticle): PageSeoConfig {
  const pageTitle = article.seoTitle?.trim() || article.title;
  return {
    title: titleWithBrand(pageTitle),
    description: clipDescription(article.description),
    canonicalPath: guidePath(article.slug),
    ogType: "article",
    ogImage: article.heroImage,
    keywords: [...SEO_TARGET_KEYWORDS, ...article.keywords],
  };
}

export function buildSeoLandingPageSeo(page: SeoLandingPageDef): PageSeoConfig {
  return {
    title: page.title,
    description: clipDescription(page.description),
    canonicalPath: page.path,
    ogType: "website",
    keywords: page.keywords,
  };
}

export function buildFirefighterRedLeadRecipeSeo(): PageSeoConfig {
  return {
    title: titleWithBrand(FIREFIGHTER_RED_LEAD_RECIPE.seoTitle),
    description: clipDescription(FIREFIGHTER_RED_LEAD_RECIPE.description),
    canonicalPath: FIREFIGHTER_RED_LEAD_RECIPE.path,
    ogType: "article",
    ogImage: FIREFIGHTER_RED_LEAD_RECIPE.heroImage,
    keywords: [...SEO_TARGET_KEYWORDS, ...FIREFIGHTER_RED_LEAD_RECIPE.keywords],
  };
}

export function defaultOgImage(origin: string): string {
  return absoluteImageUrl(origin, SEO_DEFAULT_OG_IMAGE_PATH);
}

export function normalizeCanonicalPath(path: string): string {
  return normalizePath(path);
}
