#!/usr/bin/env tsx
import { scaleGoldenIngredients } from "../shared/golden-100/recipe-quality/crew-scale.js";
import { clampGoldenIngredientsForCrew } from "../shared/recipe/crew-portion-limits.js";

const chickenCaesarBase = [
  { name: "Chicken breast", quantity: "13.3", unit: "lb" },
  { name: "Romaine hearts", quantity: "13.3", unit: "heads" },
];

const scaled6 = scaleGoldenIngredients(chickenCaesarBase, 8, 6);
const chicken = scaled6.find((i) => /chicken/i.test(i.name));
const lbs = parseFloat(chicken?.quantity || "0");

if (lbs > 4) {
  console.error(`[test-crew-portion-limits] FAIL Hall Caesar Chicken crew=6 got ${lbs} lb chicken (expected <= 4)`);
  process.exit(1);
}

const ozPer = (lbs * 16) / 6;
if (ozPer > 12) {
  console.error(`[test-crew-portion-limits] FAIL ${ozPer} oz/person`);
  process.exit(1);
}

const { fixes } = clampGoldenIngredientsForCrew(chickenCaesarBase, 8);
if (!fixes.some((f) => /Chicken breast/i.test(f.name))) {
  console.error("[test-crew-portion-limits] FAIL expected clamp fix on 13.3 lb base");
  process.exit(1);
}

console.log(`[test-crew-portion-limits] OK Hall Caesar crew=6 → ${lbs} lb (${Math.round(ozPer * 10) / 10} oz/person)`);
