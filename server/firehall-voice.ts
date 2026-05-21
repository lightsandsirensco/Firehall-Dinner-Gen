/**
 * Firehall tone, crew portions, and copy — keeps output practical and station-realistic.
 */

import type { GenerateResponse, IngredientItem } from "@shared/schema";

const PROTEIN_LB_FLOOR_PER_SEAT = 0.45; // ~7 oz raw per firefighter — hall portions, not meal-prep

const PROTEIN_ITEM_PATTERN =
  /\b(chicken|beef|pork|turkey|sausage|ground beef|steak|thigh|breast|drumstick|pork chop|ribs|ham|bacon|shrimp|salmon|fish|cod|tuna)\b/i;

const LB_PATTERN = /^([\d.]+)\s*(lb|lbs|pound|pounds)\b/i;

const WHY_OPENERS = [
  "The kind of spread that ends the \"what's for dinner?\" argument fast.",
  "Built for a hungry crew coming off a long day — hearty, practical, no fuss.",
  "Hall-style dinner: big flavors, real portions, stuff you can actually pull off on shift.",
  "This is a table meal, not a food-blog project — feeds the crew and tastes like home.",
  "Comfort food energy without the tiny portions — everyone eats well tonight.",
];

const SHIFT_CONTEXT = [
  "Get the starch going first while someone preps the main.",
  "Works great when you've got one person on the stove and another on sides.",
  "Most of this can run while gear's getting checked — just watch your temps.",
  "Family-style on the hall table — line up, grab a plate, no one's leaving hungry.",
];

export function healthinessForVoice(pref: string): string {
  if (pref === "lean") return "lighter but still filling (not diet food)";
  if (pref === "comfort") return "full comfort / stick-to-your-ribs";
  return "classic hall — hearty and balanced";
}

export function buildHallWhyItFits(
  title: string,
  crewSize: number,
  cuisine: string,
  protein: string,
  totalMin: number,
  mealFormat?: string,
): string {
  const opener = pickFrom(WHY_OPENERS);
  const c =
    cuisine && cuisine !== "any"
      ? cuisine.charAt(0).toUpperCase() + cuisine.slice(1).replace(/_/g, " ")
      : "Hearty";
  const p = protein && protein !== "any" ? protein : "protein";
  const format =
    mealFormat && mealFormat !== "random"
      ? mealFormat.replace(/_/g, " ")
      : "crew dinner";
  const shift = pickFrom(SHIFT_CONTEXT);
  return `${opener} ${c} ${p} ${format} for ${crewSize} — about ${totalMin} min. ${shift}`;
}

export function hallCleanupTip(): string {
  return pickFrom([
    "Soak sheet pans and skillets while the crew eats — cleanup's easier when stuff's still warm.",
    "Line pans with foil when you can. Wipe the range as soon as pots come off — tomorrow-you will thank you.",
    "Get protein trays in the fridge within two hours. Stack dirty pans to soak; knock it out before shift change if you can.",
  ]);
}

export function hallProTips(crewSize: number, baseServings: number): string[] {
  return [
    `Hall portions for ${crewSize} — if it looks light, round protein and starch up. Firefighters eat.`,
    baseServings < crewSize
      ? `Scaled up from a ${baseServings}-serving recipe. Taste for salt after scaling — go gradual.`
      : "Taste for salt and heat before you call it — the crew will tell you straight.",
    "Frozen fries, bag salad, and sheet-pan potatoes are fair game — speed beats fancy on shift.",
  ];
}

export function scaleAmountForCrew(base: string, crewSize: number): string {
  let mult = 1;
  if (crewSize <= 4) mult = 1;
  else if (crewSize <= 6) mult = 1.25;
  else if (crewSize <= 8) mult = 1.5;
  else if (crewSize <= 10) mult = 1.85;
  else mult = 2.25;

  const m = base.match(/^([\d.]+)\s*(.*)$/);
  if (!m) return base;
  const n = Math.ceil(parseFloat(m[1]) * mult * 4) / 4;
  const unit = m[2].trim();
  return unit ? `${n} ${unit}` : String(n);
}

/** Bump protein/starch quantities so hall crews aren't shorted. */
export function applyCrewPortionFloors(
  ingredients: IngredientItem[],
  crewSize: number,
): IngredientItem[] {
  const proteinFloorLbs = Math.max(2, Math.ceil(crewSize * PROTEIN_LB_FLOOR_PER_SEAT * 2) / 2);

  return ingredients.map((ing) => {
    const item = ing.item || "";
    if (!PROTEIN_ITEM_PATTERN.test(item)) return ing;

    const lb = ing.amount.match(LB_PATTERN);
    if (lb) {
      const current = parseFloat(lb[1]);
      if (current < proteinFloorLbs) {
        return {
          ...ing,
          amount: `${proteinFloorLbs} lbs`,
          notes: ing.notes ? `${ing.notes}; hall portion` : "Hall portion",
        };
      }
    }

    // Whole chickens / trays — nudge count for big crews
    if (/\bwhole chicken\b/i.test(item) && crewSize >= 8) {
      const count = ing.amount.match(/^(\d+)/);
      if (count && parseInt(count[1], 10) < Math.ceil(crewSize / 4)) {
        return {
          ...ing,
          amount: `${Math.ceil(crewSize / 4)} whole chickens`,
          notes: ing.notes || "Hall portion",
        };
      }
    }

    return ing;
  });
}

export function applyHallVoiceToRecipe(
  recipe: GenerateResponse,
  crewSize: number,
  baseServings: number,
  cuisine: string,
  protein: string,
  mealFormat?: string,
): GenerateResponse {
  const totalMin = recipe.timing?.total_minutes ?? 35;
  return {
    ...recipe,
    ingredients: applyCrewPortionFloors(recipe.ingredients || [], crewSize),
    why_it_fits_tonight:
      recipe.why_it_fits_tonight && !/scaled for \d+ crew members/i.test(recipe.why_it_fits_tonight)
        ? recipe.why_it_fits_tonight
        : buildHallWhyItFits(recipe.title, crewSize, cuisine, protein, totalMin, mealFormat),
    cleanup_tip: hallCleanupTip(),
    pro_tips: hallProTips(crewSize, baseServings),
  };
}

function pickFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
