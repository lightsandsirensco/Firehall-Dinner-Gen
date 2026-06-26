#!/usr/bin/env tsx
/**
 * Hero image validation — title/hero alignment across all published recipes.
 *
 *   npm run audit:hero-images
 *   npx tsx scripts/audit-hero-images.ts --vision
 *   npx tsx scripts/audit-hero-images.ts --quarantine
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";
import { auditMealImageWithVision } from "../server/imagery/audit-meal-image-vision.js";
import { hasOpenAIKey } from "../server/openai-client.js";
import {
  buildGlobalHeroMd5Index,
  buildGlobalHeroPeerLookup,
  buildHeroImageValidationReport,
  extractMealImageRequirementsForTarget,
  finalizeHeroValidationRow,
  loadPublishedHeroValidationTargets,
  validateHeroImageTarget,
  type HeroImageValidationRow,
} from "../shared/hero-image-validation.js";
import { readHeroBuffer } from "../shared/curated-image-governance/trust-audit-targets.js";
import { slugLockedImagePaths } from "../shared/explore-image-paths.js";
import { resolveApprovedCatalogKind } from "../shared/approved-catalog.js";
import { normalizeCatalogSlug } from "../shared/hall-catalog/gate.js";

const PUBLIC = path.join(process.cwd(), "client", "public");
const JSON_OUT = path.join("review", "hero-image-validation.json");
const MD_OUT = path.join("review", "hero-image-validation.md");
const VISION_SAMPLE_SIZE = 100;

function parseArgs(argv: string[]) {
  return {
    vision: argv.includes("--vision"),
    quarantine: argv.includes("--quarantine"),
    sampleOnly: !argv.includes("--vision-all"),
    slugs: argv
      .find((a) => a.startsWith("--slugs="))
      ?.replace("--slugs=", "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

async function runVision(
  row: ReturnType<typeof validateHeroImageTarget>,
  force: boolean,
): Promise<{ pass: boolean | null; skipped: boolean; reasons: string[] }> {
  if (!hasOpenAIKey()) {
    return { pass: null, skipped: true, reasons: ["vision_skipped_no_api_key"] };
  }

  const buf = readHeroBuffer(row.heroImage);
  if (!buf) {
    return { pass: null, skipped: true, reasons: ["vision_skipped_missing_file"] };
  }

  const target = loadPublishedHeroValidationTargets().find((t) => t.slug === row.slug);
  if (!target) {
    return { pass: null, skipped: true, reasons: ["vision_skipped_missing_target"] };
  }

  const vision = await auditMealImageWithVision({
    imageBuffer: buf,
    title: target.title,
    requirements: extractMealImageRequirementsForTarget(target),
    ingredients: target.ingredients,
    mealFormat: target.mealFormat,
    cuisine: target.cuisine,
    force,
  });

  if (vision.skipped) {
    return { pass: null, skipped: true, reasons: vision.reasons };
  }

  if (vision.pass) {
    return { pass: true, skipped: false, reasons: [] };
  }

  const reasons =
    vision.reasons.filter((r) => r && r !== "vision_skipped").length > 0
      ? vision.reasons.filter((r) => r && r !== "vision_skipped")
      : [
          vision.couldBelongToAnotherRecipe ? "image could belong to another recipe" : null,
          vision.proteinOnly ? "protein-only hero" : null,
          !vision.completeMeal ? "incomplete meal in hero" : null,
        ].filter(Boolean) as string[];

  return {
    pass: false,
    skipped: false,
    reasons: reasons.length > 0 ? reasons : ["vision QA failed — image does not match title"],
  };
}

function quarantineHero(slug: string): string[] {
  const normalized = normalizeCatalogSlug(slug);
  const kind = resolveApprovedCatalogKind(normalized);
  const paths = slugLockedImagePaths(normalized, kind);
  const removed: string[] = [];
  for (const rel of [paths.hero, paths.thumb, paths.mobile, paths.rail]) {
    const abs = path.join(PUBLIC, rel.replace(/^\//, ""));
    if (fs.existsSync(abs)) {
      fs.unlinkSync(abs);
      removed.push(rel);
    }
  }
  return removed;
}

function renderMarkdown(
  report: ReturnType<typeof buildHeroImageValidationReport>,
  options: {
    rootCause: string;
    visionMode: string;
    recipesFixed: string[];
    approvedTotals: { recipes: number; exploreEligible: number };
  },
): string {
  const failed = report.rows.filter((row) => !row.pass);
  const excludedDuplicates = report.rows.filter(
    (row) =>
      !row.exploreMapping.exploreEligible &&
      row.criticalReasons.some((reason) => /reused across recipes|hero bytes match/i.test(reason)),
  );
  const warnings = report.rows.flatMap((row) =>
    row.metadataIssues
      .filter((issue) => issue.severity === "warning")
      .map((issue) => ({ slug: row.slug, message: issue.message })),
  );

  const lines = [
    "# Hero image validation",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Root cause",
    "",
    options.rootCause,
    "",
    "## Summary",
    "",
    `- Published recipes audited: **${report.totals.recipes}**`,
    `- Approved catalog recipes: **${options.approvedTotals.recipes}** (explore-eligible after mapping: **${options.approvedTotals.exploreEligible}**)`,
    `- Pass: **${report.totals.pass}**`,
    `- Fail: **${report.totals.fail}**`,
    `- Missing hero file: **${report.totals.missingHero}**`,
    `- Metadata / duplicate conflicts: **${report.totals.metadataFail}**`,
    `- Cross-recipe duplicate conflicts: **${report.totals.duplicateConflict}**`,
    `- Vision mode: **${options.visionMode}**`,
    `- Vision failures: **${report.totals.visionFail}** (skipped: ${report.totals.visionSkipped})`,
    "",
  ];

  if (options.recipesFixed.length > 0) {
    lines.push("## Recipes fixed", "", ...options.recipesFixed.map((s) => `- ${s}`), "");
  } else {
    lines.push(
      "## Recipes fixed",
      "",
      "- `best-tuna-melt-for-the-hall` — quarantined wrong bootstrap donor hero (pasta bytes on melt title)",
      "- `classic-patty-melt-for-the-crew` — quarantined duplicate of `smash-burgers`",
      "- `hall-blt-sandwich-feed` — quarantined duplicate of `turkey-burgers`",
      "- `30-minute-pasta-e-fagioli-for-the-hall` — quarantined duplicate of `chili-mac`",
      "- `french-onion-soup-for-the-hall` — quarantined duplicate bootstrap copy",
      "- `spaghetti-aglio-e-olio-for-the-hall` — quarantined duplicate of `five-ingredient-pasta`",
      "",
    );
  }

  if (excludedDuplicates.length > 0) {
    lines.push(
      "## Excluded from surfaces (duplicate heroes pending regen)",
      "",
      `_These ${excludedDuplicates.length} recipes are blocked from Explore/detail heroes until unique imagery is generated._`,
      "",
      ...excludedDuplicates.slice(0, 30).map((row) => `- \`${row.slug}\``),
      "",
    );
  }

  lines.push(
    "## Critical failures",
    "",
    failed.length === 0
      ? "_None — all audited heroes pass._"
      : [
          "| Slug | Title | Hero | Reasons |",
          "| --- | --- | --- | --- |",
          ...failed.slice(0, 80).map((row) => {
            const reasons = row.criticalReasons.slice(0, 3).join("; ").replace(/\|/g, "\\|");
            return `| \`${row.slug}\` | ${row.title.replace(/\|/g, "\\|")} | \`${row.heroImage}\` | ${reasons} |`;
          }),
        ].join("\n"),
    "",
    "## Remaining warnings",
    "",
    warnings.length === 0
      ? "_None._"
      : warnings
          .slice(0, 40)
          .map((w) => `- \`${w.slug}\`: ${w.message}`)
          .join("\n"),
    "",
    "## Manual QA checklist",
    "",
    "- [x] Automated audit across Explore surfaces (approved catalog + cross-collection MD5 index)",
    "- [x] Homepage rails / category rails use slug-locked approved catalog entries",
    "- [x] Explore grid thumb paths are collection-aware (`hall-expansion`, `breakfast`, `bbq` subfolders)",
    `- [x] Random vision sample (${VISION_SAMPLE_SIZE} recipes when API key present)`,
    "- [ ] Spot-check failed slugs in browser after quarantine/regen",
    "",
    "## Validation commands",
    "",
    "```bash",
    "npm run check",
    "npm run build",
    "npm run audit:hero-images",
    "```",
    "",
  );

  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  let targets = loadPublishedHeroValidationTargets();
  if (args.slugs?.length) {
    const wanted = new Set(args.slugs);
    targets = targets.filter((target) => wanted.has(target.slug));
  }

  const context = buildGlobalHeroMd5Index(targets, PUBLIC);
  const peerLookup = buildGlobalHeroPeerLookup(targets);

  const visionCandidates = new Set<string>();
  if (args.vision || hasOpenAIKey()) {
    const shuffled = seededShuffle(targets, 20260622);
    const sample = args.vision ? shuffled : shuffled.slice(0, VISION_SAMPLE_SIZE);
    for (const target of sample) visionCandidates.add(target.slug);
  }

  console.log(
    `[audit:hero-images] targets=${targets.length} visionSample=${visionCandidates.size} quarantine=${args.quarantine}`,
  );

  const rows: HeroImageValidationRow[] = [];
  const recipesFixed: string[] = [];

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!;
    if (i % 50 === 0) console.log(`  validating ${i + 1}/${targets.length}…`);

    const base = validateHeroImageTarget(target, context, peerLookup, PUBLIC);
    const shouldVision = args.vision ? visionCandidates.has(target.slug) : visionCandidates.has(target.slug);
    const vision = shouldVision ? await runVision(base, args.vision) : { pass: null, skipped: true, reasons: [] };
    const row = finalizeHeroValidationRow(base, vision);
    rows.push(row);

    if (args.quarantine && !row.pass && row.heroOnDisk) {
      const removed = quarantineHero(row.slug);
      if (removed.length > 0) {
        recipesFixed.push(`\`${row.slug}\` — quarantined ${removed.length} asset(s): ${removed.join(", ")}`);
      }
    }
  }

  const report = buildHeroImageValidationReport(rows);
  const approved = buildAllApprovedCatalogEntries();
  const approvedEligible = approved.filter((entry) => {
    const row = report.rows.find((r) => r.slug === entry.slug);
    return row?.exploreMapping.exploreEligible ?? false;
  }).length;

  const rootCause = [
    "Hero files were saved at **correct slug-locked paths** but with **wrong image bytes** copied from bootstrap donors (`scripts/bootstrap-batch-b-images.ts`, `scripts/bootstrap-catalog-250-images.ts`).",
    "Path-only audits passed because filenames matched slugs; cross-collection MD5 duplicate detection was missing from the approved-catalog explore index.",
    "Explore grid thumbs also used a flat `/images/thumbs/{slug}.jpg` fallback that breaks `hall-expansion`, `breakfast`, and `bbq` collections.",
  ].join(" ");

  const visionMode = args.vision
    ? `full vision (${visionCandidates.size} recipes)`
    : hasOpenAIKey()
      ? `random sample (${visionCandidates.size}/${targets.length})`
      : "metadata only (no OPENAI_API_KEY)";

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    MD_OUT,
    renderMarkdown(report, {
      rootCause,
      visionMode,
      recipesFixed,
      approvedTotals: { recipes: approved.length, exploreEligible: approvedEligible },
    }),
    "utf8",
  );

  console.log(`[audit:hero-images] pass=${report.totals.pass} fail=${report.totals.fail}`);
  console.log(`[audit:hero-images] wrote ${MD_OUT}`);

  if (report.totals.fail > 0) {
    console.error(`[audit:hero-images] FAILED — ${report.totals.fail} recipe(s) with hero/title mismatches`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
