#!/usr/bin/env tsx
/**
 * Hero image validation across all published recipes.
 *
 * Hard failures: missing/broken/invalid hero files, empty/placeholder/contradictory alt text,
 * conflicting duplicate bytes, mapping errors, and vision-confirmed wrong dishes.
 * Title/alt wording heuristics are warnings. Without --vision, semantic status is "not verified".
 *
 *   npm run audit:hero-images
 *   npx tsx scripts/audit-hero-images.ts --vision                # inspect every hero
 *   npx tsx scripts/audit-hero-images.ts --vision-sample=100     # sample + heuristic-flagged
 *   npx tsx scripts/audit-hero-images.ts --quarantine            # delete heroes that need new images
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";
import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";
import { createOpenAIClient, hasOpenAIKey } from "../server/openai-client.js";
import {
  accuracyStatus,
  inspectRecipeImage,
  recipeFidelity,
  type QaRecipe,
  type VisionVerdict,
} from "../server/imagery/recipe-image-qa.js";
import {
  buildGlobalHeroMd5Index,
  buildGlobalHeroPeerLookup,
  buildHeroImageValidationReport,
  collectHeuristicHeroIssues,
  finalizeHeroValidationRow,
  loadPublishedHeroValidationTargets,
  validateHeroImageTarget,
  type HeroImageValidationBase,
  type HeroImageValidationRow,
  type HeroVisionResult,
} from "../shared/hero-image-validation.js";
import {
  readHeroBuffer,
  type TrustAuditCollection,
  type TrustAuditTarget,
} from "../shared/curated-image-governance/trust-audit-targets.js";
import { slugLockedImagePaths } from "../shared/explore-image-paths.js";
import { resolveApprovedCatalogKind } from "../shared/approved-catalog.js";
import { normalizeCatalogSlug } from "../shared/hall-catalog/gate.js";
import { writeFileAtomicSync } from "../server/lib/write-file-atomic.js";

const PUBLIC = path.join(process.cwd(), "client", "public");
const JSON_OUT = path.join("review", "hero-image-validation.json");
const MD_OUT = path.join("review", "hero-image-validation.md");

function parseArgs(argv: string[]) {
  const sample = Number(argv.find((a) => a.startsWith("--vision-sample="))?.split("=")[1]);
  return {
    vision: argv.includes("--vision"),
    visionSample: Number.isFinite(sample) && sample > 0 ? sample : 0,
    quarantine: argv.includes("--quarantine"),
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

const VISION_NOT_REQUESTED: HeroVisionResult = {
  pass: null,
  skipped: true,
  reasons: ["vision check not run (pass --vision to verify the picture)"],
};

const CATALOG_DIR: Record<TrustAuditCollection, string> = {
  golden_100: "golden-100",
  performance_meals: "performance-meals",
  hall_expansion: "hall-expansion",
  breakfast: "breakfast",
  pizza_night: "pizza-night",
  smoothies: "smoothies",
};

function loadQaRecipe(target: TrustAuditTarget): QaRecipe {
  const pagePath = path.join(PUBLIC, "catalog", CATALOG_DIR[target.collection], "pages", `${target.slug}.json`);
  const page = (fs.existsSync(pagePath) ? JSON.parse(fs.readFileSync(pagePath, "utf8")) : {}) as QaRecipe;
  return {
    ...page,
    slug: target.slug,
    title: target.title,
    mealFormat: target.mealFormat,
    ingredients: page.ingredients?.length ? page.ingredients : target.ingredients,
  };
}

/**
 * Semantic check = recipe-fidelity vision QA (same rubric that gates image generation):
 * does the picture show this recipe's dish, protein and foods? Composition/style is not judged.
 */
