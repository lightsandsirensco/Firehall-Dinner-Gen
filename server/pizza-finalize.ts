/**
 * Normalize, validate, and enrich pizza recipes before API response.
 */

import type { PizzaRequest, PizzaResponse, IngredientItem, RecipeStep } from "../shared/schema.js";
import { buildPizzaTemplate } from "./pizza-templates.js";
import { enhanceRecipeStepsSync, buildEnhanceContextFromTitle } from "./instruction-enhancer.js";
import { log } from "./logger.js";

function normalizeIngredientList(arr: unknown): IngredientItem[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((entry: unknown) => {
      if (typeof entry === "string") {
        const match = entry.match(
          /^([\d½¼¾⅓⅔⅛\s\/\.\-]+(?:cups?|tbsp|tsp|oz|g|lbs?|pounds?|cans?|cloves?|pinch(?:es)?|packets?|bunch(?:es)?|large|medium|small)?)\s+(.+)$/i,
        );
        if (match) return { item: match[2].trim(), amount: match[1].trim(), notes: "" };
        return { item: entry.trim(), amount: "", notes: "" };
      }
      if (entry && typeof entry === "object") {
        const o = entry as Record<string, unknown>;
        return {
          item: String(o.item || o.name || "").trim(),
          amount: String(o.amount || o.qty || "").trim(),
          notes: String(o.notes || "").trim(),
        };
      }
      return { item: String(entry), amount: "", notes: "" };
    })
    .filter((i) => i.item.length > 0);
}

function normalizeBuildSteps(steps: unknown): RecipeStep[] {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((s, i) => {
      if (typeof s === "string") {
        return { heading: `Step ${i + 1}`, body: s.trim() };
      }
      if (s && typeof s === "object") {
        const o = s as Record<string, unknown>;
        const body = String(o.body || o.step || o.instruction || "").trim();
        const heading = String(o.heading || o.title || `Step ${i + 1}`).trim();
        return { heading, body };
      }
      return { heading: `Step ${i + 1}`, body: String(s) };
    })
    .filter((s) => s.body.length > 0);
}

function mergeIngredientLists(
  primary: IngredientItem[],
  fallback: IngredientItem[],
): IngredientItem[] {
  if (primary.length >= fallback.length) return primary;
  const seen = new Set(primary.map((i) => i.item.toLowerCase()));
  const merged = [...primary];
  for (const item of fallback) {
    if (!seen.has(item.item.toLowerCase())) {
      merged.push(item);
      seen.add(item.item.toLowerCase());
    }
  }
  return merged;
}

function pizzaCountLabel(crewSize: number): string {
  if (crewSize <= 4) return "2–3 large pizzas for 4 people";
  if (crewSize <= 6) return "3–4 large pizzas for 6 people";
  if (crewSize <= 8) return "4–5 large pizzas for 8 people";
  return `${Math.ceil(crewSize / 2)} large pizzas for ${crewSize} people`;
}

