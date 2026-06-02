#!/usr/bin/env tsx
/**
 * Complete Hall Guides audit — inventory + production report.
 *
 *   npm run audit:hall-guides
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EDITORIAL_ARTICLES } from "../shared/editorial/articles-data.js";
import { auditHallGuidesCatalog } from "../shared/editorial/hall-guides-audit.js";
import { withGuidePublishingDefaults } from "../shared/editorial/seo-article-build.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const INVENTORY_MD = join(root, "review", "hall-guides-inventory.md");
const PRODUCTION_MD = join(root, "review", "hall-guides-production-audit.md");
const PRODUCTION_JSON = join(root, "review", "hall-guides-production-audit.json");

function main(): void {
  const articles = EDITORIAL_ARTICLES.map(withGuidePublishingDefaults);
  const { inventory, audits, summary } = auditHallGuidesCatalog(articles);

  const inventoryMd = [
    "# Hall Guides Inventory",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Total guides: **${summary.total}** (all published)`,
    "",
    "| Title | URL | Words | Category | Pillar | Target keyword | Read (min) |",
    "|-------|-----|------:|----------|--------|----------------|------------:|",
    ...inventory
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(
        (r) =>
          `| ${escapeCell(r.title)} | ${r.url} | ${r.wordCount} | ${r.category} | ${r.pillar} | ${escapeCell(r.targetKeyword)} | ${r.readMinutes} |`,
      ),
    "",
    "## By pillar",
    "",
    ...pillarBreakdown(inventory),
  ].join("\n");

  const p0 = audits.filter((a) => a.priority === "P0").sort((a, b) => a.seoScore - b.seoScore);
  const p1 = audits.filter((a) => a.priority === "P1");
  const p2 = audits.filter((a) => a.priority === "P2");

  const productionMd = [
    "# Hall Guides Production Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Executive summary",
    "",
    "| Metric | Value |",
    "|--------|------:|",
    `| Guides audited | ${summary.total} |`,
    `| Average SEO score | ${summary.avgSeo}/100 |`,
    `| Average human writing score | ${summary.avgHuman}/100 |`,
    `| **P0 — rewrite immediately** | **${summary.p0}** |`,
    `| P1 — improve soon | ${summary.p1} |`,
    `| P2 — acceptable | ${summary.p2} |`,
    "",
    "## Audit dimensions",
    "",
    "Each guide scored 0–100 on:",
    "",
    "- **SEO** — title, meta, URL, headings, keyword coverage, internal links, hero alt",
    "- **Human writing** — AI phrase detection, firefighter voice, rhythm",
    "- **Trust** — unsupported claims, nutrition disclaimers, boilerplate FAQs",
    "- **Firefighter relevance** — shift/hall/crew kitchen language density",
    "- **Search intent** — answers the query with actionable meal examples",
    "- **Depth** — word count, section substance, list-vs-prose balance",
    "- **Conversion** — recipe links, related guides (page CTAs: Find a Meal + Browse)",
    "- **EEAT** — experience markers, practical crew scenarios",
    "",
    "## P0 guides (rewrite first)",
    "",
    p0.length
      ? p0.map((r) => formatGuideBlock(r)).join("\n---\n\n")
      : "_None — all guides at or above P1 threshold._",
    "",
    "## P1 guides",
    "",
    p1.length ? p1.map((r) => formatGuideBlock(r)).join("\n---\n\n") : "_None._",
    "",
    "## P2 guides (acceptable baseline)",
    "",
    `| Guide | SEO | Human | Trust | FF rel | Intent | Depth |`,
    "|-------|----:|------:|------:|-------:|-------:|------:|",
    ...p2
      .sort((a, b) => b.seoScore - a.seoScore)
      .map(
        (r) =>
          `| [${r.title}](${r.url}) | ${r.seoScore} | ${r.humanWritingScore} | ${r.trustScore} | ${r.firefighterRelevanceScore} | ${r.searchIntentScore} | ${r.depthScore} |`,
      ),
    "",
    "## Full scorecard",
    "",
    "| Guide | Priority | SEO | Human | Trust | FF | Intent | Depth | Conv | EEAT |",
    "|-------|:--------:|----:|------:|------:|---:|-------:|------:|-----:|-----:|",
    ...audits
      .sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority))
      .map(
        (r) =>
          `| [${escapeCell(r.title)}](${r.url}) | ${r.priority} | ${r.seoScore} | ${r.humanWritingScore} | ${r.trustScore} | ${r.firefighterRelevanceScore} | ${r.searchIntentScore} | ${r.depthScore} | ${r.conversionScore} | ${r.eeatScore} |`,
      ),
    "",
    "## Validation",
    "",
    "```bash",
    "npm run audit:hall-guides",
    "npm run audit:editorial-copy",
    "npm run content:generate-guides",
    "npm run check",
    "```",
  ].join("\n");

  mkdirSync(dirname(INVENTORY_MD), { recursive: true });
  writeFileSync(INVENTORY_MD, inventoryMd, "utf8");
  writeFileSync(PRODUCTION_MD, productionMd, "utf8");
  writeFileSync(
    PRODUCTION_JSON,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, inventory, audits }, null, 2)}\n`,
    "utf8",
  );

  console.log(`[audit:hall-guides] inventory → ${INVENTORY_MD}`);
  console.log(`[audit:hall-guides] report → ${PRODUCTION_MD}`);
  console.log(
    `[audit:hall-guides] P0=${summary.p0} P1=${summary.p1} P2=${summary.p2} avgSeo=${summary.avgSeo} avgHuman=${summary.avgHuman}`,
  );

  if (summary.p0 > 0) process.exitCode = 0;
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|");
}

function priorityOrder(p: string): number {
  if (p === "P0") return 0;
  if (p === "P1") return 1;
  return 2;
}

function pillarBreakdown(inventory: ReturnType<typeof auditHallGuidesCatalog>["inventory"]): string[] {
  const counts = new Map<string, number>();
  for (const row of inventory) {
    const key = row.pillar || "—";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([pillar, n]) => `- **${pillar}**: ${n}`);
}

function formatGuideBlock(r: ReturnType<typeof auditHallGuidesCatalog>["audits"][0]): string {
  const lines = [
    `### ${r.title}`,
    "",
    `- **URL:** ${r.url}`,
    `- **Priority:** ${r.priority}`,
    `- **Primary keyword:** ${r.primaryKeyword}`,
    `- **Scores:** SEO ${r.seoScore} · Human ${r.humanWritingScore} · Trust ${r.trustScore} · Firefighter ${r.firefighterRelevanceScore} · Intent ${r.searchIntentScore} · Depth ${r.depthScore}`,
    `- **Title length:** ${r.titleLength} · **Meta:** ${r.metaDescriptionLength} chars · **H2 sections:** ${r.h2Count} · **Recipe links:** ${r.recipeLinkCount}`,
  ];
  if (r.aiFlags.length) lines.push(`- **AI flags:** ${r.aiFlags.join(", ")}`);
  if (r.factFlags.length) lines.push(`- **Fact flags:** ${r.factFlags.join(", ")}`);
  if (r.recommendedChanges.length) {
    lines.push("", "**Recommended changes:**");
    for (const c of r.recommendedChanges) lines.push(`- ${c}`);
  }
  return lines.join("\n");
}

main();
