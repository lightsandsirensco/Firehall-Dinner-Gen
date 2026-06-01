import type { ClientIngredient, ClientRecipeResponse, ClientStep } from "@shared/schema";
import type { GoldenRecipePage } from "@shared/golden-100/recipe-page-schema";

/** Convert a catalog page to ClientRecipeResponse for Hall Favorites save. */
export function catalogPageToClientRecipe(page: GoldenRecipePage, slug: string): ClientRecipeResponse {
  const proteinTag = page.tags?.find((t) => t.startsWith("protein:"));
  const chosenProtein = proteinTag?.replace("protein:", "") || "mixed";
  const formatTag = page.tags?.find((t) => t.startsWith("format:"));
  const mealFormat = formatTag?.replace("format:", "") || "plated_main";

  const ingredients: ClientIngredient[] = page.ingredients.map((ing) => ({
    name: ing.name,
    qty: parseFloat(String(ing.quantity)) || 0,
    unit: ing.unit || "",
    category: ing.group || "Ingredients",
  }));

  const steps: ClientStep[] = page.steps.map((s) => ({
    n: s.stepNumber,
    title: s.title,
    heat: s.heatLevel || "",
    minutes: s.minutes ?? 0,
    instructions: s.instruction,
  }));

  return {
    title: page.displayTitle || page.title,
    meal_format: mealFormat,
    servings: page.baseServings ?? page.crewSize,
    tags: page.tags ?? [],
    timing: {
      prep_min: page.prepTime ?? 15,
      cook_min: page.cookTime,
      total_min: (page.prepTime ?? 15) + page.cookTime,
    },
    protein_safety: {
      protein: chosenProtein,
      internal_temp_f: chosenProtein === "chicken" || chosenProtein === "turkey" ? 165 : 145,
      rest_min: 0,
      notes: "",
    },
    ingredients,
    steps,
    plating: {
      serve_style: "family-style",
      assembly_instructions: page.tonightSpread?.[0] || "",
      optional_toppings: [],
    },
    macros_per_serving: {
      calories: page.nutrition?.calories ?? page.calories ?? 0,
      protein_g: page.nutrition?.protein ?? page.protein ?? 0,
      carbs_g: page.nutrition?.carbs ?? page.carbs ?? 0,
      fat_g: page.nutrition?.fats ?? page.fats ?? 0,
    },
    chosen_protein: chosenProtein,
    primary_protein_source: chosenProtein,
    why_it_fits_tonight: page.whyCrewsLikeIt || page.shortDescription || "",
    cleanup_tip: page.proTips?.[0] || "",
    pro_tips: page.proTips,
    hall_curated: true,
    _slug: slug,
    _source: "catalog",
    hero_image: page.heroImage,
    hero_image_alt: page.heroImageAlt,
    catalog_badge: "Firehall Meals Catalog",
  };
}
