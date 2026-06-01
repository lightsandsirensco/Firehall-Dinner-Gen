#!/usr/bin/env tsx
/**
 * Apply recipe quality fixes: spelling, ingredient patches, step rewrites.
 *
 *   npm run apply:recipe-quality-fixes
 *   npm run apply:recipe-quality-fixes -- --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";
import type { ApprovedCatalogEntry } from "../shared/approved-catalog.js";
import { isHallClassicSlug } from "../shared/hall-catalog/gate.js";
import type { GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";
import { goldenRecipePageSchema } from "../shared/golden-100/recipe-page-schema.js";
import { stripBannedInstructionPhrases } from "../shared/firehall-instruction-voice.js";
import {
  breakfastPageToGolden,
  goldenPageToBreakfastPatch,
  goldenPageToSmoothiePatch,
  rewriteRecipeDetailPage,
  smoothiePageToGolden,
} from "../shared/golden-100/recipe-quality/detail-rewrite-engine.js";
import {
  auditCuratedRecipeQuality,
  patchInternalTemps,
  patchUnusedIngredients,
} from "../shared/recipe-quality/curated-recipe-quality-audit.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const DRY_RUN = process.argv.includes("--dry-run");

const COPY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\btonight'?s board\b/gi, "serving line"],
  [/\bperfect for\b/gi, "works for"],
  [/\bideal for\b/gi, "works for"],
  [/\bplate and serve\b/gi, "portion and serve"],
  [/\bserve and enjoy\b/gi, "serve while hot"],
  [/\buntil done\b/gi, "until fully cooked"],
  [/\bcook until done\b/gi, "cook to safe internal temperature"],
  [/\belevated?\b/gi, ""],
  [/\brestaurant-?quality\b/gi, "hall-style"],
  [/\bto perfection\b/gi, "until done right"],
  [/\bculinary\b/gi, ""],
  [/\bwhilst\b/gi, "while"],
  [/\butilize\b/gi, "use"],
  [/\bflavor explosion\b/gi, "big flavor"],
  [/\bweeknight wonder\b/gi, ""],
  [/\bprotein-?packed powerhouse\b/gi, "high-protein meal"],
  [/\bcrowd-?pleasing sensation\b/gi, "crew favorite"],
];

type ChangeLog = {
  slug: string;
  spellingCorrections: string[];
  ingredientsFixed: string[];
  stepsRewritten: number;
};

function resolvePageJsonPath(slug: string, kind: ApprovedCatalogEntry["kind"]): string | null {
  const candidates = [
    kind === "breakfast_catalog" ? `/catalog/breakfast/pages/${slug}.json` : null,
    kind === "bbq_catalog" ? `/catalog/bbq/pages/${slug}.json` : null,
    kind === "smoothie" ? `/catalog/smoothies/pages/${slug}.json` : null,
    `/catalog/golden-100/pages/${slug}.json`,
    `/catalog/performance-meals/pages/${slug}.json`,
    `/catalog/hall-expansion/pages/${slug}.json`,
  ].filter(Boolean) as string[];
  for (const rel of candidates) {
    const abs = path.join(PUBLIC, rel.replace(/^\//, ""));
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

function polishText(value: string): { text: string; corrections: string[] } {
  const corrections: string[] = [];
  let text = stripBannedInstructionPhrases(value);
  for (const [re, replacement] of COPY_REPLACEMENTS) {
    if (re.test(text)) {
      corrections.push(`${re.source.slice(0, 30)} → ${replacement || "(removed)"}`);
      text = text.replace(re, replacement);
    }
  }
  text = text.replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim();
  return { text, corrections };
}

function polishPageStrings(page: Record<string, unknown>): { page: Record<string, unknown>; corrections: string[] } {
  const allCorrections: string[] = [];

  function walk(node: unknown, skipKeys = false): unknown {
    if (typeof node === "string") {
      const { text, corrections } = polishText(node);
      allCorrections.push(...corrections);
      return text;
    }
    if (Array.isArray(node)) return node.map((item) => walk(item));
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (k === "slug" || k.endsWith("Image")) {
          out[k] = v;
          continue;
        }
        out[k] = walk(v);
      }
      return out;
    }
    return node;
  }

  return { page: walk(page) as Record<string, unknown>, corrections: [...new Set(allCorrections)] };
}

function loadGoldenPage(entry: ApprovedCatalogEntry, raw: Record<string, unknown>): GoldenRecipePage {
  if (entry.kind === "breakfast_catalog") return breakfastPageToGolden(raw);
  if (entry.kind === "smoothie") return smoothiePageToGolden(raw);
  return raw as GoldenRecipePage;
}

function writePage(entry: ApprovedCatalogEntry, page: GoldenRecipePage, raw: Record<string, unknown>): void {
  const abs = resolvePageJsonPath(entry.slug, entry.kind)!;
  let output: Record<string, unknown>;
  if (entry.kind === "breakfast_catalog") {
    output = goldenPageToBreakfastPatch(page, raw);
  } else if (entry.kind === "smoothie") {
    output = goldenPageToSmoothiePatch(page, raw);
  } else {
    output = { ...raw, ...page };
  }
  if (!DRY_RUN) {
    fs.writeFileSync(abs, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  }
}

function main(): void {
  const entries = buildAllApprovedCatalogEntries();
  const changes: ChangeLog[] = [];
  let modified = 0;
  let spellingTotal = 0;
  let ingredientTotal = 0;
  let stepsTotal = 0;

  for (const entry of entries) {
    const abs = resolvePageJsonPath(entry.slug, entry.kind);
    if (!abs) continue;

    const rawOriginal = JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown>;
    const { page: polishedRaw, corrections } = polishPageStrings({ ...rawOriginal });
    let page = loadGoldenPage(entry, polishedRaw);

    const beforeAudit = auditCuratedRecipeQuality(page, entry);
    if (beforeAudit.pass && corrections.length === 0) continue;

    const log: ChangeLog = {
      slug: entry.slug,
      spellingCorrections: [...new Set(corrections)],
      ingredientsFixed: [],
      stepsRewritten: 0,
    };

    const beforeSteps = JSON.stringify(page.steps);

    const needsRewrite =
      !beforeAudit.pass &&
      beforeAudit.issues.some((i) =>
        ["vague_step", "temperature_missing", "internal_temp_missing", "completeness"].includes(i.category),
      );

    if (needsRewrite) {
      const ctx = {
        slug: entry.slug,
        kind: entry.kind,
        protein: entry.protein,
        mealFormat: entry.mealFormat,
        category: entry.category,
        isClassic: isHallClassicSlug(entry.slug),
      };
      page = rewriteRecipeDetailPage(page, ctx);
      for (let pass = 0; pass < 2; pass++) {
        const audit = auditCuratedRecipeQuality(page, entry);
        if (audit.pass) break;
        page = rewriteRecipeDetailPage(page, ctx);
      }
    }

    if (beforeAudit.issues.some((i) => i.category === "ingredient_unused")) {
      const patched = patchUnusedIngredients(page);
      page = patched.page;
      log.ingredientsFixed = patched.fixed;
    }

    if (beforeAudit.issues.some((i) => i.category === "internal_temp_missing")) {
      page = patchInternalTemps(page, entry.protein || "chicken");
    }

    if (JSON.stringify(page.steps) !== beforeSteps) {
      log.stepsRewritten = page.steps.length;
    }

    if (entry.kind !== "breakfast_catalog" && entry.kind !== "smoothie") {
      page = goldenRecipePageSchema.parse(page);
    }

    const hasChanges =
      log.spellingCorrections.length > 0 ||
      log.ingredientsFixed.length > 0 ||
      log.stepsRewritten > 0 ||
      JSON.stringify(polishedRaw) !== JSON.stringify(rawOriginal);

    if (!hasChanges) continue;

    writePage(entry, page, polishedRaw);
    changes.push(log);
    modified++;
    spellingTotal += log.spellingCorrections.length;
    ingredientTotal += log.ingredientsFixed.length;
    stepsTotal += log.stepsRewritten > 0 ? 1 : 0;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    recipesModified: modified,
    spellingCorrections: spellingTotal,
    ingredientsFixed: ingredientTotal,
    stepRewritesCompleted: stepsTotal,
    changes,
  };

  fs.mkdirSync(path.join(ROOT, "review"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, "review", "recipe-quality-fixes.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  const md = [
    "# Recipe Quality Fixes Applied",
    "",
    `Generated: ${report.generatedAt}`,
    `Mode: **${DRY_RUN ? "dry-run" : "fix"}**`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Recipes modified | ${report.recipesModified} |`,
    `| Spelling/copy corrections | ${report.spellingCorrections} |`,
    `| Missing ingredient mentions fixed | ${report.ingredientsFixed} |`,
    `| Step rewrites completed | ${report.stepRewritesCompleted} |`,
    "",
    "## Recipes modified",
    "",
    "| Slug | Spelling | Ingredients | Steps |",
    "| --- | ---: | ---: | ---: |",
    ...changes.slice(0, 100).map(
      (c) =>
        `| ${c.slug} | ${c.spellingCorrections.length} | ${c.ingredientsFixed.length ? c.ingredientsFixed.join(", ") : "—"} | ${c.stepsRewritten || "—"} |`,
    ),
  ];

  fs.writeFileSync(path.join(ROOT, "review", "recipe-quality-fixes.md"), `${md.join("\n")}\n`);

  console.log(
    `[apply:recipe-quality-fixes] modified=${modified} spelling=${spellingTotal} ingredients=${ingredientTotal} rewrites=${stepsTotal}${DRY_RUN ? " (dry-run)" : ""}`,
  );
}

main();
