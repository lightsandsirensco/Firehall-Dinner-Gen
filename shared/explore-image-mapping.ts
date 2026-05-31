/**
 * Explore image-to-recipe identity mapping — slug-locked validation only.
 * Correct image > no image > wrong image.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ApprovedCatalogEntry, ApprovedCatalogKind } from "./approved-catalog.js";
import {
  auditBreakfastFormatRules,
  inferBreakfastFormatKind,
} from "./curated-image-governance/breakfast-image-rules.js";
import {
  auditCategoryMealFormat,
  auditTitlePathKeywords,
  type ImageAccuracyIssue,
} from "./curated-image-governance/image-accuracy-rules.js";
import { isImageReuseAndFallbacksDisabled } from "./image-reuse-policy.js";
import {
  configuredImageDonorSlug,
  lookupConfiguredImageDonorSlug,
  resolveActiveImageDonorSlug,
} from "./image-donor-resolver.js";
import {
  heroPathConflictsTitle,
  inferVisualSignalsFromTitle,
  type MealVisualSignal,
} from "./meal-image-title-match.js";
import {
  imageFileExists,
  publicImageAbsolute,
  slugLockedImagePaths,
  type ExploreCatalogImageKind,
} from "./explore-image-paths.js";
import { normalizeCatalogSlug } from "./hall-catalog/gate.js";

export type ExploreImageMappingStatus =
  | "correct"
  | "missing"
  | "mismatched_path"
  | "mismatched_identity"
  | "duplicate_conflict";

export interface ExploreImageMappingRow {
  slug: string;
  title: string;
  category: string;
  kind: ApprovedCatalogKind;
  heroImage: string;
  canonicalHero: string;
  status: ExploreImageMappingStatus;
  issues: ImageAccuracyIssue[];
  duplicatePeers: string[];
  heroMd5: string | null;
  exploreEligible: boolean;
}

export interface ExploreImageMappingReport {
  generatedAt: string;
  totals: {
    recipes: number;
    correct: number;
    missing: number;
    mismatchedPath: number;
    mismatchedIdentity: number;
    duplicateConflict: number;
    exploreEligible: number;
    exploreExcluded: number;
    duplicateImageGroups: number;
  };
  rows: ExploreImageMappingRow[];
}

export interface ExploreImageMappingContext {
  md5BySlug: Map<string, string | null>;
  slugByMd5: Map<string, string[]>;
  publicRoot?: string;
}

const SIGNAL_CONFLICTS = new Set<string>([
  "taco:bowl",
  "bowl:taco",
  "taco:pasta",
  "pasta:taco",
  "pasta:breakfast",
  "breakfast:pasta",
  "pasta:skillet",
  "skillet:pasta",
  "burger:salad",
  "salad:burger",
  "burger:soup",
  "soup:burger",
  "pizza:bowl",
  "bowl:pizza",
  "smoothie:grill",
  "grill:smoothie",
]);

function dominantSignal(signals: Set<MealVisualSignal>): MealVisualSignal | null {
  for (const signal of signals) {
    if (signal !== "generic") return signal;
  }
  return null;
}

export function extractSlugFromImagePath(imagePath: string): string | null {
  const trimmed = (imagePath || "").trim();
  if (!trimmed) return null;
  const base = trimmed.split("/").pop() || "";
  const match = base.match(/^([a-z0-9-]+)\.(jpg|jpeg|png|webp)$/i);
  return match ? match[1].toLowerCase() : null;
}

export function getCanonicalExploreHeroPath(slug: string, kind: ExploreCatalogImageKind): string {
  return slugLockedImagePaths(slug, kind).hero;
}

export function isSlugLockedImagePath(slug: string, imagePath: string): boolean {
  const normalized = normalizeCatalogSlug(slug);
  const pathSlug = extractSlugFromImagePath(imagePath);
  return pathSlug === normalized;
}

export function md5PublicImage(publicPath: string, publicRoot?: string): string | null {
  const trimmed = (publicPath || "").trim();
  if (!trimmed || !imageFileExists(trimmed, publicRoot)) return null;
  try {
    const abs = publicImageAbsolute(trimmed, publicRoot);
    return crypto.createHash("md5").update(fs.readFileSync(abs)).digest("hex");
  } catch {
    return null;
  }
}

export { configuredImageDonorSlug, lookupConfiguredImageDonorSlug, resolveActiveImageDonorSlug };

function slugPairConflicts(title: string, peerSlug: string): boolean {
  const peer = peerSlug.toLowerCase();
  if (/\b(oats?|oatmeal)\b/i.test(title) && /\b(mac-and-cheese|macaroni|smoked-mac|pasta-bar)\b/.test(peer)) {
    return true;
  }
  if (/\bsteak\b/i.test(title) && /\b(pulled-pork|brisket-burnt|sandwich)\b/.test(peer)) {
    return true;
  }
  if (/\bburrito\b/i.test(title) && /\b(falafel|rice-bowl|mediterranean-feast|greek-chicken-bowls)\b/.test(peer)) {
    return true;
  }
  if (/\boats?\b/i.test(title) && /\b(mac-and-cheese|smoked-mac|pretzel-bite|pasta-bar)\b/.test(peer)) {
    return true;
  }
  if (/\bhash\b/i.test(title) && !/\bburrito\b/i.test(title) && /\b(falafel|bowl-bar|mediterranean)\b/.test(peer)) {
    return true;
  }
  return false;
}

export function recipesShareImageButConflict(
  slug: string,
  title: string,
  mealFormat: string,
  peerSlug: string,
  peerTitle: string,
  peerMealFormat: string,
): boolean {
  if (slugPairConflicts(title, peerSlug) || slugPairConflicts(peerTitle, slug)) {
    return true;
  }

  const a = inferVisualSignalsFromTitle(title, mealFormat);
  const b = inferVisualSignalsFromTitle(peerTitle, peerMealFormat);
  const aDom = dominantSignal(a);
  const bDom = dominantSignal(b);
  if (!aDom || !bDom || aDom === "generic" || bDom === "generic") return false;
  if (aDom === bDom) return false;
  return SIGNAL_CONFLICTS.has(`${aDom}:${bDom}`);
}

export function buildExploreImageMappingContext(
  entries: Array<Pick<ApprovedCatalogEntry, "slug" | "heroImage">>,
  publicRoot?: string,
): ExploreImageMappingContext {
  const md5BySlug = new Map<string, string | null>();
  const slugByMd5 = new Map<string, string[]>();

  for (const entry of entries) {
    const slug = normalizeCatalogSlug(entry.slug);
    const md5 = md5PublicImage(entry.heroImage, publicRoot);
    md5BySlug.set(slug, md5);
    if (!md5) continue;
    const peers = slugByMd5.get(md5) || [];
    peers.push(slug);
    slugByMd5.set(md5, peers);
  }

  return { md5BySlug, slugByMd5, publicRoot };
}

export function validateExploreImageMapping(
  entry: Pick<
    ApprovedCatalogEntry,
    "slug" | "title" | "kind" | "category" | "mealFormat" | "heroImage" | "tags"
  >,
  context: ExploreImageMappingContext,
  options: { peerLookup?: Map<string, Pick<ApprovedCatalogEntry, "title" | "mealFormat">> } = {},
): ExploreImageMappingRow {
  const slug = normalizeCatalogSlug(entry.slug);
  const canonicalHero = getCanonicalExploreHeroPath(slug, entry.kind);
  const heroImage = (entry.heroImage || "").trim() || canonicalHero;
  const issues: ImageAccuracyIssue[] = [];
  let status: ExploreImageMappingStatus = "correct";
  let duplicatePeers: string[] = [];

  if (!isSlugLockedImagePath(slug, heroImage)) {
    status = "mismatched_path";
    issues.push({
      code: "explore_card_mismatch",
      severity: "critical",
      message: `hero path slug "${extractSlugFromImagePath(heroImage)}" !== recipe slug "${slug}"`,
      confidence: 99,
    });
  }

  if (heroImage !== canonicalHero && entry.kind !== "hall_classic") {
    status = status === "correct" ? "mismatched_path" : status;
    issues.push({
      code: "explore_card_mismatch",
      severity: "critical",
      message: `hero path ${heroImage} is not canonical ${canonicalHero}`,
      confidence: 96,
    });
  }

  const heroExists = imageFileExists(heroImage, context.publicRoot);
  if (!heroExists) {
    status = "missing";
    issues.push({
      code: "missing_image_file",
      severity: "critical",
      message: "canonical hero image missing on disk",
      confidence: 98,
    });
  }

  if (
    !isSlugLockedImagePath(slug, heroImage) &&
    heroPathConflictsTitle(heroImage, entry.title, entry.mealFormat)
  ) {
    status = "mismatched_identity";
    issues.push({
      code: "explore_card_mismatch",
      severity: "critical",
      message: "hero path conflicts with recipe title/format",
      confidence: 94,
    });
  }

  issues.push(
    ...auditTitlePathKeywords(entry.title, heroImage),
    ...auditCategoryMealFormat(entry.title, entry.mealFormat, entry.category, heroImage),
  );

  if (entry.kind === "breakfast_catalog") {
    issues.push(...auditBreakfastFormatRules(entry.title, heroImage, entry.tags || []));
    if (
      inferBreakfastFormatKind(entry.title, entry.tags || []).includes("oats") &&
      !/\b(oats?|oatmeal|savory-oats)\b/i.test(heroImage)
    ) {
      status = "mismatched_identity";
      issues.push({
        code: "explore_card_mismatch",
        severity: "critical",
        message: "oats recipe hero path lacks oatmeal identity cues",
        confidence: 90,
      });
    }
  }

  const heroMd5 = context.md5BySlug.get(slug) ?? md5PublicImage(heroImage, context.publicRoot);
  if (heroMd5) {
    duplicatePeers = (context.slugByMd5.get(heroMd5) || []).filter((peer) => peer !== slug);
  }

  if (isImageReuseAndFallbacksDisabled() && duplicatePeers.length > 0) {
    status = "duplicate_conflict";
    issues.push({
      code: "duplicate_hero_hash",
      severity: "critical",
      message: `hero file reused across recipes (${duplicatePeers.join(", ")}) — image reuse disabled`,
      confidence: 99,
    });
  }

  const donorSlug = resolveActiveImageDonorSlug(slug, heroImage, {
    heroMd5: heroMd5 ?? undefined,
    publicRoot: context.publicRoot,
  });
  if (donorSlug) {
    status = "mismatched_identity";
    issues.push({
      code: "donor_override_active",
      severity: "critical",
      message: `hero file matches configured donor "${donorSlug}" instead of unique slug identity`,
      confidence: 97,
    });
  }

  const peerLookup = options.peerLookup;
  if (!isImageReuseAndFallbacksDisabled()) {
    for (const peerSlug of duplicatePeers) {
      const peer = peerLookup?.get(peerSlug);
      const peerTitle = peer?.title || peerSlug.replace(/-/g, " ");
      const peerMealFormat = peer?.mealFormat || entry.mealFormat;
      if (recipesShareImageButConflict(slug, entry.title, entry.mealFormat, peerSlug, peerTitle, peerMealFormat)) {
        status = "duplicate_conflict";
        issues.push({
          code: "duplicate_hero_hash",
          severity: "critical",
          message: `hero file shared with conflicting recipe "${peerSlug}"`,
          confidence: 95,
        });
      }
    }
  }

  const critical = issues.filter((issue) => issue.severity === "critical");
  const exploreEligible =
    heroExists &&
    isSlugLockedImagePath(slug, heroImage) &&
    (entry.kind === "hall_classic" || heroImage === canonicalHero) &&
    critical.length === 0;

  if (exploreEligible) {
    status = "correct";
  } else if (status === "correct") {
    status = critical.some((issue) => issue.code === "missing_image_file")
      ? "missing"
      : "mismatched_identity";
  }

  return {
    slug,
    title: entry.title,
    category: entry.category,
    kind: entry.kind,
    heroImage,
    canonicalHero,
    status,
    issues: critical,
    duplicatePeers,
    heroMd5,
    exploreEligible,
  };
}

export function auditExploreImageMappings(
  entries: ApprovedCatalogEntry[],
  publicRoot?: string,
): ExploreImageMappingReport {
  const context = buildExploreImageMappingContext(entries, publicRoot);
  const peerLookup = new Map(entries.map((entry) => [normalizeCatalogSlug(entry.slug), entry]));
  const rows = entries.map((entry) =>
    validateExploreImageMapping(entry, context, { peerLookup }),
  );

  const duplicateImageGroups = new Set(
    rows.filter((row) => row.duplicatePeers.length > 0).map((row) => row.heroMd5),
  ).size;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      recipes: rows.length,
      correct: rows.filter((row) => row.status === "correct").length,
      missing: rows.filter((row) => row.status === "missing").length,
      mismatchedPath: rows.filter((row) => row.status === "mismatched_path").length,
      mismatchedIdentity: rows.filter((row) => row.status === "mismatched_identity").length,
      duplicateConflict: rows.filter((row) => row.status === "duplicate_conflict").length,
      exploreEligible: rows.filter((row) => row.exploreEligible).length,
      exploreExcluded: rows.filter((row) => !row.exploreEligible).length,
      duplicateImageGroups,
    },
    rows,
  };
}

export function filterExploreEligibleCatalogEntries(
  entries: ApprovedCatalogEntry[],
  publicRoot?: string,
): { recipes: ApprovedCatalogEntry[]; report: ExploreImageMappingReport } {
  const report = auditExploreImageMappings(entries, publicRoot);
  const eligible = new Set(report.rows.filter((row) => row.exploreEligible).map((row) => row.slug));
  return {
    recipes: entries.filter((entry) => eligible.has(normalizeCatalogSlug(entry.slug))),
    report,
  };
}

export function syncHeroToThumbIfDrifted(
  slug: string,
  kind: ExploreCatalogImageKind,
  publicRoot?: string,
): boolean {
  const paths = slugLockedImagePaths(slug, kind);
  const heroMd5 = md5PublicImage(paths.hero, publicRoot);
  const thumbMd5 = md5PublicImage(paths.thumb, publicRoot);
  if (!heroMd5 || heroMd5 === thumbMd5) return false;

  const heroAbs = publicImageAbsolute(paths.hero, publicRoot);
  const thumbAbs = publicImageAbsolute(paths.thumb, publicRoot);
  fs.mkdirSync(path.dirname(thumbAbs), { recursive: true });
  fs.copyFileSync(heroAbs, thumbAbs);
  return true;
}