async function runVision(
  row: HeroImageValidationBase,
  target: TrustAuditTarget,
  client: ReturnType<typeof createOpenAIClient> | null,
): Promise<HeroVisionResult> {
  if (!client) {
    return { pass: null, skipped: true, reasons: ["vision unavailable: no OpenAI API key"] };
  }

  const buf = readHeroBuffer(row.heroImage);
  if (!buf) {
    return { pass: null, skipped: true, reasons: ["vision skipped: hero file missing"] };
  }

  const recipe = loadQaRecipe(target);
  let verdict: VisionVerdict;
  try {
    verdict = await inspectRecipeImage(client, buf, recipe);
  } catch (err) {
    return { pass: null, skipped: true, reasons: [`vision unavailable: ${(err as Error).message}`] };
  }

  const fidelity = recipeFidelity(verdict, recipe);
  if (fidelity.status === "PASS") return { pass: true, skipped: false, reasons: [] };
  if (fidelity.status === "FAIL") return { pass: false, skipped: false, reasons: fidelity.reasons };
  return {
    pass: null,
    skipped: false,
    reasons: [`vision inconclusive (${accuracyStatus(verdict)}) — needs human review: ${fidelity.reasons.join("; ")}`],
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

const cell = (text: string) => text.replace(/\|/g, "\\|");

function table(rows: HeroImageValidationRow[], reasons: (row: HeroImageValidationRow) => string[], limit = 80): string {
  if (rows.length === 0) return "_None._";
  return [
    "| Slug | Title | Hero | Reasons |",
    "| --- | --- | --- | --- |",
    ...rows.slice(0, limit).map(
      (row) =>
        `| \`${row.slug}\` | ${cell(row.title)} | \`${row.heroImage}\` | ${cell(reasons(row).slice(0, 3).join("; "))} |`,
    ),
  ].join("\n");
}

function renderMarkdown(
  report: ReturnType<typeof buildHeroImageValidationReport>,
  options: {
    visionMode: string;
    recipesFixed: string[];
    approvedTotals: { recipes: number; exploreEligible: number };
  },
): string {
  const t = report.totals;
  const failed = report.rows.filter((row) => !row.pass);
  const needsNewImage = report.rows.filter((row) => row.needsNewImage);
  const semanticWarned = report.rows.filter((row) => row.semanticWarnings.length > 0);
  const metadataWarned = report.rows.filter((row) => row.metadataWarnings.length > 0);
  const notVerifiedReasons = new Map<string, number>();
  for (const row of report.rows.filter((r) => r.semanticStatus === "not_verified")) {
    for (const reason of row.semanticReasons) notVerifiedReasons.set(reason, (notVerifiedReasons.get(reason) ?? 0) + 1);
  }

  const lines = [
    "# Hero image validation",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Published recipes audited: **${t.recipes}** (approved catalog: ${options.approvedTotals.recipes}, explore-eligible: ${options.approvedTotals.exploreEligible})`,
    `- Pass: **${t.pass}** · Hard failures: **${t.fail}**`,
    `  - File failures (missing, empty, malformed path, not an image): ${t.fileFailures} (missing: ${t.missingHero})`,
    `  - Metadata failures (empty/placeholder alt, alt contradicts title): ${t.metadataFailures}`,
    `  - Conflicting duplicate hero bytes: ${t.duplicateConflict}`,
    `  - Vision-confirmed wrong dish: ${t.semanticFail}`,
    `- Metadata warnings: **${t.metadataWarnings}** recipes`,
    `- Semantic warnings (title/alt wording heuristics, not failures): **${t.semanticWarnings}** recipes`,
    `- Semantic status — verified pass: **${t.semanticPass}**, verified fail: **${t.semanticFail}**, not verified: **${t.semanticNotVerified}**`,
    `- Recipes requiring new images: **${t.needsNewImage}**`,
    `- Vision mode: **${options.visionMode}**`,
    "",
  ];

  if (options.recipesFixed.length > 0) {
    lines.push("## Quarantined this run", "", ...options.recipesFixed.map((s) => `- ${s}`), "");
  }

  lines.push(
    "## Hard failures",
    "",
    table(failed, (row) => row.hardFailures),
    "",
    "## Recipes requiring new images",
    "",
    "_Missing or invalid hero file, bytes that conflict with another recipe, or a vision-confirmed wrong dish._",
    "",
    table(needsNewImage, (row) =>
      row.hardFailures.length ? row.hardFailures : ["hero bytes conflict with another recipe (excluded from Explore)"],
    ),
    "",
    "## Semantic status not verified",
    "",
    t.semanticNotVerified === 0
      ? "_Every hero was inspected by vision._"
      : [...notVerifiedReasons].map(([reason, n]) => `- ${n} recipe(s): ${reason}`).join("\n"),
    "",
    "## Semantic warnings (wording heuristics)",
    "",
    "_Title/alt/path wording suggests a possible mismatch. These never fail the audit; confirm visually or run `--vision`._",
    "",
    table(semanticWarned, (row) => row.semanticWarnings),
    "",
    "## Metadata warnings",
    "",
    metadataWarned.length === 0
      ? "_None._"
      : metadataWarned
          .slice(0, 60)
          .map((row) => `- \`${row.slug}\`: ${row.metadataWarnings.join("; ")}`)
          .join("\n"),
    "",
    "## Validation commands",
    "",
    "```bash",
    "npm run test:hero-image-validation",
    "npm run audit:hero-images",
    "npx tsx scripts/audit-hero-images.ts --vision",
    "```",
    "",
  );

  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const visionRequested = args.vision || args.visionSample > 0;
  if (visionRequested) applyDevOpenAiTlsIfAllowed();
  const client = visionRequested && hasOpenAIKey() ? createOpenAIClient() : null;

  let targets = loadPublishedHeroValidationTargets();
  if (args.slugs?.length) {
    const wanted = new Set(args.slugs);
    targets = targets.filter((target) => wanted.has(target.slug));
  }

  const context = buildGlobalHeroMd5Index(targets, PUBLIC);
  const peerLookup = buildGlobalHeroPeerLookup(targets);

  const sampled = new Set<string>(
    args.vision
      ? targets.map((t) => t.slug)
      : seededShuffle(targets, 20260622)
          .slice(0, args.visionSample)
          .map((t) => t.slug),
  );

  console.log(
    `[audit:hero-images] targets=${targets.length} vision=${args.vision ? "all" : args.visionSample > 0 ? `sample ${args.visionSample} + flagged` : "off"} quarantine=${args.quarantine}`,
  );

  const rows: HeroImageValidationRow[] = [];
  const recipesFixed: string[] = [];

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!;
    if (i % 50 === 0) console.log(`  validating ${i + 1}/${targets.length}…`);

    const base = validateHeroImageTarget(target, context, peerLookup, PUBLIC);
    const shouldVision =
      visionRequested &&
      (sampled.has(target.slug) || collectHeuristicHeroIssues(base.metadataIssues).length > 0);
    const vision = shouldVision ? await runVision(base, target, client) : VISION_NOT_REQUESTED;
    const row = finalizeHeroValidationRow(base, vision);
    rows.push(row);

    if (args.quarantine && row.needsNewImage && row.heroOnDisk) {
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

  const visionMode = args.vision
    ? `full vision (${targets.length} recipes)`
    : args.visionSample > 0
      ? `sample of ${args.visionSample} + heuristic-flagged recipes`
      : "off — semantic correctness not verified";

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  writeFileAtomicSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileAtomicSync(
    MD_OUT,
    renderMarkdown(report, {
      visionMode,
      recipesFixed,
      approvedTotals: { recipes: approved.length, exploreEligible: approvedEligible },
    }),
    "utf8",
  );

  const t = report.totals;
  console.log(
    `[audit:hero-images] pass=${t.pass} hardFail=${t.fail} metadataWarnings=${t.metadataWarnings} semanticWarnings=${t.semanticWarnings} ` +
      `semantic(pass/fail/notVerified)=${t.semanticPass}/${t.semanticFail}/${t.semanticNotVerified} needsNewImage=${t.needsNewImage}`,
  );
  console.log(`[audit:hero-images] wrote ${MD_OUT}`);

  if (t.fail > 0) {
    console.error(`[audit:hero-images] FAILED — ${t.fail} recipe(s) with hard hero-image failures`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

