#!/usr/bin/env tsx
/**
 * Audit recipes whose titles include "with [side]" for firehall pairing accuracy.
 *
 *   npm run audit:title-side-accuracy
 */
import fs from "node:fs";
import path from "node:path";
import {
  auditTitleSidePairing,
  isSidePairingTitle,
  normalizeSidePairingTitle,
} from "../shared/curated-image-governance/title-side-pairing-governance.js";
import {
  auditTitlePrimarySideAlignment,
  hasImageTitleMismatch,
} from "../shared/curated-image-governance/title-primary-side-rules.js";
import { loadTrustAuditTargets } from "../shared/curated-image-governance/trust-audit-targets.js";

const JSON_OUT = path.join("review", "title-side-accuracy-audit.json");
const MD_OUT = path.join("review", "title-side-accuracy-audit.md");

type Row = {
  slug: string;
  collection: string;
  title: string;
  heroImage: string;
  heroAlt?: string;
  sidePairingTitle: boolean;
  pairingIssues: ReturnType<typeof auditTitleSidePairing>;
  imageIssues: ReturnType<typeof auditTitlePrimarySideAlignment>;
  fail: boolean;
};

function walkJsonPages(root: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walkJsonPages(p));
    else if (entry.name.endsWith(".json") && entry.name !== "index.json") out.push(p);
  }
  return out;
}

function loadCatalogRows(): Row[] {
  const rows: Row[] = [];
  const roots = [
    ["golden_100", "client/public/catalog/golden-100/pages"],
    ["performance_meals", "client/public/catalog/performance-meals/pages"],
    ["hall_expansion", "client/public/catalog/hall-expansion/pages"],
    ["breakfast", "client/public/catalog/breakfast/pages"],
    ["bbq", "client/public/catalog/bbq/pages"],
  ] as const;

  for (const [collection, rel] of roots) {
    for (const file of walkJsonPages(path.join(process.cwd(), rel))) {
      const page = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      const slug = String(page.slug || path.basename(file, ".json"));
      const title = String(page.title || page.displayTitle || "");
      if (!/\bwith\b/i.test(title)) continue;
      const heroImage = String(page.heroImage || "");
      const heroAlt = page.heroImageAlt ? String(page.heroImageAlt) : undefined;
      const pairingIssues = auditTitleSidePairing({ slug, title, heroPath: heroImage, heroAlt });
      const imageIssues = auditTitlePrimarySideAlignment({
        slug,
        title,
        heroPath: heroImage,
        heroAlt,
      });
      rows.push({
        slug,
        collection,
        title,
        heroImage,
        heroAlt,
        sidePairingTitle: isSidePairingTitle(title),
        pairingIssues,
        imageIssues,
        fail:
          pairingIssues.some((i) => i.severity === "critical") || hasImageTitleMismatch(imageIssues),
      });
    }
  }
  return rows;
}

function main(): void {
  const normalizedExample = normalizeSidePairingTitle(
    "Shepherd's Pie",
    "Quinoa",
    "Greek Salad",
  );

  const catalogRows = loadCatalogRows();
  const trustTargets = loadTrustAuditTargets().filter((t) => /\bwith\b/i.test(t.title));
  const trustRows: Row[] = trustTargets.map((t) => {
    const pairingIssues = auditTitleSidePairing({
      slug: t.slug,
      title: t.title,
      heroPath: t.heroImage,
      heroAlt: t.heroAlt,
    });
    const imageIssues = auditTitlePrimarySideAlignment({
      slug: t.slug,
      title: t.title,
      heroPath: t.heroImage,
      heroAlt: t.heroAlt,
    });
    return {
      slug: t.slug,
      collection: t.collection,
      title: t.title,
      heroImage: t.heroImage,
      heroAlt: t.heroAlt,
      sidePairingTitle: isSidePairingTitle(t.title),
      pairingIssues,
      imageIssues,
      fail:
        pairingIssues.some((i) => i.severity === "critical") || hasImageTitleMismatch(imageIssues),
    };
  });

  function buildRow(input: {
    slug: string;
    collection: string;
    title: string;
    heroImage: string;
    heroAlt?: string;
  }): Row {
    const pairingIssues = auditTitleSidePairing({
      slug: input.slug,
      title: input.title,
      heroPath: input.heroImage,
      heroAlt: input.heroAlt,
    });
    const imageIssues = auditTitlePrimarySideAlignment({
      slug: input.slug,
      title: input.title,
      heroPath: input.heroImage,
      heroAlt: input.heroAlt,
    });
    return {
      slug: input.slug,
      collection: input.collection,
      title: input.title,
      heroImage: input.heroImage,
      heroAlt: input.heroAlt,
      sidePairingTitle: isSidePairingTitle(input.title),
      pairingIssues,
      imageIssues,
      fail:
        pairingIssues.some((i) => i.severity === "critical") || hasImageTitleMismatch(imageIssues),
    };
  }

  const bySlug = new Map<string, Row>();
  for (const r of [...catalogRows, ...trustRows]) {
    const key = `${r.collection}:${r.slug}`;
    const prev = bySlug.get(key);
    const merged = {
      slug: r.slug,
      collection: r.collection,
      title: r.title || prev?.title || "",
      heroImage: r.heroImage || prev?.heroImage || "",
      heroAlt: r.heroAlt || prev?.heroAlt,
    };
    bySlug.set(key, buildRow(merged));
  }
  const rows = [...bySlug.values()].sort((a, b) => a.title.localeCompare(b.title));

  const sidePairingRows = rows.filter((r) => r.sidePairingTitle);
  const failed = rows.filter((r) => r.fail);
  const criticalPairing = rows.filter((r) =>
    r.pairingIssues.some((i) => i.severity === "critical"),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    normalizedExample: {
      before: "Shepherd's Pie with Quinoa & Greek Salad",
      after: normalizedExample,
    },
    totals: {
      titlesWithWith: rows.length,
      sidePairingTitles: sidePairingRows.length,
      failed: failed.length,
      criticalPairingIssues: criticalPairing.length,
    },
    failed,
    sidePairingTitles: sidePairingRows,
    allWithTitles: rows,
  };

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2), "utf8");

  const md = `# Title + Side Accuracy Audit

Generated: ${report.generatedAt}

## Summary

| Metric | Count |
| --- | --- |
| Titles containing "with" | ${report.totals.titlesWithWith} |
| Side-pairing titles (generator-style) | ${report.totals.sidePairingTitles} |
| Failed (critical pairing or P0 image) | ${report.totals.failed} |
| Critical pairing issues | ${report.totals.criticalPairingIssues} |

## Normalization Example

- **Before:** Shepherd's Pie with Quinoa & Greek Salad
- **After:** ${normalizedExample}

## Failed Recipes

${failed.length ? failed.map((r) => `- \`${r.slug}\` (${r.collection}) — **${r.title}**`).join("\n") : "_None_"}

## Side-Pairing Titles

${sidePairingRows.map((r) => `- \`${r.slug}\` — ${r.title}${r.fail ? " **FAIL**" : ""}`).join("\n") || "_None_"}
`;

  fs.writeFileSync(MD_OUT, md, "utf8");
  console.log(`[audit:title-side-accuracy] wrote ${JSON_OUT} and ${MD_OUT}`);
  console.log(
    `[audit:title-side-accuracy] with-titles=${rows.length} side-pairing=${sidePairingRows.length} failed=${failed.length}`,
  );
  if (failed.length) process.exitCode = 1;
}

main();
