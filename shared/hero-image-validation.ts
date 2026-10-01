/**
 * Hero image validation — metadata, cross-recipe MD5 conflicts, and optional vision QA.
 * Catches wrong pixels at correct slug-locked paths (bootstrap donor copies, etc.).
 *
 * Deterministic file/metadata checks can fail a recipe. Whether the picture shows the right
 * dish is only decided by vision; title/alt wording heuristics are warnings.
 */
import fs from "node:fs";
import path from "node:path";

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
import { imageFileExists, publicImageAbsolute } from "./explore-image-paths.js";
import { normalizeCatalogSlug } from "./hall-catalog/gate.js";
import type { TrustAuditCollection } from "./curated-image-governance/trust-audit-targets.js";
import { resolveApprovedCatalogKind } from "./approved-catalog.js";
import type { ExploreCatalogImageKind } from "./explore-image-paths.js";

/** `pass`/`fail` only ever come from inspecting pixels (vision); wording never decides it. */
export type HeroSemanticStatus = "pass" | "fail" | "not_verified";

export type HeroVisionResult = { pass: boolean | null; skipped: boolean; reasons: string[] };

export type HeroImageValidationBase = {
  slug: string;
  title: string;
  collection: string;
  heroImage: string;
  /** Alt as rendered: configured heroImageAlt, else the recipe title. */
  heroAlt: string;
  heroAltConfigured: boolean;
  heroOnDisk: boolean;
  exploreMapping: ExploreImageMappingRow;
  /** Raw title/alt/path wording issues and duplicate-byte issues. */
  metadataIssues: ImageAccuracyIssue[];
  /** Deterministic: malformed path, missing/empty/non-image file. */
  fileFailures: string[];
  /** Deterministic: empty/placeholder alt, alt contradicting the title's protein/dish. */
  metadataFailures: string[];
  /** Deterministic but non-blocking metadata quality notes. */
  metadataWarnings: string[];
};

export type HeroImageValidationRow = HeroImageValidationBase & {
  /** Title/alt/path wording heuristics — possible mismatch signals, never failures on their own. */
  semanticWarnings: string[];
  semanticStatus: HeroSemanticStatus;
  /** Vision fail reasons, or why semantic correctness was not verified. */
  semanticReasons: string[];
  hardFailures: string[];
  /** Image bytes are missing/invalid, conflict with another recipe, or vision saw the wrong dish. */
  needsNewImage: boolean;
  pass: boolean;
};

