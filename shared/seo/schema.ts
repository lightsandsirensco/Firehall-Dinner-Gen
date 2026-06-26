import type { EditorialArticle } from "../editorial/content-schema.js";
import { guidePath, guidesIndexPath } from "../editorial/content-schema.js";
import type { GoldenRecipePage } from "../golden-100/recipe-page-schema.js";
import {
  SEO_BRAND,
  SEO_DEFAULT_DESCRIPTION,
  SEO_SITE_NAME,
  SEO_TARGET_KEYWORDS,
} from "./constants.js";
import { absoluteImageUrl, absoluteUrl, recipePath } from "./urls.js";

export type BreadcrumbItem = { name: string; path: string };

export type FaqItem = { question: string; answer: string };

function isoDurationMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m <= 0) return "PT0M";
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `PT${rem}M`;
  if (rem === 0) return `PT${h}H`;
  return `PT${h}H${rem}M`;
}

export function buildOrganizationSchema(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SEO_BRAND,
    alternateName: SEO_SITE_NAME,
    url: absoluteUrl(origin, "/"),
    description: SEO_DEFAULT_DESCRIPTION,
    knowsAbout: [...SEO_TARGET_KEYWORDS],
  };
}

export function buildWebSiteSchema(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO_SITE_NAME,
    alternateName: [SEO_BRAND, "Firefighter Recipes", "Firehouse Meals"],
    url: absoluteUrl(origin, "/"),
    inLanguage: "en-US",
    description: SEO_DEFAULT_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl(origin, "/explore")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Homepage collection hub — reinforces recipe-catalog positioning. */
export function buildHomeRecipeCollectionSchema(
  origin: string,
  recipeCount: number,
  categoryLinks: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${absoluteUrl(origin, "/")}#recipe-collection`,
    name: "Firefighter Meals & Firehall Recipes",
    description: SEO_DEFAULT_DESCRIPTION,
    url: absoluteUrl(origin, "/"),
    isPartOf: {
      "@type": "WebSite",
      name: SEO_SITE_NAME,
      url: absoluteUrl(origin, "/"),
    },
    about: {
      "@type": "Thing",
      name: "Firefighter and firehouse cooking",
    },
    numberOfItems: recipeCount,
    hasPart: categoryLinks.map((c) => ({
      "@type": "CollectionPage",
      name: c.name,
      url: absoluteUrl(origin, c.path),
    })),
  };
}

export function buildBreadcrumbListSchema(origin: string, items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(origin, item.path),
    })),
  };
}

export function buildFaqPageSchema(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function buildRecipeSchema(origin: string, page: GoldenRecipePage) {
  return buildRecipeSchemaAtPath(origin, page, recipePath(page.slug));
}

export type StandaloneRecipeSchemaInput = {
  path: string;
  title: string;
  subtitle?: string;
  description: string;
  heroImage?: string;
  prepTime: number;
  cookTime: number;
  crewSize: number;
  recipeCategory: string;
  recipeCuisine: string;
  tags: string[];
  ingredients: Array<{ name: string; quantity?: string; unit?: string; notes?: string; optional?: boolean }>;
  steps: Array<{ stepNumber: number; title: string; instruction: string; minutes?: number }>;
  nutrition: { calories: number; protein: number; carbs: number; fat: number };
  generatedAt: string;
};

export function buildRecipeSchemaAtPath(
  origin: string,
  page: GoldenRecipePage,
  canonicalPath: string,
) {
  const url = absoluteUrl(origin, canonicalPath);
  const hero = page.heroImage?.trim();
  const image = hero ? absoluteImageUrl(origin, hero) : undefined;
  const prep = page.prepTime ?? Math.max(5, Math.round(page.cookTime * 0.25));
  const cook = page.cookTime;

  const ingredients = page.ingredients.map((ing) => {
    const qty = [ing.quantity, ing.unit].filter(Boolean).join(" ");
    return qty ? `${qty} ${ing.name}` : ing.name;
  });

  const instructions = page.steps.map((step) => ({
    "@type": "HowToStep",
    position: step.stepNumber,
    name: step.title,
    text: step.instruction,
    ...(step.minutes ? { duration: isoDurationMinutes(step.minutes) } : {}),
  }));

  const categoryLabel = page.category.replace(/_/g, " ");

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "@id": `${url}#recipe`,
    name: page.displayTitle || page.title,
    headline: page.subtitle || page.displayTitle || page.title,
    description: page.description,
    image: image ? [image] : undefined,
    url,
    inLanguage: "en-US",
    author: {
      "@type": "Organization",
      name: SEO_BRAND,
      url: absoluteUrl(origin, "/"),
    },
    publisher: {
      "@type": "Organization",
      name: SEO_BRAND,
      url: absoluteUrl(origin, "/"),
    },
    datePublished: page.generatedAt,
    dateModified: page.generatedAt,
    recipeCategory: categoryLabel,
    recipeCuisine: page.cuisine,
    keywords: [...SEO_TARGET_KEYWORDS, categoryLabel, page.cuisine, ...page.tags.slice(0, 8)].join(
      ", ",
    ),
    prepTime: isoDurationMinutes(prep),
    cookTime: isoDurationMinutes(cook),
    totalTime: isoDurationMinutes(prep + cook),
    recipeYield: `${page.crewSize} servings`,
    recipeIngredient: ingredients,
    recipeInstructions: instructions,
    nutrition: {
      "@type": "NutritionInformation",
      calories: `${page.nutrition.calories} calories`,
      proteinContent: `${page.nutrition.protein} g`,
      carbohydrateContent: `${page.nutrition.carbs} g`,
      fatContent: `${page.nutrition.fats} g`,
    },
  };
}

