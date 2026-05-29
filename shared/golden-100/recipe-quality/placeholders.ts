/**

 * Detect placeholder / vague recipe content — shared by audit, builder, validator.

 */



import {

  BANNED_STEP_TITLES,

  GENERIC_GRILL_STEP_TITLES,

  usesGenericGrillTemplate,

} from "./recipe-instruction-class.js";



const VAGUE_INGREDIENT =

  /\b(protein|seafood|vegetarian|beef|chicken|pork|turkey|mixed)\s*\(main\)|^cooking oil$|^seasoning$|^cheese blend$|^primary protein|^mixed vegetables$|^beef \(main|^chicken \(main|^pork \(main|^seafood \(main/i;



const VAGUE_UNIT = /^x$/i;



const GENERIC_STEP =

  /^(cook|add|mix|stir|serve|prepare)\s+(the\s+)?\w+\s*(until done|until ready)?\.?$/i;



const GENERIC_STEP_PHRASE =

  /\b(cook (the )?protein until done|pat the protein dry and season with salt and pepper|season to taste|cook until done)\b/i;



const TEMPLATE_STEP_PHRASE =

  /\b(set the line|build flavor|finish and serve|cook the main)\b/i;



export function isVagueIngredientName(name: string): boolean {

  const n = name.trim();

  if (!n || n.length < 3) return true;

  if (VAGUE_INGREDIENT.test(n)) return true;

  if (/^protein$/i.test(n)) return true;

  if (/^seasoning$/i.test(n)) return true;

  if (/^main protein$/i.test(n)) return true;

  return false;

}



export function isPlaceholderIngredient(ing: {

  name: string;

  quantity?: string;

  unit?: string;

}): boolean {

  if (isVagueIngredientName(ing.name)) return true;

  if (ing.unit && VAGUE_UNIT.test(ing.unit.trim()) && (!ing.quantity || ing.quantity === "1"))

    return true;

  return false;

}



export function countPlaceholderIngredients(

  ingredients: Array<{ name: string; quantity?: string; unit?: string }>,

): number {

  return ingredients.filter((i) => isPlaceholderIngredient(i)).length;

}



export function isPlaceholderCuratedRecipe(ingredients: Array<{ name: string; amount?: number; unit?: string }>): boolean {

  if (!ingredients.length) return true;

  const placeholderCount = ingredients.filter((i) =>

    isPlaceholderIngredient({

      name: i.name,

      quantity: i.amount != null ? String(i.amount) : undefined,

      unit: i.unit,

    }),

  ).length;

  return placeholderCount >= 2 || (ingredients.length <= 6 && placeholderCount >= 1);

}



export function isBannedStepTitle(title: string): boolean {

  const t = title.trim().toLowerCase();

  return BANNED_STEP_TITLES.has(t) || GENERIC_GRILL_STEP_TITLES.has(t);

}



export function isGenericStep(step: { title?: string; instruction: string }): boolean {

  const title = (step.title || "").trim().toLowerCase();

  const body = step.instruction.trim();

  if (isBannedStepTitle(title)) return true;

  if (/^step\s*\d+$/i.test(title)) return true;

  if (/Watch color and texture/i.test(body)) return true;

  if (GENERIC_STEP.test(body)) return true;

  if (GENERIC_STEP_PHRASE.test(body)) return true;

  if (TEMPLATE_STEP_PHRASE.test(body)) return true;

  if (body.length < 55) return true;

  if (/\bcook the main\b/i.test(title)) return true;

  if (/\bbuild flavor\b/i.test(title)) return true;

  return false;

}



export function stepsFailQualityBar(

  steps: Array<{ title?: string; instruction: string }>,

): boolean {

  if (steps.length < 4) return true;

  if (usesGenericGrillTemplate(steps)) return true;

  if (steps.some((s) => isGenericStep(s))) return true;

  return false;

}



export function hasWeakTitle(title: string): boolean {

  const t = title.trim();

  if (t.length > 72) return true;

  if (/,.*,/.test(t)) return true;

  if (/\brecipe with\b/i.test(t)) return true;

  if (/\b(and|with)\s+(sour cream|cilantro|cheese|butter|garlic)\b.*\b(and|with)\b/i.test(t))

    return true;

  return false;

}



export function hasTemperatureCue(text: string): boolean {

  return /\d+\s*°\s*[fc]|\d+\s*degrees?\s*f/i.test(text);

}



export function hasTimingCue(text: string): boolean {

  return /\d+\s*[-–]\s*\d+\s*min|\d+\s*min|hours?/i.test(text);

}


