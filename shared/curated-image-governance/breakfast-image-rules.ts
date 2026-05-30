/**
 * Breakfast-only image accuracy rules — title/format alignment, duplicates, Red Lead.
 */

import type { ImageAccuracyIssue } from "./image-accuracy-rules.js";
import { auditFoodRealismHeuristics, auditTitlePathKeywords } from "./image-accuracy-rules.js";
import { validateRedLeadImageRef } from "./red-lead-rules.js";

export type BreakfastImageSurface = {
  slug: string;
  title: string;
  heroImage: string;
  thumbImage: string;
  mobileImage: string;
  railImage: string;
  tags?: string[];
  altText?: string;
  mealFormat?: string;
  source: "breakfast_catalog" | "golden_100" | "red_lead" | "explore";
};

export type BreakfastFormatKind =
  | "hash"
  | "burrito"
  | "oats"
  | "sandwich"
  | "skillet"
  | "casserole"
  | "pancake"
  | "waffle"
  | "wrap"
  | "taco"
  | "french_toast"
  | "parfait"
  | "pizza"
  | "red_lead"
  | "other";

export type BreakfastFormatRule = {
  kind: BreakfastFormatKind;
  titleRe: RegExp;
  tagRe?: RegExp;
  requiredPathRe: RegExp;
  forbiddenPathRe?: RegExp;
  failMessage: string;
  skipWhenTitleMatches?: RegExp;
};

/** Breakfast-specific automatic fail conditions (path/slug heuristics). */
export const BREAKFAST_FORMAT_RULES: BreakfastFormatRule[] = [
  {
    kind: "hash",
    titleRe: /\bhash\b/i,
    requiredPathRe: /\b(potato|hash|skillet|sheet-pan)\b/i,
    forbiddenPathRe: /\b(cake|coffee-cake|bar|brownie|cookie|dessert|square|muffin|bundt|loaf|granola|oatmeal|french-toast)\b/i,
    failMessage: "hash recipe must show potato/skillet hash — not dessert, bars, or baked squares",
    skipWhenTitleMatches: /\bburrito\b/i,
  },
  {
    kind: "burrito",
    titleRe: /\bburrito\b/i,
    requiredPathRe: /\b(burrito|tortilla|wrap|crunchwrap|enchilada)\b/i,
    forbiddenPathRe: /\b(biscuit|gravy|sandwich|open-face|skillet-hash)\b/i,
    failMessage: "burrito recipe must show tortillas — not biscuits and gravy or open sandwiches",
  },
  {
    kind: "oats",
    titleRe: /\boats?\b|\boatmeal\b/i,
    requiredPathRe: /\b(oats?|oatmeal|savory-oats)\b/i,
    forbiddenPathRe: /\b(biscuit|gravy|pancake|waffle|sweet|dessert|cake|square|french-toast)\b/i,
    failMessage: "oats recipe must show oatmeal — not biscuits, gravy, pancakes, or dessert squares",
  },
  {
    kind: "sandwich",
    titleRe: /\b(sandwich|biscuit|mc muffin|slider)\b/i,
    tagRe: /\b(sandwich|biscuit|slider)\b/i,
    requiredPathRe: /\b(sandwich|biscuit|slider|bread|bun|monte-cristo|pinwheel|tray)\b/i,
    forbiddenPathRe: /\b(burrito|tortilla|skillet-hash|oatmeal)\b/i,
    failMessage: "breakfast sandwich recipe must show bread/bun/biscuit — not burritos or hash skillets",
  },
  {
    kind: "skillet",
    titleRe: /\bskillet\b/i,
    requiredPathRe: /\b(skillet|cast-iron|cast_iron|hash|omelette|pepper|steak|cowboy)\b/i,
    forbiddenPathRe: /\b(biscuit|gravy|burrito|pancake-stack|parfait)\b/i,
    failMessage: "skillet recipe must show cast-iron breakfast — not biscuits and gravy or burritos",
  },
  {
    kind: "casserole",
    titleRe: /\b(casserole|egg bake|bake)\b/i,
    requiredPathRe: /\b(casserole|bake|egg-bake|french-toast|denver|southwest|turkey-sausage-egg)\b/i,
    forbiddenPathRe: /\b(burrito|taco|skillet-hash|biscuit-gravy)\b/i,
    failMessage: "breakfast bake/casserole must resemble a baked casserole — not burritos or hash skillets",
  },
  {
    kind: "pancake",
    titleRe: /\bpancake\b/i,
    requiredPathRe: /\b(pancake|french-toast|pinwheel|maple|protein-pancake)\b/i,
    forbiddenPathRe: /\b(burrito|hash|biscuit-gravy|oatmeal)\b/i,
    failMessage: "pancake recipe must show pancakes or stacked breakfast — not burritos or hash",
  },
  {
    kind: "waffle",
    titleRe: /\bwaffle\b/i,
    requiredPathRe: /\b(waffle|pancake|french-toast)\b/i,
    failMessage: "waffle recipe must show waffles or similar griddled breakfast",
  },
  {
    kind: "wrap",
    titleRe: /\bwrap\b/i,
    requiredPathRe: /\b(wrap|tortilla|burrito|crunchwrap)\b/i,
    failMessage: "wrap recipe must show wrapped handheld breakfast",
  },
  {
    kind: "taco",
    titleRe: /\btaco\b/i,
    requiredPathRe: /\b(taco|quesadilla|tortilla|enchilada)\b/i,
    forbiddenPathRe: /\b(biscuit|gravy|sandwich)\b/i,
    failMessage: "taco recipe must show tortillas — not biscuits or sandwiches",
  },
  {
    kind: "french_toast",
    titleRe: /\bfrench toast\b/i,
    requiredPathRe: /\b(french-toast|toast|bake|monte-cristo)\b/i,
    failMessage: "french toast recipe must show french toast or baked french toast",
  },
  {
    kind: "parfait",
    titleRe: /\bparfait\b/i,
    requiredPathRe: /\b(parfait|yogurt|poutine|bowl)\b/i,
    forbiddenPathRe: /\b(skillet|burrito|hash|sandwich)\b/i,
    failMessage: "parfait recipe must show yogurt bowl style — not skillets or burritos",
  },
  {
    kind: "pizza",
    titleRe: /\bpizza\b/i,
    requiredPathRe: /\b(pizza)\b/i,
    failMessage: "breakfast pizza must show pizza",
  },
  {
    kind: "red_lead",
    titleRe: /\bred lead\b/i,
    requiredPathRe: /\b(red-lead|firefighter-red-lead|tomato|shakshuka|cast-iron|cast_iron|skillet)\b/i,
    forbiddenPathRe: /\b(curry|stew|soup|chicken|biscuit|gravy|burrito|pancake)\b/i,
    failMessage: "Red Lead must show tomato cast-iron sauce — never curry, stew, soup, or chicken dishes",
  },
];

