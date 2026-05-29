#!/usr/bin/env tsx
/**
 * Audit Golden 100 recipe content quality — titles, ingredients, steps, placeholders.
 *
 *   npm run audit:recipe-content
 *   npm run audit:recipe-content -- --fix-report=review/recipe-content-audit.md
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { buildGoldenRecipePage } from "../server/golden-100/recipe-page-builder.js";
import { validateGoldenRecipePage } from "../server/golden-100/recipe-page-validator.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { auditGoldenRecipeContent } from "../shared/golden-100/recipe-quality/audit.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const reportArg = process.argv.find((a) => a.startsWith("--fix-report="));
const reportPath = reportArg?.replace("--fix-report=", "") ?? "review/recipe-content-audit.md";

async function main(): Promise<void> {
  await initCuratedRecipeStore();

  const results: Array<{
    slug: string;
    title: string;
    pass: boolean;
    score: number;
    manual: boolean;
    issues: string[];
  }> = [];

  for (const def of GOLDEN_100_RECIPES) {
    const page = buildGoldenRecipePage(def);
    const validation = validateGoldenRecipePage(page);
    const audit = auditGoldenRecipeContent(page);
    const issues = [
      ...audit.issues.map((i) => `${i.severity}: ${i.code} — ${i.message}`),
      ...validation.issues.map((i) => `${i.severity}: ${i.code} — ${i.message}`),
    ];
    results.push({
      slug: def.slug,
      title: page.displayTitle || page.title,
      pass: audit.pass && validation.pass,
      score: Math.round((audit.score + page.realismScore) / 2),
      manual: audit.needsManualReview,
      issues: [...new Set(issues)],
    });
  }

  const pass = results.filter((r) => r.pass).length;
  const fail = results.filter((r) => !r.pass);
  const manual = results.filter((r) => r.manual);

  fail.sort((a, b) => a.score - b.score);
  const worst = fail.slice(0, 25);

  const lines = [
    "# Recipe content quality audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `| Metric | Count |`,
    `|--------|------:|`,
    `| Total | ${results.length} |`,
    `| Pass | ${pass} |`,
    `| Fail | ${fail.length} |`,
    `| Needs manual review | ${manual.length} |`,
    "",
    "## Worst offenders",
    "",
    ...worst.map(
      (r) =>
        `### ${r.slug}\n- **Title:** ${r.title}\n- **Score:** ${r.score}\n- **Issues:**\n${r.issues.map((i) => `  - ${i}`).join("\n") || "  - (none listed)"}\n`,
    ),
    "",
    "## All failures",
    "",
    ...fail.map((r) => `- \`${r.slug}\` (${r.score}) — ${r.issues.slice(0, 3).join("; ")}`),
  ];

  const out = join(root, reportPath);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, lines.join("\n"), "utf8");

  console.log(`[audit:recipe-content] pass=${pass}/${results.length} fail=${fail.length} manual=${manual.length}`);
  console.log(`[audit:recipe-content] report → ${out}`);

  if (worst.length) {
    console.log("\nWorst 10:");
    for (const r of worst.slice(0, 10)) {
      console.log(`  ✗ ${r.slug} (${r.score}) — ${r.issues[0] ?? "quality"}`);
    }
  }

  process.exit(fail.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
