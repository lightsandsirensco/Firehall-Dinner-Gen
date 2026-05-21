/**
 * Semantic meal validation + repair — ensures complete, coherent firehall dinners.
 */

import type { GenerateResponse, IngredientItem, RecipeStep } from "@shared/schema";
import {
  detectMealIdentity,
  getRequiredComponents,
  ingredientsMatchPattern,
  classifyComponentRole,
  isSeasoningOrGarnish,
  isValidPlateSide,
  type MealIdentity,
} from "@shared/meal-semantics";
import { log } from "./index";
import { scaleAmountForCrew } from "./firehall-voice";
import { finalizeMealPlate } from "./meal-plate";
import { normalizeFormatKeyForCarb } from "./carb-rules";

export interface MealValidationContext {
  mealFormat: string;
  cuisine: string;
  crewSize: number;
  allergens: string[];
  protein: string;
}

export interface MealValidationResult {
  recipe: GenerateResponse;
  issues: string[];
  repairs: string[];
}

interface RepairTemplate {
  item: string;
  amount: string;
  notes: string;
  step: RecipeStep;
  check: RegExp;
}

const REPAIR_TEMPLATES: Record<string, RepairTemplate> = {
  hoagie_rolls: {
    item: "Hoagie rolls",
    amount: "12 rolls",
    notes: "Required — bread for sandwiches; plate_role: bread",
    check: /\b(hoagie|sub roll|french roll|dinner roll|baguette|ciabatta)\b/i,
    step: {
      heading: "Warm the rolls (400°F, 5–8 min)",
      body: "Split hoagie rolls and warm in the oven until soft inside and lightly crisp outside. Pile on a tray for the crew to build sandwiches.",
    },
  },
  burger_buns: {
    item: "Burger buns",
    amount: "12 brioche buns",
    notes: "Required — buns for burgers; plate_role: bread",
    check: /\b(burger bun|brioche bun)\b/i,
    step: {
      heading: "Toast the buns (medium, 2–3 min)",
      body: "Lightly toast burger buns cut-side down in a dry pan or on the grill. Keep warm until the patties are ready.",
    },
  },
  flour_tortillas: {
    item: "Flour tortillas (8-inch)",
    amount: "24 tortillas",
    notes: "Required — tortillas for tacos; plate_role: bread",
    check: /\b(tortilla|taco shell)\b/i,
    step: {
      heading: "Warm the tortillas (dry pan, 30 sec each)",
      body: "Heat tortillas in a dry skillet until pliable. Wrap in foil to keep warm for the line.",
    },
  },
  pasta_dry: {
    item: "Penne pasta, dry",
    amount: "2 lbs",
    notes: "Required — pasta base; plate_role: starch",
    check: /\b(pasta|spaghetti|penne|linguine|fettuccine|noodle|macaroni)\b/i,
    step: {
      heading: "Boil the pasta (rolling boil, 10–12 min)",
      body: "Cook pasta in salted water until al dente. Drain, toss with a little oil, and hold for plating.",
    },
  },
  jasmine_rice: {
    item: "Jasmine rice, uncooked",
    amount: "3 cups",
    notes: "Required — rice base; plate_role: starch",
    check: /\b(rice|jasmine|basmati)\b/i,
    step: {
      heading: "Cook jasmine rice (simmer, 15–18 min)",
      body: "Rinse rice, simmer covered until fluffy. Keep warm for bowls or curry service.",
    },
  },
  naan: {
    item: "Naan bread",
    amount: "12 pieces",
    notes: "Required — naan for curry night; plate_role: bread",
    check: /\b(naan|roti|pita)\b/i,
    step: {
      heading: "Warm the naan (400°F, 4–6 min)",
      body: "Heat naan in the oven until soft and warm. Serve stacked for tearing at the table.",
    },
  },
  au_jus: {
    item: "Beef au jus (concentrate + water or broth)",
    amount: "2 qt",
    notes: "Required — dipping jus for French dip; plate_role: sauce",
    check: /\b(au jus|beef broth|consomme|jus|onion soup)\b/i,
    step: {
      heading: "Simmer the au jus (medium, 10 min)",
      body: "Warm beef broth or prepared au jus. Portion into small cups for dipping — essential for French dip night.",
    },
  },
  coleslaw_side: {
    item: "Coleslaw mix",
    amount: "2 bags (14 oz each)",
    notes: "Station side — veg for the table; plate_role: veg",
    check: /\b(coleslaw|slaw)\b/i,
    step: {
      heading: "Toss the coleslaw (no heat, 5 min)",
      body: "Toss slaw with mayo and vinegar. Chill until sandwiches are ready.",
    },
  },
};

