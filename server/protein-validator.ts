import type { GenerateResponse } from "@shared/schema";

const ALL_ANIMAL_PROTEINS: Record<string, string[]> = {
  chicken: ["chicken", "poultry"],
  beef: ["beef", "steak", "veal", "brisket", "ground beef", "sirloin", "ribeye", "chuck", "flank"],
  pork: ["pork", "bacon", "ham", "prosciutto", "pancetta", "chorizo", "salami", "pepperoni", "pork chop", "pork loin", "pulled pork", "carnitas"],
  turkey: ["turkey", "turkey breast", "ground turkey"],
  fish: ["fish", "salmon", "tuna", "cod", "tilapia", "halibut", "trout", "mahi", "swordfish", "bass", "snapper", "fish fillet", "white fish"],
  shrimp: ["shrimp", "prawn"],
  lamb: ["lamb"],
  crab: ["crab"],
  lobster: ["lobster"],
  seafood: ["seafood", "clam", "mussel", "oyster", "scallop", "squid", "calamari", "octopus", "anchovy", "anchovies"],
  other_meat: ["gelatin", "lard", "bone broth", "duck", "venison", "bison", "goat", "rabbit"],
};

const FALSE_POSITIVE_CONTEXTS: Record<string, string[]> = {
  fish: ["fish sauce", "fish stock", "starfish"],
  ham: ["hamburger"],
  bass: ["basset", "bass note"],
  chicken: ["chicken stock", "chicken broth", "chicken bouillon", "plant-based chicken", "chickpea"],
  beef: ["beef stock", "beef broth", "beef bouillon", "plant-based beef", "plant-based ground"],
  duck: ["duck sauce"],
  lamb: ["lamb's lettuce", "lamb ear"],
};

export function getForbiddenProteins(selectedProtein: string): string[] {
  const selected = selectedProtein.toLowerCase();
  const forbidden: string[] = [];

  for (const [protein, variants] of Object.entries(ALL_ANIMAL_PROTEINS)) {
    if (protein === selected) continue;
    forbidden.push(...variants);
  }

  if (selected !== "pork") {
    forbidden.push("sausage");
  }

  return forbidden;
}

export function getForbiddenProteinsText(selectedProtein: string): string {
  const forbidden = getForbiddenProteins(selectedProtein);
  return forbidden.join(", ");
}

function isFalsePositive(word: string, text: string): boolean {
  const contexts = FALSE_POSITIVE_CONTEXTS[word];
  if (!contexts) return false;
  return contexts.some((ctx) => text.includes(ctx));
}

export function validateProteinCompliance(
  recipe: GenerateResponse,
  selectedProtein: string
): { valid: boolean; reason?: string } {
  const selected = selectedProtein.toLowerCase();

  if (selected === "pantry") {
    return { valid: true };
  }

  const selectedVariants = ALL_ANIMAL_PROTEINS[selected] || [selected];
  const forbidden = getForbiddenProteins(selected);

  const titleLower = recipe.title.toLowerCase();
  const ingredientTexts = recipe.ingredients.map(
    (i) => `${i.item}`.toLowerCase()
  );

  if (selected === "vegetarian") {
    const allMeatTerms: string[] = [];
    for (const variants of Object.values(ALL_ANIMAL_PROTEINS)) {
      allMeatTerms.push(...variants);
    }
    allMeatTerms.push("sausage");

    const stepTexts = (recipe.steps || []).map(s => `${s.heading} ${s.body}`.toLowerCase());
    const allSearchableText = [
      ingredientTexts.join(" "),
      titleLower,
      ...stepTexts,
    ].join(" ");

    for (const term of allMeatTerms) {
      if (term.length < 4) continue;
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(allSearchableText) && !isFalsePositive(term, allSearchableText)) {
        return {
          valid: false,
          reason: `Animal protein "${term}" found in vegetarian recipe`,
        };
      }
    }
    return { valid: true };
  }

  const proteinFoundInIngredients = ingredientTexts.some((text) =>
    selectedVariants.some((v) => text.includes(v))
  );

  if (!proteinFoundInIngredients) {
    return {
      valid: false,
      reason: `Selected protein "${selectedProtein}" not found in ingredients`,
    };
  }

  const allIngredientText = ingredientTexts.join(" ");

  for (const word of forbidden) {
    if (word.length < 4) continue;
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(allIngredientText)) {
      if (isFalsePositive(word, allIngredientText)) continue;
      if (word === "sausage" && allIngredientText.includes(`${selected} sausage`)) continue;
      return {
        valid: false,
        reason: `Forbidden protein "${word}" found in ingredients for "${selectedProtein}"`,
      };
    }
  }

  return { valid: true };
}