export function buildStandaloneRecipeSchema(origin: string, recipe: StandaloneRecipeSchemaInput) {
  const url = absoluteUrl(origin, recipe.path);
  const hero = recipe.heroImage?.trim();
  const image = hero ? absoluteImageUrl(origin, hero) : undefined;

  const ingredients = recipe.ingredients
    .filter((ing) => !ing.optional)
    .map((ing) => {
      const qty = [ing.quantity, ing.unit].filter(Boolean).join(" ");
      return qty ? `${qty} ${ing.name}` : ing.name;
    });

  const instructions = recipe.steps.map((step) => ({
    "@type": "HowToStep",
    position: step.stepNumber,
    name: step.title,
    text: step.instruction,
    ...(step.minutes ? { duration: isoDurationMinutes(step.minutes) } : {}),
  }));

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "@id": `${url}#recipe`,
    name: recipe.title,
    headline: recipe.subtitle || recipe.title,
    description: recipe.description,
    image: image ? [image] : undefined,
    url,
    inLanguage: "en-US",
    author: {
      "@type": "Organization",
      name: SEO_BRAND,
      url: absoluteUrl(origin, "/"),
    },
    publisher: {
      "@type": "Organization",
      name: SEO_BRAND,
      url: absoluteUrl(origin, "/"),
    },
    datePublished: recipe.generatedAt,
    dateModified: recipe.generatedAt,
    recipeCategory: recipe.recipeCategory,
    recipeCuisine: recipe.recipeCuisine,
    keywords: [...SEO_TARGET_KEYWORDS, ...recipe.tags, recipe.recipeCategory].join(", "),
    prepTime: isoDurationMinutes(recipe.prepTime),
    cookTime: isoDurationMinutes(recipe.cookTime),
    totalTime: isoDurationMinutes(recipe.prepTime + recipe.cookTime),
    recipeYield: `${recipe.crewSize} servings`,
    recipeIngredient: ingredients,
    recipeInstructions: instructions,
    nutrition: {
      "@type": "NutritionInformation",
      calories: `${recipe.nutrition.calories} calories`,
      proteinContent: `${recipe.nutrition.protein} g`,
      carbohydrateContent: `${recipe.nutrition.carbs} g`,
      fatContent: `${recipe.nutrition.fat} g`,
    },
  };
}

export function buildArticleSchema(origin: string, article: EditorialArticle) {
  const url = absoluteUrl(origin, guidePath(article.slug));
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: article.title,
    description: article.description,
    url,
    inLanguage: "en-US",
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Organization",
      name: SEO_BRAND,
      url: absoluteUrl(origin, "/"),
    },
    publisher: {
      "@type": "Organization",
      name: SEO_BRAND,
      url: absoluteUrl(origin, "/"),
    },
    keywords: [...SEO_TARGET_KEYWORDS, ...article.keywords].join(", "),
    timeRequired: isoDurationMinutes(article.readMinutes),
    articleSection: article.topic.replace(/_/g, " "),
    mainEntityOfPage: url,
  };
}

export function buildGuideArticleBreadcrumbs(
  origin: string,
  article: EditorialArticle,
): BreadcrumbItem[] {
  return [
    { name: "Home", path: "/" },
    { name: "Guides", path: guidesIndexPath() },
    { name: article.title, path: guidePath(article.slug) },
  ];
}
