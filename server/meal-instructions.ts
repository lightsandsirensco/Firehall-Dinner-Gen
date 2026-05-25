/**
 * Meal instruction engine — ingredient-coupled, format-specific cooking flows.
 * Replaces generic rule expansion for /api/generate response path.
 */

import type { GenerateResponse, IngredientItem, RecipeStep } from "../shared/schema.js";
import {
  classifyComponentRole,
  detectMealIdentity,
  isSeasoningOrGarnish,
  PROTEIN_PATTERN,
  type MealIdentity,
} from "../shared/meal-semantics.js";
import type { StructuredRecipeStep, CookingMethod } from "../shared/recipe-step-schema.js";
import { structuredRecipeStepSchema, structuredToRecipeStep } from "../shared/recipe-step-schema.js";
import {
  sourceStepsAreSpecific,
  validateMealSteps,
  type MealStepValidationContext,
} from "../shared/meal-step-validation.js";
import { isInventedMealSource, shouldPreserveSourceSteps } from "../shared/imported-recipe.js";
import type { RecipeSourceAttribution } from "../shared/canonical-recipe.js";
import {
  dedupeRedundantSteps,
  stripBannedInstructionPhrases,
} from "../shared/firehall-instruction-voice.js";

export interface MealInstructionContext {
  title: string;
  mealFormat: string;
  identity: MealIdentity;
  protein: string;
  crewSize: number;
  totalMinutes: number;
  ingredients: IngredientItem[];
}

function s(
  title: string,
  instruction: string,
  ingredients_used: string[],
  estimated_time: number,
  cooking_method: CookingMethod,
): StructuredRecipeStep {
  const parsed = structuredRecipeStepSchema.parse({
    title,
    instruction: stripBannedInstructionPhrases(instruction),
    ingredients_used,
    estimated_time,
    cooking_method,
  });
  return parsed;
}

function toSteps(structured: StructuredRecipeStep[]): RecipeStep[] {
  return dedupeRedundantSteps(
    structured.map((x) => structuredToRecipeStep(x) as RecipeStep),
  );
}

function names(items: IngredientItem[], max = 5): string {
  const n = items.map((i) => i.item).filter(Boolean);
  if (n.length <= max) return n.join(", ");
  return `${n.slice(0, max).join(", ")}, and ${n.length - max} more`;
}

function partitionIngredients(ings: IngredientItem[]) {
  const proteins: IngredientItem[] = [];
  const starches: IngredientItem[] = [];
  const vegSides: IngredientItem[] = [];
  const breads: IngredientItem[] = [];
  const sauces: IngredientItem[] = [];
  const other: IngredientItem[] = [];

  for (const ing of ings) {
    if (isSeasoningOrGarnish(ing.item, ing.notes)) continue;
    const role = classifyComponentRole(ing.item, ing.notes);
    if (role === "main_protein" || PROTEIN_PATTERN.test(ing.item)) proteins.push(ing);
    else if (role === "starch_side") starches.push(ing);
    else if (role === "veg_side") vegSides.push(ing);
    else if (role === "bread_base") breads.push(ing);
    else if (role === "sauce") sauces.push(ing);
    else other.push(ing);
  }
  return { proteins, starches, vegSides, breads, sauces, other };
}

function proteinTempNote(proteinName: string): string {
  const p = proteinName.toLowerCase();
  if (/chicken|turkey/.test(p)) return " Target 165°F (74°C) in the thickest piece — juices run clear.";
  if (/ground|beef.*patty|burger|sausage/.test(p)) return " Cook until no pink inside; ground beef to 160°F (71°C).";
  if (/pork/.test(p)) return " Target 145°F (63°C), then rest 3 minutes.";
  if (/fish|salmon|shrimp|cod|tuna|seafood/.test(p)) return " Fish flakes with a fork; shrimp turn pink and firm.";
  return " Cook through to safe internal temperature for your protein.";
}

