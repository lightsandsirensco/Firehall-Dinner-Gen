/**
 * Hero image validation — metadata, cross-recipe MD5 conflicts, and optional vision QA.
 * Catches wrong pixels at correct slug-locked paths (bootstrap donor copies, etc.).
 */

import {
  auditCategoryMealFormat,
  auditTitlePathKeywords,
  type ImageAccuracyIssue,
} from "./curated-image-governance/image-accuracy-rules.js";
import {
  auditMealImageCompleteness,
  extractMealImageRequirements,
  hasMealCompletenessFailure,
} from "./curated-image-governance/meal-image-completeness.js";
import { auditTitlePrimarySideAlignment } from "./curated-image-governance/title-primary-side-rules.js";
import type { TrustAuditTarget } from "./curated-image-governance/trust-audit-targets.js";
import { loadTrustAuditTargets } from "./curated-image-governance/trust-audit-targets.js";
import {
  buildExploreImageMappingContext,
  md5PublicImage,
  recipesShareImageButConflict,
  validateExploreImageMapping,
  type ExploreImageMappingRow,
} from "./explore-image-mapping.js";
import { imageFileExists } from "./explore-image-paths.js";
import { normalizeCatalogSlug } from "./hall-catalog/gate.js";
import type { TrustAuditCollection } from "./curated-image-governance/trust-audit-targets.js";
import { resolveApprovedCatalogKind } from "./approved-catalog.js";
import type { ExploreCatalogImageKind } from "./explore-image-paths.js";

export type HeroImageValidationRow = {
  slug: string;
  title: string;
  collection: string;
  heroImage: string;
  heroAlt: string;
  heroOnDisk: boolean;
  exploreMapping: ExploreImageMappingRow;
  metadataIssues: ImageAccuracyIssue[];
  visionPass: boolean | null;
  visionSkipped: boolean;
  visionReasons: string[];
  pass: boolean;
  criticalReasons: string[];
};

export type HeroImageValidationReport = {
  generatedAt: string;
  totals: {
    recipes: number;
    pass: number;
    fail: number;
    missingHero: number;
    metadataFail: number;
    duplicateConflict: number;
    visionFail: number;
    visionSkipped: number;
  };
  rows: HeroImageValidationRow[];
};

export function resolveKindForHeroValidation(
  slug: string,
  collection: TrustAuditCollection,
): ExploreCatalogImageKind {
  switch (collection) {
    case "hall_expansion":
      return "hall_expansion";
    case "breakfast":
      return "breakfast_catalog";
    case "smoothies":
      return "smoothie";
    case "performance_meals":
      return "performance_meal";
    default:
      return resolveApprovedCatalogKind(slug);
  }
}

export function auditHeroMetadata(target: TrustAuditTarget): ImageAccuracyIssue[] {
  const heroAlt = (target.heroAlt || target.title).trim();
  return [
    ...auditTitlePathKeywords(target.title, target.heroImage, heroAlt),
    ...auditCategoryMealFormat(target.title, target.mealFormat, target.cuisine, target.heroImage),
    ...auditTitlePrimarySideAlignment({
      slug: target.slug,
      title: target.title,
      mealFormat: target.mealFormat,
      heroPath: target.heroImage,
      heroAlt,
    }),
    ...auditMealImageCompleteness({
      slug: target.slug,
      title: target.title,
      mealFormat: target.mealFormat,
      heroPath: target.heroImage,
      heroAlt,
      ingredients: target.ingredients,
      tonightSpread: target.tonightSpread,
      metadataOnly: true,
    }),
  ];
}

