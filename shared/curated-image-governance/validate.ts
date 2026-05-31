import { heroPathConflictsTitle } from "../meal-image-title-match.js";
import { titleClaimsTacos } from "../meal-format-contract.js";
import { validateRedLeadImageRef } from "./red-lead-rules.js";
import { validateServingStyleImageMatch } from "./serving-style-rules.js";
import {
  inferPlatingTypeFromHeroPath,
  platingTypesConflict,
} from "../plating-type.js";import { isFirehallOwnedHeroUrl } from "../food-imagery/paths.js";
import { inferTagsFromImageRef } from "./infer-tags.js";
import { profileAllowsSignal } from "./profile.js";
import type {
  CuratedImageGovernanceInput,
  CuratedImageGovernanceResult,
  ImageGovernanceMismatch,
} from "./types.js";
import { IMAGE_GOVERNANCE_BUILD_FAIL_THRESHOLD } from "./types.js";
import { auditTitlePrimarySideAlignment } from "./title-primary-side-rules.js";

function mismatch(
  code: ImageGovernanceMismatch["code"],
  severity: ImageGovernanceMismatch["severity"],
  message: string,
  confidence: number,
  field?: ImageGovernanceMismatch["field"],
): ImageGovernanceMismatch {
  return { code, severity, message, confidence, field };
}

function isExternalUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  if (/^https?:\/\//i.test(u)) return !isFirehallOwnedHeroUrl(u);
  return false;
}

function proteinCompatible(
  recipeProtein: string,
  imageProteins: string[],
  title = "",
): boolean {
  let want = recipeProtein.toLowerCase();
  if (!want || want === "any" || want === "pantry") return true;
  if (imageProteins.length === 0) return true;
  if (want === "salmon") want = "fish";

  const compatible: Record<string, string[]> = {
    chicken: ["chicken", "turkey"],
    beef: ["beef"],
    pork: ["pork"],
    turkey: ["turkey", "chicken"],
    fish: ["fish", "shrimp", "salmon"],
    seafood: ["shrimp", "fish", "salmon"],
    vegetarian: ["vegetarian"],
  };

  const allowed = compatible[want] || [want];
  if (imageProteins.some((p) => allowed.includes(p))) return true;
  if (want === "beef" && imageProteins.includes("pork") && /\bsausage\b/i.test(title)) {
    return true;
  }
  return false;
}

