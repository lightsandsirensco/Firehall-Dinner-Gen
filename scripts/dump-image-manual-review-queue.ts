#!/usr/bin/env tsx
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import {
  buildCuratedMealImageProfile,
  validateCuratedImageGovernance,
} from "../shared/curated-image-governance/index.js";
import { resolveExistingSlugImage } from "../shared/explore-image-paths.js";

const MANUAL_QUEUE = [
  "pepper-smoked-brisket-flat",
  "protein-pancake-tray",
  "smoked-corned-beef",
  "burrito-bowl-bar-night",
  "cast-iron-chicken-fajitas",
  "bacon-egg-hash-skillet",
  "bacon-hash-burritos",
  "hall-sausage-biscuits-gravy",
  "ham-cheddar-egg-bake",
  "ham-pepper-skillet",
  "maple-sausage-pinwheels",
  "sausage-egg-cheese-sandwiches",
  "turkey-sausage-burritos",
  "turkey-sausage-egg-bake",
] as const;

function recommendCorrection(
  slug: string,
  title: string,
  mismatches: Array<{ code: string; message: string; severity: string }>,
): string {
  const codes = new Set(mismatches.map((m) => m.code));
  if (codes.has("path_title_conflict")) {
    return `Generate a new editorial hero via \`npm run expansion:generate-imagery -- --only=${slug}\` showing the actual plated dish for "${title}" — not a borrowed peer image whose filename implies a different meal.`;
  }
  if (codes.has("plating_mismatch")) {
    return `Replace hero with imagery that matches the meal format (plated_main vs breakfast vs bar format). Run imagery generation for \`${slug}\` with the correct shot preset.`;
  }
  if (codes.has("protein_mismatch")) {
    return `Commission/regenerate hero where the visible protein matches the recipe (${title}). Do not reuse a chicken hero for pork/beef or vice versa.`;
  }
  if (codes.has("format_mismatch")) {
    return `Swap hero for format-accurate photography (tacos vs plated, soup vs grill, etc.) using \`expansion:generate-imagery\` or catalog imagery pipeline for \`${slug}\`.`;
  }
  if (codes.has("duplicate_hero_path")) {
    return `Assign a unique hero asset for \`${slug}\`; stop sharing the same JPEG with another catalog slug. Bootstrap copy is acceptable temporarily — generate unique imagery before marketing push.`;
  }
  return `Run \`npm run expansion:generate-imagery -- --only=${slug}\` (or breakfast/hall imagery equivalent), human-review the output, and set imageApproved after visual QA.`;
}

function main() {
  const catalog = buildApprovedCatalog();
  const rows = [];

  for (const slug of MANUAL_QUEUE) {
    const entry = catalog.recipes.find((r) => r.slug === slug);
    if (!entry) {
      rows.push({ slug, error: "Not in approved catalog" });
      continue;
    }
    const img = resolveExistingSlugImage(entry.slug, entry.kind);
    const profile = buildCuratedMealImageProfile({
      slug: entry.slug,
      title: entry.title,
      protein: entry.protein ?? "any",
      cuisine: entry.cuisine ?? "american",
      mealFormat: entry.mealFormat ?? "plated_main",
    });
    const gov = validateCuratedImageGovernance({
      profile,
      heroImage: img.heroImage ?? "",
      thumbImage: img.thumbImage ?? "",
      mobileImage: img.mobileImage ?? "",
      imageApproved: true,
      publishGate: true,
    });

    rows.push({
      slug: entry.slug,
      title: entry.title,
      kind: entry.kind,
      heroImage: img.heroImage ?? "(missing)",
      thumbImage: img.thumbImage ?? "(missing)",
      mobileImage: img.mobileImage ?? "(missing)",
      mismatchConfidence: gov.mismatchConfidence,
      imageMatchConfidence: 100 - gov.mismatchConfidence,
      pass: gov.pass,
      needsManualReview: gov.needsManualReview,
      flagReasons: gov.mismatches.map((m) => ({
        code: m.code,
        severity: m.severity,
        confidence: m.confidence,
        message: m.message,
      })),
      recommendedCorrection: recommendCorrection(entry.slug, entry.title, gov.mismatches),
    });
  }

  console.log(JSON.stringify(rows, null, 2));
}

main();
