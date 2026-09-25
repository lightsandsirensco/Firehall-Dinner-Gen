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

/**
 * Guard rails against regressing to generic, product-promotional FAQ
 * filler ("Where do these recipes come from?", "What if crew size or
 * time changes tonight?", etc). These questions do not answer anything
 * about the guide's actual subject — they explain the product instead.
 * See GUIDE FAQ CONTENT AUDIT + REWRITE for the original cleanup.
 *
 * This runs on every guide at build time (buildSeoGuide /
 * withGuidePublishingDefaults) so a future edit — human or generated —
 * cannot silently reintroduce this pattern. If you hit this error while
 * writing a new guide, write a question specific to that guide's topic
 * instead of reaching for boilerplate.
 */
const BANNED_GENERIC_FAQ_QUESTION_PATTERNS: RegExp[] = [
  /where do these recipes? (come from|links? go)/i,
  /how do i find (more )?recipes/i,
  /what if (my |our )?crew size (or time )?change/i,
  /what if.*time changes tonight/i,
  /how does firehall meals work/i,
  /why should i use firehall meals/i,
];

const BANNED_FAQ_ANSWER_PHRASES: RegExp[] = [
  /not home-blog scaling/i,
  /curated,?\s*hall-tested catalog/i,
  /designed specifically for firefighters/i,
];

function assertGuideSpecificFaqs(slug: string, faqs: EditorialFaq[]): void {
  for (const faq of faqs) {
    for (const pattern of BANNED_GENERIC_FAQ_QUESTION_PATTERNS) {
      if (pattern.test(faq.question)) {
        throw new Error(
          `[guide-faq-guard] "${slug}" has a generic/product-promotional FAQ question: "${faq.question}". ` +
            `Write a question that answers something about this guide's actual subject instead.`,
        );
      }
    }
    for (const pattern of BANNED_FAQ_ANSWER_PHRASES) {
      if (pattern.test(faq.answer)) {
        throw new Error(
          `[guide-faq-guard] "${slug}" FAQ answer uses banned boilerplate phrasing: "${faq.answer}"`,
        );
      }
    }
  }
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
  assertGuideSpecificFaqs(input.slug, faqs);

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
  assertGuideSpecificFaqs(article.slug, faqs);

  return enrichGuideArticle({
    ...article,
    faqs,
    heroImageAlt:
      article.heroImageAlt?.trim() ||
      `${article.title} — ${pk} tips for fire station kitchens and crew-sized meals`,
  });
}

/**
 * Standard FAQ fragments that are genuinely reusable — not guide-specific
 * boilerplate. `nutrition` is a real disclaimer (this is not medical
 * advice), appropriate to repeat verbatim across nutrition_performance
 * guides. Do not add generic "how does this product work" entries here;
 * every other FAQ must be written specifically for its guide.
 */
export const STANDARD_FAQS = {
  nutrition: {
    question: "Is this medical advice?",
    answer:
      "No. This is practical shift nutrition for station kitchens. Follow your department's health guidance and consult professionals for personal medical questions.",
  },
} as const;
