/**
 * Chicken and Dumplings — hand-written pack (thick stew, dropped dumplings, not brothy soup template).
 */
import type { GoldenRecipeDefinition } from "../types.js";
import type { MealSpecificPack } from "./golden-p0-classic-packs.js";

type Ing = MealSpecificPack["ingredients"][number];
type Step = MealSpecificPack["steps"][number];

function m(
  name: string,
  quantity: number,
  unit: string,
  group?: string,
  notes?: string,
): Ing {
  return { name, quantity: String(quantity), unit, group, notes };
}

function mult(n: number, scale: number): number {
  return Math.round(n * scale * 10) / 10;
}

function step(
  n: number,
  title: string,
  instruction: string,
  minutes: number,
  heatLevel: Step["heatLevel"] = "",
): Step {
  return { stepNumber: n, title, instruction, minutes, heatLevel };
}

export const CHICKEN_DUMPLINGS_SOURCE_URL =
  "https://www.seriouseats.com/easy-chicken-and-dumplings-recipe";

export const CHICKEN_DUMPLINGS_PACK = (
  scale: number,
  _def: GoldenRecipeDefinition,
): MealSpecificPack => ({
  prepMinutes: 25,
  cookMinutes: 55,
  ingredients: [
    m("Bone-in, skin-on chicken thighs", mult(3, scale), "lb", "Stew", "or 4 lb boneless thighs"),
    m("Unsalted butter", mult(4, scale), "tbsp", "Stew"),
    m("Yellow onion", mult(2, scale), "count", "Stew", "diced"),
    m("Carrots", mult(3, scale), "cups", "Stew", "diced"),
    m("Celery stalks", mult(4, scale), "count", "Stew", "diced"),
    m("Garlic cloves", mult(4, scale), "count", "Stew", "minced"),
    m("All-purpose flour", mult(0.25, scale), "cup", "Stew", "for thickening"),
    m("Low-sodium chicken broth", mult(6, scale), "cups", "Stew", "not watery soup volume"),
    m("Bay leaves", mult(2, scale), "count", "Stew"),
    m("Fresh thyme", mult(4, scale), "sprigs", "Stew"),
    m("All-purpose flour", mult(2, scale), "cups", "Dumplings"),
    m("Baking powder", mult(1, scale), "tbsp", "Dumplings"),
    m("Kosher salt", mult(1, scale), "tsp", "Dumplings"),
    m("Whole milk", mult(0.75, scale), "cup", "Dumplings"),
    m("Large eggs", mult(2, scale), "count", "Dumplings"),
    m("Unsalted butter", mult(3, scale), "tbsp", "Dumplings", "cold, cubed"),
    m("Fresh parsley", mult(0.5, scale), "cup", "Finish", "chopped"),
  ],
  steps: [
    step(
      1,
      "Brown chicken and build the stew base",
      "Pat chicken dry. Brown thighs in butter in a large Dutch oven over medium-high, skin-side down first, 8–10 minutes total; transfer out. In the same pot, cook onion, carrot, celery, and garlic with salt until softened, 8 minutes. Stir in ¼ cup flour and cook 1 minute.",
      12,
      "medium-high",
    ),
    step(
      2,
      "Simmer until stew-thick",
      "Add broth, bay leaves, and thyme. Return chicken. Simmer partially covered 30–35 minutes until chicken is tender. Stew should coat a spoon — not thin brothy soup. Shred or chop chicken, return meat, and discard skin and bones if you used bone-in.",
      35,
      "medium-low",
    ),
    step(
      3,
      "Mix dumpling batter",
      "Whisk flour, baking powder, and salt. Cut in cold butter, then stir in milk and eggs until a thick, scoopable batter forms — thicker than pancake batter, it should mound on a spoon.",
      10,
    ),
    step(
      4,
      "Drop dumplings and steam",
      "Bring stew to a gentle simmer. Drop batter by ¼-cup scoops on top, spacing across the pot. Cover tightly and cook 15 minutes without lifting the lid — dumplings steam and puff. Consistency when done: thick stew underneath, fluffy dumplings on top, not submerged thin soup.",
      18,
      "medium-low",
    ),
    step(
      5,
      "Finish and hold for late crew",
      "Dumplings are done when a skewer through a centre comes out clean. Stir parsley at the edge of the pot. Hold covered off heat up to 20 minutes or keep on lowest simmer — do not boil hard or dumplings fall apart. Ladle stew and dumplings together so each bowl gets both.",
      8,
      "low",
    ),
  ],
});