export function inferBreakfastFormatKind(title: string, tags: string[] = []): BreakfastFormatKind[] {
  const tagBlob = tags.join(" ");
  const kinds = new Set<BreakfastFormatKind>();

  // Handheld formats win over hash when title contains both (e.g. "Bacon Hash Burritos").
  if (/\bburrito\b/i.test(title)) kinds.add("burrito");
  if (/\bwrap\b/i.test(title)) kinds.add("wrap");
  if (/\btaco\b/i.test(title)) kinds.add("taco");

  for (const rule of BREAKFAST_FORMAT_RULES) {
    if (kinds.has("burrito") && rule.kind === "hash") continue;
    if (kinds.has("wrap") && rule.kind === "hash") continue;
    if (rule.titleRe.test(title) || (rule.tagRe && rule.tagRe.test(tagBlob))) {
      kinds.add(rule.kind);
    }
  }
  return kinds.size > 0 ? [...kinds] : ["other"];
}

export function auditBreakfastFormatRules(
  title: string,
  heroPath: string,
  tags: string[] = [],
  altText = "",
): ImageAccuracyIssue[] {
  const blob = `${heroPath} ${altText} ${tags.join(" ")}`.toLowerCase();
  const issues: ImageAccuracyIssue[] = [];
  const skipHash = /\bburrito\b/i.test(title) || /\bwrap\b/i.test(title);

  for (const rule of BREAKFAST_FORMAT_RULES) {
    if (skipHash && rule.kind === "hash") continue;
    const titleMatch = rule.titleRe.test(title);
    const tagMatch = rule.tagRe ? rule.tagRe.test(tags.join(" ")) : false;
    if (!titleMatch && !tagMatch) continue;
    if (rule.skipWhenTitleMatches?.test(title)) continue;

    if (rule.forbiddenPathRe?.test(blob)) {
      issues.push({
        code: "title_path_keyword_conflict",
        severity: "critical",
        message: rule.failMessage,
        confidence: 92,
      });
    } else if (!rule.requiredPathRe.test(blob)) {
      issues.push({
        code: "category_mismatch",
        severity: "critical",
        message: rule.failMessage,
        confidence: 88,
      });
    }
  }

  const redLead = validateRedLeadImageRef(title, heroPath, altText);
  if (!redLead.ok) {
    issues.push({
      code: "title_path_keyword_conflict",
      severity: "critical",
      message: redLead.forbidden || redLead.missingRequired || "Red Lead image rule failed",
      confidence: 95,
    });
  }

  return issues;
}

export function auditBreakfastImageSurfaces(
  surface: BreakfastImageSurface,
  heroMd5?: string | null,
  duplicatePeers: string[] = [],
): ImageAccuracyIssue[] {
  const issues: ImageAccuracyIssue[] = [
    ...auditTitlePathKeywords(surface.title, surface.heroImage, surface.altText || ""),
    ...auditBreakfastFormatRules(surface.title, surface.heroImage, surface.tags, surface.altText || ""),
    ...auditFoodRealismHeuristics(surface.title, surface.heroImage, surface.altText || "", surface.mealFormat || "breakfast"),
  ];

  if (duplicatePeers.length > 0) {
    issues.push({
      code: "duplicate_hero_hash",
      severity: "critical",
      message: `hero MD5 shared with ${duplicatePeers.join(", ")}`,
      confidence: 92,
    });
  }

  if (heroMd5 && duplicatePeers.some((p) => p !== surface.slug)) {
    issues.push({
      code: "donor_override_active",
      severity: "warning",
      message: `hero reuses same file as other breakfast recipe(s): ${duplicatePeers.filter((p) => p !== surface.slug).join(", ")}`,
      confidence: 85,
    });
  }

  return issues;
}

export function breakfastRecipePasses(issues: ImageAccuracyIssue[]): boolean {
  return !issues.some((i) => i.severity === "critical");
}
