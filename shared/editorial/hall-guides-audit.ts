/**
 * Hall Guides production audit — SEO, voice, trust, intent, depth, EEAT.
 */

import type { EditorialArticle } from "./content-schema.js";
import { guidePath } from "./content-schema.js";
import { buildGuideArticleSeo } from "../seo/metadata.js";
import { auditEditorialArticleCopy } from "./editorial-copy-audit.js";

export type GuidePriority = "P0" | "P1" | "P2";

export interface HallGuideInventoryRow {
  slug: string;
  title: string;
  url: string;
  wordCount: number;
  category: string;
  pillar: string;
  targetKeyword: string;
  publishStatus: "published";
  readMinutes: number;
}

export interface HallGuideAuditRow {
  slug: string;
  title: string;
  url: string;
  seoScore: number;
  humanWritingScore: number;
  trustScore: number;
  firefighterRelevanceScore: number;
  searchIntentScore: number;
  depthScore: number;
  conversionScore: number;
  eeatScore: number;
  priority: GuidePriority;
  primaryKeyword: string;
  metaDescriptionLength: number;
  titleLength: number;
  h2Count: number;
  recipeLinkCount: number;
  relatedGuideCount: number;
  hasHeroAlt: boolean;
  aiFlags: string[];
  factFlags: string[];
  recommendedChanges: string[];
}

