/**
 * Firehall meal composition — completes Spoonacular mains into full crew plates.
 * Sides are chosen via cuisine/identity pairing (side-pairing.ts), not generic potato fallbacks.
 */

import type { GenerateResponse, IngredientItem, RecipeStep } from "@shared/schema";
import { log } from "./index";
import { applyHallInstructionPolish, dedupePlateIngredients, syncStationSidesToSteps } from "./meal-sanity";
import { normalizeFormatKeyForCarb, pickCarbForFormat } from "./carb-rules";
import { scaleAmountForCrew } from "./firehall-voice";
import { validateAndRepairMeal } from "./meal-validation";
import { detectMealIdentity, isSeasoningOrGarnish } from "@shared/meal-semantics";
import {
  correctStarchKeyForTitle,
  isCaesarMainDish,
  isWeakCaesarStarch,
} from "@shared/firehall-instruction-voice";
import {
  pickComposedSides,
  getStarchTemplate,
  trackComposedSides,
  STARCH_TEMPLATES,
  type SidePairingContext,
} from "./side-pairing";

export interface MealComposeContext {
  mealFormat: string;
  cuisine: string;
  healthiness: string;
  crewSize: number;
  allergens: string[];
  protein: string;
  sessionKey?: string;
}

const STARCH_PATTERN =
  /\b(rice|jasmine|basmati|pasta|spaghetti|penne|noodle|udon|soba|potato|potatoes|fries|wedge|bread|bun|roll|tortilla|taco shell|naan|pita|quinoa|couscous|macaroni|linguine|cornbread|toast|hash brown|farro|barley|mac and cheese)\b/i;

const VEG_PATTERN =
  /\b(broccoli|green bean|asparagus|salad|lettuce|spinach|kale|carrot|bell pepper|zucchini|squash|corn on the cob|coleslaw|cucumber|tomato|onion|vegetable|veg\b|mixed greens|caesar|slaw|green beans|peas|cauliflower|brussels|edamame)\b/i;

const PROTEIN_PATTERN =
  /\b(chicken|beef|pork|turkey|sausage|shrimp|salmon|fish|cod|tuna|steak|ground beef|bacon|ham|tofu|tempeh|lentil|chickpea|pulled pork|thigh|breast)\b/i;

const EXTRA_PATTERN =
  /\b(sauce|dressing|raita|yogurt|pickle|kimchi|salsa|guacamole|garlic bread|naan|gravy|au jus)\b/i;

/** Re-export for validation module compatibility. */
export { STARCH_TEMPLATES as STARCH_SIDES };

function plateIngredients(recipe: GenerateResponse): IngredientItem[] {
  return (recipe.ingredients || []).filter(
    (i) => !isSeasoningOrGarnish(i.item, i.notes),
  );
}

function sanitizePantryLines(recipe: GenerateResponse): void {
  recipe.ingredients = (recipe.ingredients || []).map((ing) => {
    if (isSeasoningOrGarnish(ing.item, ing.notes)) {
      const notes = ing.notes?.includes("Pantry") ? ing.notes : "Pantry staple — not a plate component";
      return { ...ing, notes };
    }
    return ing;
  });
}

function ingredientsText(recipe: GenerateResponse): string {
  return plateIngredients(recipe)
    .map((i) => `${i.item} ${i.notes || ""}`)
    .join(" ")
    .toLowerCase();
}

