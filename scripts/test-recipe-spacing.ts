#!/usr/bin/env tsx
/**
 * Unit checks for normalizeRecipeSpacing — run via: npx tsx scripts/test-recipe-spacing.ts
 */

import { detectRecipeSpacingIssues, normalizeRecipeSpacing } from "../shared/recipe/spacing.js";

function assertEq(actual: string, expected: string, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected "${expected}", got "${actual}"`);
  }
}

function assertNoIssues(text: string, label: string): void {
  const issues = detectRecipeSpacingIssues(text);
  if (issues.length > 0) {
    throw new Error(`${label}: expected no issues, got ${JSON.stringify(issues)}`);
  }
}

function main(): void {
  assertEq(normalizeRecipeSpacing("ME.)Take bad"), "ME.) Take bad", ".) space");
  assertEq(normalizeRecipeSpacing("Chicken.)Cook until golden"), "Chicken.) Cook until golden", ".) cook");
  assertEq(normalizeRecipeSpacing("Sauce.)Mix well"), "Sauce.) Mix well", ".) mix");
  assertEq(normalizeRecipeSpacing("1.Mix the sauce"), "1. Mix the sauce", "numbered step");
  assertEq(normalizeRecipeSpacing("Done,serve hot"), "Done, serve hot", "comma");
  assertEq(normalizeRecipeSpacing("Heat;then stir"), "Heat; then stir", "semicolon");

  assertEq(normalizeRecipeSpacing("Use 1.5 cups flour"), "Use 1.5 cups flour", "decimal");
  assertEq(normalizeRecipeSpacing("Bake to 165°F"), "Bake to 165°F", "temperature");
  assertEq(normalizeRecipeSpacing("See https://example.com/recipe"), "See https://example.com/recipe", "url");
  assertEq(normalizeRecipeSpacing("Dr.Smith said"), "Dr.Smith said", "abbrev protected");

  assertNoIssues(normalizeRecipeSpacing("ME.) Take bad"), "fixed .)");
  assertNoIssues("Use 1.5 cups and bake to 165°F.", "measurements");

  console.log("[test-recipe-spacing] all checks passed");
}

main();