const AI_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "whether you're", re: /\bwhether you(?:'re| are)\b/i },
  { label: "in today's world", re: /\bin today(?:'s|s) (?:world|fast-paced)\b/i },
  { label: "it's important to", re: /\bit(?:'s| is) important to\b/i },
  { label: "delve", re: /\bdelve\b/i },
  { label: "landscape", re: /\b(?:ever[- ]changing )?landscape\b/i },
  { label: "robust", re: /\brobust\b/i },
  { label: "leverage", re: /\bleverage\b/i },
  { label: "game-changer", re: /\bgame[- ]?changer\b/i },
  { label: "look no further", re: /\blook no further\b/i },
  { label: "ultimate guide", re: /\bultimate guide\b/i },
  { label: "comprehensive guide", re: /\bcomprehensive guide\b/i },
  { label: "furthermore/moreover", re: /\b(furthermore|moreover|additionally)\b/i },
  { label: "at the end of the day", re: /\bat the end of the day\b/i },
  { label: "without further ado", re: /\bwithout further ado\b/i },
  { label: "in conclusion", re: /\bin conclusion\b/i },
  { label: "it's worth noting", re: /\bit(?:'s| is) worth noting\b/i },
  { label: "elevate", re: /\belevate your\b/i },
  { label: "unlock", re: /\bunlock\b/i },
];

const FACT_RISK_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "medical claim without disclaimer", re: /\b(cure|heal|prevent disease|guaranteed weight)\b/i },
  { label: "unsupported superlative", re: /\b(best ever|always works|never fail|guaranteed)\b/i },
  { label: "extreme nutrition number", re: /\b\d{4,}\s*calories?\b/i },
  { label: "definitive health promise", re: /\bwill (?:lose|gain|burn) \d+/i },
];

const FIREFIGHTER_VOICE_MARKERS =
  /\b(shift|tones|crew|hall|station kitchen|whiteboard|apparatus bay|on duty|mutual aid|prep table|hotel pan|line setup|second helpings)\b/i;

const GENERIC_BLOG_MARKERS =
  /\b(self-care journey|mindful eating|wellness journey|holistic approach|lifestyle brand|in today's society)\b/i;

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function collectGuideProse(article: EditorialArticle): string {
  return [
    article.intro,
    article.subtitle,
    article.description,
    ...article.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.tips ?? [])]),
    ...article.practicalAdvice,
    ...article.faqs.flatMap((f) => [f.question, f.answer]),
    ...article.mealRecommendations.map((m) => `${m.title} ${m.blurb}`),
    ...(article.embeddedRecipes?.flatMap((r) => [
      r.name,
      r.intro,
      r.nutritionHighlights,
      r.shiftNote,
      ...r.instructions,
    ]) ?? []),
  ].join("\n");
}

function primaryKeyword(article: EditorialArticle): string {
  return article.keywords[0]?.trim() || article.slug.replace(/-/g, " ");
}

function keywordInText(keyword: string, text: string): boolean {
  const k = keyword.toLowerCase();
  const hay = text.toLowerCase();
  if (hay.includes(k)) return true;
  const tokens = k.split(/\s+/).filter((t) => t.length > 3);
  if (tokens.length === 0) return false;
  const hits = tokens.filter((t) => hay.includes(t));
  return hits.length >= Math.ceil(tokens.length * 0.6);
}

function listDensityScore(article: EditorialArticle, wordCount: number): number {
  if (article.mealRecommendations.length >= 15) {
    return 82;
  }
  const listItems =
    article.practicalAdvice.length +
    article.sections.reduce((n, s) => n + (s.tips?.length ?? 0), 0) +
    article.mealRecommendations.length;
  const ratio = listItems / Math.max(wordCount / 100, 1);
  if (ratio > 2.2) return 62;
  if (ratio > 1.6) return 78;
  return 90;
}

function thinSectionPenalty(article: EditorialArticle): number {
  let penalty = 0;
  for (const s of article.sections) {
    const words = s.paragraphs.reduce((n, p) => n + countWords(p), 0);
    if (words < 45) penalty += 12;
    if (s.paragraphs.length === 1 && words < 80) penalty += 8;
  }
  if (countWords(article.intro) < 50) penalty += 10;
  return Math.min(40, penalty);
}

function detectAiFlags(prose: string): string[] {
  const flags: string[] = [];
  for (const { label, re } of AI_PATTERNS) {
    if (re.test(prose)) flags.push(label);
  }
  return flags;
}

function detectFactFlags(prose: string, article: EditorialArticle): string[] {
  const flags: string[] = [];
  for (const { label, re } of FACT_RISK_PATTERNS) {
    if (re.test(prose)) flags.push(label);
  }
  if (article.topic === "nutrition_performance") {
    const hasDisclaimer = /not medical|not a doctor|department's health|consult professional/i.test(prose);
    if (!hasDisclaimer) flags.push("nutrition guide missing disclaimer");
  }
  return flags;
}

function scoreSeo(article: EditorialArticle, prose: string): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 100;
  const pk = primaryKeyword(article);
  const seo = buildGuideArticleSeo(article);
  const serpTitle = seo.title.replace(/\s*\|\s*Firehall Meals$/i, "").trim();
  const titleLen = serpTitle.length;

  if (titleLen > 60) {
    score -= 12;
    notes.push(`Title long for SERP (${titleLen} chars) — tighten or use seoTitle`);
  }
  const titleHasKeyword =
    keywordInText(pk, article.title) || keywordInText(pk, article.seoTitle ?? "") || keywordInText(pk, serpTitle);
  if (!titleHasKeyword) {
    score -= 15;
    notes.push("Primary keyword missing from title");
  }
  if (seo.description.length > 155) {
    score -= 8;
    notes.push(`Meta description ${seo.description.length} chars — trim under 155`);
  }
  if (!keywordInText(pk, seo.description)) {
    score -= 10;
    notes.push("Primary keyword weak in meta description");
  }
  if (article.slug.length > 55) {
    score -= 5;
    notes.push("URL slug is long — consider shorter slug if migrating");
  }
  if (!keywordInText(pk, prose)) {
    score -= 12;
    notes.push("Primary keyword thin in body");
  }
  const h1Ok = article.title.trim().length > 0;
  if (!h1Ok) {
    score -= 20;
    notes.push("Missing H1 title");
  }
  if (article.sections.length < 2) {
    score -= 10;
    notes.push("Need at least 2 H2 sections");
  }
  const dupHeadings = new Set(article.sections.map((s) => s.heading.toLowerCase()));
  if (dupHeadings.size !== article.sections.length) {
    score -= 8;
    notes.push("Duplicate section headings");
  }
  if (!article.heroImageAlt?.trim()) {
    score -= 5;
    notes.push("Add descriptive heroImageAlt with keyword context");
  } else if (!keywordInText(pk, article.heroImageAlt)) {
    score -= 3;
    notes.push("Hero alt could include primary keyword naturally");
  }
  if (article.mealRecommendations.length < 3) {
    score -= 8;
    notes.push("Add more internal recipe links");
  }
  if ((article.relatedArticleSlugs?.length ?? 0) < 1) {
    score -= 5;
    notes.push("Link to related guides");
  }

  return { score: Math.max(0, score), notes };
}

function scoreHumanVoice(prose: string, aiFlags: string[], article: EditorialArticle): number {
  let score = 100;
  score -= aiFlags.length * 12;
  if (GENERIC_BLOG_MARKERS.test(prose)) score -= 18;
  const copyIssues = auditEditorialArticleCopy(article);
  score -= copyIssues.filter((i) => i.severity === "error").length * 10;
  score -= copyIssues.filter((i) => i.severity === "warn").length * 4;
  if (!FIREFIGHTER_VOICE_MARKERS.test(prose)) score -= 20;
  const youRatio = (prose.match(/\byou\b/gi) ?? []).length;
  const weRatio = (prose.match(/\b(we|our hall)\b/gi) ?? []).length;
  if (youRatio + weRatio < 2) score -= 8;
  return Math.max(0, Math.min(100, score));
}

function scoreTrust(factFlags: string[], article: EditorialArticle): number {
  let score = 100;
  score -= factFlags.length * 15;
  const boilerplateFaq = article.faqs.filter(
    (f) =>
      f.question === "Where do these recipes come from?" ||
      f.question === "What if crew size or time changes tonight?",
  );
  if (boilerplateFaq.length >= 2 && article.faqs.length <= 2) score -= 10;
  return Math.max(0, score);
}

function scoreFirefighterRelevance(prose: string): number {
  const hits = (prose.match(FIREFIGHTER_VOICE_MARKERS) ?? []).length;
  if (hits >= 8) return 95;
  if (hits >= 4) return 82;
  if (hits >= 2) return 68;
  return 45;
}

function scoreSearchIntent(article: EditorialArticle, prose: string, wordCount: number): number {
  const pk = primaryKeyword(article);
  let score = 85;
  const actionable =
    /\b(how to|steps|start with|rule|assign|plan|prep|hold|line|portion|minutes|crew size)\b/i.test(prose);
  const mealExamples = article.mealRecommendations.length >= 3;
  if (!actionable) score -= 20;
  if (!mealExamples) score -= 15;
  if (!keywordInText(pk, article.title)) score -= 15;
  if (wordCount < 400) score -= 25;
  if (wordCount > 2200 && article.sections.length < 4) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function scoreDepth(article: EditorialArticle, wordCount: number): number {
  let score = 100;
  score -= thinSectionPenalty(article);
  if (wordCount < 500) score -= 18;
  if (wordCount < 350) score -= 15;
  if (article.sections.length < 3 && wordCount < 700) score -= 8;
  if (article.practicalAdvice.length < 3) score -= 8;
  const avgSectionWords =
    article.sections.reduce(
      (n, s) => n + s.paragraphs.reduce((p, para) => p + countWords(para), 0),
      0,
    ) / Math.max(article.sections.length, 1);
  if (avgSectionWords < 55) score -= 12;
  score = Math.min(score, listDensityScore(article, wordCount));
  return Math.max(0, score);
}

function scoreConversion(article: EditorialArticle): number {
  let score = 70;
  if (article.mealRecommendations.length >= 4) score += 15;
  if (article.mealRecommendations.length >= 3) score += 10;
  if ((article.relatedArticleSlugs?.length ?? 0) >= 2) score += 5;
  return Math.min(100, score);
}

function scoreEeat(prose: string, article: EditorialArticle): number {
  let score = 72;
  if (FIREFIGHTER_VOICE_MARKERS.test(prose)) score += 12;
  if (article.practicalAdvice.some((t) => /assign|tones|shift|crew|hall/i.test(t))) score += 8;
  if (/\b(hall-tested|on our hall|crews actually|station kitchen)\b/i.test(prose)) score += 8;
  if (GENERIC_BLOG_MARKERS.test(prose)) score -= 15;
  return Math.max(0, Math.min(100, score));
}

function assignPriority(scores: {
  seo: number;
  human: number;
  trust: number;
  firefighter: number;
  intent: number;
  depth: number;
  aiFlags: string[];
  factFlags: string[];
  wordCount: number;
}): GuidePriority {
  const avg =
    (scores.seo + scores.human + scores.trust + scores.firefighter + scores.intent + scores.depth) / 6;

  if (
    scores.aiFlags.length >= 2 ||
    scores.factFlags.length >= 1 ||
    scores.human < 65 ||
    scores.trust < 75 ||
    scores.seo < 78 ||
    scores.depth < 35 ||
    (scores.intent < 48 && scores.wordCount < 450)
  ) {
    return "P0";
  }
  if (scores.aiFlags.length >= 1 && scores.human < 80) return "P0";

  if (scores.depth < 60 || scores.seo < 90 || scores.firefighter < 65 || scores.intent < 70 || avg < 78) {
    return "P1";
  }
  return "P2";
}

export function buildHallGuideInventory(articles: EditorialArticle[]): HallGuideInventoryRow[] {
  return articles.map((article) => {
    const prose = collectGuideProse(article);
    return {
      slug: article.slug,
      title: article.title,
      url: guidePath(article.slug),
      wordCount: countWords(prose),
      category: article.topic.replace(/_/g, " "),
      pillar: article.pillar?.replace(/_/g, " ") ?? "—",
      targetKeyword: primaryKeyword(article),
      publishStatus: "published",
      readMinutes: article.readMinutes,
    };
  });
}

export function auditHallGuide(article: EditorialArticle): HallGuideAuditRow {
  const prose = collectGuideProse(article);
  const wordCount = countWords(prose);
  const aiFlags = detectAiFlags(prose);
  const factFlags = detectFactFlags(prose, article);
  const seoResult = scoreSeo(article, prose);

  const humanWritingScore = scoreHumanVoice(prose, aiFlags, article);
  const trustScore = scoreTrust(factFlags, article);
  const firefighterRelevanceScore = scoreFirefighterRelevance(prose);
  const searchIntentScore = scoreSearchIntent(article, prose, wordCount);
  const depthScore = scoreDepth(article, wordCount);
  const conversionScore = scoreConversion(article);
  const eeatScore = scoreEeat(prose, article);
  const seoScore = seoResult.score;

  const priority = assignPriority({
    seo: seoScore,
    human: humanWritingScore,
    trust: trustScore,
    firefighter: firefighterRelevanceScore,
    intent: searchIntentScore,
    depth: depthScore,
    aiFlags,
    factFlags,
    wordCount,
  });

  const recommendedChanges = [
    ...seoResult.notes,
    ...aiFlags.map((f) => `Rewrite AI-pattern phrase: "${f}"`),
    ...factFlags.map((f) => `Fact-check: ${f}`),
  ];
  if (humanWritingScore < 75) {
    recommendedChanges.push("Rewrite intro + one section in direct hall voice (short sentences, crew scenarios)");
  }
  if (depthScore < 70) {
    recommendedChanges.push("Expand thin sections with station-specific examples and timing notes");
  }
  if (searchIntentScore < 75) {
    recommendedChanges.push("Answer the search query in the first 2 paragraphs — less preamble");
  }
  if (conversionScore < 80) {
    recommendedChanges.push("Add 1–2 more recipe picks with specific shift scenarios");
  }

  const seo = buildGuideArticleSeo(article);

  return {
    slug: article.slug,
    title: article.title,
    url: guidePath(article.slug),
    seoScore,
    humanWritingScore,
    trustScore,
    firefighterRelevanceScore,
    searchIntentScore,
    depthScore,
    conversionScore,
    eeatScore,
    priority,
    primaryKeyword: primaryKeyword(article),
    metaDescriptionLength: seo.description.length,
    titleLength: seo.title.length,
    h2Count: article.sections.length + 1,
    recipeLinkCount: article.mealRecommendations.length,
    relatedGuideCount: article.relatedArticleSlugs?.length ?? 0,
    hasHeroAlt: Boolean(article.heroImageAlt?.trim()),
    aiFlags,
    factFlags,
    recommendedChanges: [...new Set(recommendedChanges)].slice(0, 8),
  };
}

export function auditHallGuidesCatalog(articles: EditorialArticle[]): {
  inventory: HallGuideInventoryRow[];
  audits: HallGuideAuditRow[];
  summary: {
    total: number;
    p0: number;
    p1: number;
    p2: number;
    avgSeo: number;
    avgHuman: number;
  };
} {
  const inventory = buildHallGuideInventory(articles);
  const audits = articles.map(auditHallGuide);
  const p0 = audits.filter((a) => a.priority === "P0").length;
  const p1 = audits.filter((a) => a.priority === "P1").length;
  const p2 = audits.filter((a) => a.priority === "P2").length;
  const avgSeo = Math.round(audits.reduce((s, a) => s + a.seoScore, 0) / audits.length);
  const avgHuman = Math.round(audits.reduce((s, a) => s + a.humanWritingScore, 0) / audits.length);
  return {
    inventory,
    audits,
    summary: { total: audits.length, p0, p1, p2, avgSeo, avgHuman },
  };
}
