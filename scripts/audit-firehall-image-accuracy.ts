#!/usr/bin/env tsx
/**
 * Firehall Meals Image Accuracy Audit — full report with 2-second identification rule.
 *
 *   npm run audit:firehall-image-accuracy
 *   npm run audit:firehall-image-accuracy -- --vision
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const AUDIT_JSON = path.join("review", "meal-image-trust-audit.json");
const FINAL_MD = path.join("review", "firehall-image-accuracy-audit.md");

function runAudit(vision: boolean): void {
  const args = ["tsx", "scripts/audit-meal-image-trust.ts"];
  if (vision) args.push("--vision");
  const r = spawnSync("npx", args, { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function writeReport(): void {
  if (!fs.existsSync(AUDIT_JSON)) return;

  const audit = JSON.parse(fs.readFileSync(AUDIT_JSON, "utf8")) as {
    generatedAt: string;
    visionEnabled: boolean;
    totals: {
      audited: number;
      passed: number;
      failed: number;
      titleIngredientMismatches: number;
      missingSideDishes: number;
      proteinOnlyHeroes: number;
    };
    failedRecipes: Array<{
      recipe: string;
      slug: string;
      collection: string;
      reasonFailed: string;
      replacementGenerated: boolean;
      qaPass: boolean | null;
    }>;
  };

  const lines = [
    "# Firehall Meals Image Accuracy Audit",
    "",
    `Generated: ${audit.generatedAt}`,
    "",
    "## Rule",
    "",
    "A firefighter should identify the recipe title within **2 seconds** of seeing the image.",
    "",
    "**FAIL** if: title ingredient missing · side dish missing · protein only · wrong recipe · tight restaurant crop · family meal not visible",
    "",
    "**PASS** if: main dish and all named sides visible · wide family-style firehall framing",
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Recipes audited | ${audit.totals.audited} |`,
    `| Passed | ${audit.totals.passed} |`,
    `| Failed | ${audit.totals.failed} |`,
    `| Title ingredient mismatches | ${audit.totals.titleIngredientMismatches} |`,
    `| Missing side dishes | ${audit.totals.missingSideDishes} |`,
    `| Protein-only heroes | ${audit.totals.proteinOnlyHeroes} |`,
    `| Vision QA enabled | ${audit.visionEnabled} |`,
    "",
    "## Failed recipes",
    "",
  ];

  if (audit.failedRecipes.length === 0) {
    lines.push("_All recipes passed._");
  } else {
    lines.push("| Recipe | Collection | Reason | Regenerated | QA |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const r of audit.failedRecipes) {
      lines.push(
        `| ${r.recipe} | ${r.collection} | ${r.reasonFailed.replace(/\|/g, "/").slice(0, 100)} | ${r.replacementGenerated ? "yes" : "no"} | ${r.qaPass === true ? "pass" : r.qaPass === false ? "fail" : "—"} |`,
      );
    }
  }

  lines.push("", "## Commands", "", "```bash", "npm run audit:firehall-image-accuracy", "npm run fix:meal-hero-alt", "npm run run:meal-image-trust-fix -- --apply --vision", "```");

  fs.writeFileSync(FINAL_MD, lines.join("\n"));
  console.log(`[audit:firehall-image-accuracy] report → ${FINAL_MD}`);
}

function main(): void {
  const vision = process.argv.includes("--vision");
  runAudit(vision);
  writeReport();
  const audit = JSON.parse(fs.readFileSync(AUDIT_JSON, "utf8")) as {
    totals: { audited: number; failed: number; passed: number };
  };
  console.log(
    `[audit:firehall-image-accuracy] pass=${audit.totals.passed} fail=${audit.totals.failed}`,
  );
}

main();
