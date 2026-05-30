import type { MealVisualSignal } from "../meal-image-title-match.js";

const PATH_SIGNAL_RULES: Array<{ signal: MealVisualSignal; re: RegExp }> = [
  { signal: "taco", re: /\b(taco|tacos|fajita|burrito|nacho|quesadilla|tortilla)\b/i },
  { signal: "burger", re: /\b(burger|smash|cheeseburger|patty|bun)\b/i },
  { signal: "pasta", re: /\b(pasta|spaghetti|penne|rigatoni|lasagna|macaroni|ziti)\b/i },
  { signal: "pizza", re: /\b(pizza|flatbread|pepperoni)\b/i },
  { signal: "bowl", re: /\b(bowl|rice-bowl|grain-bowl|bibimbap|poke)\b/i },
  { signal: "skillet", re: /\b(skillet|one-pan|one_pot|cast-iron)\b/i },
  { signal: "stir_fry", re: /\b(stir-fry|stir_fry|wok)\b/i },
  { signal: "soup", re: /\b(soup|chili|chowder|stew|bisque|curry|broth)\b/i },
  { signal: "sandwich", re: /\b(sandwich|sub|hoagie|panini)\b/i },
  { signal: "sandwich", re: /\b(lettuce-cup|lettuce-wrap|lettuce_cup|lettuce_wrap)\b/i },
  { signal: "salad", re: /\b(salad|caesar|greens)\b/i },
  { signal: "sheet_pan", re: /\b(sheet-pan|sheet_pan|tray)\b/i },
  { signal: "grill", re: /\b(grill|grilled|bbq|barbecue|brisket)\b/i },
  { signal: "breakfast", re: /\b(breakfast|pancake|waffle|omelette|hash)\b/i },
];

const PATH_PROTEIN_RULES: Array<{ protein: string; re: RegExp }> = [
  { protein: "shrimp", re: /\b(shrimp|prawn|scampi)\b/i },
  { protein: "fish", re: /\b(salmon|cod|tilapia|tuna|fish|seafood)\b/i },
  { protein: "beef", re: /\b(beef|steak|brisket|meatloaf|ground-beef)\b/i },
  { protein: "chicken", re: /\b(chicken|poultry)\b/i },
  { protein: "pork", re: /\b(pork|carnitas|sausage|bacon|ham)\b/i },
  { protein: "turkey", re: /\b(turkey)\b/i },
  { protein: "vegetarian", re: /\b(tofu|tempeh|falafel|vegan|plant)\b/i },
];

export interface InferredImageTags {
  signals: MealVisualSignal[];
  proteins: string[];
  stockPhotoHeuristic: boolean;
  overZoomHeuristic: boolean;
}

export function inferTagsFromImageRef(
  imageRef: string,
  altText = "",
  shotPresetId = "",
): InferredImageTags {
  const blob = `${imageRef} ${altText} ${shotPresetId}`.toLowerCase();
  const signals = new Set<MealVisualSignal>();
  const proteins: string[] = [];

  for (const { signal, re } of PATH_SIGNAL_RULES) {
    if (re.test(blob)) signals.add(signal);
  }
  for (const { protein, re } of PATH_PROTEIN_RULES) {
    if (re.test(blob)) proteins.push(protein);
  }

  if (shotPresetId) {
    const preset = shotPresetId.replace(/-/g, "_");
    const shotToSignal: Record<string, MealVisualSignal> = {
      tacos: "taco",
      burger: "burger",
      pasta: "pasta",
      pizza: "pizza",
      bowl: "bowl",
      skillet: "skillet",
      stir_fry: "stir_fry",
      soup_chili: "soup",
      salad: "salad",
      sheet_pan: "sheet_pan",
      grill: "grill",
      breakfast: "breakfast",
      sandwich: "sandwich",
      plated_main: "generic",
    };
    const mapped = shotToSignal[preset];
    if (mapped && mapped !== "generic") signals.add(mapped);
  }

  if (signals.size === 0) signals.add("generic");

  const stockPhotoHeuristic =
    /\b(stock|shutterstock|getty|istock|adobe stock|generic food)\b/i.test(blob) ||
    /\b(636x393|556x370)\b/.test(blob);

  const overZoomHeuristic =
    /\b(macro|extreme.?close|close-up only|ingredient only)\b/i.test(blob) &&
    !/\b(full plate|whole pie|entire)\b/i.test(blob);

  return {
    signals: [...signals],
    proteins,
    stockPhotoHeuristic,
    overZoomHeuristic,
  };
}
