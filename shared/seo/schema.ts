import type { EditorialArticle } from "../editorial/content-schema.js";
import { guidePath, guidesIndexPath } from "../editorial/content-schema.js";
import type { GoldenRecipePage } from "../golden-100/recipe-page-schema.js";
import type { RecipeDietaryProfileSchema } from "../dietary/schema.js";
import {
  SEO_BRAND,
  SEO_DEFAULT_DESCRIPTION,
  SEO_SITE_NAME,
  SEO_TARGET_KEYWORDS,
} from "./constants.js";
import { absoluteImageUrl, absoluteUrl, recipePath } from "./urls.js";

export type BreadcrumbItem = { name: string; path: string };

/**
 * Hall Expansion's on-disk `category` field is stamped with the internal
 * collection/family id ("hall_expansion") rather than a real food category —
 * every other golden-100-shaped family already stores a genuine category
 * there (e.g. "comfort_food", "bbq_grill_nights"). Every recipe in every
 * family — Hall Expansion included — already carries its real category as a
 * `category:`-prefixed tag (see the catalog generation tooling), so this
 * only reads that existing, already-canonical value for schema.org's
 * `recipeCategory` when the top-level field is the internal collection id.
 * It never invents a category, and never touches the on-disk `category`
 * field itself — Explore grouping, badges, and filters all keep reading
 * `category` exactly as before; this is a presentation/schema-only mapping.
 */
export function recipeCategoryLabel(page: Pick<GoldenRecipePage, "category" | "tags">): string {
  if (page.category === "hall_expansion") {
    const tag = page.tags.find((t) => t.startsWith("category:"));
    if (tag) return tag.slice("category:".length).replace(/_/g, " ");
  }
  return page.category.replace(/_/g, " ");
}

/**
 * `recipeCuisine` is free-text, authored across many recipe-generation
 * batches over time — the exact same cuisine ends up spelled with
 * inconsistent casing ("italian" vs "Italian"), inconsistent word
 * separators ("middle_eastern" / "middle-eastern" / "middle eastern"), or as
 * an obvious synonym ("Southwest" vs "Southwestern"). This normalizes only
 * those obvious formatting/synonym duplicates for the schema.org
 * `recipeCuisine` value — it never reclassifies a cuisine into a different
 * one (e.g. "Thai-inspired" stays distinct from "Thai", "Sichuan/Chinese"
 * stays distinct from "Chinese") and never touches the on-disk `cuisine`
 * field itself, which many other systems read as free text.
 */
const CUISINE_SYNONYMS: Record<string, string> = {
  "middle eastern": "Middle Eastern",
  middle_eastern: "Middle Eastern",
  "middle-eastern": "Middle Eastern",
  southwest: "Southwestern",
};

const CUISINE_ACRONYMS = new Set(["bbq"]);

function titleCaseWord(word: string): string {
  return word.length ? word[0]!.toUpperCase() + word.slice(1) : word;
}

export function normalizeRecipeCuisineLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  if (CUISINE_SYNONYMS[lower]) return CUISINE_SYNONYMS[lower];
  if (CUISINE_ACRONYMS.has(lower)) return trimmed.toUpperCase();
  // Title-case each word segment; preserve separators ("-", "/", " ") as-is
  // so compounds like "Italian-American" and "Sichuan/Chinese" stay intact.
  return trimmed
    .split(/(\s|-|\/)/)
    .map((part) => (/^[a-z]/i.test(part) ? titleCaseWord(part.toLowerCase()) : part))
    .join("");
}

/**
 * Audited for SEO Phase 5, Section C (`suitableForDiet`): Firehall Meals'
 * dietary classification is an intentionally conservative CONVENIENCE
 * filter (see `shared/dietary/classify-recipe.ts` and the disclaimer in
 * `client/src/components/trust/dietary-badges.tsx` — "Always check
 * ingredient labels and account for substitutions and cross-contact when
 * cooking for allergies"), not a certified allergen-safety guarantee.
 * schema.org's `suitableForDiet` carries no such disclaimer, so an allergen
 * claim there (gluten-free, dairy-free, nut-free, etc.) would read as a
 * *stronger*, unqualified safety claim than the site itself makes — exactly
 * what this audit says must not happen. Separately, schema.org's
 * `RestrictedDiet` enum has no value at all for "dairy-free", "nut-free",
 * "egg-free", "soy-free", "shellfish-free", "fish-free", or "pork-free", so
 * those 7 flags have no valid mapping regardless of confidence.
 *
 * `vegan`/`vegetarian` are different in kind: they're ingredient-composition
 * facts (no meat/fish/dairy/egg/honey), not cross-contamination/allergy
 * safety claims, schema.org has exact-match enum values for both, and the
 * site already asserts the identical claim to users today via the same
 * high-confidence gate. Gated strictly on `confidence === "high"` (every
 * ingredient resolved — see `classifyRecipeDietary`'s own "food-safety rule"
 * doc comment) and the specific flag being `true`, these two are
 * implemented. Every allergen-type flag, including `glutenFree` (schema.org
 * *does* have `GlutenFreeDiet`, but gluten-free is squarely the kind of
 * allergy/safety claim this audit warns against making from a text-based
 * ingredient classifier), is deliberately left out of `suitableForDiet`.
 */
