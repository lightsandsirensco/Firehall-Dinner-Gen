/**
 * Helpers for editorial guides — consistent structure, human voice defaults.
 */

import { humanRecipeTitle } from "../recipe-human-titles.js";
import type { EditorialPillar } from "./content-pillar.js";
import type {
  EditorialArticle,
  EditorialFaq,
  EditorialMealPick,
  EditorialSection,
  EditorialSource,
  EditorialTopic,
} from "./content-schema.js";
import { collectGuideProse } from "./hall-guides-audit.js";

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

/**
 * Stock phrases that read as filler or forced fire-service colour rather than
 * cooking instruction. Guides fail to publish if they contain any of these —
 * say what the cook should actually do instead ("if a call comes in, pull the
 * pan off the heat and cover it").
 */
export const BANNED_GUIDE_PHRASES: Array<{ label: string; re: RegExp }> = [
  { label: "tones drop", re: /\btones? (?:drop|dropped|dropping|go(?:es)? off)\b/i },
  { label: "busy board", re: /\b(?:busy|the) board (?:interrupts|lights up|goes)\b|\bbusy boards?\b/i },
  { label: "morale", re: /\bmorale\b/i },
  { label: "food-blog comparison", re: /\b(?:food|home)[- ]blog\b/i },
  { label: "whether you're X or Y", re: /\bwhether you(?:'re| are)\b/i },
  { label: "it's not just X", re: /\b(?:it|this|that|dinner|cooking)(?:'s| is) not just\b|\bisn't just about\b/i },
  { label: "ultimate/comprehensive guide", re: /\b(?:ultimate|comprehensive) guide\b/i },
  { label: "game-changer", re: /\bgame[- ]?changer\b/i },
  { label: "fuel the shift", re: /\bfuel(?:s|ing)? (?:the|your|a long|long) (?:shift|crew|body)\b/i },
  { label: "hall-tested claim", re: /\bhall-tested\b/i },
];

function assertNoBannedPhrases(article: EditorialArticle): void {
  const prose = collectGuideProse(article);
  const hits = BANNED_GUIDE_PHRASES.filter(({ re }) => re.test(prose)).map((p) => p.label);
  if (hits.length) {
    throw new Error(`[guide-copy-guard] "${article.slug}" uses banned stock phrasing: ${hits.join(", ")}`);
  }
}

function finalizeGuide(article: EditorialArticle): EditorialArticle {
  assertGuideSpecificFaqs(article.slug, article.faqs);
  assertNoBannedPhrases(article);
  const heroImageAlt = article.heroImage ? article.heroImageAlt?.trim() || article.title : undefined;
  const { heroImageAlt: _drop, ...rest } = article;
  return heroImageAlt ? { ...rest, heroImageAlt } : rest;
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
  faqs?: EditorialFaq[];
  relatedArticleSlugs?: string[];
  topic?: EditorialTopic;
  pillar?: EditorialPillar;
  readMinutes?: number;
  seoTitle?: string;
  heroImage?: string;
  heroImageAlt?: string;
  sources?: EditorialSource[];
  updatedAt?: string;
}): EditorialArticle {
  const topic = input.topic ?? "meal_planning";
  const faqs = input.faqs ?? [];

  return finalizeGuide({
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
    updatedAt: input.updatedAt ?? PUBLISHED,
    readMinutes: input.readMinutes ?? 7,
    ...(input.heroImage ? { heroImage: input.heroImage } : {}),
    ...(input.heroImageAlt ? { heroImageAlt: input.heroImageAlt } : {}),
    ...(input.sources?.length ? { sources: input.sources } : {}),
  });
}

/** Ensure SEO + metadata defaults on any guide before publish. */
export function withGuidePublishingDefaults(article: EditorialArticle): EditorialArticle {
  return finalizeGuide({ ...article, faqs: article.faqs ?? [] });
}
