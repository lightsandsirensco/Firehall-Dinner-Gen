#!/usr/bin/env tsx
/**
 * Regression tests for dish-format fidelity in the recipe-image semantic checker.
 *
 *   npm run test:dish-format-fidelity
 *
 * A format mismatch must fail regardless of ingredient overlap; an ambiguous format must go
 * to manual review; a correct format with minor garnish variation must pass.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  compareDishFormat,
  dishFormatNegativeHints,
  expectedDishFormat,
  isFormatIssue,
  normalizeDepictedFormat,
  type DishFormat,
  type FidelityStatus,
} from "../shared/food-imagery/dish-format.js";
import { buildPlatingPromptLine, inferPlatingType, platingNegativeHints } from "../shared/plating-type.js";
import {
  parseVisionVerdict,
  passesPublishGate,
  recipeFidelity,
  type QaRecipe,
} from "../server/imagery/recipe-image-qa.js";

interface FidelityCase {
  id: string;
  recipe: QaRecipe;
  vision: Record<string, unknown>;
  expected: FidelityStatus;
}

const fixture = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "fixtures", "dish-format-fidelity.json"), "utf8"),
) as { cases: FidelityCase[]; expectedFormats: Array<[string, DishFormat | null]> };

let passed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

const REGRESSION_TITLE = "Italian Garlic Beef Bowls with Spaghetti & Coleslaw Mix";

console.log("dish-format fidelity verdicts");
for (const c of fixture.cases) {
  check(`${c.id} → ${c.expected}`, () => {
    const result = recipeFidelity(parseVisionVerdict(c.vision), c.recipe);
    assert.equal(result.status, c.expected, `${c.id}: got ${result.status} (${result.reasons.join("; ")})`);
    if (c.expected === "INCONCLUSIVE") assert.ok(result.reasons.length > 0, "inconclusive must explain why");
  });
}

check("every listed format mismatch hard-fails with a format reason", () => {
  const mismatches = fixture.cases.filter((c) => /^(regression|control|mismatch)-/.test(c.id));
  assert.equal(mismatches.length, 13);
  for (const c of mismatches) {
    const result = recipeFidelity(parseVisionVerdict(c.vision), c.recipe);
    assert.equal(result.format.verdict, "mismatch", c.id);
    assert.match(result.reasons[0] ?? "", /wrong dish format/, c.id);
  }
});

check("ingredient overlap never overrides a format mismatch (content PASS + sandwich → FAIL)", () => {
  const regression = fixture.cases.find((c) => c.id === "regression-italian-garlic-beef-bowls-shown-as-meatball-subs")!;
  for (const accuracy of ["PASS", "MINOR", "MAJOR"]) {
    const v = parseVisionVerdict({ ...regression.vision, accuracy, accuracy_issues: [] });
    assert.equal(recipeFidelity(v, regression.recipe).status, "FAIL", `accuracy=${accuracy}`);
  }
});

check("publish gate rejects the regression image and names the format", () => {
  const regression = fixture.cases[0]!;
  const gate = passesPublishGate(parseVisionVerdict(regression.vision), regression.recipe);
  assert.equal(gate.ok, false);
  assert.match(gate.reasons.join(" "), /recipe is bowl but image shows sandwich/);
});

console.log("expected format inference");
for (const [title, expected] of fixture.expectedFormats) {
  check(`"${title}" → ${expected ?? "not applicable"}`, () => assert.equal(expectedDishFormat(title), expected));
}
check("mealFormat is the fallback when the title does not commit", () => {
  assert.equal(expectedDishFormat("Italian Garlic Beef with Spaghetti", "bowl"), "bowl");
  assert.equal(expectedDishFormat("Italian Garlic Beef Bowls", "sandwich"), "bowl", "title wins over mealFormat");
});

console.log("depicted format normalization");
check("free-text model labels map to the format enum", () => {
  const cases: Array<[string, DishFormat]> = [
    ["meatball subs on a tray", "sandwich"],
    ["hoagie rolls", "sandwich"],
    ["egg rolls on a platter", "rolled"],
    ["burrito bowl", "bowl"],
    ["wrapped burrito", "wrap"],
    ["meal_prep", "meal_prep"],
    ["sheet pan", "sheet_pan"],
    ["", "unclear"],
    ["something abstract", "unclear"],
  ];
  for (const [raw, want] of cases) assert.equal(normalizeDepictedFormat(raw), want, raw);
});
check("format/vessel complaints are separated from food complaints", () => {
  for (const issue of [
    "served on a plate instead of a skillet",
    "Presented in a bowl instead of a casserole",
    "dish is a casserole, not plated pasta",
    "Dish is rolled, not a casserole",
    "wrong dish format — sandwich instead of bowl",
    "soup instead of wrap",
  ]) {
    assert.ok(isFormatIssue(issue), issue);
  }
  for (const issue of ["chicken wings instead of turkey breast", "cheese on top — not in recipe", "missing spaghetti", "spaghetti instead of penne pasta"]) {
    assert.ok(!isFormatIssue(issue), issue);
  }
});
check("a format call without a recipe format is not applicable", () => {
  assert.equal(compareDishFormat(null, "sandwich", 99).verdict, "not_applicable");
});

console.log("generation prompt");
check("bowl prompt for the regression recipe rules out sandwich presentation", () => {
  const plating = inferPlatingType(REGRESSION_TITLE, "bowl");
  assert.equal(plating, "bowl");
  assert.match(buildPlatingPromptLine(plating, REGRESSION_TITLE, "Italian"), /NOT a sandwich, sub or roll/);
  const negatives = platingNegativeHints(plating, REGRESSION_TITLE, "bowl");
  for (const word of ["sandwich", "sub roll", "hoagie", "bread roll", "burger bun", "wrapped burrito"]) {
    assert.ok(negatives.includes(word), `missing negative "${word}"`);
  }
});
check("format negatives never ban the recipe's own format", () => {
  assert.ok(!dishFormatNegativeHints("sandwich").some((w) => /sandwich|hoagie|sub roll/.test(w)));
  assert.ok(!dishFormatNegativeHints("bowl").includes("rice bowl"));
});

console.log(`\n${passed} checks passed`);
