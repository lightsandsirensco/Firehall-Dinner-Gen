#!/usr/bin/env tsx
/**
 * Breakfast collection governance audit report.
 *
 *   npm run audit:breakfast-governance
 */
import fs from "node:fs";
import path from "node:path";
import {
  BREAKFAST_GOVERNANCE_BY_SLUG,
  MISSING_FIREHALL_BREAKFASTS,
  isPerformanceBreakfastSlug,
} from "../shared/breakfast-catalog/governance.js";
import { readBreakfastCatalogIndexFromDisk } from "../server/breakfast-catalog/page-store.js";

const JSON_OUT = path.join("review", "breakfast-governance-audit.json");
const MD_OUT = path.join("review", "breakfast-governance-audit.md");

function main(): void {
  const index = readBreakfastCatalogIndexFromDisk();
  if (!index) throw new Error("Missing breakfast index.json");

  const allSlugs = Object.keys(BREAKFAST_GOVERNANCE_BY_SLUG);
  const records = allSlugs.map((s) => BREAKFAST_GOVERNANCE_BY_SLUG[s]!);

  const keep = records.filter((r) => r.decision === "KEEP");
  const rewrite = records.filter((r) => r.decision === "REWRITE");
  const movePerf = records.filter((r) => r.decision === "MOVE_PERFORMANCE");
  const del = records.filter((r) => r.decision === "DELETE");
  const lowAuth = records.filter((r) => r.scores.firehallAuthenticity < 7);

  const tierCounts = {
    firehall_classic: records.filter((r) => r.tier === "firehall_classic").length,
    healthier_hall: records.filter((r) => r.tier === "healthier_hall").length,
    performance: records.filter((r) => r.tier === "performance").length,
  };

  const imageCorrections = records
    .filter((r) => r.imageNotes || r.scores.imageAccuracy < 7)
    .map((r) => ({ slug: r.slug, notes: r.imageNotes ?? "Re-audit hero for crew-scale presentation." }));

  const report = {
    generatedAt: new Date().toISOString(),
    totalRecipes: records.length,
    primaryIndexCount: index.recipeCount,
    tierCounts,
    tierPercentages: {
      firehall_classic: Math.round((tierCounts.firehall_classic / records.length) * 100),
      healthier_hall: Math.round((tierCounts.healthier_hall / records.length) * 100),
      performance: Math.round((tierCounts.performance / records.length) * 100),
    },
    decisions: {
      KEEP: keep.map((r) => r.slug),
      REWRITE: rewrite.map((r) => r.slug),
      MOVE_PERFORMANCE: movePerf.map((r) => r.slug),
      DELETE: del.map((r) => r.slug),
    },
    lowAuthenticity: lowAuth.map((r) => ({
      slug: r.slug,
      score: r.scores.firehallAuthenticity,
      tier: r.tier,
    })),
    missingFirehallClassics: MISSING_FIREHALL_BREAKFASTS,
    imageCorrectionsRequired: imageCorrections,
    scores: records.map((r) => ({
      slug: r.slug,
      tier: r.tier,
      decision: r.decision,
      ...r.scores,
    })),
    collectionStructure: {
      primary: "/breakfast",
      performance: "/breakfast/performance",
      performanceSlugs: allSlugs.filter(isPerformanceBreakfastSlug),
    },
  };

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2), "utf8");

  const md = `# Breakfast Collection Governance Audit

Generated: ${report.generatedAt}

## Summary

| Metric | Value |
| --- | --- |
| Total recipes audited | ${report.totalRecipes} |
| Primary collection (post-split) | ${report.primaryIndexCount} |
| Tier 1 — Firehall Classics | ${tierCounts.firehall_classic} (${report.tierPercentages.firehall_classic}%) |
| Tier 2 — Healthier Hall | ${tierCounts.healthier_hall} (${report.tierPercentages.healthier_hall}%) |
| Tier 3 — Performance | ${tierCounts.performance} (${report.tierPercentages.performance}%) |

## Recipes to Keep (${keep.length})

${keep.map((r) => `- \`${r.slug}\``).join("\n")}

## Recipes to Rewrite (${rewrite.length})

${rewrite.map((r) => `- \`${r.slug}\``).join("\n")}

## Recipes to Move to Performance Breakfasts (${movePerf.length})

${movePerf.map((r) => `- \`${r.slug}\``).join("\n")}

## Recipes to Delete (${del.length})

${del.length ? del.map((r) => `- \`${r.slug}\``).join("\n") : "_None — all catalog recipes retained._"}

## Low Authenticity (< 7/10)

${lowAuth.map((r) => `- \`${r.slug}\` — ${r.scores.firehallAuthenticity}/10 (${r.tier})`).join("\n")}

## Missing Firehall Breakfasts We Should Add

${MISSING_FIREHALL_BREAKFASTS.map((m) => `- **${m.title}** — ${m.rationale}`).join("\n")}

## Image Corrections Required

${imageCorrections.map((i) => `- \`${i.slug}\` — ${i.notes}`).join("\n")}

## Updated Breakfast Collection Structure

- **Primary hall breakfasts:** \`/breakfast\` — ${tierCounts.firehall_classic + tierCounts.healthier_hall} recipes (classics + healthier hall)
- **Performance breakfasts:** \`/breakfast/performance\` — ${tierCounts.performance} recipes (training / macro-focused)
- Recipe pages remain at \`/catalog/breakfast/pages/{slug}.json\`
- Performance routes: \`/breakfast/performance/{slug}\`

## Per-Recipe Scores

| Slug | Tier | Decision | Auth | Crew | Batch | Beginner | Visual | Image | Culture |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${records
  .map(
    (r) =>
      `| ${r.slug} | ${r.tier} | ${r.decision} | ${r.scores.firehallAuthenticity} | ${r.scores.crewAppeal} | ${r.scores.batchCooking} | ${r.scores.beginnerFriendly} | ${r.scores.visualAppeal} | ${r.scores.imageAccuracy} | ${r.scores.cultureFit} |`,
  )
  .join("\n")}
`;

  fs.writeFileSync(MD_OUT, md, "utf8");
  console.log(`[breakfast-governance] wrote ${JSON_OUT} and ${MD_OUT}`);
}

main();
