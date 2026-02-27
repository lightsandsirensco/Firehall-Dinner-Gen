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

const HIDDEN_ANIMAL_PRODUCTS: string[] = [
  "chicken broth", "chicken stock", "chicken bouillon",
  "beef broth", "beef stock", "beef bouillon",
  "fish stock", "fish sauce", "fish broth",
  "oyster sauce", "anchovy paste", "worcestershire",
  "tallow", "suet", "dripping", "schmaltz",
  "demi-glace", "demi glace",
];

const FALSE_POSITIVE_CONTEXTS: Record<string, string[]> = {
  ham: ["hamburger"],
  bass: ["basset", "bass note"],
  duck: ["duck sauce"],
  lamb: ["lamb's lettuce", "lamb ear"],
};

const VEGETARIAN_SAFE_FALSE_POSITIVES: Record<string, RegExp[]> = {
  chicken: [/chickpea/i, /plant[- ]based chicken/i],
  beef: [/plant[- ]based beef/i, /plant[- ]based ground/i],
  lamb: [/lamb's lettuce/i, /lamb ear/i],
  ham: [/hamburger/i],
  bass: [/basset/i, /bass note/i],
  fish: [/starfish/i],
};

const NON_VEGETARIAN_FALSE_POSITIVES: Record<string, RegExp[]> = {
  fish: [/fish sauce/i, /fish stock/i, /starfish/i],
  ham: [/hamburger/i],
  bass: [/basset/i, /bass note/i],
  chicken: [/chicken stock/i, /chicken broth/i, /chicken bouillon/i, /plant[- ]based chicken/i, /chickpea/i],
  beef: [/beef stock/i, /beef broth/i, /beef bouillon/i, /plant[- ]based beef/i, /plant[- ]based ground/i],
  duck: [/duck sauce/i],
  lamb: [/lamb's lettuce/i, /lamb ear/i],
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

function isTermFalsePositiveInSegment(word: string, segment: string, isVegetarian: boolean): boolean {
  const patterns = isVegetarian
    ? VEGETARIAN_SAFE_FALSE_POSITIVES[word]
    : NON_VEGETARIAN_FALSE_POSITIVES[word];
  if (!patterns) return false;
  return patterns.some((rx) => rx.test(segment));
}

function allOccurrencesAreFalsePositives(word: string, segments: string[], isVegetarian: boolean): boolean {
  const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  for (const seg of segments) {
    if (regex.test(seg) && !isTermFalsePositiveInSegment(word, seg, isVegetarian)) {
      return false;
    }
  }
  return true;
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
    const proTipTexts = (recipe.pro_tips || []).map(t => t.toLowerCase());
    const allSegments = [
      ...ingredientTexts,
      titleLower,
      ...stepTexts,
      ...proTipTexts,
    ];
    const allSearchableText = allSegments.join(" ");

    for (const term of allMeatTerms) {
      if (term.length < 4) continue;
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(allSearchableText) && !allOccurrencesAreFalsePositives(term, allSegments, true)) {
        return {
          valid: false,
          reason: `Animal protein "${term}" found in vegetarian recipe`,
        };
      }
    }

    for (const hidden of HIDDEN_ANIMAL_PRODUCTS) {
      if (allSearchableText.includes(hidden)) {
        return {
          valid: false,
          reason: `Hidden animal product "${hidden}" found in vegetarian recipe`,
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
      if (allOccurrencesAreFalsePositives(word, ingredientTexts, false)) continue;
      if (word === "sausage" && allIngredientText.includes(`${selected} sausage`)) continue;
      return {
        valid: false,
        reason: `Forbidden protein "${word}" found in ingredients for "${selectedProtein}"`,
      };
    }
  }

  return { valid: true };
}