/** Ensure recipe has minimum viable pizza structure; merge from template gaps. */
export function finalizePizzaRecipe(
  recipe: PizzaResponse,
  request: PizzaRequest,
  conceptId: string,
  source: "ai" | "template",
): PizzaResponse {
  const template = buildPizzaTemplate(conceptId, request);

  recipe.pizza_style_id = conceptId;
  recipe.title = (recipe.title || template.title).trim();
  recipe.dough_type = recipe.dough_type || template.dough_type;
  recipe.why_this_works = recipe.why_this_works || template.why_this_works;
  recipe.recommended_pizzas = recipe.recommended_pizzas || pizzaCountLabel(request.crew_size);

  recipe.timing = {
    prep_minutes: recipe.timing?.prep_minutes || template.timing.prep_minutes,
    bake_minutes: recipe.timing?.bake_minutes || template.timing.bake_minutes,
    total_minutes:
      recipe.timing?.total_minutes ||
      (recipe.timing?.prep_minutes || 0) + (recipe.timing?.bake_minutes || 0) ||
      template.timing.total_minutes,
  };

  recipe.oven_setup = {
    preheat_temp_f: recipe.oven_setup?.preheat_temp_f || template.oven_setup.preheat_temp_f,
    preheat_temp_c: recipe.oven_setup?.preheat_temp_c || template.oven_setup.preheat_temp_c,
    rack_position: recipe.oven_setup?.rack_position || template.oven_setup.rack_position,
    surface_option: recipe.oven_setup?.surface_option || template.oven_setup.surface_option,
  };

  if (!recipe.ingredients) {
    recipe.ingredients = { sauce: [], cheese: [], toppings: [], drizzles: [] };
  }

  if (recipe.ingredients.dough) {
    recipe.ingredients.dough = normalizeIngredientList(recipe.ingredients.dough);
  } else if (template.ingredients.dough) {
    recipe.ingredients.dough = template.ingredients.dough;
  }

  recipe.ingredients.sauce = mergeIngredientLists(
    normalizeIngredientList(recipe.ingredients.sauce),
    template.ingredients.sauce,
  );
  recipe.ingredients.cheese = mergeIngredientLists(
    normalizeIngredientList(recipe.ingredients.cheese),
    template.ingredients.cheese,
  );
  recipe.ingredients.toppings = mergeIngredientLists(
    normalizeIngredientList(recipe.ingredients.toppings),
    template.ingredients.toppings,
  );
  recipe.ingredients.drizzles = mergeIngredientLists(
    normalizeIngredientList(recipe.ingredients.drizzles),
    template.ingredients.drizzles,
  );

  let buildSteps = normalizeBuildSteps(recipe.build_steps);
  if (buildSteps.length < 3) {
    buildSteps = template.build_steps;
    log(`[pizza] build_steps thin — using template steps for ${conceptId}`, "catalog");
  }

  const ctx = buildEnhanceContextFromTitle(recipe.title, {
    protein: template.protein_safety?.[0]?.protein,
    totalMinutes: recipe.timing.total_minutes,
    crewSize: request.crew_size,
    ingredients: [
      ...recipe.ingredients.sauce,
      ...recipe.ingredients.cheese,
      ...recipe.ingredients.toppings,
    ].map((i) => i.item),
    mealFormat: "pizza",
  });
  recipe.build_steps = enhanceRecipeStepsSync(buildSteps, ctx);

  if (!recipe.protein_safety?.length && template.protein_safety?.length) {
    recipe.protein_safety = template.protein_safety;
  } else if (Array.isArray(recipe.protein_safety)) {
    recipe.protein_safety = recipe.protein_safety.map((ps: unknown) => {
      if (typeof ps === "string") {
        const tempMatch = (ps as string).match(/(\d+)\s*°?\s*F/i);
        return {
          protein: "Meat",
          target_temp_f: tempMatch ? parseInt(tempMatch[1], 10) : 165,
          target_temp_c: 74,
          rest_minutes: 0,
          probe_where: "thickest part",
          notes: ps as string,
        };
      }
      const p = ps as Record<string, unknown>;
      return {
        protein: String(p.protein || "Meat"),
        target_temp_f: Number(p.target_temp_f || p.temp_f || 165),
        target_temp_c: Number(p.target_temp_c || p.temp_c || 74),
        rest_minutes: Number(p.rest_minutes || p.rest_min || 0),
        probe_where: String(p.probe_where || p.probe || "thickest part"),
        notes: String(p.notes || ""),
      };
    });
  } else {
    recipe.protein_safety = [];
  }

  recipe.cleanup_tip =
    recipe.cleanup_tip?.trim() ||
    template.cleanup_tip ||
    "Line sheet pans with parchment for easier cleanup after the crew eats.";

  recipe.macros_per_serving = {
    calories: Math.round(recipe.macros_per_serving?.calories || template.macros_per_serving.calories),
    protein_g: Math.round(recipe.macros_per_serving?.protein_g || template.macros_per_serving.protein_g),
    carbs_g: Math.round(recipe.macros_per_serving?.carbs_g || template.macros_per_serving.carbs_g),
    fat_g: Math.round(recipe.macros_per_serving?.fat_g || template.macros_per_serving.fat_g),
  };

  if (recipe.veg_option?.swap_toppings) {
    recipe.veg_option.swap_toppings = normalizeIngredientList(recipe.veg_option.swap_toppings);
  }

  if (!recipe.title || recipe.ingredients.sauce.length === 0 || recipe.build_steps.length < 2) {
    log(`[pizza] finalize fell back to full template for ${conceptId} (source=${source})`, "catalog");
    return { ...buildPizzaTemplate(conceptId, request), pizza_style_id: conceptId };
  }

  return recipe;
}