const IDENTITY_REPAIR_KEYS: Partial<Record<MealIdentity, Record<string, string>>> = {
  french_dip: { rolls: "hoagie_rolls", au_jus: "au_jus" },
  burger: { buns: "burger_buns" },
  sandwich: { bread: "hoagie_rolls" },
  taco: { tortillas: "flour_tortillas" },
  wrap: { wraps: "flour_tortillas" },
  pasta: { pasta: "pasta_dry" },
  bowl: { base: "jasmine_rice" },
  stir_fry: { base: "jasmine_rice" },
  indian_curry: { rice_or_naan: "naan" },
};

function allergenBlocks(item: string, allergens: string[]): boolean {
  const a = allergens.map((x) => x.toLowerCase());
  const t = item.toLowerCase();
  if (a.includes("gluten") && /\b(bread|bun|pasta|naan|pita|flour|tortilla|noodle|penne|spaghetti|roll|hoagie)\b/i.test(t)) {
    return true;
  }
  if (a.includes("dairy") && /\b(cheese|butter|cream|yogurt|parmesan|naan)\b/i.test(t)) return true;
  return false;
}

function insertStepBeforeServe(steps: RecipeStep[], step: RecipeStep): RecipeStep[] {
  const copy = [...steps];
  const serveIdx = copy.findIndex((s) =>
    /\b(serve|plate|ladle|divide|portion|build)\b/i.test(`${s.heading} ${s.body}`),
  );
  if (serveIdx >= 0) copy.splice(serveIdx, 0, step);
  else copy.push(step);
  return copy;
}

function ingredientExists(ingredients: IngredientItem[], pattern: RegExp): boolean {
  return ingredients.some((i) => pattern.test(`${i.item} ${i.notes || ""}`));
}

function applyRepair(
  recipe: GenerateResponse,
  templateKey: string,
  crewSize: number,
  allergens: string[],
): boolean {
  const tpl = REPAIR_TEMPLATES[templateKey];
  if (!tpl || allergenBlocks(tpl.item, allergens)) return false;
  if (ingredientExists(recipe.ingredients || [], tpl.check)) return false;

  const ingredients = [...(recipe.ingredients || [])];
  ingredients.push({
    item: tpl.item,
    amount: scaleAmountForCrew(tpl.amount, crewSize),
    notes: tpl.notes,
  });
  recipe.ingredients = ingredients;
  recipe.steps = insertStepBeforeServe(recipe.steps || [], tpl.step);
  return true;
}

/** Re-tag notes for plate builder; drop seasonings mis-labeled as sides. */
function normalizeIngredientRoles(
  recipe: GenerateResponse,
  identity: MealIdentity,
  crewSize: number,
  allergens: string[],
): string[] {
  const fixes: string[] = [];
  const title = recipe.title || "";

  recipe.ingredients = (recipe.ingredients || []).map((ing) => {
    const role = classifyComponentRole(ing.item, ing.notes, title);

    if (role === "seasoning" && /station side|plate_role:\s*(veg|starch)/i.test(ing.notes || "")) {
      fixes.push(`reclass:${ing.item}:seasoning`);
      return { ...ing, notes: "Pantry — seasoning (not a plate side)" };
    }

    if (role === "veg_side" && isSeasoningOrGarnish(ing.item, ing.notes)) {
      fixes.push(`reclass:${ing.item}:not-veg-side`);
      return { ...ing, notes: "Pantry — seasoning" };
    }

    if (role === "bread_base" && !/plate_role|required/i.test(ing.notes || "")) {
      return { ...ing, notes: `${ing.notes ? ing.notes + "; " : ""}plate_role: bread`.trim() };
    }

    return ing;
  });

  const text = (recipe.ingredients || []).map((i) => `${i.item} ${i.notes}`).join(" ");
  const hasRealVeg = (recipe.ingredients || []).some(
    (i) => classifyComponentRole(i.item, i.notes, title) === "veg_side" && isValidPlateSide(i.item, i.notes),
  );

  if (
    !hasRealVeg &&
    (identity === "sandwich" || identity === "burger" || identity === "french_dip") &&
    !ingredientExists(recipe.ingredients || [], /\b(coleslaw|slaw|salad|pickle)\b/i)
  ) {
    if (applyRepair(recipe, "coleslaw_side", crewSize, allergens)) fixes.push("repair:coleslaw_for_handheld");
  }

  return fixes;
}

