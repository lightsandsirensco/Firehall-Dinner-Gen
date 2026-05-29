#!/usr/bin/env tsx
/**
 * Validate Golden 100 recipe JSON-LD + unique metadata for SEO.
 *
 *   npx tsx scripts/validate-seo-schema.ts
 *   npx tsx scripts/validate-seo-schema.ts --json
 */
import fs from "node:fs";
import path from "node:path";
import { buildRecipePageSeo } from "../shared/seo/metadata.js";
import { buildRecipeSchema } from "../shared/seo/schema.js";
import { resolvePublicSiteOrigin } from "../server/seo/sitemap.js";
import type { GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";

const jsonOut = process.argv.includes("--json");
const origin = resolvePublicSiteOrigin();
const pagesDir = path.join(process.cwd(), "client", "public", "catalog", "golden-100", "pages");

type Issue = { slug: string; code: string; message: string };

function loadPages(): GoldenRecipePage[] {
  const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith(".json"));
  return files.map((f) => JSON.parse(fs.readFileSync(path.join(pagesDir, f), "utf8")) as GoldenRecipePage);
}

function validateRecipeSchema(slug: string, schema: Record<string, unknown>): Issue[] {
  const issues: Issue[] = [];
  const required = [
    "@context",
    "@type",
    "name",
    "description",
    "url",
    "recipeIngredient",
    "recipeInstructions",
    "prepTime",
    "cookTime",
  ];
  for (const key of required) {
    if (schema[key] == null || schema[key] === "") {
      issues.push({ slug, code: "schema_missing", message: `Missing ${key}` });
    }
  }
  if (schema["@type"] !== "Recipe") {
    issues.push({ slug, code: "schema_type", message: `Expected @type Recipe, got ${schema["@type"]}` });
  }
  const ingredients = schema.recipeIngredient;
  if (!Array.isArray(ingredients) || ingredients.length < 3) {
    issues.push({ slug, code: "schema_ingredients", message: "recipeIngredient needs 3+ items" });
  }
  const steps = schema.recipeInstructions;
  if (!Array.isArray(steps) || steps.length < 2) {
    issues.push({ slug, code: "schema_steps", message: "recipeInstructions needs 2+ steps" });
  }
  return issues;
}

function main(): void {
  const pages = loadPages();
  const issues: Issue[] = [];
  const titles = new Set<string>();
  const descriptions = new Set<string>();

  if (pages.length !== 100) {
    issues.push({
      slug: "__catalog__",
      code: "count",
      message: `Expected 100 pages, found ${pages.length}`,
    });
  }

  for (const page of pages) {
    const schema = buildRecipeSchema(origin, page) as Record<string, unknown>;
    issues.push(...validateRecipeSchema(page.slug, schema));

    const seo = buildRecipePageSeo(page, origin);
    if (seo.title.length < 15 || seo.title.length > 65) {
      issues.push({
        slug: page.slug,
        code: "title_length",
        message: `Title length ${seo.title.length} (target 15–65)`,
      });
    }
    if (seo.description.length < 50 || seo.description.length > 165) {
      issues.push({
        slug: page.slug,
        code: "description_length",
        message: `Description length ${seo.description.length} (target 50–165)`,
      });
    }
    if (!seo.ogImage) {
      issues.push({ slug: page.slug, code: "og_image", message: "Missing og:image" });
    }

    if (titles.has(seo.title)) {
      issues.push({ slug: page.slug, code: "duplicate_title", message: "Duplicate title" });
    }
    titles.add(seo.title);

    if (descriptions.has(seo.description)) {
      issues.push({ slug: page.slug, code: "duplicate_description", message: "Duplicate description" });
    }
    descriptions.add(seo.description);
  }

  const report = {
    origin,
    pages: pages.length,
    uniqueTitles: titles.size,
    uniqueDescriptions: descriptions.size,
    issues,
    pass: issues.length === 0,
  };

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("[validate-seo-schema] Golden 100 SEO validation\n");
    console.log(`  Pages: ${report.pages}`);
    console.log(`  Unique titles: ${report.uniqueTitles}`);
    console.log(`  Unique descriptions: ${report.uniqueDescriptions}`);
    console.log(`  Issues: ${issues.length}`);
    if (issues.length) {
      for (const i of issues.slice(0, 15)) {
        console.log(`    - ${i.slug}: [${i.code}] ${i.message}`);
      }
      if (issues.length > 15) console.log(`    … and ${issues.length - 15} more`);
    }
    console.log(`\n  Overall: ${report.pass ? "PASS" : "NEEDS WORK"}`);
  }

  process.exit(report.pass ? 0 : 1);
}

main();
