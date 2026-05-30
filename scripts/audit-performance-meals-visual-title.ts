#!/usr/bin/env tsx
/**
 * Visual-title audit for Performance Meals (50).
 *
 * Outputs:
 *   review/performance-meals-visual-title-audit.json
 *   review/performance-meals-visual-title-audit.md
 *
 * Usage:
 *   npm run audit:performance-meals-visual-title
 */
import fs from "node:fs";
import path from "node:path";
import { PERFORMANCE_ADAPTED_RECIPES } from "../shared/performance-meals/adapted/index.js";
import { performancePageImageSet } from "../shared/performance-meals/recipe-page-paths.js";
import {
  buildCuratedMealImageProfile,
  validateCuratedImageGovernance,
} from "../shared/curated-image-governance/index.js";

type AuditRow = {
  slug: string;
  title: string;
  protein: string;
  mealFormat: string;
  platingType: string;
  heroImage: string;
  pass: boolean;
  mismatchConfidence: number;
  mismatches: Array<{ code: string; severity: string; message: string }>;
};

function auditPerformanceMeals(): AuditRow[] {
  const rows: AuditRow[] = [];

  for (const recipe of PERFORMANCE_ADAPTED_RECIPES) {
    const { slug, title, protein, mealFormat, cuisine } = recipe.manifest;
    const images = performancePageImageSet(slug);
    const profile = buildCuratedMealImageProfile({
      slug,
      title,
      protein,
      cuisine,
      mealFormat,
    });

    const result = validateCuratedImageGovernance({
      profile,
      heroImage: images.heroImage,
      thumbImage: images.thumbImage,
      mobileImage: images.mobileImage,
      imageApproved: true,
      publishGate: true,
    });

    rows.push({
      slug,
      title,
      protein,
      mealFormat,
      platingType: profile.platingType,
      heroImage: images.heroImage,
      pass: result.pass,
      mismatchConfidence: result.mismatchConfidence,
      mismatches: result.mismatches.map((m) => ({
        code: m.code,
        severity: m.severity,
        message: m.message,
      })),
    });
  }

  return rows;
}

function writeReport(rows: AuditRow[]): void {
  const mismatches = rows.filter((r) => !r.pass || r.mismatches.length > 0);
  const critical = mismatches.filter((r) => r.mismatches.some((m) => m.severity === "critical"));

  const jsonPath = path.join("review", "performance-meals-visual-title-audit.json");
  const mdPath = path.join("review", "performance-meals-visual-title-audit.md");

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        auditedAt: new Date().toISOString(),
        recipesAudited: rows.length,
        passCount: rows.filter((r) => r.pass).length,
        mismatchCount: mismatches.length,
        criticalCount: critical.length,
        rows,
      },
      null,
      2,
    ),
  );

  const mdLines = [
    "# Performance Meals Visual-Title Audit",
    "",
    `- Recipes audited: **${rows.length}**`,
    `- Pass: **${rows.filter((r) => r.pass).length}**`,
    `- With mismatches: **${mismatches.length}**`,
    `- Critical mismatches: **${critical.length}**`,
    "",
    "## Mismatches",
    "",
  ];

  if (mismatches.length === 0) {
    mdLines.push("_No mismatches flagged._");
  } else {
    for (const row of mismatches) {
      mdLines.push(`### ${row.title} (\`${row.slug}\`)`);
      mdLines.push(`- Hero: \`${row.heroImage}\``);
      mdLines.push(`- Format: ${row.mealFormat} · Plating: ${row.platingType}`);
      for (const m of row.mismatches) {
        mdLines.push(`- **${m.severity}** \`${m.code}\`: ${m.message}`);
      }
      mdLines.push("");
    }
  }

  fs.writeFileSync(mdPath, mdLines.join("\n"));
  console.log(`[audit:performance-meals-visual-title] wrote ${jsonPath}`);
  console.log(`[audit:performance-meals-visual-title] wrote ${mdPath}`);
  console.log(
    `[audit:performance-meals-visual-title] audited=${rows.length} mismatches=${mismatches.length} critical=${critical.length}`,
  );
}

writeReport(auditPerformanceMeals());