function prepStep(ctx: MealInstructionContext, used: IngredientItem[]): StructuredRecipeStep {
  return s(
    "Prep the station",
    `Lay out ${names(used, 8)} for ${ctx.crewSize} crew portions. Read all steps once — you want the main and sides landing together, not a cold line waiting on rice.`,
    used.slice(0, 8).map((i) => i.item),
    Math.min(12, Math.max(8, Math.round(ctx.totalMinutes * 0.12))),
    "prep",
  );
}

function serveStep(ctx: MealInstructionContext, dish: string): StructuredRecipeStep {
  return s(
    "Serve while hot",
    `Portion ${dish} for ${ctx.crewSize} — full servings, not skimpy scoops. Taste once for salt and acid; if anything tastes flat, a squeeze of lime or splash of broth wakes it up. Hold covered at 200°F if service is delayed.`,
    [dish],
    3,
    "serve",
  );
}

function buildBurgerSteps(ctx: MealInstructionContext): RecipeStep[] {
  const { proteins, breads, vegSides, starches } = partitionIngredients(ctx.ingredients);
  const patty = proteins[0]?.item || "burger patties";
  const buns = breads[0]?.item || "burger buns";
  const used = [patty, buns, ...vegSides.map((i) => i.item), ...starches.map((i) => i.item)].filter(Boolean);

  const steps: StructuredRecipeStep[] = [
    prepStep(ctx, ctx.ingredients.filter((i) => !isSeasoningOrGarnish(i.item, i.notes))),
    s(
      "Form and season the patties",
      `Shape ${patty} into ${ctx.crewSize} equal patties slightly wider than ${buns} — they shrink when cooking. Season both sides with salt and pepper; indent the center with your thumb so they stay flat on the griddle.`,
      [patty],
      8,
      "prep",
    ),
    s(
      "Cook the burgers",
      `Heat a large cast-iron skillet or flat-top over medium-high until a water drop sizzles. Cook patties 4–5 minutes per side for a solid sear — flip once, don't press out the juice.${proteinTempNote(patty)} Work in batches if the pan is crowded.`,
      [patty],
      12,
      "grill",
    ),
    s(
      "Toast the buns",
      `Split ${buns} and toast cut-side down in the same pan (or under the broiler) for 1–2 minutes until golden — dry buns soak up juice and fall apart on the line.`,
      [buns],
      3,
      "sauté",
    ),
  ];

  if (starches.length) {
    steps.push(
      s(
        `Cook ${starches[0].item}`,
        `Prepare ${starches[0].item} while burgers rest — follow package directions for frozen fries or wedges. Spread in one layer on a sheet pan at 425°F until crisp and golden at the edges.`,
        [starches[0].item],
        18,
        "bake",
      ),
    );
  }
  if (vegSides.length) {
    steps.push(
      s(
        `Heat ${vegSides[0].item}`,
        `Warm or sauté ${names(vegSides, 2)} in a second pan while burgers finish — station sides should be hot when the patties come off.`,
        vegSides.map((i) => i.item),
        8,
        "sauté",
      ),
    );
  }

  steps.push(
    s(
      "Assemble the burgers",
      `Build bottom bun → patty → any cheese or toppings from your list → top bun. Keep assembled burgers on a sheet pan in a warm oven (200°F) if the crew is staggered.`,
      [buns, patty],
      4,
      "assemble",
    ),
    serveStep(ctx, "burgers"),
  );

  return toSteps(steps);
}