export function auditHeroAltAlignment(
  title: string,
  heroAlt: string,
  heroPath: string,
): ImageAccuracyIssue[] {
  const issues: ImageAccuracyIssue[] = [];
  const alt = heroAlt.trim();
  if (!alt) return issues;

  const titleBlob = title.toLowerCase();
  const altBlob = alt.toLowerCase();
  const pathBlob = heroPath.toLowerCase();

  const titleProteins: Array<{ re: RegExp; label: string }> = [
    { re: /\btuna\b/i, label: "tuna" },
    { re: /\bchicken\b/i, label: "chicken" },
    { re: /\bbeef\b/i, label: "beef" },
    { re: /\bpork\b/i, label: "pork" },
    { re: /\bsalmon\b/i, label: "salmon" },
    { re: /\bshrimp\b/i, label: "shrimp" },
    { re: /\bturkey\b/i, label: "turkey" },
  ];

  for (const { re, label } of titleProteins) {
    if (!re.test(titleBlob)) continue;
    const altClaimsOther =
      (label !== "chicken" && /\bchicken\b|\bparm\b|\bparmesan\b/i.test(altBlob)) ||
      (label !== "tuna" && /\btuna\b/i.test(altBlob) && !re.test(altBlob)) ||
      (label === "tuna" && /\b(chicken|parm|parmesan|beef|pork)\b/i.test(altBlob));
    if (altClaimsOther) {
      issues.push({
        code: "image_title_mismatch",
        severity: "critical",
        message: `title claims ${label} but hero alt suggests a different protein/dish`,
        confidence: 88,
      });
    }
  }

  if (/\bmelt\b/i.test(titleBlob) && /\b(spaghetti|pasta|penne|rigatoni)\b/i.test(`${altBlob} ${pathBlob}`)) {
    issues.push({
      code: "image_title_mismatch",
      severity: "critical",
      message: "melt/sandwich title but hero alt/path suggests pasta",
      confidence: 90,
    });
  }

  return issues;
}

export function buildGlobalHeroPeerLookup(
  targets: TrustAuditTarget[],
): Map<string, Pick<TrustAuditTarget, "title" | "mealFormat">> {
  const lookup = new Map<string, Pick<TrustAuditTarget, "title" | "mealFormat">>();
  for (const target of targets) {
    lookup.set(normalizeCatalogSlug(target.slug), {
      title: target.title,
      mealFormat: target.mealFormat,
    });
  }
  return lookup;
}

export function buildGlobalHeroMd5Index(
  targets: TrustAuditTarget[],
  publicRoot?: string,
): ReturnType<typeof buildExploreImageMappingContext> {
  const inputs = targets.map((target) => ({
    slug: target.slug,
    heroImage: target.heroImage,
  }));
  return buildExploreImageMappingContext(inputs, publicRoot);
}

export function auditCrossRecipeHeroDuplicates(
  target: TrustAuditTarget,
  context: ReturnType<typeof buildExploreImageMappingContext>,
  peerLookup: Map<string, Pick<TrustAuditTarget, "title" | "mealFormat">>,
): ImageAccuracyIssue[] {
  const slug = normalizeCatalogSlug(target.slug);
  const heroMd5 = context.md5BySlug.get(slug) ?? md5PublicImage(target.heroImage, context.publicRoot);
  if (!heroMd5) return [];

  const peers = (context.slugByMd5.get(heroMd5) || []).filter((peer) => peer !== slug);
  if (peers.length === 0) return [];

  const issues: ImageAccuracyIssue[] = [];
  for (const peerSlug of peers) {
    const peer = peerLookup.get(peerSlug);
    const peerTitle = peer?.title || peerSlug.replace(/-/g, " ");
    const peerMealFormat = peer?.mealFormat || target.mealFormat;
    if (
      recipesShareImageButConflict(
        slug,
        target.title,
        target.mealFormat,
        peerSlug,
        peerTitle,
        peerMealFormat,
      )
    ) {
      issues.push({
        code: "duplicate_hero_hash",
        severity: "critical",
        message: `hero bytes match conflicting recipe "${peerSlug}" (${peerTitle})`,
        confidence: 97,
      });
    }
  }

  if (issues.length === 0 && peers.length > 0) {
    issues.push({
      code: "duplicate_hero_hash",
      severity: "warning",
      message: `hero bytes shared with ${peers.length} other recipe(s): ${peers.slice(0, 4).join(", ")}${peers.length > 4 ? "…" : ""}`,
      confidence: 80,
    });
  }

  return issues;
}

export function collectCriticalHeroIssues(issues: ImageAccuracyIssue[]): ImageAccuracyIssue[] {
  return issues.filter((issue) => issue.severity === "critical");
}

