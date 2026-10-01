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
  checkStructuralCues,
  compareDishFormat,
  dishFormatNegativeHints,
  expectedDishFormat,
  isFormatIssue,
  normalizeDepictedFormat,
  type DishFormat,
  type FidelityStatus,
} from "../shared/food-imagery/dish-format.js";
import {
  buildFullPlatingPromptLine,
  buildPlatingPromptLine,
  inferPlatingType,
  platingNegativeHints,
} from "../shared/plating-type.js";
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
  assert.equal(mismatches.length, 18);
  for (const c of mismatches) {
    const result = recipeFidelity(parseVisionVerdict(c.vision), c.recipe);
    assert.equal(result.format.verdict, "mismatch", c.id);
    assert.match(result.reasons[0] ?? "", /wrong dish format|required \w+ not visible/, c.id);
  }
});

check("rice-bowl regression fails whether the model labels it nachos or bowl", () => {
  for (const id of ["regression-mexican-american-garlic-beef-bowls-shown-as-nachos", "regression-mexican-american-nachos-labelled-as-bowl"]) {
    const c = fixture.cases.find((x) => x.id === id)!;
    const result = recipeFidelity(parseVisionVerdict(c.vision), c.recipe);
    assert.equal(result.status, "FAIL", id);
    const gate = passesPublishGate(parseVisionVerdict(c.vision), c.recipe);
    assert.equal(gate.ok, false, id);
  }
  const labelledBowl = fixture.cases.find((x) => x.id === "regression-mexican-american-nachos-labelled-as-bowl")!;
  const reasons = recipeFidelity(parseVisionVerdict(labelledBowl.vision), labelledBowl.recipe).reasons.join(" ");
  assert.match(reasons, /tortilla chips/);
  assert.match(reasons, /required rice not visible/);
});

console.log("structural cues");
check("title-promised components and foreign carriers decide the format", () => {
  const title = "Mexican-American Garlic Beef Bowls with Rice";
  assert.equal(checkStructuralCues(title, "ground beef rice", ["rice", "beef", "salsa"]).verdict, "match");
  assert.equal(checkStructuralCues(title, "ground beef rice", ["beef", "salsa", "cheese"]).verdict, "mismatch");
  assert.equal(checkStructuralCues(title, "ground beef rice", ["beef", "salsa"]).verdict, "inconclusive");
  assert.equal(checkStructuralCues(title, "ground beef rice", ["rice", "beef", "tortilla chips"]).verdict, "mismatch");
  assert.equal(checkStructuralCues(title, "ground beef rice tortilla chips", ["rice", "beef", "tortilla chips"]).verdict, "match");
  assert.equal(checkStructuralCues("Chicken Burrito Bowls", "chicken rice", ["burrito bowl", "rice", "chicken"]).verdict, "match");
  assert.equal(checkStructuralCues("Meatball Subs", "meatballs sub rolls", ["meatballs", "sub rolls", "marinara"]).verdict, "match");
  assert.equal(checkStructuralCues("Chicken and Rice Soup", "chicken rice broth", ["chicken", "broth", "carrots"]).verdict, "inconclusive");
  assert.equal(checkStructuralCues("Herb Roasted Thighs", "", ["chicken"]).verdict, "not_applicable");
  assert.equal(checkStructuralCues("Pasta e Ceci for the Hall", "ditalini chickpeas", ["ditalini", "chickpeas", "rosemary"]).verdict, "match");
});
check("nachos baked in a skillet or pan is reviewed, never auto-failed; nachos for a bowl always fail", () => {
  assert.equal(compareDishFormat("skillet", "nachos", 90).verdict, "inconclusive");
  assert.equal(compareDishFormat("casserole", "nachos", 100).verdict, "inconclusive");
  assert.equal(compareDishFormat("bowl", "nachos", 90).verdict, "mismatch");
  assert.equal(compareDishFormat("casserole", "rolled", 100).verdict, "mismatch");
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
    ["loaded nachos on a platter", "nachos"],
    ["tortilla chips piled with beef and cheese", "nachos"],
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
    "served in a bowl — recipe is a skillet",
    "served in a baking dish — recipe serves in shallow bowls",
    "plated format — expected casserole",
  ]) {
    assert.ok(isFormatIssue(issue), issue);
  }
  for (const issue of [
    "chicken wings instead of turkey breast",
    "cheese on top — not in recipe",
    "missing spaghetti",
    "spaghetti instead of penne pasta",
    "served on a plate with fries — fries not in recipe",
  ]) {
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
check("rice-bowl prompt requires visible rice and rules out nachos", () => {
  const title = "Mexican-American Garlic Beef Bowls with Rice";
  const line = buildFullPlatingPromptLine(title, "bowl", "Mexican-American");
  assert.match(line, /NOT nachos or tortilla chips/);
  assert.match(line, /rice must be clearly visible as a major component/);
  const negatives = platingNegativeHints(inferPlatingType(title, "bowl"), title, "bowl");
  for (const word of ["nachos", "tortilla chips", "taco shells", "wrapped burrito"]) {
    assert.ok(negatives.includes(word), `missing negative "${word}"`);
  }
  assert.match(buildFullPlatingPromptLine(REGRESSION_TITLE, "bowl", "Italian"), /pasta must be clearly visible/);
});
check("format negatives never ban the recipe's own format", () => {
  assert.ok(!dishFormatNegativeHints("nachos").includes("nachos"));
  assert.ok(!dishFormatNegativeHints("sandwich").some((w) => /sandwich|hoagie|sub roll/.test(w)));
  assert.ok(!dishFormatNegativeHints("bowl").includes("rice bowl"));
});

console.log(`\n${passed} checks passed`);
