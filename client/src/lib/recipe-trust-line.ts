import type { ClientRecipeResponse } from "@shared/schema";

const FALLBACK_LINES = [
  "Crew-ready dinner for busy shifts",
  "Practical spread for a real hall night",
  "Built for firefighters — not food bloggers",
  "Station dinner that actually fills the crew",
  "Hall-tested comfort for tonight's table",
] as const;

function stableIndex(key: string, length: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % length;
}

function norm(s: string): string {
  return s.toLowerCase().trim().replace(/_/g, " ");
}

function tagBlob(recipe: ClientRecipeResponse): string {
  const parts = [
    ...(recipe.tags || []),
    recipe.meal_format,
    recipe.meal_style,
    recipe.recipe_tags?.cuisine,
    recipe.recipe_tags?.cooking_method,
    recipe.recipe_tags?.base_carb,
    recipe.title,
  ].filter(Boolean);
  return norm(parts.join(" "));
}

function totalMinutes(recipe: ClientRecipeResponse): number | null {
  const t = recipe.timing;
  if (!t) return null;
  if (t.total_min > 0) return t.total_min;
  const sum = (t.prep_min || 0) + (t.cook_min || 0);
  return sum > 0 ? sum : null;
}

function crewCount(recipe: ClientRecipeResponse, crewSize?: number): number {
  const n = crewSize ?? recipe.servings;
  return n > 0 ? n : 6;
}

/** Deterministic, context-aware trust line for the recipe card (S7). */
export function buildRecipeTrustLine(recipe: ClientRecipeResponse, crewSize?: number): string {
  const blob = tagBlob(recipe);
  const title = norm(recipe.title || "");
  const mins = totalMinutes(recipe);
  const crew = crewCount(recipe, crewSize);
  const rt = recipe.recipe_tags;
  const method = norm(rt?.cooking_method || "");
  const format = norm(recipe.meal_format || "");
  const cuisine = norm(rt?.cuisine || recipe.meal_plate?.cuisine_label || "");

  if (/parm|parmesan|meatball|lasagna/.test(title)) {
    return "Hall classic comfort dinner";
  }
  if (/chili|stew|soup|chowder/.test(title)) {
    return "Stick-to-your-ribs spread for the hall";
  }
  if (/taco|fajita|burrito|enchilada|quesadilla/.test(title)) {
    return "Crew-pleasing station dinner";
  }
  if (/caesar|salad/.test(title) && /chicken|turkey/.test(blob)) {
    return "Lighter plate — still crew-sized";
  }
  if (/bowl/.test(format) || /bowl/.test(blob)) {
    if (rt?.high_fiber || /high fiber/.test(blob)) {
      return "Balanced crew meal with lighter cleanup";
    }
    return "Built for a full table — bowl night";
  }

  if (/slow cooker|slow-cook|instant pot|crock/.test(method + blob)) {
    return "Perfect for slower station nights";
  }
  if (/sheet pan|sheet-pan|one pot|one-pot|skillet/.test(method + format + blob)) {
    return "One-pan friendly for busy shifts";
  }
  if (/grill/.test(method + blob)) {
    return "Straightforward grill night at the hall";
  }
  if (/slow cooker|slow-cook/.test(blob) || (mins != null && mins >= 75)) {
    return "Worth the time when the hall slows down";
  }

  if (rt?.quick_cleanup || /quick cleanup/.test(blob)) {
    return "Fast cleanup after the call";
  }
  if (rt?.high_protein || /feeds hard|high protein/.test(blob)) {
    return "Protein-forward — feeds a hungry crew";
  }

  if (crew >= 10) {
    return "Large-batch friendly for the hall";
  }
  if (crew >= 8) {
    return `Built for ${crew} at the table`;
  }

  if (mins != null) {
    if (mins <= 28) return "Quick station dinner";
    if (mins <= 38) return "Crew-ready dinner for busy shifts";
    if (mins >= 55) return "Good for post-call dinners when you've got time";
  }

  if (cuisine.includes("mediterranean") || cuisine.includes("greek")) {
    return "Balanced crew meal — hall-friendly flavors";
  }
  if (cuisine.includes("mexican")) {
    return "Big flavors — easy to scale for the crew";
  }
  if (cuisine.includes("italian") || cuisine.includes("pasta")) {
    return "Hall-tested pasta night";
  }
  if (cuisine.includes("bbq") || cuisine.includes("barbecue")) {
    return "Smokehouse spread without the fuss";
  }
  if (cuisine.includes("asian") || cuisine.includes("stir")) {
    return "Stir-fry night — in and out of the kitchen";
  }

  if (/comfort|mac and cheese|cheesy|casserole/.test(blob + title)) {
    return "Hall-tested comfort food";
  }
  if (/lean|lighter|grilled/.test(blob) && !/comfort|cheesy/.test(blob)) {
    return "Lighter crew dinner — still satisfying";
  }

  const key = `${recipe._signature || recipe.title}::${format}::${cuisine}::${crew}`;
  return FALLBACK_LINES[stableIndex(key, FALLBACK_LINES.length)];
}