export type HeroImageValidationReport = {
  generatedAt: string;
  totals: {
    recipes: number;
    pass: number;
    fail: number;
    fileFailures: number;
    metadataFailures: number;
    missingHero: number;
    duplicateConflict: number;
    metadataWarnings: number;
    semanticWarnings: number;
    semanticPass: number;
    semanticFail: number;
    semanticNotVerified: number;
    needsNewImage: number;
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
    // "parm" is the dish shorthand; "parmesan" alone is usually the cheese on top.
    const altClaimsOther =
      (label !== "chicken" && /\bchicken\b|\bparm\b|\bparmigiana\b/i.test(altBlob)) ||
      (label !== "tuna" && /\btuna\b/i.test(altBlob) && !re.test(altBlob)) ||
      (label === "tuna" && /\b(chicken|parm|parmigiana|beef|pork)\b/i.test(altBlob));
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

const HERO_PATH_SHAPE = /^\/images\/[A-Za-z0-9/_.-]+\.(jpe?g|png|webp)$/i;

function sniffImageFormat(head: Buffer): "jpg" | "png" | "webp" | null {
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "jpg";
  if (head.subarray(0, 4).toString("hex") === "89504e47") return "png";
  if (head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

function readHead(abs: string): Buffer {
  const fd = fs.openSync(abs, "r");
  try {
    const head = Buffer.alloc(12);
    fs.readSync(fd, head, 0, 12, 0);
    return head;
  } finally {
    fs.closeSync(fd);
  }
}

/** Hard failures about the configured hero file itself. Format is sniffed from bytes, not the extension. */
export function auditHeroFile(heroImage: string, publicRoot?: string): string[] {
  const trimmed = (heroImage || "").trim();
  if (!trimmed) return ["hero image path is empty"];
  if (!HERO_PATH_SHAPE.test(trimmed) || trimmed.includes("..")) return [`hero image path is malformed: "${trimmed}"`];
  if (!imageFileExists(trimmed, publicRoot)) return ["hero image file missing"];

  const abs = publicImageAbsolute(trimmed, publicRoot);
  if (fs.statSync(abs).size === 0) return ["hero image file is empty (0 bytes)"];
  return sniffImageFormat(readHead(abs)) ? [] : ["hero image file is not a valid JPEG, PNG or WebP image"];
}

/** Browsers still render a mismatched file, so this is a warning; the fix is a re-encode, not a new image. */
export function auditHeroFileFormat(heroImage: string, publicRoot?: string): string[] {
  const trimmed = (heroImage || "").trim();
  if (!HERO_PATH_SHAPE.test(trimmed) || !imageFileExists(trimmed, publicRoot)) return [];
  const abs = publicImageAbsolute(trimmed, publicRoot);
  if (fs.statSync(abs).size === 0) return [];
  const actual = sniffImageFormat(readHead(abs));
  const declared = path.extname(trimmed).slice(1).toLowerCase().replace("jpeg", "jpg");
  if (!actual || actual === declared) return [];
  return [`hero .${declared} file contains ${actual.toUpperCase()} data (re-encode: npm run images:fix-jpeg-format)`];
}

export const TEMPLATE_ALT =
  /plated for a firehall crew|on a (?:station|crew) prep table|crew-sized BBQ spread with visible smoke and bark|^Wide (?:firehall|baking dish)\b/i;

const PLACEHOLDER_ALT = /^(image|photo|picture|hero|hero image|placeholder|alt|alt text|untitled|undefined|null|none|todo|tbd|\[object object\])$/i;

/** Deterministic alt-text checks. Wording that merely lacks title tokens is not checked here. */
export function auditHeroAltText(input: {
  configuredAlt?: string;
  title: string;
  slug: string;
  heroImage: string;
}): { failures: string[]; warnings: string[] } {
  const configured = (input.configuredAlt ?? "").trim();
  const effective = configured || input.title.trim();
  const failures: string[] = [];
  const warnings: string[] = [];

  const fileStem = path.basename(input.heroImage).replace(/\.[a-z0-9]+$/i, "");
  if (!effective) failures.push("hero alt text is empty (no heroImageAlt and no title)");
  else if (PLACEHOLDER_ALT.test(effective) || effective === input.slug || effective === fileStem) {
    failures.push(`hero alt text is a placeholder: "${effective}"`);
  }

  if (!configured && effective) warnings.push("no heroImageAlt configured — alt falls back to the recipe title");
  const token = /\b[a-z]+_[a-z]+\b/.exec(configured)?.[0];
  if (token) warnings.push(`hero alt text contains internal taxonomy token "${token}"`);
  const template = TEMPLATE_ALT.exec(configured)?.[0];
  if (template) warnings.push(`hero alt text contains image-prompt template wording "${template}"`);

  return { failures, warnings };
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

/** Issues backed by image bytes rather than title/alt/path wording. */
function isByteEvidenceIssue(issue: ImageAccuracyIssue): boolean {
  return issue.code === "duplicate_hero_hash";
}

/** Title/alt/path wording issues — signals of a possible mismatch, never proof. */
export function collectHeuristicHeroIssues(issues: ImageAccuracyIssue[]): ImageAccuracyIssue[] {
  return issues.filter((issue) => !isByteEvidenceIssue(issue));
}

export function validateHeroImageTarget(
  target: TrustAuditTarget,
  context: ReturnType<typeof buildExploreImageMappingContext>,
  peerLookup: Map<string, Pick<TrustAuditTarget, "title" | "mealFormat">>,
  publicRoot?: string,
): HeroImageValidationBase {
  const slug = normalizeCatalogSlug(target.slug);
  const kind = resolveKindForHeroValidation(slug, target.collection);
  const heroAlt = (target.heroAlt || target.title).trim();
  const fileFailures = auditHeroFile(target.heroImage, publicRoot);
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

  const alt = auditHeroAltText({
    configuredAlt: target.heroAlt,
    title: target.title,
    slug,
    heroImage: target.heroImage,
  });
  const altContradictions = auditHeroAltAlignment(target.title, heroAlt, target.heroImage);
  const duplicates = auditCrossRecipeHeroDuplicates(target, context, peerLookup);

  return {
    slug,
    title: target.title,
    collection: target.collection,
    heroImage: target.heroImage,
    heroAlt,
    heroAltConfigured: Boolean(target.heroAlt?.trim()),
    heroOnDisk,
    exploreMapping,
    metadataIssues: [...auditHeroMetadata(target), ...duplicates],
    fileFailures,
    metadataFailures: [...alt.failures, ...altContradictions.map((issue) => issue.message)],
    metadataWarnings: [
      ...auditHeroFileFormat(target.heroImage, publicRoot),
      ...alt.warnings,
      ...duplicates.filter((issue) => issue.severity !== "critical").map((issue) => issue.message),
    ],
  };
}

function semanticVerdict(vision: HeroVisionResult): { status: HeroSemanticStatus; reasons: string[] } {
  if (vision.pass === true) return { status: "pass", reasons: [] };
  if (vision.pass === false) {
    return { status: "fail", reasons: vision.reasons.length ? vision.reasons : ["vision: image does not match recipe"] };
  }
  const why = vision.reasons.filter(Boolean);
  return { status: "not_verified", reasons: why.length ? why : ["vision check not run"] };
}

export function finalizeHeroValidationRow(
  base: HeroImageValidationBase,
  vision: HeroVisionResult,
): HeroImageValidationRow {
  const byteConflicts = base.metadataIssues
    .filter((issue) => isByteEvidenceIssue(issue) && issue.severity === "critical")
    .map((issue) => issue.message);
  const mappingFailures = base.exploreMapping.issues.map((issue) => issue.message);
  const semantic = semanticVerdict(vision);

  // Mapping/duplicate issues on recipes excluded from Explore are already gated by mapping
  // policy; file and alt failures apply either way.
  const surfaceFailures = base.exploreMapping.exploreEligible ? [...mappingFailures, ...byteConflicts] : [];
  const hardFailures = [
    ...base.fileFailures,
    ...base.metadataFailures,
    ...surfaceFailures,
    ...(semantic.status === "fail" ? semantic.reasons.map((reason) => `vision: ${reason}`) : []),
  ];

  // A vision pass is direct evidence the picture is right, so wording heuristics are moot.
  const semanticWarnings =
    semantic.status === "pass" ? [] : collectHeuristicHeroIssues(base.metadataIssues).map((issue) => issue.message);

  return {
    ...base,
    semanticWarnings: [...new Set(semanticWarnings)],
    semanticStatus: semantic.status,
    semanticReasons: semantic.reasons,
    hardFailures: [...new Set(hardFailures)],
    needsNewImage: base.fileFailures.length > 0 || byteConflicts.length > 0 || semantic.status === "fail",
    pass: hardFailures.length === 0,
  };
}

export function buildHeroImageValidationReport(
  rows: HeroImageValidationRow[],
): HeroImageValidationReport {
  const count = (pred: (row: HeroImageValidationRow) => boolean) => rows.filter(pred).length;
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      recipes: rows.length,
      pass: count((row) => row.pass),
      fail: count((row) => !row.pass),
      fileFailures: count((row) => row.fileFailures.length > 0),
      metadataFailures: count((row) => row.metadataFailures.length > 0),
      missingHero: count((row) => !row.heroOnDisk),
      duplicateConflict: count((row) =>
        row.metadataIssues.some((issue) => issue.code === "duplicate_hero_hash" && issue.severity === "critical"),
      ),
      metadataWarnings: count((row) => row.metadataWarnings.length > 0),
      semanticWarnings: count((row) => row.semanticWarnings.length > 0),
      semanticPass: count((row) => row.semanticStatus === "pass"),
      semanticFail: count((row) => row.semanticStatus === "fail"),
      semanticNotVerified: count((row) => row.semanticStatus === "not_verified"),
      needsNewImage: count((row) => row.needsNewImage),
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
