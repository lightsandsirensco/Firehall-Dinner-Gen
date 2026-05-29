#!/usr/bin/env tsx
import { buildCuratedMealImageProfile, validateCuratedImageGovernance } from "../shared/curated-image-governance/index.js";
import { goldenPageImageSet } from "../shared/golden-100/recipe-page-paths.js";
import {
  allowedHeroSignals,
  heroPathConflictsTitle,
  inferVisualSignalsFromImagePath,
  inferVisualSignalsFromTitle,
} from "../shared/meal-image-title-match.js";

const cases = [
  ["turkey-taco-skillet", "Turkey Taco Skillet", "turkey", "skillet"],
  ["enchilada-casserole", "Chicken Enchilada Casserole", "chicken", "plated_main"],
  ["instant-pot-chicken-tacos", "Instant Pot Chicken Tacos", "chicken", "plated_main"],
  ["smoky-chicken-tacos", "Smokey Chicken Tacos", "chicken", "plated_main"],
  [
    "enchilada-stuffed-spaghetti-squash",
    "Enchilada Stuffed Spaghetti Squash",
    "chicken",
    "plated_main",
  ],
] as const;

for (const [slug, title, protein, fmt] of cases) {
  const p = goldenPageImageSet(slug);
  const prof = buildCuratedMealImageProfile({ slug, title, protein, mealFormat: fmt });
  const r = validateCuratedImageGovernance({
    profile: prof,
    heroImage: p.heroImage,
    thumbImage: p.thumbImage,
    mobileImage: p.mobileImage,
    imageApproved: true,
    publishGate: true,
  });
  const allowed = [...allowedHeroSignals(title, fmt)];
  const pathSig = [...inferVisualSignalsFromImagePath(p.heroImage, title)];
  const titleSig = [...inferVisualSignalsFromTitle(title, fmt)];
  const blob = `${p.heroImage} ${title}`.toLowerCase();
  console.log(slug, {
    skilletInBlob: /skillet|one-pan|one_pan/.test(blob),
    conflict: heroPathConflictsTitle(p.heroImage, title, fmt),
    pass: r.pass,
    allowed,
    pathSig,
    titleSig,
    mismatches: r.mismatches.map((m) => m.code),
  });
}