export function validateMealSemantics(
  recipe: GenerateResponse,
  ctx: MealValidationContext,
): { issues: string[]; ok: boolean } {
  const issues: string[] = [];
  const title = recipe.title || "";
  const formatKey = normalizeFormatKeyForCarb(ctx.mealFormat);
  const identity = detectMealIdentity(title, formatKey);
  const ingredients = recipe.ingredients || [];

  const required = getRequiredComponents(identity);
  for (const req of required) {
    if (!ingredientsMatchPattern(ingredients, req.pattern)) {
      issues.push(`missing_required:${identity}:${req.id}:${req.label}`);
    }
  }

  const sidesOnPlate = ingredients.filter((i) => {
    const role = classifyComponentRole(i.item, i.notes, title);
    return role === "veg_side" || role === "starch_side" || role === "bread_base";
  });

  for (const ing of sidesOnPlate) {
    if (!isValidPlateSide(ing.item, ing.notes)) {
      issues.push(`invalid_side:${ing.item}`);
    }
  }

  if (identity === "sandwich" || identity === "french_dip" || identity === "burger") {
    const hasBread = ingredientsMatchPattern(ingredients, REPAIR_TEMPLATES.hoagie_rolls.check) ||
      ingredientsMatchPattern(ingredients, REPAIR_TEMPLATES.burger_buns.check) ||
      /\b(bread|bun|roll)\b/i.test(ingredients.map((i) => i.item).join(" "));
    if (!hasBread) {
      issues.push(`critical:no_bread_for_${identity}`);
    }
  }

  return { issues, ok: issues.filter((i) => i.startsWith("critical:") || i.startsWith("missing_required:")).length === 0 };
}

/**
 * Validate meal structure, repair missing required components, re-plate.
 */
export function validateAndRepairMeal(
  recipe: GenerateResponse,
  ctx: MealValidationContext,
): MealValidationResult {
  const issues: string[] = [];
  const repairs: string[] = [];

  let fixed: GenerateResponse = {
    ...recipe,
    ingredients: [...(recipe.ingredients || [])],
    steps: [...(recipe.steps || [])],
    tags: recipe.tags ? { ...recipe.tags } : undefined,
  };

  const title = fixed.title || "";
  const formatKey = normalizeFormatKeyForCarb(ctx.mealFormat);
  const identity = detectMealIdentity(title, formatKey);

  const { issues: preIssues } = validateMealSemantics(fixed, ctx);
  if (preIssues.length > 0) {
    log(`[meal-validate] pre-check "${title}": ${preIssues.join("; ")}`, "validate");
  }

  const repairMap = IDENTITY_REPAIR_KEYS[identity] || {};
  const required = getRequiredComponents(identity);

  for (const req of required) {
    if (ingredientsMatchPattern(fixed.ingredients || [], req.pattern)) continue;

    const templateKey = repairMap[req.id];
    if (templateKey && applyRepair(fixed, templateKey, ctx.crewSize, ctx.allergens)) {
      repairs.push(`repair:${identity}:${req.id}:${templateKey}`);
    } else {
      repairs.push(`unrepaired:${identity}:${req.id}`);
    }
  }

  if (identity === "indian_curry") {
    const hasRice = ingredientExists(fixed.ingredients || [], /\b(rice|basmati|jasmine)\b/i);
    const hasNaan = ingredientExists(fixed.ingredients || [], /\b(naan|roti|pita)\b/i);
    if (!hasRice && !hasNaan) {
      if (applyRepair(fixed, "naan", ctx.crewSize, ctx.allergens)) repairs.push("repair:indian_curry:naan");
      else if (applyRepair(fixed, "jasmine_rice", ctx.crewSize, ctx.allergens)) repairs.push("repair:indian_curry:rice");
    }
  }

  if (identity === "pasta" && !ingredientExists(fixed.ingredients || [], REPAIR_TEMPLATES.pasta_dry.check)) {
    if (applyRepair(fixed, "pasta_dry", ctx.crewSize, ctx.allergens)) repairs.push("repair:pasta:base");
  }

  const roleFixes = normalizeIngredientRoles(fixed, identity, ctx.crewSize, ctx.allergens);
  repairs.push(...roleFixes);

  const { issues: postIssues } = validateMealSemantics(fixed, ctx);
  issues.push(...postIssues);

  const plated = finalizeMealPlate(fixed, {
    cuisine: ctx.cuisine,
    protein: ctx.protein,
    mealFormat: ctx.mealFormat,
    originalTitle: title,
    crewSize: ctx.crewSize,
  });

  if (postIssues.length > 0) {
    log(`[meal-validate] "${plated.title}" identity=${identity} unresolved=[${postIssues.join("; ")}]`, "validate");
  }
  if (repairs.length > 0) {
    log(`[meal-validate] "${plated.title}" repairs=[${repairs.join("; ")}]`, "validate");
  }

  return { recipe: plated, issues, repairs };
}
