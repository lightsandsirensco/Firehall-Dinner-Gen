import type { CatalogRecipeAuditRecord, MealArchetypeId } from "./types.js";

const ARCHETYPE_RULES: Array<{
  id: MealArchetypeId;
  label: string;
  test: (r: CatalogRecipeAuditRecord) => boolean;
}> = [
  {
    id: "burrito_bowl",
    label: "Burrito / burrito bowl",
    test: (r) =>
      /\b(burrito bowl|burrito-bowl|performance burrito|burrito bowls?)\b/i.test(
        `${r.title} ${r.slug} ${r.mealFormat} ${r.tags.join(" ")}`,
      ),
  },
  {
    id: "chicken_rice_bowl",
    label: "Chicken rice bowl",
    test: (r) =>
      /\bbowl/i.test(`${r.title} ${r.mealFormat}`) &&
      /\bchicken\b/i.test(`${r.title} ${r.protein} ${r.slug}`) &&
      /\b(rice|quinoa|grain)\b/i.test(`${r.ingredientNames.join(" ")} ${r.title}`),
  },
  {
    id: "creamy_chicken_pasta",
    label: "Creamy chicken pasta",
    test: (r) =>
      /\b(pasta|penne|alfredo|carbonara|fettuccine|macaroni)\b/i.test(
        `${r.title} ${r.slug} ${r.mealFormat} ${r.ingredientNames.slice(0, 8).join(" ")}`,
      ) &&
      /\b(chicken|cream|alfredo|cheese)\b/i.test(`${r.title} ${r.ingredientNames.join(" ")}`),
  },
  {
    id: "taco_variation",
    label: "Taco / fajita / enchilada variation",
    test: (r) =>
      /\b(taco|tacos|fajita|enchilada|burrito|quesadilla|nacho|tamale)\b/i.test(
        `${r.title} ${r.slug} ${r.mealFormat} ${r.tags.join(" ")}`,
      ) &&
      !/\bbreakfast hash\b/i.test(r.title),
  },
  {
    id: "sheet_pan_chicken",
    label: "Sheet pan chicken",
    test: (r) =>
      /\b(sheet pan|sheet-pan|tray bake)\b/i.test(`${r.title} ${r.slug} ${r.tags.join(" ")}`) &&
      /\bchicken\b/i.test(`${r.title} ${r.protein} ${r.slug}`),
  },
  {
    id: "burger_variation",
    label: "Burger / smash burger variation",
    test: (r) =>
      /\b(burger|smash|cheeseburger|slider)\b/i.test(`${r.title} ${r.slug} ${r.mealFormat}`) &&
      !/\bbreakfast\b/i.test(r.category),
  },
  {
    id: "breakfast_hash",
    label: "Breakfast hash / skillet",
    test: (r) =>
      r.category.includes("breakfast") &&
      /\b(hash|skillet|skillets)\b/i.test(`${r.title} ${r.slug} ${r.tags.join(" ")}`),
  },
  {
    id: "breakfast_burrito",
    label: "Breakfast burrito / wrap",
    test: (r) =>
      r.category.includes("breakfast") &&
      /\b(burrito|wrap|crunchwrap)\b/i.test(`${r.title} ${r.slug} ${r.tags.join(" ")}`),
  },
  {
    id: "pulled_pork_bbq",
    label: "Pulled pork BBQ",
    test: (r) =>
      /\b(pulled pork|pork shoulder|pork butt)\b/i.test(`${r.title} ${r.slug}`) &&
      /\b(bbq|smok|vinegar|mustard)\b/i.test(`${r.title} ${r.tags.join(" ")} ${r.category}`),
  },
  {
    id: "brisket_bbq",
    label: "Brisket / burnt ends BBQ",
    test: (r) => /\b(brisket|burnt ends|packer)\b/i.test(`${r.title} ${r.slug}`),
  },
  {
    id: "chicken_bbq",
    label: "BBQ chicken",
    test: (r) =>
      /\bchicken\b/i.test(`${r.title} ${r.protein} ${r.slug}`) &&
      /\b(bbq|barbecue|smoked|grill)\b/i.test(`${r.title} ${r.category} ${r.tags.join(" ")}`) &&
      !/\b(sheet pan|sheet-pan|tray bake)\b/i.test(`${r.title} ${r.slug}`),
  },
  {
    id: "pasta_red_sauce",
    label: "Pasta with red sauce",
    test: (r) =>
      /\b(pasta|spaghetti|penne|rigatoni|ziti|baked ziti|lasagna)\b/i.test(
        `${r.title} ${r.slug} ${r.mealFormat}`,
      ) &&
      !/\balfredo|creamy|carbonara\b/i.test(`${r.title} ${r.ingredientNames.join(" ")}`),
  },
  {
    id: "soup_chili",
    label: "Soup / chili / stew",
    test: (r) =>
      /\b(soup|chili|chowder|stew|bisque|gumbo|broth)\b/i.test(
        `${r.title} ${r.slug} ${r.mealFormat}`,
      ),
  },
  {
    id: "sheet_pan_generic",
    label: "Sheet pan (non-chicken)",
    test: (r) =>
      /\b(sheet pan|sheet-pan|tray bake)\b/i.test(`${r.title} ${r.slug}`) &&
      !/\bchicken\b/i.test(`${r.title} ${r.protein}`),
  },
  {
    id: "sandwich_handheld",
    label: "Sandwich / sub / hoagie",
    test: (r) =>
      /\b(sandwich|sub|hoagie|hero|panini|wrap|slider)\b/i.test(`${r.title} ${r.slug} ${r.mealFormat}`) &&
      !/\b(burger|smash|cheeseburger)\b/i.test(`${r.title} ${r.slug}`) &&
      !(r.category.includes("breakfast") && /\b(burrito|wrap|crunchwrap)\b/i.test(`${r.title} ${r.slug}`)),
  },
  {
    id: "smoked_meal",
    label: "Smoker-forward meal",
    test: (r) =>
      /\b(smok|smoker|pellet|low and slow|bbq)\b/i.test(
        `${r.title} ${r.cookingMethod} ${r.equipment.join(" ")} ${r.tags.join(" ")}`,
      ),
  },
];

