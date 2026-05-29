#!/usr/bin/env tsx
/**
 * Audit hero image integrity across the curated hall catalog (150).
 *
 * Focus:
 * - Detect broad fallback reuse (many slugs resolving to the same editorial fallback)
 * - Flag likely mismatches (e.g. bowl meals using generic BBQ chicken bowl fallback)
 *
 * Note: This script audits *fallback behavior* and *duplicate hero paths*.
 * It cannot "see" the image pixels; it enforces strict mapping rules.
 *
 * Usage:
 *   npx tsx scripts/audit-hero-image-integrity.ts
 *   npx tsx scripts/audit-hero-image-integrity.ts --json
 */

import { loadMergedHallCatalogIndex, resolveHallRecipePage } from "../server/meal-catalog/load-index.js";
import { resolveEditorialFallbackHero } from "../shared/meal-hero-fallback.js";
import { heroPathConflictsTitle } from "../shared/meal-image-title-match.js";

const args = process.argv.slice(2);
const asJson = args.includes("--json");

type Issue = {
  slug: string;
  title: string;
  heroImage?: string;
  issue: string;
  detail?: string;
  recommended?: string;
};

function normalizePath(p: string): string {
  return p.trim();
}

function recommendedQuery(title: string, cuisine: string, protein: string, mealFormat: string): string {
  const bits = [title, cuisine, protein, mealFormat]
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  return bits.join(" · ");
}

function main(): void {
  const index = loadMergedHallCatalogIndex();
  const issues: Issue[] = [];

  // 1) Duplicate hero paths in the published catalog pages.
  const heroToSlugs = new Map<string, string[]>();
  for (const row of index.recipes) {
    const page = resolveHallRecipePage(row.slug);
    const hero = page?.heroImage?.trim();
    if (!hero) continue;
    const key = normalizePath(hero);
    const list = heroToSlugs.get(key) ?? [];
    list.push(row.slug);
    heroToSlugs.set(key, list);
  }
  for (const [hero, slugs] of heroToSlugs.entries()) {
    if (slugs.length <= 1) continue;
    // Per-slug heroes should generally be unique. Duplicates are suspicious.
    issues.push({
      slug: slugs[0]!,
      title: slugs[0]!,
      heroImage: hero,
      issue: "duplicate_catalog_hero",
      detail: `shared_by=${slugs.length} slugs: ${slugs.slice(0, 8).join(", ")}${slugs.length > 8 ? "…" : ""}`,
    });
  }

  // 2) Editorial fallback mapping checks (what generator uses when imagery is missing).
  const fbToSlugs = new Map<string, string[]>();
  for (const row of index.recipes) {
    const fb = resolveEditorialFallbackHero(row.title, {
      mealFormat: row.mealFormat,
      protein: row.protein,
    });
    if (!fb) continue;
    const key = normalizePath(fb);
    const list = fbToSlugs.get(key) ?? [];
    list.push(row.slug);
    fbToSlugs.set(key, list);

    // If fallback image conflicts with the title by our semantic rules, flag hard.
    if (heroPathConflictsTitle(fb, row.title, row.mealFormat)) {
      issues.push({
        slug: row.slug,
        title: row.title,
        heroImage: fb,
        issue: "editorial_fallback_conflicts_title",
        recommended: recommendedQuery(row.title, row.cuisine, row.protein, row.mealFormat),
      });
    }
  }

  // Flag broad fallback reuse (archetype reuse).
  for (const [hero, slugs] of fbToSlugs.entries()) {
    if (slugs.length < 4) continue;
    issues.push({
      slug: slugs[0]!,
      title: slugs[0]!,
      heroImage: hero,
      issue: "broad_editorial_fallback_reuse",
      detail: `shared_by=${slugs.length} slugs: ${slugs.slice(0, 10).join(", ")}${slugs.length > 10 ? "…" : ""}`,
    });
  }

  const report = {
    recipeCount: index.recipes.length,
    issuesCount: issues.length,
    issues,
  };

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[audit:hero-integrity] recipes=${report.recipeCount} issues=${report.issuesCount}`);
    for (const i of issues.slice(0, 50)) {
      console.log(
        `  - ${i.slug}: ${i.issue}${i.heroImage ? ` hero=${i.heroImage}` : ""}${i.detail ? ` (${i.detail})` : ""}`,
      );
    }
    if (issues.length > 50) console.log(`  … and ${issues.length - 50} more`);
  }

  process.exit(issues.length > 0 ? 1 : 0);
}

main();