function buildPastaSteps(ctx: MealInstructionContext): RecipeStep[] {
  const { proteins, starches, sauces, vegSides } = partitionIngredients(ctx.ingredients);
  const pasta = starches.find((i) => /\b(pasta|spaghetti|penne|noodle|linguine|macaroni)\b/i.test(i.item))?.item
    || starches[0]?.item
    || "pasta";
  const protein = proteins[0]?.item;
  const sauce = sauces[0]?.item;

  const steps: StructuredRecipeStep[] = [
    prepStep(ctx, ctx.ingredients.filter((i) => !isSeasoningOrGarnish(i.item, i.notes))),
    s(
      "Boil the pasta",
      `Bring a large pot of salted water to a rolling boil. Add ${pasta} and stir immediately so it doesn't clump. Cook until tender with a slight bite (al dente). Reserve ½ cup pasta water, then drain well.`,
      [pasta],
      12,
      "boil",
    ),
  ];

  if (protein) {
    steps.push(
      s(
        `Cook ${protein}`,
        `Pat ${protein} dry. Sear in a large skillet over medium-high with a little oil until browned, then finish to safe doneness.${proteinTempNote(protein)} Remove and hold on a plate while you build the sauce.`,
        [protein],
        14,
        "sear",
      ),
    );
  }

  if (sauce) {
    steps.push(
      s(
        `Simmer the sauce with ${sauce}`,
        `Warm ${sauce} in the same pan — scrape up the fond from the protein. If the sauce is thick, loosen with a splash of pasta water. Toss in ${vegSides.length ? names(vegSides, 2) : "any veg from your list"} until heated through.`,
        [sauce, ...vegSides.map((i) => i.item)],
        10,
        "simmer",
      ),
    );
  } else if (vegSides.length) {
    steps.push(
      s(
        "Sauté aromatics and veg",
        `Sauté ${names(vegSides, 3)} in olive oil over medium heat until tender. Add garlic or onion from your ingredient list if you have them — cook until fragrant, not brown.`,
        vegSides.map((i) => i.item),
        8,
        "sauté",
      ),
    );
  }

  steps.push(
    s(
      "Toss and finish the pasta",
      `Return ${pasta} to the pan with the sauce and protein. Toss over medium heat 1–2 minutes — add pasta water a tablespoon at a time if it looks dry. Taste for salt before you call it done.`,
      [pasta, ...(protein ? [protein] : []), ...(sauce ? [sauce] : [])],
      5,
      "sauté",
    ),
    serveStep(ctx, "pasta"),
  );

  return toSteps(steps);
}

function buildTacoSteps(ctx: MealInstructionContext): RecipeStep[] {
  const { proteins, breads, vegSides, sauces } = partitionIngredients(ctx.ingredients);
  const tortilla = breads.find((i) => /tortilla|shell/i.test(i.item))?.item;
  if (!tortilla) {
    return buildBowlSteps(ctx);
  }

  const filling = proteins[0]?.item || "filling";
  const fillLower = filling.toLowerCase();
  const isGround = /\b(ground|beef|turkey|pork|sausage|chorizo)\b/i.test(fillLower);
  const isFish = /\b(fish|shrimp|cod|tilapia|mahi|seafood)\b/i.test(fillLower);
  const isShredded = /\b(shredded|rotisserie|pulled|pre-?cooked)\b/i.test(fillLower);

  let cookBody: string;
  if (isFish) {
    cookBody =
      `Pat ${filling} dry — wet fish steams instead of browning. Season with salt, pepper, and chili powder from your list. ` +
      `Sear in a hot oiled skillet 2–3 minutes per side until opaque and flaky at the thickest part. Break into chunks for tacos; don't overcook or it turns rubbery.`;
  } else if (isShredded) {
    cookBody =
      `Warm ${filling} in a skillet with a splash of oil and your spice mix until steaming hot (165°F for poultry). ` +
      `Toss gently — you're waking up flavor, not drying it out. Add a spoon of salsa or broth if it looks dry.`;
  } else if (isGround) {
    cookBody =
      `Heat a large skillet over medium-high until a drop of water sizzles. Add ${filling} in one layer and let it sit 2 minutes to brown before stirring. ` +
      `Break into crumbles, season with the spices from your ingredient list, and cook until no pink remains and the pan smells toasty.${proteinTempNote(filling)} ` +
      `Drain grease if the pan looks flooded — you want flavor, not a greasy line.`;
  } else {
    cookBody =
      `Season ${filling} with salt and the spices on your list. Sear or sauté over medium-high until cooked through with golden edges — ` +
      `cut into bite-size pieces if you're working with breasts or thighs.${proteinTempNote(filling)}`;
  }

  const steps: StructuredRecipeStep[] = [
    prepStep(ctx, ctx.ingredients.filter((i) => !isSeasoningOrGarnish(i.item, i.notes))),
    s(`Cook the ${filling}`, cookBody, [filling], isFish ? 10 : 14, isFish ? "sear" : "sauté"),
    s(
      `Warm ${tortilla}`,
      `Heat ${tortilla} in a dry skillet 20–30 seconds per side until pliable and spotty brown, or wrap stacked tortillas in foil at 300°F for 5–8 minutes. ` +
        `Cold tortillas crack when folded — warm is non-negotiable.`,
      [tortilla],
      5,
      "no_heat",
    ),
    s(
      "Build the topping line",
      `Set ${names(vegSides, 4)}${sauces.length ? `, ${names(sauces, 2)}` : ""} in bowls with spoons. ` +
        `Keep cheese and lettuce separate so hot meat doesn't wilt the greens before the crew builds.`,
      [...vegSides, ...sauces].map((i) => i.item),
      5,
      "assemble",
    ),
    s(
      "Assemble tacos to order",
      `Each person takes two ${tortilla}, fills with ${filling}, then tops as they like. ` +
        `Serve immediately — assembled tacos go soggy if they sit under heat lamps.`,
      [tortilla, filling],
      3,
      "assemble",
    ),
    serveStep(ctx, "tacos"),
  ];

  return toSteps(steps);
}

