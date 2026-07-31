#!/usr/bin/env tsx
/**
 * Repair: `relatedSlugs` arrays that reference recipe slugs which no longer
 * exist in the catalog (renamed/removed at some point without updating the
 * recipes that linked to them). Confirmed by `npm run audit:404` — dangling
 * related-recipe links break the "related recipes" UI (renders a broken
 * card) and count as broken internal links for crawlers.
 *
 * Strategy: build the full set of real catalog slugs across every
 * collection, then strip any `relatedSlugs` entry that isn't in that set.
 * We do NOT guess a replacement — an accurate, shorter related-list beats a
 * plausible-looking but unverified substitution.
 */
import fs from "node:fs";
import path from "node:path";

const CATALOG_ROOT = path.join(process.cwd(), "client", "public", "catalog");

function findPageFiles(): string[] {
  const results: string[] = [];
  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".json") && entry.name !== "index.json") {
        results.push(full);
      }
    }
  }
  walk(CATALOG_ROOT);
  return results;
}

function main(): void {
  const files = findPageFiles();
  const validSlugs = new Set(files.map((f) => path.basename(f, ".json")));

  let filesChanged = 0;
  let referencesRemoved = 0;
  const changedFiles: string[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!Array.isArray(data.relatedSlugs)) continue;

    const original = data.relatedSlugs as string[];
    const cleaned = original.filter((s) => validSlugs.has(s));
    if (cleaned.length !== original.length) {
      referencesRemoved += original.length - cleaned.length;
      data.relatedSlugs = cleaned;
      fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
      filesChanged++;
      changedFiles.push(path.relative(process.cwd(), file));
    }
  }

  console.log(`[repair-dangling-related-slugs] catalog slugs: ${validSlugs.size}`);
  console.log(`[repair-dangling-related-slugs] files changed: ${filesChanged}`);
  console.log(`[repair-dangling-related-slugs] dangling references removed: ${referencesRemoved}`);
  if (changedFiles.length) {
    console.log(`[repair-dangling-related-slugs] changed files:`);
    for (const f of changedFiles) console.log(`  - ${f}`);
  }
}

main();
