#!/usr/bin/env tsx
/**
 * Repair `relatedSlugs` entries that point at recipes which no longer exist
 * in the catalog (Sprint 1 recipe platform audit — `npm run audit:404`
 * flagged 77 recipe pages with `broken_related:<ghost-slug>`, most of them
 * pointing at a handful of slugs — e.g. `carolina-vinegar-pulled-pork` —
 * that were removed/renamed at some point but never scrubbed from the
 * "related recipes" lists of dozens of other pages).
 *
 * For every catalog page:
 *  1. Drop any relatedSlugs entry that doesn't resolve to a real page.
 *  2. Backfill up to `TARGET_COUNT` entries with the closest real matches
 *     (same collection, ranked by shared cuisine/category/protein/format
 *     tags), so "Related firefighter meals" never regresses to an empty or
 *     thin section.
 *
 *   npx tsx scripts/fix-broken-related-slugs.ts --dry-run
 *   npx tsx scripts/fix-broken-related-slugs.ts
 */
import fs from "node:fs";
import path from "node:path";

const DRY_RUN = process.argv.includes("--dry-run");
const TARGET_COUNT = 4;

const CATALOG_DIRS = [
  "client/public/catalog/golden-100/pages",
  "client/public/catalog/performance-meals/pages",
  "client/public/catalog/hall-expansion/pages",
  "client/public/catalog/pizza-night/pages",
  "client/public/catalog/bbq/pages",
  "client/public/catalog/breakfast/pages",
  "client/public/catalog/breakfast-meals/pages",
  "client/public/catalog/smoothies/pages",
];

interface PageRecord {
  file: string;
  slug: string;
  json: Record<string, any>;
}

function loadAll(): PageRecord[] {
  const records: PageRecord[] = [];
  for (const dir of CATALOG_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      const full = path.join(dir, file);
      try {
        const json = JSON.parse(fs.readFileSync(full, "utf8"));
        if (json?.slug) records.push({ file: full, slug: json.slug, json });
      } catch {
        // skip malformed
      }
    }
  }
  return records;
}

function tagSet(json: Record<string, any>): Set<string> {
  const tags: string[] = Array.isArray(json.tags) ? json.tags : [];
  const extra = [json.cuisine, json.category, json.protein].filter(Boolean).map(String);
  return new Set([...tags, ...extra].map((t) => t.toLowerCase()));
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}

function main() {
  const all = loadAll();
  const bySlug = new Map(all.map((r) => [r.slug, r]));
  const byDir = new Map<string, PageRecord[]>();
  for (const r of all) {
    const dir = path.dirname(r.file);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir)!.push(r);
  }

  let filesChanged = 0;
  let ghostRefsRemoved = 0;
  let backfilled = 0;
  const ghostTally = new Map<string, number>();

  for (const record of all) {
    const related: string[] = Array.isArray(record.json.relatedSlugs) ? record.json.relatedSlugs : [];
    if (related.length === 0) continue;

    const valid = related.filter((s) => bySlug.has(s) && s !== record.slug);
    const removedCount = related.length - valid.length;
    if (removedCount > 0) {
      for (const s of related) {
        if (!bySlug.has(s)) ghostTally.set(s, (ghostTally.get(s) || 0) + 1);
      }
    }

    let next = [...new Set(valid)];

    if (next.length < TARGET_COUNT) {
      const dir = path.dirname(record.file);
      const pool = byDir.get(dir) ?? all;
      const myTags = tagSet(record.json);
      const exclude = new Set([record.slug, ...next]);
      const candidates = pool
        .filter((r) => !exclude.has(r.slug))
        .map((r) => ({ slug: r.slug, score: overlap(myTags, tagSet(r.json)) }))
        .sort((a, b) => b.score - a.score);
      for (const c of candidates) {
        if (next.length >= TARGET_COUNT) break;
        next.push(c.slug);
      }
    }

    if (removedCount > 0 || next.length !== related.length || next.some((s, i) => s !== related[i])) {
      filesChanged++;
      ghostRefsRemoved += removedCount;
      backfilled += Math.max(0, next.length - valid.length);
      if (!DRY_RUN) {
        record.json.relatedSlugs = next;
        fs.writeFileSync(record.file, JSON.stringify(record.json, null, 2) + "\n", "utf8");
      }
    }
  }

  console.log(`[fix-broken-related-slugs] scanned ${all.length} pages`);
  console.log(`[fix-broken-related-slugs] files changed: ${filesChanged}`);
  console.log(`[fix-broken-related-slugs] ghost references removed: ${ghostRefsRemoved}`);
  console.log(`[fix-broken-related-slugs] replacement slugs added: ${backfilled}`);
  console.log(`[fix-broken-related-slugs] ghost slugs (count of pages referencing them):`);
  for (const [slug, count] of [...ghostTally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}x  ${slug}`);
  }
  if (DRY_RUN) console.log(`[fix-broken-related-slugs] DRY RUN — no files written`);
}

main();