function buildBowlSteps(ctx: MealInstructionContext): RecipeStep[] {
  const { proteins, starches, vegSides, sauces } = partitionIngredients(ctx.ingredients);
  const base = starches[0]?.item || "rice";
  const protein = proteins[0]?.item;

  const steps: StructuredRecipeStep[] = [
    prepStep(ctx, ctx.ingredients.filter((i) => !isSeasoningOrGarnish(i.item, i.notes))),
    s(
      `Cook ${base}`,
      /\b(rice|jasmine|basmati)\b/i.test(base)
        ? `Rinse ${base} if the bag says to. Combine with water per package (usually 1:2 rice to water), bring to a boil, cover, and simmer on low 18–20 minutes until water is absorbed. Fluff with a fork and hold covered.`
        : `Cook ${base} according to package directions until tender. Spread on a sheet pan if you need it to stay hot while protein finishes.`,
      [base],
      /\b(rice|jasmine|basmati)\b/i.test(base) ? 22 : 15,
      /\b(rice|jasmine|basmati)\b/i.test(base) ? "simmer" : "boil",
    ),
  ];

  if (protein) {
    steps.push(
      s(
        `Cook ${protein}`,
        `Season ${protein} and cook in a hot skillet or on the grill until done through.${proteinTempNote(protein)} Slice or chop for bowl portions.`,
        [protein],
        14,
        "sear",
      ),
    );
  }

  if (vegSides.length) {
    steps.push(
      s(
        "Cook the veg",
        `Sauté or roast ${names(vegSides, 3)} until tender-crisp — bowls need hot veg, not sad cold salad on lukewarm rice.`,
        vegSides.map((i) => i.item),
        10,
        "sauté",
      ),
    );
  }

  steps.push(
    s(
      "Build the bowls",
      `Base of ${base}, then ${protein || "protein"}, veg, and ${sauces[0]?.item || "sauce"} if using. Let the crew add sauce at the line.`,
      [base, ...(protein ? [protein] : []), ...vegSides.map((i) => i.item)],
      5,
      "assemble",
    ),
    serveStep(ctx, "bowls"),
  );

  return toSteps(steps);
}

