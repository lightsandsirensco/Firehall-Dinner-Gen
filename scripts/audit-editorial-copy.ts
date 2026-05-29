#!/usr/bin/env tsx
/**
 * Editorial copy & recommendation QA for Hall guides.
 *
 *   npm run audit:editorial-copy
 *   npm run audit:editorial-copy -- --report=review/editorial-copy-audit.md
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EDITORIAL_ARTICLES } from "../shared/editorial/articles-data.js";
import { editorialArticleSchema } from "../shared/editorial/content-schema.js";
import {
  auditEditorialCatalog,
  type EditorialCopyIssue,
} from "../shared/editorial/editorial-copy-audit.js";
import { validateArticleMealRecommendations } from "../shared/editorial/recommendation-rules.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const reportArg = process.argv.find((a) => a.startsWith("--report="));
const reportPath = reportArg?.replace("--report=", "") ?? "review/editorial-copy-audit.md";

const goldenSlugs = new Set(GOLDEN_100_RECIPES.map((r) => r.slug));

function main(): void {
  const schemaFails: string[] = [];
  const slugFails: string[] = [];
  const recIssues: string[] = [];

  for (const article of EDITORIAL_ARTICLES) {
    const parsed = editorialArticleSchema.safeParse(article);
    if (!parsed.success) {
      schemaFails.push(`${article.slug}: ${parsed.error.message.slice(0, 120)}`);
    }
    for (const pick of article.mealRecommendations) {
      if (!goldenSlugs.has(pick.slug)) {
        slugFails.push(`${article.slug}: unknown recipe ${pick.slug}`);
      }
    }
    for (const issue of validateArticleMealRecommendations(article)) {
      recIssues.push(`${issue.slug}: ${issue.message}`);
    }
  }

  const copyAudit = auditEditorialCatalog(EDITORIAL_ARTICLES);
  const errors = copyAudit.issues.filter((i) => i.severity === "error");
  const warns = copyAudit.issues.filter((i) => i.severity === "warn");

  const pass =
    schemaFails.length === 0 &&
    slugFails.length === 0 &&
    recIssues.length === 0 &&
    errors.length === 0;

  const lines = [
    "# Editorial copy audit",
    "",
    `Articles: ${EDITORIAL_ARTICLES.length}`,
    `Pass: ${pass ? "yes" : "no"}`,
    "",
    "## Schema",
    schemaFails.length ? schemaFails.map((s) => `- ${s}`).join("\n") : "- none",
    "",
    "## Unknown recipe slugs",
    slugFails.length ? slugFails.map((s) => `- ${s}`).join("\n") : "- none",
    "",
    "## Recommendation logic",
    recIssues.length ? recIssues.map((s) => `- ${s}`).join("\n") : "- none",
    "",
    "## Copy errors",
    formatIssues(errors),
    "",
    "## Copy warnings",
    formatIssues(warns),
    "",
    "## Manual review slugs",
    copyAudit.manualReview.length
      ? copyAudit.manualReview.map((s) => `- ${s}`).join("\n")
      : "- none",
  ];

  mkdirSync(dirname(join(root, reportPath)), { recursive: true });
  writeFileSync(join(root, reportPath), lines.join("\n"), "utf8");

  console.log(`[audit:editorial-copy] articles=${EDITORIAL_ARTICLES.length} pass=${pass}`);
  if (!pass) {
    console.log(`  schema=${schemaFails.length} slugs=${slugFails.length} rec=${recIssues.length} copy_err=${errors.length}`);
    process.exit(1);
  }
}

function formatIssues(issues: EditorialCopyIssue[]): string {
  if (!issues.length) return "- none";
  return issues.map((i) => `- ${i.slug} (${i.code}): ${i.message}`).join("\n");
}

main();