function hasMatch(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function ingredientExists(recipe: GenerateResponse, pattern: RegExp): boolean {
  return plateIngredients(recipe).some((i) => pattern.test(`${i.item} ${i.notes || ""}`));
}

function insertSideStep(recipe: GenerateResponse, step: RecipeStep): void {
  const steps = recipe.steps || [];
  const serveIdx = steps.findIndex((s) =>
    /\b(serve|plate|ladle|divide|portion)\b/i.test(`${s.heading} ${s.body}`),
  );
  if (serveIdx >= 0) steps.splice(serveIdx, 0, step);
  else steps.push(step);
  recipe.steps = steps;
}

function pairingCtx(ctx: MealComposeContext, title: string, formatKey: string): SidePairingContext {
  return {
    title,
    mealFormat: ctx.mealFormat,
    cuisine: ctx.cuisine,
    protein: ctx.protein,
    healthiness: ctx.healthiness || "balanced",
    allergens: ctx.allergens || [],
    formatKey,
    sessionKey: ctx.sessionKey,
  };
}

function addStarchFromKey(
  recipe: GenerateResponse,
  starchKey: string,
  crewSize: number,
  notes: string,
): boolean {
  const template = getStarchTemplate(starchKey);
  if (!template) {
    log(`[compose] No starch template for key="${starchKey}"`, "compose");
    return false;
  }
  const check = new RegExp(starchKey.replace(/\s+/g, "|"), "i");
  if (ingredientExists(recipe, check) || ingredientExists(recipe, new RegExp(template.item.split(",")[0], "i"))) {
    return false;
  }
  recipe.ingredients = recipe.ingredients || [];
  recipe.ingredients.push({
    item: template.item,
    amount: scaleAmountForCrew(template.amount, crewSize),
    notes,
  });
  insertSideStep(recipe, template.step);
  if (recipe.tags && template.carbTag) {
    recipe.tags = { ...recipe.tags, base_carb: template.carbTag };
  }
  return true;
}

function addVegSide(
  recipe: GenerateResponse,
  vegLabel: string,
  crewSize: number,
): boolean {
  if (!vegLabel || isSeasoningOrGarnish(vegLabel)) return false;
  const tpl = getStarchTemplate("coleslaw");
  const checkWord = vegLabel.split(" ")[0];
  if (ingredientExists(recipe, new RegExp(checkWord, "i"))) return false;

  const coleslawTpl = /coleslaw|slaw/i.test(vegLabel) && tpl;
  if (coleslawTpl) {
    recipe.ingredients!.push({
      item: tpl.item,
      amount: scaleAmountForCrew(tpl.amount, crewSize),
      notes: "Station side — veg for the table; plate_role: veg",
    });
    insertSideStep(recipe, tpl.step);
    return true;
  }

  const vegStep: RecipeStep = {
    heading: `Prepare ${vegLabel.split("(")[0].trim()} (medium, 8–12 min)`,
    body: `Knock out ${vegLabel.toLowerCase()} while the main cooks — bagged or frozen is fine on shift. Season and hold warm.`,
  };
  recipe.ingredients!.push({
    item: vegLabel,
    amount: scaleAmountForCrew(crewSize >= 10 ? "2 batches" : "1 batch", crewSize),
    notes: "Station side — veg for the table; plate_role: veg",
  });
  insertSideStep(recipe, vegStep);
  return true;
}

function buildPlatingNote(recipe: GenerateResponse, formatKey: string): string {
  const mains: string[] = [];
  const starches: string[] = [];
  const vegs: string[] = [];

  for (const ing of plateIngredients(recipe)) {
    const line = ing.item;
    if (STARCH_PATTERN.test(line) && !PROTEIN_PATTERN.test(line)) starches.push(line);
    else if (VEG_PATTERN.test(line) && !PROTEIN_PATTERN.test(line)) vegs.push(line);
    else if (PROTEIN_PATTERN.test(line)) mains.push(line);
  }

  const parts: string[] = [];
  if (mains.length) parts.push(`Main: ${mains.slice(0, 2).join(", ")}`);
  if (starches.length) parts.push(`Starch: ${starches.slice(0, 2).join(", ")}`);
  if (vegs.length) parts.push(`Veg/side: ${vegs.slice(0, 2).join(", ")}`);

  const serve =
    formatKey === "bowl" || formatKey === "stir-fry"
      ? "Line the table with bowls — base first, then protein and veg."
      : formatKey === "burger" || formatKey === "sandwich"
        ? "Lay out bread, protein, and sides buffet-style."
        : "Family-style on the hall table: mains in the middle, sides in big bowls.";

  return parts.length > 0 ? `${parts.join(" · ")} ${serve}` : serve;
}

export function scoreMealCompleteness(recipe: GenerateResponse): number {
  const text = ingredientsText(recipe);
  let score = 0;
  if (hasMatch(text, PROTEIN_PATTERN)) score += 3;
  if (hasMatch(text, STARCH_PATTERN)) score += 2;
  if (hasMatch(text, VEG_PATTERN)) score += 2;
  const count = plateIngredients(recipe).length;
  if (count >= 7) score += 2;
  else if (count >= 5) score += 1;
  if ((recipe.steps || []).length >= 4) score += 1;
  return score;
}

const MIN_PRE_COMPOSE_SCORE = 5;

const VEG_EXEMPT_FORMATS = new Set(["salad", "soup-stew", "soup"]);

export function shouldTryNextCandidate(
  recipe: GenerateResponse,
  candidateIndex: number,
  totalCandidates: number,
  mealFormat?: string,
): boolean {
  if (candidateIndex >= totalCandidates - 1) return false;
  if (scoreMealCompleteness(recipe) < MIN_PRE_COMPOSE_SCORE) return true;

  const formatKey = normalizeFormatKeyForCarb(mealFormat || recipe.meal_style || "random");
  if (!VEG_EXEMPT_FORMATS.has(formatKey) && !hasMatch(ingredientsText(recipe), VEG_PATTERN)) {
    return true;
  }
  return false;
}

export function completeFirehallPlate(
  recipe: GenerateResponse,
  ctx: MealComposeContext,
): { recipe: GenerateResponse; fixes: string[] } {
  const fixes: string[] = [];
  const formatKey = normalizeFormatKeyForCarb(ctx.mealFormat);

  let fixed: GenerateResponse = {
    ...recipe,
    ingredients: [...(recipe.ingredients || [])],
    steps: [...(recipe.steps || [])],
    tags: recipe.tags ? { ...recipe.tags } : undefined,
  };

  sanitizePantryLines(fixed);

  if (isCaesarMainDish(fixed.title || "")) {
    fixed.ingredients = (fixed.ingredients || []).filter(
      (i) => !isWeakCaesarStarch(i.item),
    );
  }

  const preText = ingredientsText(fixed);
  const alreadyComposed = (fixed.ingredients || []).some((i) =>
    /station side|hall side|hall base|hall extra/i.test(i.notes || ""),
  );

  if (
    alreadyComposed &&
    hasMatch(preText, STARCH_PATTERN) &&
    hasMatch(preText, VEG_PATTERN)
  ) {
    sanitizePantryLines(fixed);
    const { recipe: validated, repairs } = validateAndRepairMeal(fixed, {
      mealFormat: ctx.mealFormat,
      cuisine: ctx.cuisine,
      crewSize: ctx.crewSize,
      allergens: ctx.allergens,
      protein: ctx.protein,
    });
    return { recipe: validated, fixes: repairs.length ? repairs : [] };
  }

  const pCtx = pairingCtx(ctx, fixed.title || "", formatKey);
  const sides = pickComposedSides(pCtx);
  const identity = detectMealIdentity(fixed.title || "", formatKey);
  const handheld =
    identity === "sandwich" ||
    identity === "burger" ||
    identity === "french_dip" ||
    formatKey === "sandwich" ||
    formatKey === "burger";

  const hasStarch = hasMatch(ingredientsText(fixed), STARCH_PATTERN);
  const hasVeg = hasMatch(ingredientsText(fixed), VEG_PATTERN);

  // Bowl base
  if (formatKey === "bowl" && !hasStarch) {
    const picked = pickCarbForFormat("bowl", ctx.healthiness || "balanced", ctx.allergens);
    const starchKey = picked?.includes("rice") ? "jasmine rice" : picked === "quinoa" ? "quinoa" : sides.starchKey || "jasmine rice";
    if (addStarchFromKey(fixed, starchKey, ctx.crewSize, "Station side — bowl base")) {
      fixes.push(`compose:bowl_${starchKey}`);
      trackComposedSides(starchKey, null, null, ctx.sessionKey);
    }
  }

  // Starch side (skipped for handheld — buns added by validation; fries/slaw from pairing)
  const isCaesar = isCaesarMainDish(fixed.title || "") || identity === "caesar_salad";
  if (isCaesar && !hasStarch && sides.starchKey) {
    const starch = correctStarchKeyForTitle(fixed.title || "", sides.starchKey) || "garlic bread";
    if (addStarchFromKey(fixed, starch, ctx.crewSize, "Station side — garlic bread for Caesar night; plate_role: starch")) {
      fixes.push(`compose:caesar_${starch}`);
      trackComposedSides(starch, null, null, ctx.sessionKey);
    }
  }

  const isTacoNight =
    formatKey === "tacos" ||
    identity === "taco" ||
    /\btaco(s)?\b/i.test(fixed.title || "");

  const needsStarchSide =
    !handheld &&
    !isCaesar &&
    !isTacoNight &&
    formatKey !== "bowl" &&
    formatKey !== "stir-fry" &&
    formatKey !== "pasta" &&
    formatKey !== "salad" &&
    formatKey !== "soup-stew" &&
    !hasStarch;

  if (needsStarchSide && sides.starchKey) {
    if (addStarchFromKey(fixed, sides.starchKey, ctx.crewSize, "Station side — starch for the table; plate_role: starch")) {
      fixes.push(`compose:starch_${sides.starchKey}:${sides.pairingSource}`);
      trackComposedSides(sides.starchKey, null, null, ctx.sessionKey);
    }
  }

  // Handheld: fries/wedges + slaw (not baby potatoes by default)
  if (handheld && !hasStarch && sides.starchKey && sides.starchKey !== "roasted potatoes") {
    if (addStarchFromKey(fixed, sides.starchKey, ctx.crewSize, "Station side — starch for the table; plate_role: starch")) {
      fixes.push(`compose:handheld_${sides.starchKey}`);
      trackComposedSides(sides.starchKey, null, null, ctx.sessionKey);
    }
  }

  const textAfterStarch = ingredientsText(fixed);
  const needsVeg =
    !isCaesar &&
    formatKey !== "salad" &&
    !hasMatch(textAfterStarch, VEG_PATTERN) &&
    sides.vegLabel;

  if (needsVeg && addVegSide(fixed, sides.vegLabel!, ctx.crewSize)) {
    fixes.push(`compose:veg_${sides.pairingSource}`);
    trackComposedSides(null, sides.vegLabel, sides.bundleId, ctx.sessionKey);
  }

  // Optional extra (naan, kimchi, etc.)
  if (sides.extraLabel && !allergenBlocksExtra(fixed, sides.extraLabel, ctx.allergens)) {
    const extraKey = sides.extraLabel.toLowerCase().includes("naan") ? "naan" : null;
    if (extraKey && addStarchFromKey(fixed, extraKey, ctx.crewSize, "Station extra; plate_role: optional")) {
      fixes.push(`compose:extra_${extraKey}`);
    } else if (!ingredientExists(fixed, new RegExp(sides.extraLabel.split(" ")[0], "i"))) {
      const extraStep: RecipeStep = {
        heading: `Set out ${sides.extraLabel.split("(")[0].trim()} (no heat)`,
        body: `Portion ${sides.extraLabel.toLowerCase()} for the table — crew can add to taste.`,
      };
      fixed.ingredients!.push({
        item: sides.extraLabel,
        amount: scaleAmountForCrew("1 batch", ctx.crewSize),
        notes: "Station extra; plate_role: optional",
      });
      insertSideStep(fixed, extraStep);
      fixes.push(`compose:extra_${sides.extraLabel}`);
    }
  }

  const assembly = buildPlatingNote(fixed, formatKey);
  (fixed as GenerateResponse & { plating?: { serve_style: string; assembly_instructions: string; optional_toppings: string[] } }).plating = {
    serve_style: formatKey === "bowl" ? "Build-your-own bowls" : "Hall table — family style",
    assembly_instructions: assembly,
    optional_toppings: [],
  };

  if (fixes.length > 0) {
    log(`[compose] "${fixed.title}" — ${fixes.join(", ")}`, "compose");
  }

  const { recipe: deduped } = dedupePlateIngredients(fixed);
  fixed = deduped;

  const { recipe: validated, repairs, issues } = validateAndRepairMeal(fixed, {
    mealFormat: ctx.mealFormat,
    cuisine: ctx.cuisine,
    crewSize: ctx.crewSize,
    allergens: ctx.allergens,
    protein: ctx.protein,
  });
  fixes.push(...repairs);
  if (issues.length > 0) fixes.push(`validate:issues=${issues.length}`);

  const { recipe: synced, fixes: stepFixes } = syncStationSidesToSteps(validated);
  fixes.push(...stepFixes);

  const polished = applyHallInstructionPolish(synced);
  return { recipe: polished, fixes };
}

function allergenBlocksExtra(recipe: GenerateResponse, extra: string, allergens: string[]): boolean {
  const a = allergens.map((x) => x.toLowerCase());
  const t = extra.toLowerCase();
  if (a.includes("gluten") && /\b(naan|bread|tortilla)\b/i.test(t)) return true;
  if (a.includes("dairy") && /\b(cheese|butter|yogurt)\b/i.test(t)) return true;
  return ingredientExists(recipe, new RegExp(extra.split(" ")[0], "i"));
}
