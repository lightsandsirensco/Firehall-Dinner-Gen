#!/usr/bin/env tsx
/**
 * Recipe slug / file / image integrity audit.
 *
 * Checks, across the entire catalog:
 *   1. Every index.json entry's slug has a matching pages/<slug>.json file.
 *   2. Every pages/<slug>.json file's internal `slug` field matches its filename.
 *   3. No slug appears more than once within a collection's index.json.
 *   4. Each recipe's hero/thumb/mobile image path embeds that recipe's own slug
 *      (catches copy/paste image-path mistakes where one recipe points at another's photo).
 *
 *   npx tsx scripts/audit-recipe-slug-image-integrity.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CATALOG_DIR = path.join(ROOT, "client", "public", "catalog");

type Issue = { collection: string; slug: string; issue: string };

function main() {
  const issues: Issue[] = [];
  const collections = fs
    .readdirSync(CATALOG_DIR)
    .filter((c) => fs.statSync(path.join(CATALOG_DIR, c)).isDirectory());

  let totalRecipes = 0;

  for (const collection of collections) {
    const indexPath = path.join(CATALOG_DIR, collection, "index.json");
    const pagesDir = path.join(CATALOG_DIR, collection, "pages");
    if (!fs.existsSync(indexPath) || !fs.existsSync(pagesDir)) continue;

    const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    const entries: any[] = Array.isArray(index) ? index : index.recipes ?? [];

    const seenSlugs = new Map<string, number>();
    for (const entry of entries) {
      const slug = entry.slug;
      if (!slug) {
        issues.push({ collection, slug: "(missing)", issue: "index entry with no slug" });
        continue;
      }
      seenSlugs.set(slug, (seenSlugs.get(slug) ?? 0) + 1);

      const pageFile = path.join(pagesDir, `${slug}.json`);
      if (!fs.existsSync(pageFile)) {
        issues.push({ collection, slug, issue: `index references missing page file pages/${slug}.json` });
        continue;
      }

      totalRecipes++;
      const page = JSON.parse(fs.readFileSync(pageFile, "utf8"));
      if (page.slug !== slug) {
        issues.push({
          collection,
          slug,
          issue: `page file's internal slug ("${page.slug}") does not match filename ("${slug}")`,
        });
      }

      for (const field of ["heroImage", "mobileImage", "thumbImage", "railImage"]) {
        const val = page[field];
        if (typeof val !== "string" || !val) continue;
        // Extract the filename stem (without extension) and check it references this slug.
        const stem = path.basename(val).replace(/\.(jpg|jpeg|png|webp)$/i, "");
        if (stem !== slug) {
          issues.push({
            collection,
            slug,
            issue: `${field} ("${val}") does not embed this recipe's own slug (found "${stem}")`,
          });
        }
      }
    }

    for (const [slug, count] of seenSlugs) {
      if (count > 1) {
        issues.push({ collection, slug, issue: `slug appears ${count} times in index.json` });
      }
    }

    // Orphan page files not referenced by the index.
    const pageFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith(".json"));
    for (const f of pageFiles) {
      const slug = f.replace(/\.json$/, "");
      if (!seenSlugs.has(slug)) {
        issues.push({ collection, slug, issue: "page file exists but is not referenced in index.json" });
      }
    }
  }

  console.log(`Checked ${totalRecipes} recipes across ${collections.length} collections.\n`);
  if (!issues.length) {
    console.log("No slug/file/image integrity issues found.");
  } else {
    console.log(`Found ${issues.length} issue(s):\n`);
    for (const i of issues) {
      console.log(`  [${i.collection}] ${i.slug}: ${i.issue}`);
    }
  }

  const reviewDir = path.join(ROOT, "review");
  fs.mkdirSync(reviewDir, { recursive: true });
  fs.writeFileSync(
    path.join(reviewDir, "recipe-slug-image-integrity-audit.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), totalRecipes, issueCount: issues.length, issues }, null, 2) + "\n",
    "utf8",
  );
  console.log(`\nReport written to review/recipe-slug-image-integrity-audit.json`);
}

main();