function buildSoupStewSteps(ctx: MealInstructionContext): RecipeStep[] {
  const { proteins, vegSides, sauces, other } = partitionIngredients(ctx.ingredients);
  const broth =
    [...sauces, ...other].find((i) => /\b(broth|stock|consomme)\b/i.test(i.item))?.item
    || sauces[0]?.item
    || "broth";
  const protein = proteins[0]?.item;

  const steps: StructuredRecipeStep[] = [
    prepStep(ctx, ctx.ingredients.filter((i) => !isSeasoningOrGarnish(i.item, i.notes))),
  ];

  if (protein) {
    steps.push(
      s(
        `Brown ${protein}`,
        `Brown ${protein} in a heavy pot over medium-high — don't crowd. You want color on the meat before liquid goes in.${proteinTempNote(protein)}`,
        [protein],
        10,
        "sear",
      ),
    );
  }

  if (vegSides.length) {
    steps.push(
      s(
        "Cook aromatics and veg",
        `Sauté ${names(vegSides, 3)} in the pot until softened. Scrape the bottom so nothing burns before you add liquid.`,
        vegSides.map((i) => i.item),
        8,
        "sauté",
      ),
    );
  }

  steps.push(
    s(
      "Simmer the pot",
      `Add ${broth} and bring to a steady simmer — small bubbles, not a rolling boil. Cook until flavors meld and vegetables are tender, stirring every few minutes so nothing sticks.${protein ? ` ${protein} should be fully cooked through.` : ""}`,
      [broth, ...(protein ? [protein] : []), ...vegSides.map((i) => i.item)],
      Math.max(18, Math.round(ctx.totalMinutes * 0.45)),
      "simmer",
    ),
    serveStep(ctx, "the pot"),
  );

  return toSteps(steps);
}

function buildSheetPanSteps(ctx: MealInstructionContext): RecipeStep[] {
  const { proteins, starches, vegSides } = partitionIngredients(ctx.ingredients);
  const protein = proteins[0]?.item;
  const lines = ctx.ingredients.filter((i) => !isSeasoningOrGarnish(i.item, i.notes));

  const steps: StructuredRecipeStep[] = [
    prepStep(ctx, lines),
    s(
      "Heat the oven",
      "Preheat to 425°F with racks in the middle. Line two sheet pans with parchment or foil — hall volume needs space, not one crowded tray.",
      ["parchment or foil"],
      10,
      "bake",
    ),
    s(
      "Prep and arrange on pans",
      `Cut ${names([...proteins, ...starches, ...vegSides], 6)} into even pieces. Toss with oil, salt, and pepper; spread in a single layer with space between pieces — overcrowding steams instead of roasts.`,
      lines.slice(0, 8).map((i) => i.item),
      12,
      "prep",
    ),
    s(
      "Roast until done",
      `Roast 22–28 minutes, swapping pans halfway, until ${protein || "protein"} is cooked through and vegetables are browned at the edges.${protein ? proteinTempNote(protein) : ""}`,
      lines.slice(0, 8).map((i) => i.item),
      26,
      "roast",
    ),
    serveStep(ctx, "sheet-pan dinner"),
  ];

  return toSteps(steps);
}

function buildStirFrySteps(ctx: MealInstructionContext): RecipeStep[] {
  const { proteins, starches, vegSides, sauces } = partitionIngredients(ctx.ingredients);
  const protein = proteins[0]?.item;
  const noodle = starches.find((i) => /rice|noodle/i.test(i.item));

  const steps: StructuredRecipeStep[] = [
    prepStep(ctx, ctx.ingredients.filter((i) => !isSeasoningOrGarnish(i.item, i.notes))),
  ];

  if (noodle) {
    steps.push(
      s(
        `Cook ${noodle.item}`,
        /\b(rice)\b/i.test(noodle.item)
          ? `Cook ${noodle.item} and hold hot — stir-fry waits for no one.`
          : `Cook ${noodle.item} per package, drain, and toss with a little oil so it doesn't clump.`,
        [noodle.item],
        15,
        "boil",
      ),
    );
  }

  if (protein) {
    steps.push(
      s(
        `Sear ${protein}`,
        `Slice ${protein} thin. Sear in a hot wok or skillet over high heat in batches — 2–3 minutes until browned. Remove and hold.${proteinTempNote(protein)}`,
        [protein],
        8,
        "sear",
      ),
    );
  }

  steps.push(
    s(
      "Stir-fry the veg",
      `Add ${names(vegSides, 4)} to the hot pan with oil; keep everything moving 3–4 minutes until crisp-tender. Push veg aside, add ${sauces[0]?.item || "sauce"} if listed, and toss to coat.`,
      [...vegSides, ...sauces].map((i) => i.item),
      6,
      "stir_fry",
    ),
    s(
      "Combine and finish",
      `Return ${protein || "protein"} to the pan. Toss everything 1–2 minutes until heated through and lightly charred at the edges. Serve immediately over ${noodle?.item || "rice"}.`,
      [protein || "protein", ...vegSides.map((i) => i.item)].filter(Boolean),
      4,
      "stir_fry",
    ),
    serveStep(ctx, "stir-fry"),
  );

  return toSteps(steps);
}

