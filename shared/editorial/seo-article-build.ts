/**
 * Helpers for editorial guides — consistent structure, human voice defaults.
 */

import { enrichGuideArticle } from "./guide-depth-enrichment.js";
import { humanRecipeTitle } from "../recipe-human-titles.js";
import type { EditorialPillar } from "./content-pillar.js";
import type {
  EditorialArticle,
  EditorialFaq,
  EditorialMealPick,
  EditorialSection,
  EditorialTopic,
} from "./content-schema.js";

const PUBLISHED = "2026-05-27T18:00:00.000Z";

export function meal(
  slug: string,
  title: string,
  blurb: string,
  catalog?: EditorialMealPick["catalog"],
): EditorialMealPick {
  const resolved = humanRecipeTitle(slug, title);
  return catalog ? { slug, title: resolved, blurb, catalog } : { slug, title: resolved, blurb };
}

function defaultPillar(topic: EditorialTopic): EditorialPillar {
  if (topic === "nutrition_performance") return "nutrition_performance";
  if (topic === "station_lifestyle" || topic === "crew_culture") return "station_lifestyle";
  if (topic === "shift_operations") return "operations_how_to";
  return "recipes_meals";
}

export function buildSeoGuide(input: {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  keywords: string[];
  intro: string;
  sections: EditorialSection[];
  practicalAdvice: string[];
  mealRecommendations: EditorialMealPick[];
  faqs: EditorialFaq[];
  relatedArticleSlugs?: string[];
  topic?: EditorialTopic;
  pillar?: EditorialPillar;
  readMinutes?: number;
  seoTitle?: string;
  heroImageAlt?: string;
}): EditorialArticle {
  const topic = input.topic ?? "meal_planning";
  const pk = input.keywords[0] ?? input.title;
  const faqs =
    topic === "nutrition_performance" && !input.faqs.some((f) => /medical/i.test(f.question))
      ? [...input.faqs, STANDARD_FAQS.nutrition]
      : input.faqs;

  const base: EditorialArticle = {
    slug: input.slug,
    title: input.title,
    ...(input.seoTitle ? { seoTitle: input.seoTitle } : {}),
    subtitle: input.subtitle,
    description: input.description,
    topic,
    pillar: input.pillar ?? defaultPillar(topic),
    intro: input.intro,
    sections: input.sections,
    practicalAdvice: input.practicalAdvice,
    mealRecommendations: input.mealRecommendations,
    faqs,
    relatedArticleSlugs: input.relatedArticleSlugs,
    keywords: input.keywords,
    publishedAt: PUBLISHED,
    updatedAt: PUBLISHED,
    readMinutes: input.readMinutes ?? 7,
    heroImageAlt:
      input.heroImageAlt ??
      `${input.title} — ${pk} tips for fire station kitchens and crew-sized meals`,
  };
  return enrichGuideArticle(base);
}

/** Ensure SEO + metadata defaults on any guide before publish. */
export function withGuidePublishingDefaults(article: EditorialArticle): EditorialArticle {
  const pk = article.keywords[0] ?? article.slug.replace(/-/g, " ");
  const faqs =
    article.topic === "nutrition_performance" &&
    !article.faqs.some((f) => /medical/i.test(f.question))
      ? [...article.faqs, STANDARD_FAQS.nutrition]
      : article.faqs;

  return enrichGuideArticle({
    ...article,
    faqs,
    heroImageAlt:
      article.heroImageAlt?.trim() ||
      `${article.title} — ${pk} tips for fire station kitchens and crew-sized meals`,
  });
}

export const STANDARD_FAQS = {
  catalog: {
    question: "Where do these recipes come from?",
    answer:
      "Each link goes to a full recipe on Firehall Meals — crew-sized portions, station timing, and steps written for a shared kitchen. Not home-blog scaling.",
  },
  generator: {
    question: "What if crew size or time changes tonight?",
    answer:
      "Use Find a Meal with your headcount and minutes available. Hall Match pulls from the same curated, hall-tested catalog these guides recommend.",
  },
  nutrition: {
    question: "Is this medical advice?",
    answer:
      "No. This is practical shift nutrition for station kitchens. Follow your department's health guidance and consult professionals for personal medical questions.",
  },
} as const;
