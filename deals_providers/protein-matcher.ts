import type { ApprovedCatalogEntry } from "../shared/approved-catalog.js";
import type { ProteinDealMatchedRecipe, ProteinType } from "../shared/protein-deals/types.js";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import { isProteinType } from "./deal-normalizer.js";

const CUT_RECIPE_HINTS: Record<string, string[]> = {
  thighs: ["thigh", "shredded chicken", "dark meat", "braise", "simmer"],
  breast: ["breast", "grill", "bake", "stir fry"],
  wings: ["wing", "buffalo", "bbq"],
  drumsticks: ["drumstick", "braise", "bake"],
  ground: ["ground", "burger", "chili", "taco", "meatball", "meat sauce", "pasta bake", "skillet"],
  shoulder: ["pulled", "slow", "bbq", "roast", "crock", "braise"],
  ribs: ["rib", "bbq", "grill"],
  chops: ["chop", "sear", "pan"],
  fillets: ["fillet", "bake", "pan sear", "grill"],
  steak: ["steak", "grill", "sear"],
  eggs: ["egg", "breakfast", "skillet", "omelette", "scramble"],
  starch: ["potato", "mash", "roast", "bake"],
};

const PROTEIN_NEGATIVE: Record<string, string[]> = {
  chicken: ["beef", "pork", "fish", "salmon", "turkey", "lamb"],
  beef: ["chicken", "pork", "fish", "turkey"],
  pork: ["chicken", "beef", "fish", "turkey"],
  sausage: ["chicken breast", "fish", "salmon"],
  fish: ["beef", "pork", "chicken", "ground beef"],
  turkey: ["beef", "pork", "fish"],
};

let catalogCache: ApprovedCatalogEntry[] | null = null;

function getCatalogRecipes(): ApprovedCatalogEntry[] {
  if (!catalogCache) catalogCache = buildApprovedCatalog().recipes;
  return catalogCache;
}

function scoreRecipe(
  recipe: ApprovedCatalogEntry,
  proteinType: string | null,
  cut: string | null,
  itemName: string,
  normalizedItem: ProteinType,
): { score: number; reason: string } | null {
  const hay = itemName.toLowerCase();
  const proteinHay = recipe.protein.toLowerCase();
  const searchHay = recipe.searchText.toLowerCase();
  const titleHay = recipe.title.toLowerCase();

  if (isProteinType(proteinType)) {
    const negatives = PROTEIN_NEGATIVE[proteinType] ?? [];
    if (negatives.some((n) => proteinHay.includes(n) || titleHay.includes(n))) return null;
    if (!proteinHay.includes(proteinType) && !searchHay.includes(proteinType)) return null;
  }

  let score = 0;
  let reason = "";

  if (cut && CUT_RECIPE_HINTS[cut]) {
    for (const hint of CUT_RECIPE_HINTS[cut]!) {
      if (searchHay.includes(hint) || titleHay.includes(hint) || proteinHay.includes(hint)) {
        score += 40;
        reason = `Good fit for ${cut}`;
        break;
      }
    }
  }

  if (proteinType && proteinHay.includes(proteinType)) {
    score += 30;
    reason = reason || `Uses ${proteinType}`;
  } else if (searchHay.includes(normalizedItem)) {
    score += 20;
    reason = reason || `Includes ${normalizedItem}`;
  }

  for (const token of hay.split(/\s+/).filter((t) => t.length > 3)) {
    if (searchHay.includes(token)) {
      score += 15;
      reason = `Matches ${token}`;
      break;
    }
  }

  if (cut === "ground" && proteinType === "beef") {
    if (/burger|chili|taco|meatball|bolognese|sloppy|shepherd/i.test(titleHay + searchHay)) {
      score += 25;
      reason = "Ground beef dinner";
    }
  }

  if (cut === "shoulder" && proteinType === "pork") {
    if (/pulled|bbq|slow|roast/i.test(titleHay + searchHay)) {
      score += 25;
      reason = "Slow-cooker pork";
    }
  }

  if (cut === "thighs" && proteinType === "chicken") {
    if (/thigh|shredded|braise|curry|stew/i.test(titleHay + searchHay)) {
      score += 20;
      reason = "Chicken thigh meal";
    }
  }

  if (proteinType === "sausage") {
    if (/sausage|pepper|pasta|skillet|breakfast/i.test(titleHay + searchHay)) {
      score += 25;
      reason = "Sausage dinner";
    }
  }

  if (score < 25) return null;
  return { score, reason: reason || "Protein match" };
}

export function matchRecipesForProteinDeal(
  normalizedItem: ProteinType,
  itemName: string,
  proteinType: string | null,
  cut: string | null,
  limit = 12,
): ProteinDealMatchedRecipe[] {
  const recipes = getCatalogRecipes();
  const ranked: Array<ProteinDealMatchedRecipe & { _score: number }> = [];

  for (const recipe of recipes) {
    const result = scoreRecipe(recipe, proteinType, cut, itemName, normalizedItem);
    if (!result) continue;
    ranked.push({
      slug: recipe.slug,
      title: recipe.title,
      protein: recipe.protein,
      heroImage: recipe.thumbImage || recipe.heroImage,
      match_reason: result.reason,
      _score: result.score,
    });
  }

  ranked.sort((a, b) => b._score - a._score);
  return ranked.slice(0, limit).map(({ _score, ...r }) => r);
}

export function resetProteinMatcherCatalogCache(): void {
  catalogCache = null;
}