function buildSandwichSteps(ctx: MealInstructionContext): RecipeStep[] {
  const { proteins, breads, vegSides } = partitionIngredients(ctx.ingredients);
  const bread = breads[0]?.item || "rolls";
  const filling = proteins[0]?.item;

  const steps: StructuredRecipeStep[] = [
    prepStep(ctx, ctx.ingredients.filter((i) => !isSeasoningOrGarnish(i.item, i.notes))),
  ];

  if (filling) {
    steps.push(
      s(
        `Cook ${filling}`,
        `Cook ${filling} until fully done and seasoned — sliced for sandwiches, not whole pieces.${proteinTempNote(filling)} Rest 2 minutes before slicing thin against the grain if it's beef or pork.`,
        [filling],
        14,
        "sear",
      ),
    );
  }

  steps.push(
    s(
      "Toast the bread",
      `Split ${bread} and toast cut-side down in a skillet or under the broiler until golden — soggy bread kills a hall sandwich.`,
      [bread],
      3,
      "sauté",
    ),
    s(
      "Assemble sandwiches",
      `Layer ${filling || "filling"}, ${names(vegSides, 3)}, and any cheese from your list on ${bread}. Cut in half for the line.`,
      [bread, ...(filling ? [filling] : []), ...vegSides.map((i) => i.item)],
      5,
      "assemble",
    ),
    serveStep(ctx, "sandwiches"),
  );

  return toSteps(steps);
}

function buildBreakfastSteps(ctx: MealInstructionContext): RecipeStep[] {
  const { proteins, starches, vegSides } = partitionIngredients(ctx.ingredients);
  const steps: StructuredRecipeStep[] = [
    prepStep(ctx, ctx.ingredients.filter((i) => !isSeasoningOrGarnish(i.item, i.notes))),
  ];

  if (starches.length) {
    steps.push(
      s(
        `Cook ${starches[0].item}`,
        `Prepare ${starches[0].item} — pancakes on a 375°F griddle until bubbles set, bacon on a sheet pan at 400°F until crisp, or potatoes in a skillet until golden.`,
        [starches[0].item],
        15,
        "bake",
      ),
    );
  }

  if (proteins.length) {
    steps.push(
      s(
        `Cook ${proteins[0].item}`,
        `Cook ${proteins[0].item} until done — eggs scrambled low and slow for creamy curds, sausage until no pink.${proteinTempNote(proteins[0].item)}`,
        [proteins[0].item],
        10,
        "sauté",
      ),
    );
  }

  if (vegSides.length) {
    steps.push(
      s(
        "Cook the sides",
        `Sauté ${names(vegSides, 2)} in butter or oil until tender.`,
        vegSides.map((i) => i.item),
        8,
        "sauté",
      ),
    );
  }

  steps.push(serveStep(ctx, "breakfast"));
  return toSteps(steps);
}