export function suitableForDietFromProfile(dietary: RecipeDietaryProfileSchema | undefined): string[] | undefined {
  if (!dietary || dietary.confidence !== "high") return undefined;
  const diets: string[] = [];
  if (dietary.flags.vegan) diets.push("https://schema.org/VeganDiet");
  if (dietary.flags.vegetarian) diets.push("https://schema.org/VegetarianDiet");
  return diets.length ? diets : undefined;
}

export type FaqItem = {
  question: string;
  answer: string;
  /**
   * Optional contextual internal link rendered right after `answer` —
   * points a short homepage/FAQ answer toward the deeper page that owns
   * that search intent (e.g. "/firefighter-meals"). Not every FAQ needs
   * one. Purely a UI affordance: FAQPage JSON-LD (`buildFaqPageSchema`)
   * only reads `question`/`answer`, so this never creates a mismatch
   * between visible and structured-data content.
   */
  link?: { href: string; label: string };
};

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

export function buildRecipeSchemaAtPath(
  origin: string,
  page: GoldenRecipePage,
  canonicalPath: string,
  options?: { aggregateRating?: { ratingValue: number; ratingCount: number; reviewCount?: number } },
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

  const categoryLabel = recipeCategoryLabel(page);
  const cuisineLabel = normalizeRecipeCuisineLabel(page.cuisine);
  const suitableForDiet = suitableForDietFromProfile(page.dietary);
  const aggregate = options?.aggregateRating;

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
    recipeCuisine: cuisineLabel,
    ...(suitableForDiet ? { suitableForDiet } : {}),
    keywords: [...SEO_TARGET_KEYWORDS, categoryLabel, cuisineLabel, ...page.tags.slice(0, 8)].join(
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
    ...(aggregate && aggregate.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: aggregate.ratingValue,
            bestRating: 5,
            worstRating: 1,
            ratingCount: aggregate.ratingCount,
            ...(aggregate.reviewCount != null ? { reviewCount: aggregate.reviewCount } : {}),
          },
        }
      : {}),
  };
}

/** Map crew approval (0–1) to a 1–5 AggregateRating value for schema. */
export function approvalScoreToRatingValue(approvalScore: number): number {
  const clamped = Math.min(1, Math.max(0, approvalScore));
  return Math.round((1 + clamped * 4) * 10) / 10;
}

export function buildRecipeSchema(
  origin: string,
  page: GoldenRecipePage,
  options?: { aggregateRating?: { ratingValue: number; ratingCount: number; reviewCount?: number } },
) {
  return buildRecipeSchemaAtPath(origin, page, recipePath(page.slug), options);
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
  dietary?: RecipeDietaryProfileSchema;
};

export function buildStandaloneRecipeSchema(origin: string, recipe: StandaloneRecipeSchemaInput) {
  const url = absoluteUrl(origin, recipe.path);
  const hero = recipe.heroImage?.trim();
  const cuisineLabel = normalizeRecipeCuisineLabel(recipe.recipeCuisine);
  const suitableForDiet = suitableForDietFromProfile(recipe.dietary);
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
    recipeCuisine: cuisineLabel,
    ...(suitableForDiet ? { suitableForDiet } : {}),
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
  const hero = article.heroImage?.trim();
  const image = hero ? absoluteImageUrl(origin, hero) : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: article.title,
    description: article.description,
    image: image ? [image] : undefined,
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

/** Public product SEO explainers — never attach private hall data. */
export function buildSoftwareApplicationSchema(
  origin: string,
  opts: {
    name: string;
    description: string;
    path: string;
    applicationCategory?: string;
  },
) {
  const url = absoluteUrl(origin, opts.path);
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: opts.name,
    description: opts.description,
    url,
    applicationCategory: opts.applicationCategory ?? "LifestyleApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    provider: {
      "@type": "Organization",
      name: SEO_BRAND,
      url: absoluteUrl(origin, "/"),
    },
    isPartOf: {
      "@type": "WebSite",
      name: SEO_SITE_NAME,
      url: absoluteUrl(origin, "/"),
    },
  };
}
