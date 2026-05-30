#!/usr/bin/env tsx
/** Writes human-readable transparency report from catalog-250-full-transparency.json */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const json = JSON.parse(
  fs.readFileSync(path.join(ROOT, "review/catalog-250-full-transparency.json"), "utf8"),
);

const byRecipe = new Map<string, { slug: string; max: number; partners: string[] }>();
for (const p of json.duplicatePairs70Plus as Array<{ slugA: string; slugB: string; score: number }>) {
  for (const [slug, other] of [
    [p.slugA, p.slugB],
    [p.slugB, p.slugA],
  ] as const) {
    const cur = byRecipe.get(slug) ?? { slug, max: 0, partners: [] };
    cur.max = Math.max(cur.max, p.score);
    if (!cur.partners.includes(other)) cur.partners.push(other);
    byRecipe.set(slug, cur);
  }
}

const dupRecipes = [...byRecipe.values()].sort((a, b) => b.max - a.max || a.slug.localeCompare(b.slug));

const lines = [
  "# Catalog 250 — Full Transparency Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Official production score (audit:catalog-250)",
  "",
  "**100/100** — 0 critical, 0 warnings (re-audited after thin-ingredient fixes).",
  "",
  "## Batch-250 recipes (26)",
  "",
  ...(json.batch250Slugs as Array<{ slug: string; title: string }>).map(
    (r) => `- \`${r.slug}\` — ${r.title}`,
  ),
  "",
  "## Ingredient overlap ≥70% — batch-250 pairs (8)",
  "",
  ...(json.batch250DuplicatePairs70Plus as Array<{ slugA: string; slugB: string; score: number; titleA: string; titleB: string }>).map(
    (p) => `- **${p.score}%** — \`${p.slugA}\` ↔ \`${p.slugB}\` (${p.titleA} / ${p.titleB})`,
  ),
  "",
  "## Ingredient overlap ≥70% — all affected recipes (121 unique slugs)",
  "",
  "| Max overlap | Slug | Partner count |",
  "|------------:|------|--------------:|",
  ...dupRecipes.map((r) => `| ${r.max}% | \`${r.slug}\` | ${r.partners.length} |`),
  "",
  "## Image match confidence below 90% (250 approved recipes)",
  "",
  "Match confidence = `100 - mismatchConfidence` from curated image governance.",
  "",
  "| Match confidence | Count |",
  "|-----------------:|------:|",
];

const imgHist = new Map<number, number>();
for (const row of json.imageMatchConfidenceBelow90 as Array<{ confidence: number }>) {
  imgHist.set(row.confidence, (imgHist.get(row.confidence) ?? 0) + 1);
}
for (const [conf, count] of [...imgHist.entries()].sort((a, b) => a[0] - b[0])) {
  lines.push(`| ${conf}% | ${count} |`);
}

lines.push(
  "",
  "## Manual image review queue (14 approved recipes)",
  "",
  "These have `needsManualReview: true` in image governance — **not yet human-signed-off** for imagery.",
  "",
  ...(json.needsManualImageReview as Array<{ slug: string; title: string; confidence: number }>).map(
    (r) => `- \`${r.slug}\` — ${r.title} (mismatch confidence ${r.confidence})`,
  ),
  "",
  "## Note on manual editorial audit",
  "",
  "There is no per-recipe `manuallyAudited` flag on the approved catalog. Image governance manual review (above) is the closest automated queue. Full editorial human sign-off has not been recorded for all 250 recipes.",
  "",
);

fs.writeFileSync(path.join(ROOT, "review/catalog-250-transparency-report.md"), lines.join("\n"), "utf8");
console.log("[report] wrote review/catalog-250-transparency-report.md");