function buildBbqSteps(ctx: MealInstructionContext): RecipeStep[] {
  const { proteins, starches, vegSides, sauces } = partitionIngredients(ctx.ingredients);
  const meat = proteins[0]?.item || "BBQ protein";

  const steps: StructuredRecipeStep[] = [
    prepStep(ctx, ctx.ingredients.filter((i) => !isSeasoningOrGarnish(i.item, i.notes))),
    s(
      `Cook ${meat} low and slow or hot grill`,
      `Season ${meat}. On a grill or grill pan: sear over medium-high, then finish over lower heat until tender and safe inside.${proteinTempNote(meat)} Brush with ${sauces[0]?.item || "BBQ sauce"} in the last few minutes only — sugar burns if added too early.`,
      [meat, ...(sauces[0] ? [sauces[0].item] : [])],
      25,
      "grill",
    ),
  ];

  if (starches.length) {
    steps.push(
      s(
        `Prepare ${starches[0].item}`,
        `Heat or bake ${starches[0].item} while the protein rests — cornbread, buns, or slaw should be ready when meat comes off heat.`,
        [starches[0].item],
        15,
        "bake",
      ),
    );
  }

  if (vegSides.length) {
    steps.push(
      s(
        "Warm the sides",
        `Warm ${names(vegSides, 2)} on the grill or in a pan — cold slaw is fine; warm beans should be hot.`,
        vegSides.map((i) => i.item),
        8,
        "sauté",
      ),
    );
  }

  steps.push(serveStep(ctx, "BBQ plates"));
  return toSteps(steps);
}

function buildPlatedMainSteps(ctx: MealInstructionContext): RecipeStep[] {
  const { proteins, starches, vegSides, sauces } = partitionIngredients(ctx.ingredients);
  const protein = proteins[0]?.item;

  const steps: StructuredRecipeStep[] = [
    prepStep(ctx, ctx.ingredients.filter((i) => !isSeasoningOrGarnish(i.item, i.notes))),
  ];

  if (starches.length) {
    const st = starches[0];
    steps.push(
      s(
        `Cook ${st.item}`,
        /\b(rice|jasmine|basmati)\b/i.test(st.item)
          ? `Cook ${st.item}: boil, cover, simmer on low until water is absorbed.`
          : `Cook ${st.item} per package or roast at 425°F on a sheet pan until tender and golden.`,
        [st.item],
        20,
        /\b(rice|jasmine|basmati)\b/i.test(st.item) ? "simmer" : "bake",
      ),
    );
  }

  if (protein) {
    steps.push(
      s(
        `Cook ${protein}`,
        `Pat ${protein} dry. Sear in a hot oiled skillet over medium-high until browned, then reduce heat and finish to safe doneness.${proteinTempNote(protein)} Rest 3 minutes before slicing or portioning.`,
        [protein],
        16,
        "sear",
      ),
    );
  }

  if (vegSides.length) {
    steps.push(
      s(
        "Cook the vegetables",
        `Cook ${names(vegSides, 3)} in a second pan or on the sheet pan with the starch — they should be hot and seasoned when the protein is ready.`,
        vegSides.map((i) => i.item),
        10,
        "sauté",
      ),
    );
  }

  if (sauces.length) {
    steps.push(
      s(
        `Finish with ${sauces[0].item}`,
        `Warm ${sauces[0].item} and spoon over the plate or serve on the side for the crew.`,
        [sauces[0].item],
        4,
        "simmer",
      ),
    );
  }

  steps.push(serveStep(ctx, ctx.title));
  return toSteps(steps);
}

type BuilderFn = (ctx: MealInstructionContext) => RecipeStep[];

const IDENTITY_BUILDERS: Partial<Record<MealIdentity, BuilderFn>> = {
  burger: buildBurgerSteps,
  pasta: buildPastaSteps,
  taco: buildTacoSteps,
  wrap: buildTacoSteps,
  bowl: buildBowlSteps,
  stir_fry: buildStirFrySteps,
  soup_stew: buildSoupStewSteps,
  sandwich: buildSandwichSteps,
  french_dip: buildSandwichSteps,
};

