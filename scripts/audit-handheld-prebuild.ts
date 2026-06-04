#!/usr/bin/env tsx
/**
 * Pre-build catalog audit for handheld expansion (7 requested meals).
 */
import fs from "node:fs";
import path from "node:path";

const PROPOSED = [
  { slug: "chicken-caesar-wraps", title: "Chicken Caesar Wraps", format: "wrap" },
  { slug: "buffalo-chicken-wraps", title: "Buffalo Chicken Wraps", format: "wrap" },
  { slug: "greek-chicken-pitas", title: "Greek Chicken Pitas", format: "pita" },
  { slug: "beef-gyros-for-the-hall", title: "Beef Gyros", format: "pita" },
  { slug: "chicken-shawarma-pitas", title: "Chicken Shawarma Pitas", format: "pita" },
  { slug: "sausage-peppers-on-buns", title: "Sausage & Peppers on Buns", format: "hoagie" },
  { slug: "chicken-dumpling-soup", title: "Chicken and Dumplings", format: "stew", existing: true },
] as const;

function catalogTitles(): Array<{ slug: string; title: string; collection: string }> {
  const out: Array<{ slug: string; title: string; collection: string }> = [];
  const roots = [
    ["golden-100", "client/public/catalog/golden-100/index.json"],
    ["hall-expansion", "client/public/catalog/hall-expansion/index.json"],
    ["breakfast", "client/public/catalog/breakfast/index.json"],
    ["performance-meals", "client/public/catalog/performance-meals/index.json"],
  ] as const;
  for (const [collection, indexPath] of roots) {
    const p = path.join(process.cwd(), indexPath);
    if (!fs.existsSync(p)) continue;
    const index = JSON.parse(fs.readFileSync(p, "utf8")) as { recipes: Array<{ slug: string; title: string }> };
    for (const r of index.recipes) out.push({ slug: r.slug, title: r.title, collection });
  }
  return out;
}

function tokenSet(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean));
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}

const catalog = catalogTitles();
const report = {
  generatedAt: new Date().toISOString(),
  catalogMealCount: catalog.length,
  greekVsShawarma: {
    verdict: "SUFFICIENTLY DIFFERENT",
    rationale:
      "Greek pitas use lemon-oregano yogurt marinade, fresh cucumber-tomato-onion, and tzatziki-forward build. Shawarma pitas use warm spice blend (cumin, coriander, turmeric, paprika), optional pickled vegetables, and garlic-tahini sauce — different marinade, garnish, and flavour profile. Not a duplicate of shawarma-bar-night (bar spread) or shawarma-chicken-rice-bowls (bowl).",
  },
  buffaloWrapVsExisting: {
    verdict: "PASS — NO HANDHELD OVERLAP",
    existing: catalog.filter((c) => /buffalo/i.test(c.title)),
    rationale:
      "Catalog has Buffalo Chicken Dip (baked dip) only. No buffalo chicken wrap or buffalo sandwich. Wrap is distinct format.",
  },
  chickenDumplings: {
    verdict: "EXISTING SLUG — ENHANCE IN PLACE",
    slug: "chicken-dumpling-soup",
    rationale:
      "Do not add second recipe. Upgrade instructions/images on chicken-dumpling-soup to thick stew with dropped dumplings (not brothy soup template).",
  },
  proposed: [] as Array<Record<string, unknown>>,
};

for (const p of PROPOSED) {
  const pTokens = tokenSet(p.title);
  const near = catalog
    .map((c) => ({ ...c, score: overlap(pTokens, tokenSet(c.title)) }))
    .filter((c) => c.score >= 2 && c.slug !== p.slug)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  const exact = catalog.find((c) => c.slug === p.slug || c.title.toLowerCase() === p.title.toLowerCase());
  report.proposed.push({
    slug: p.slug,
    title: p.title,
    existing: exact ?? null,
    nearDuplicates: near,
    buildAction: p.existing ? "enhance_existing_golden_page" : "add_hall_expansion",
  });
}

const outPath = path.join(process.cwd(), "review/handheld-prebuild-audit.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