export function validateCuratedImageGovernance(
  input: CuratedImageGovernanceInput,
): CuratedImageGovernanceResult {
  const mismatches: ImageGovernanceMismatch[] = [];
  let mismatchConfidence = 0;

  const { profile } = input;
  const slugTitleConflict =
    /taco|burrito|nacho|fajita/i.test(profile.slug) &&
    /\b(plate|plated|platter)\b/i.test(profile.title) &&
    !titleClaimsTacos(profile.title) &&
    !/\b(enchilada|quesadilla|burrito|fajita|nacho)\b/i.test(profile.title);

  const hero = (input.heroImage || "").trim();
  const thumb = (input.thumbImage || "").trim();
  const mobile = (input.mobileImage || "").trim();
  const publishGate = Boolean(input.publishGate);

  if (slugTitleConflict) {
    mismatches.push(
      mismatch(
        "path_title_conflict",
        "critical",
        "slug implies handheld/taco meal but title implies plated — wrong catalog pairing",
        95,
        "bundle",
      ),
    );
    mismatchConfidence = Math.max(mismatchConfidence, 95);
  }

  if (!hero) {
    mismatches.push(
      mismatch(
        "missing_locked_hero",
        publishGate ? "critical" : "warning",
        "no hero image — manual review or regenerate required",
        publishGate ? 90 : 40,
        "hero",
      ),
    );
    mismatchConfidence = Math.max(mismatchConfidence, publishGate ? 90 : 40);
  }

  if (publishGate && !thumb) {
    mismatches.push(
      mismatch("missing_locked_thumb", "warning", "missing thumbnail image", 35, "thumb"),
    );
    mismatchConfidence = Math.max(mismatchConfidence, 35);
  }

  if (publishGate && !mobile) {
    mismatches.push(
      mismatch("missing_locked_mobile", "warning", "missing mobile crop image", 30, "mobile"),
    );
    mismatchConfidence = Math.max(mismatchConfidence, 30);
  }

  if (hero && isExternalUrl(hero)) {
    mismatches.push(
      mismatch(
        "external_image_forbidden",
        "critical",
        "external URL heroes are not allowed for curated meals",
        95,
        "hero",
      ),
    );
    mismatchConfidence = Math.max(mismatchConfidence, 95);
  }

  if (input.imageApproved === false && publishGate && hero.startsWith("/images/")) {
    mismatches.push(
      mismatch(
        "unapproved_image",
        "warning",
        "image not marked approved — treat as manual review",
        45,
        "bundle",
      ),
    );
    mismatchConfidence = Math.max(mismatchConfidence, 45);
  }

  const tags = inferTagsFromImageRef(hero, input.heroAlt || profile.title, "");

  if (tags.stockPhotoHeuristic) {
    mismatches.push(
      mismatch(
        "stock_photo_heuristic",
        "warning",
        "image path/metadata resembles stock photography",
        55,
        "hero",
      ),
    );
    mismatchConfidence = Math.max(mismatchConfidence, 55);
  }

  if (tags.overZoomHeuristic) {
    mismatches.push(
      mismatch(
        "over_zoom_heuristic",
        "info",
        "image metadata suggests extreme close-up framing",
        25,
        "hero",
      ),
    );
  }

  if (hero && heroPathConflictsTitle(hero, profile.title, profile.mealFormat)) {
    mismatches.push(
      mismatch(
        "path_title_conflict",
        "critical",
        `hero path conflicts with meal title/format (${profile.title})`,
        88,
        "hero",
      ),
    );
    mismatchConfidence = Math.max(mismatchConfidence, 88);
  }

  const redLeadRule = validateRedLeadImageRef(profile.title, hero, input.heroAlt || "");
  if (!redLeadRule.ok && redLeadRule.forbidden) {
    mismatches.push(
      mismatch("format_mismatch", "critical", redLeadRule.forbidden, 96, "hero"),
    );
    mismatchConfidence = Math.max(mismatchConfidence, 96);
  } else if (!redLeadRule.ok && redLeadRule.missingRequired) {
    mismatches.push(
      mismatch("format_mismatch", "critical", redLeadRule.missingRequired, 94, "hero"),
    );
    mismatchConfidence = Math.max(mismatchConfidence, 94);
  }

  const depictedPlating = hero ? inferPlatingTypeFromHeroPath(hero, input.heroAlt || profile.title) : null;
  if (
    depictedPlating &&
    platingTypesConflict(profile.platingType, depictedPlating)
  ) {
    mismatches.push(
      mismatch(
        "plating_mismatch",
        "critical",
        `hero depicts ${depictedPlating} but meal requires ${profile.platingType} (${profile.title})`,
        92,
        "hero",
      ),
    );
    mismatchConfidence = Math.max(mismatchConfidence, 92);
  }
  for (const signal of tags.signals) {
    if (signal === "generic") continue;
    // Only evaluate known meal-visual signals (not shot-preset ids).
    const known = new Set([
      "taco",
      "burger",
      "pasta",
      "pizza",
      "bowl",
      "skillet",
      "stir_fry",
      "soup",
      "sandwich",
      "salad",
      "sheet_pan",
      "grill",
      "breakfast",
    ]);
    if (!known.has(signal)) continue;
    if (profile.visualSignals.has(signal)) continue;
    if (!profileAllowsSignal(profile, signal)) {
      mismatches.push(
        mismatch(
          "format_mismatch",
          "critical",
          `image depicts ${signal} but meal is ${profile.shotCategory} (${profile.title})`,
          82,
          "hero",
        ),
      );
      mismatchConfidence = Math.max(mismatchConfidence, 82);
    }
  }

  if (!proteinCompatible(profile.protein, tags.proteins, profile.title) && tags.proteins.length > 0) {
    mismatches.push(
      mismatch(
        "protein_mismatch",
        "critical",
        `image protein cues (${tags.proteins.join(", ")}) do not match ${profile.protein}`,
        90,
        "hero",
      ),
    );
    mismatchConfidence = Math.max(mismatchConfidence, 90);
  }

  for (const servingMismatch of validateServingStyleImageMatch({
    profile,
    heroImage: hero,
    heroAlt: input.heroAlt,
    tags,
  })) {
    mismatches.push({ ...servingMismatch, field: "hero" });
    mismatchConfidence = Math.max(mismatchConfidence, servingMismatch.confidence);
  }

  for (const sideIssue of auditTitlePrimarySideAlignment({
    slug: profile.slug,
    title: profile.title,
    mealFormat: profile.mealFormat,
    heroPath: hero,
    heroAlt: input.heroAlt || profile.title,
  })) {
    const govCode =
      sideIssue.message.includes("donor")
        ? ("donor_image_forbidden" as const)
        : sideIssue.message.includes("generic bowl")
          ? ("generic_substitute_meal" as const)
          : ("image_title_mismatch" as const);
    mismatches.push(
      mismatch(govCode, "critical", sideIssue.message, sideIssue.confidence, "hero"),
    );
    mismatchConfidence = Math.max(mismatchConfidence, sideIssue.confidence);
  }

  const titleDominant = [...profile.visualSignals].find((s) => s !== "generic");
  if (
    !titleDominant &&
    /\b(beef|chicken|pork|turkey|fish|shrimp)\b/i.test(profile.title) &&
    tags.signals.includes("taco") &&
    !/\btaco|burrito|nacho\b/i.test(profile.title)
  ) {
    mismatches.push(
      mismatch(
        "format_mismatch",
        "critical",
        "taco imagery for a non-taco plated meal title",
        92,
        "hero",
      ),
    );
    mismatchConfidence = Math.max(mismatchConfidence, 92);
  }

  const criticalCount = mismatches.filter((m) => m.severity === "critical").length;
  const needsManualReview =
    !hero ||
    criticalCount > 0 ||
    mismatchConfidence >= IMAGE_GOVERNANCE_BUILD_FAIL_THRESHOLD ||
    input.imageApproved === false;

  const pass =
    mismatchConfidence < IMAGE_GOVERNANCE_BUILD_FAIL_THRESHOLD &&
    criticalCount === 0 &&
    Boolean(hero) &&
    !isExternalUrl(hero);

  return {
    pass,
    mismatchConfidence,
    mismatches,
    needsManualReview,
    inferredImageSignals: tags.signals,
  };
}

/** Hard failures for CI — trust-breaking mismatches only (not missing-file warnings). */
export function governanceFailsBuild(result: CuratedImageGovernanceResult): boolean {
  const hard = result.mismatches.filter(
    (m) =>
      m.severity === "critical" &&
      (m.code === "path_title_conflict" ||
        m.code === "plating_mismatch" ||
        m.code === "protein_mismatch" ||        m.code === "external_image_forbidden" ||
        (m.code === "format_mismatch" &&
          /taco|burrito|nacho|burger|pasta|soup|shrimp|beef|chicken/i.test(m.message)) ||
        m.code === "image_title_mismatch" ||
        m.code === "donor_image_forbidden" ||
        m.code === "generic_substitute_meal"),
  );
  return hard.length > 0;
}