function pickBuilder(ctx: MealInstructionContext): BuilderFn {
  const fmt = ctx.mealFormat.toLowerCase().replace(/_/g, "-");
  if (IDENTITY_BUILDERS[ctx.identity]) return IDENTITY_BUILDERS[ctx.identity]!;
  if (fmt === "sheet_pan" || fmt === "one_pot" || fmt === "casserole") return buildSheetPanSteps;
  if (fmt === "breakfast") return buildBreakfastSteps;
  if (fmt === "grill" || ctx.identity === "bbq" || fmt === "bbq") return buildBbqSteps;
  if (fmt === "stir-fry" || fmt === "stir_fry") return buildStirFrySteps;
  if (fmt.includes("soup") || fmt.includes("stew") || fmt === "soup_chili") return buildSoupStewSteps;
  if (fmt === "burger") return buildBurgerSteps;
  if (fmt === "pasta") return buildPastaSteps;
  if (fmt === "tacos") return buildTacoSteps;
  if (fmt === "bowl") return buildBowlSteps;
  if (fmt === "sandwich" || fmt === "wrap") return buildSandwichSteps;
  return buildPlatedMainSteps;
}

export function buildMealInstructionContext(
  recipe: GenerateResponse,
  mealFormat: string,
  crewSize = 6,
): MealInstructionContext {
  const formatKey = (mealFormat || recipe.meal_style || "random").toLowerCase();
  return {
    title: recipe.title || "Tonight's dinner",
    mealFormat: formatKey,
    identity: detectMealIdentity(recipe.title || "", formatKey),
    protein: recipe.chosen_protein || recipe.primary_protein_source || "any",
    crewSize,
    totalMinutes: recipe.timing?.total_minutes ?? 45,
    ingredients: recipe.ingredients || [],
  };
}

export function buildMealInstructionSteps(ctx: MealInstructionContext): RecipeStep[] {
  return pickBuilder(ctx)(ctx);
}

export function buildMealValidationContext(
  recipe: GenerateResponse,
  mealFormat: string,
): MealStepValidationContext {
  const inst = buildMealInstructionContext(recipe, mealFormat);
  return {
    title: inst.title,
    identity: inst.identity,
    mealFormat: inst.mealFormat,
    protein: inst.protein,
    totalMinutes: inst.totalMinutes,
    crewSize: inst.crewSize,
  };
}

/** Light sanitize — preserve imported publisher/Spoonacular flow. */
export function preserveSourceStepsLight(steps: RecipeStep[]): RecipeStep[] {
  return dedupeRedundantSteps(
    steps
      .map((s) => ({
        heading: stripBannedInstructionPhrases(String(s.heading || "").trim()),
        body: stripBannedInstructionPhrases(String(s.body || "").trim()),
      }))
      .filter((s) => s.body.length > 12),
  );
}

/**
 * Real sourced meals: keep original steps when valid.
 * Template/AI fallbacks: format-specific rebuild only.
 */
export function resolveMealBuildSteps(
  recipe: GenerateResponse,
  mealFormat: string,
  crewSize = 6,
  recipeSource?: RecipeSourceAttribution | null,
): RecipeStep[] {
  const source = recipeSource ?? recipe._recipe_source ?? null;
  const instCtx = buildMealInstructionContext(recipe, mealFormat, crewSize);
  const valCtx = buildMealValidationContext(recipe, mealFormat);
  const existing = preserveSourceStepsLight(recipe.steps || []);

  const invented = isInventedMealSource(source, recipe);
  const preserve = shouldPreserveSourceSteps(recipe, source);

  const spoonacularRich =
    !invented &&
    (source?.kind === "spoonacular" || recipe._imported) &&
    existing.length >= 5;

  if (!invented && preserve && sourceStepsAreSpecific(existing, instCtx.ingredients, valCtx)) {
    return existing;
  }

  if (!invented && sourceStepsAreSpecific(existing, instCtx.ingredients, valCtx)) {
    return existing;
  }

  if (spoonacularRich && existing.length >= 4) {
    const light = preserveSourceStepsLight(existing);
    const check = validateMealSteps(light, instCtx.ingredients, valCtx);
    if (check.ok || check.errors.every((e) => e === "generic_filler")) {
      return light;
    }
  }

  let built = buildMealInstructionSteps(instCtx);
  let check = validateMealSteps(built, instCtx.ingredients, valCtx);
  if (!check.ok) {
    built = buildPlatedMainSteps(instCtx);
    check = validateMealSteps(built, instCtx.ingredients, valCtx);
  }

  return built;
}
