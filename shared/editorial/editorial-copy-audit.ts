/**
 * Editorial prose QA — flag AI-like copy, stuffing, weak rhythm.
 */

import type { EditorialArticle } from "./content-schema.js";

export interface EditorialCopyIssue {
  slug: string;
  code: string;
  message: string;
  severity: "error" | "warn";
}

const AI_PHRASES = [
  /\bin today's (?:fast-paced )?world\b/i,
  /\bin today's fast-paced\b/i,
  /\bit's important to\b/i,
  /\bit is important to\b/i,
  /\bit's worth noting\b/i,
  /\bdelve into\b/i,
  /\btapestry of\b/i,
  /\belevate your\b/i,
  /\bunlock\b/i,
  /\bgame-changer\b/i,
  /\blook no further\b/i,
  /\bwithout further ado\b/i,
  /\bin conclusion\b/i,
  /\bwhether you're\b/i,
  /\bperfect for anyone\b/i,
  /\bultimate guide\b/i,
  /\bcomprehensive guide\b/i,
];

const STUFFING_PATTERNS = [
  /\bfirefighter\b.*\bfirefighter\b.*\bfirefighter\b/i,
  /\bfirehall\b.*\bfirehall\b.*\bfirehall\b/i,
  /\bfirehouse\b.*\bfirehouse\b.*\bfirehouse\b/i,
];

const ROBOT_TRANSITIONS =
  /\b(furthermore|moreover|additionally|in addition|that being said|at the end of the day)\b/i;

function sentenceOpenings(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^([A-Za-z]+)/);
      return m ? m[1].toLowerCase() : "";
    })
    .filter(Boolean);
}

function repeatedOpeningRatio(openings: string[]): number {
  if (openings.length < 4) return 0;
  const counts = new Map<string, number>();
  for (const o of openings) counts.set(o, (counts.get(o) ?? 0) + 1);
  let max = 0;
  for (const c of counts.values()) max = Math.max(max, c);
  return max / openings.length;
}

function collectProse(article: EditorialArticle): string {
  const parts = [
    article.intro,
    article.subtitle,
    article.description,
    ...article.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.tips ?? [])]),
    ...article.practicalAdvice,
    ...article.faqs.flatMap((f) => [f.question, f.answer]),
    ...article.mealRecommendations.map((m) => m.blurb),
    ...(article.embeddedRecipes?.flatMap((r) => [
      r.name,
      r.intro,
      r.nutritionHighlights,
      r.shiftNote,
      ...r.instructions,
      ...(r.substitutions ?? []),
    ]) ?? []),
  ];
  return parts.join("\n");
}

export function auditEditorialArticleCopy(article: EditorialArticle): EditorialCopyIssue[] {
  const issues: EditorialCopyIssue[] = [];
  const prose = collectProse(article);
  const openings = sentenceOpenings(prose);

  if (repeatedOpeningRatio(openings) > 0.35) {
    issues.push({
      slug: article.slug,
      code: "repeated_openings",
      message: "Too many paragraphs start with the same word — vary sentence rhythm",
      severity: "warn",
    });
  }

  for (const pat of AI_PHRASES) {
    if (pat.test(prose)) {
      issues.push({
        slug: article.slug,
        code: "ai_phrase",
        message: `AI-like phrase detected: ${pat.source}`,
        severity: "error",
      });
    }
  }

  for (const pat of STUFFING_PATTERNS) {
    if (pat.test(prose)) {
      issues.push({
        slug: article.slug,
        code: "keyword_stuffing",
        message: "Keyword repeated too densely in one passage",
        severity: "warn",
      });
    }
  }

  if (ROBOT_TRANSITIONS.test(prose)) {
    issues.push({
      slug: article.slug,
      code: "robot_transition",
      message: "Formal transition words read like SEO filler",
      severity: "warn",
    });
  }

  if (article.intro.split(/\s+/).length < 40) {
    issues.push({
      slug: article.slug,
      code: "thin_intro",
      message: "Intro is short for a pillar guide",
      severity: "warn",
    });
  }

  const duplicateSection = article.sections.some((s, i, arr) =>
    arr.slice(i + 1).some((o) => o.heading.toLowerCase() === s.heading.toLowerCase()),
  );
  if (duplicateSection) {
    issues.push({
      slug: article.slug,
      code: "duplicate_heading",
      message: "Duplicate section heading",
      severity: "error",
    });
  }

  return issues;
}

export function auditEditorialCatalog(articles: EditorialArticle[]): {
  pass: boolean;
  issues: EditorialCopyIssue[];
  manualReview: string[];
} {
  const issues: EditorialCopyIssue[] = [];
  const manualReview: string[] = [];

  for (const article of articles) {
    issues.push(...auditEditorialArticleCopy(article));
    const errors = issues.filter((i) => i.slug === article.slug && i.severity === "error");
    if (errors.length > 0) manualReview.push(article.slug);
  }

  const hardErrors = issues.filter((i) => i.severity === "error");
  return {
    pass: hardErrors.length === 0,
    issues,
    manualReview: [...new Set(manualReview)],
  };
}
