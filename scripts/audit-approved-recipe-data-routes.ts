#!/usr/bin/env tsx
/**
 * Validate every approved Explore catalog slug has on-disk JSON data,
 * correct route paths, and hero images — never HTML fallbacks.
 *
 *   npx tsx scripts/audit-approved-recipe-data-routes.ts
 */
import fs from "node:fs";
import path from "node:path";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import { approvedCatalogRecipePath } from "../shared/approved-catalog.js";
import { breakfastPageJsonPath } from "../shared/fuel-catalog/paths.js";
import { smoothiePageJsonPath } from "../shared/fuel-catalog/paths.js";
import { goldenPageJsonPath } from "../shared/golden-100/recipe-page-paths.js";
import { performancePageJsonPath } from "../shared/performance-meals/recipe-page-paths.js";
import { hallExpansionCatalogPagePath } from "../shared/hall-expansion/recipe-page-paths.js";
import { isBreakfastCatalogSlug } from "../shared/hall-catalog/gate.js";
import { getSmoothieCatalogItem } from "../shared/fuel-catalog/smoothies/catalog-data.js";

const PUBLIC_ROOT = path.join(process.cwd(), "client", "public");

function publicPathFromUrl(urlPath: string): string {
  return path.join(PUBLIC_ROOT, urlPath.replace(/^\//, ""));
}

function resolveMealDataCandidates(slug: string): string[] {
  return [
    goldenPageJsonPath(slug),
    performancePageJsonPath(slug),
    hallExpansionCatalogPagePath(slug),
  ];
}

function resolveDataUrl(slug: string, kind: string): string | null {
  if (kind === "breakfast_catalog" || isBreakfastCatalogSlug(slug)) {
    return breakfastPageJsonPath(slug);
  }
  if (kind === "smoothie" || getSmoothieCatalogItem(slug)) {
    return smoothiePageJsonPath(slug);
  }
  for (const candidate of resolveMealDataCandidates(slug)) {
    if (fs.existsSync(publicPathFromUrl(candidate))) return candidate;
  }
  return resolveMealDataCandidates(slug)[0] ?? goldenPageJsonPath(slug);
}

function assertValidJsonFile(absPath: string, slug: string, errors: string[]): void {
  if (!fs.existsSync(absPath)) {
    errors.push(`Missing data JSON for ${slug}: ${absPath}`);
    return;
  }
  const raw = fs.readFileSync(absPath, "utf8").trimStart();
  if (raw.startsWith("<!") || raw.startsWith("<html")) {
    errors.push(`HTML instead of JSON for ${slug}: ${absPath}`);
    return;
  }
  let parsed: { slug?: string; title?: string };
  try {
    parsed = JSON.parse(raw) as { slug?: string; title?: string };
  } catch {
    errors.push(`Invalid JSON for ${slug}: ${absPath}`);
    return;
  }
  if (!parsed.slug?.trim()) errors.push(`Missing slug field in JSON for ${slug}`);
  if (!parsed.title?.trim()) errors.push(`Missing title field in JSON for ${slug}`);
}

function assertRoutePath(slug: string, kind: string, errors: string[]): void {
  const route = approvedCatalogRecipePath(slug);
  if (kind === "breakfast_catalog" && !route.startsWith("/breakfast/")) {
    errors.push(`Breakfast slug ${slug} should route to /breakfast/*, got ${route}`);
  }
  if (kind === "smoothie" && !route.startsWith("/recipes/")) {
    errors.push(`Smoothie slug ${slug} should route to /recipes/*, got ${route}`);
  }
  if (
    kind !== "breakfast_catalog" &&
    kind !== "smoothie" &&
    !route.startsWith("/recipes/")
  ) {
    errors.push(`Meal slug ${slug} should route to /recipes/*, got ${route}`);
  }
}

function assertHeroImage(heroImage: string, slug: string, errors: string[]): void {
  if (!heroImage.startsWith("/images/")) {
    errors.push(`Non-curated hero path for ${slug}: ${heroImage}`);
    return;
  }
  const abs = publicPathFromUrl(heroImage);
  if (!fs.existsSync(abs)) {
    errors.push(`Missing hero image for ${slug}: ${heroImage}`);
  }
}

function main(): void {
  const catalog = buildApprovedCatalog();
  const errors: string[] = [];
  const slugs = new Set<string>();
  let breakfastCount = 0;
  let smoothieCount = 0;
  let mealCount = 0;

  for (const entry of catalog.recipes) {
    if (slugs.has(entry.slug)) {
      errors.push(`Duplicate approved slug: ${entry.slug}`);
    }
    slugs.add(entry.slug);

    if (entry.kind === "breakfast_catalog") breakfastCount += 1;
    else if (entry.isSmoothie) smoothieCount += 1;
    else mealCount += 1;

    assertRoutePath(entry.slug, entry.kind, errors);

    const dataUrl = resolveDataUrl(entry.slug, entry.kind);
    if (!dataUrl) {
      errors.push(`Could not resolve data URL for ${entry.slug}`);
      continue;
    }
    assertValidJsonFile(publicPathFromUrl(dataUrl), entry.slug, errors);
    assertHeroImage(entry.heroImage, entry.slug, errors);
  }

  if (errors.length > 0) {
    console.error("[audit-approved-recipe-data-routes] FAIL\n");
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log(
    `[audit-approved-recipe-data-routes] PASS — ${catalog.recipeCount} recipes (${mealCount} meals, ${breakfastCount} breakfast, ${smoothieCount} smoothies)`,
  );
}

main();