export function hasHeroValidationFailure(issues: ImageAccuracyIssue[]): boolean {
  return (
    collectCriticalHeroIssues(issues).length > 0 ||
    hasMealCompletenessFailure(issues)
  );
}

export function validateHeroImageTarget(
  target: TrustAuditTarget,
  context: ReturnType<typeof buildExploreImageMappingContext>,
  peerLookup: Map<string, Pick<TrustAuditTarget, "title" | "mealFormat">>,
  publicRoot?: string,
): Omit<HeroImageValidationRow, "visionPass" | "visionSkipped" | "visionReasons" | "pass" | "criticalReasons"> {
  const slug = normalizeCatalogSlug(target.slug);
  const kind = resolveKindForHeroValidation(slug, target.collection);
  const heroAlt = (target.heroAlt || target.title).trim();
  const heroOnDisk = imageFileExists(target.heroImage, publicRoot);

  const exploreMapping = validateExploreImageMapping(
    {
      slug,
      title: target.title,
      kind,
      category: target.collection,
      mealFormat: target.mealFormat,
      heroImage: target.heroImage,
      tags: [],
    },
    context,
    { peerLookup },
  );

  const metadataIssues = [
    ...auditHeroMetadata(target),
    ...auditHeroAltAlignment(target.title, heroAlt, target.heroImage),
    ...auditCrossRecipeHeroDuplicates(target, context, peerLookup),
  ];

  return {
    slug,
    title: target.title,
    collection: target.collection,
    heroImage: target.heroImage,
    heroAlt,
    heroOnDisk,
    exploreMapping,
    metadataIssues,
  };
}

export function finalizeHeroValidationRow(
  base: Omit<
    HeroImageValidationRow,
    "visionPass" | "visionSkipped" | "visionReasons" | "pass" | "criticalReasons"
  >,
  vision: { pass: boolean | null; skipped: boolean; reasons: string[] },
): HeroImageValidationRow {
  const metadataCritical = collectCriticalHeroIssues(base.metadataIssues);
  const mappingCritical = base.exploreMapping.issues;
  const metadataBlocksSurface =
    metadataCritical.length > 0 || hasMealCompletenessFailure(base.metadataIssues) || vision.pass === false;

  const criticalReasons = [
    ...mappingCritical.map((issue) => issue.message),
    ...metadataCritical.map((issue) => issue.message),
    ...(vision.pass === false ? vision.reasons : []),
  ];

  // Recipes excluded from Explore/detail hero surfaces are already gated by mapping policy.
  const pass = base.exploreMapping.exploreEligible
    ? base.heroOnDisk && mappingCritical.length === 0 && !metadataBlocksSurface
    : true;

  return {
    ...base,
    visionPass: vision.pass,
    visionSkipped: vision.skipped,
    visionReasons: vision.reasons,
    pass,
    criticalReasons: [...new Set(criticalReasons)],
  };
}

export function buildHeroImageValidationReport(
  rows: HeroImageValidationRow[],
): HeroImageValidationReport {
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      recipes: rows.length,
      pass: rows.filter((row) => row.pass).length,
      fail: rows.filter((row) => !row.pass).length,
      missingHero: rows.filter((row) => !row.heroOnDisk).length,
      metadataFail: rows.filter((row) => hasHeroValidationFailure(row.metadataIssues)).length,
      duplicateConflict: rows.filter((row) =>
        row.metadataIssues.some((issue) => issue.code === "duplicate_hero_hash" && issue.severity === "critical"),
      ).length,
      visionFail: rows.filter((row) => row.visionPass === false).length,
      visionSkipped: rows.filter((row) => row.visionSkipped).length,
    },
    rows,
  };
}

export function loadPublishedHeroValidationTargets(): TrustAuditTarget[] {
  return loadTrustAuditTargets();
}

export function extractMealImageRequirementsForTarget(target: TrustAuditTarget) {
  return extractMealImageRequirements({
    title: target.title,
    mealFormat: target.mealFormat,
    ingredients: target.ingredients,
    tonightSpread: target.tonightSpread,
  });
}
