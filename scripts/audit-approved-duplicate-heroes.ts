#!/usr/bin/env tsx
/**
 * Approved-catalog duplicate hero audit — same image bytes on multiple approved recipes.
 *
 *   npm run audit:approved-duplicate-heroes
 *
 * Output: review/approved-duplicate-heroes-audit.json
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";

const PUBLIC = path.join(process.cwd(), "client", "public");
const OUT = path.join("review", "approved-duplicate-heroes-audit.json");

function readHeroBuffer(heroPath: string): Buffer | null {
  const rel = heroPath.replace(/^\//, "");
  const candidates = [
    path.join(PUBLIC, rel),
    path.join(PUBLIC, rel.replace(/\.webp$/, ".jpg")),
    path.join(PUBLIC, rel.replace(/\.jpg$/, ".webp")),
  ];
  for (const abs of candidates) {
    if (fs.existsSync(abs)) return fs.readFileSync(abs);
  }
  return null;
}

function main(): void {
  const byHash = new Map<string, Array<{ slug: string; title: string; heroImage: string }>>();

  for (const entry of buildAllApprovedCatalogEntries()) {
    const buf = readHeroBuffer(entry.heroImage);
    if (!buf) continue;
    const hash = crypto.createHash("md5").update(buf).digest("hex");
    const list = byHash.get(hash) ?? [];
    list.push({ slug: entry.slug, title: entry.title, heroImage: entry.heroImage });
    byHash.set(hash, list);
  }

  const duplicateGroups = [...byHash.entries()]
    .filter(([, slugs]) => slugs.length > 1)
    .map(([hash, recipes]) => ({ hash, count: recipes.length, recipes }))
    .sort((a, b) => b.count - a.count);

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      approvedRecipes: buildAllApprovedCatalogEntries().length,
      duplicateGroups: duplicateGroups.length,
      recipesInDuplicateGroups: duplicateGroups.reduce((n, g) => n + g.count, 0),
    },
    duplicateGroups,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

  console.log(
    `[audit:approved-duplicate-heroes] groups=${report.totals.duplicateGroups} recipes=${report.totals.recipesInDuplicateGroups}`,
  );
  console.log(`[audit:approved-duplicate-heroes] wrote ${OUT}`);

  if (duplicateGroups.length > 0) {
    for (const g of duplicateGroups.slice(0, 5)) {
      console.error(`  DUP x${g.count}: ${g.recipes.map((r) => r.slug).join(", ")}`);
    }
    process.exit(1);
  }
}

main();