export function inferMealArchetypes(record: Omit<CatalogRecipeAuditRecord, "archetypes">): MealArchetypeId[] {
  const withArchetypes = { ...record, archetypes: [] as MealArchetypeId[] };
  const matched = ARCHETYPE_RULES.filter((rule) => rule.test(withArchetypes)).map((r) => r.id);
  return matched.length ? matched : ["other"];
}

export function archetypeLabel(id: MealArchetypeId): string {
  return ARCHETYPE_RULES.find((r) => r.id === id)?.label ?? id;
}

export const REJECTED_EXPANSION_PATTERNS: Array<{
  pattern: string;
  archetype: MealArchetypeId;
  threshold: number;
}> = [
  { pattern: "Another burrito bowl variation", archetype: "burrito_bowl", threshold: 3 },
  { pattern: "Another chicken rice bowl variation", archetype: "chicken_rice_bowl", threshold: 3 },
  { pattern: "Another creamy chicken pasta variation", archetype: "creamy_chicken_pasta", threshold: 3 },
  { pattern: "Another taco variation with only minor changes", archetype: "taco_variation", threshold: 8 },
  { pattern: "Another sheet pan chicken variation", archetype: "sheet_pan_chicken", threshold: 3 },
  { pattern: "Another burger with minor topping changes", archetype: "burger_variation", threshold: 5 },
];

export const EXPANSION_OPPORTUNITY_SEEDS = [
  { name: "Jambalaya", cuisine: "cajun", format: "one_pot", technique: "rice_one_pot" },
  { name: "Paella", cuisine: "spanish", format: "skillet", technique: "wide_pan_rice" },
  { name: "Butter Chicken", cuisine: "indian", format: "curry", technique: "simmered_curry" },
  { name: "Shawarma Platters", cuisine: "middle_eastern", format: "platter", technique: "spit_roast_or_sheet" },
  { name: "Chicken Souvlaki", cuisine: "greek", format: "skewer", technique: "grilled_skewers" },
  { name: "Korean Bulgogi", cuisine: "korean", format: "grill", technique: "marinated_grill" },
  { name: "Cottage Pie", cuisine: "british", format: "bake", technique: "mashed_top_bake" },
  { name: "Shepherd's Pie", cuisine: "british", format: "bake", technique: "mashed_top_bake" },
  { name: "Beef Barbacoa", cuisine: "mexican", format: "braise", technique: "slow_braise" },
  { name: "Chicken Cacciatore", cuisine: "italian", format: "braise", technique: "tomato_braise" },
  { name: "Chicken Paprikash", cuisine: "hungarian", format: "stew", technique: "paprika_stew" },
  { name: "Peri Peri Chicken", cuisine: "portuguese", format: "grill", technique: "spicy_grill" },
  { name: "Ramen", cuisine: "japanese", format: "bowl", technique: "broth_noodles" },
  { name: "Pho", cuisine: "vietnamese", format: "bowl", technique: "aromatic_broth" },
  { name: "Gumbo", cuisine: "cajun", format: "stew", technique: "roux_stew" },
  { name: "Tourtière", cuisine: "canadian", format: "pie", technique: "meat_pie" },
  { name: "Montreal Smoked Meat", cuisine: "canadian", format: "sandwich", technique: "steamed_smoked_beef" },
  { name: "Donair Platters", cuisine: "canadian", format: "platter", technique: "donair_meat" },
  { name: "Greek Chicken Skewers", cuisine: "greek", format: "skewer", technique: "grilled_skewers" },
] as const;
