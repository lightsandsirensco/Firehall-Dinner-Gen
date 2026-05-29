/**
 * Internal inspiration registry — NOT published to guide JSON or public pages.
 * QA / editorial traceability only.
 */

export type SmoothieSourcePublisher =
  | "Skinnytaste"
  | "EatingWell"
  | "Love & Lemons"
  | "Ambitious Kitchen"
  | "Minimalist Baker"
  | "The Mediterranean Dish";

export interface SmoothieSourceRecord {
  recipeId: string;
  publisher: SmoothieSourcePublisher;
  sourceUrl: string;
  inspirationTitle: string;
  adaptationNotes: string;
}

/** Maps embedded recipe `id` → internal source */
export const SMOOTHIE_GUIDE_SOURCES: Record<string, SmoothieSourceRecord> = {
  "mixed-berry-protein": {
    recipeId: "mixed-berry-protein",
    publisher: "Skinnytaste",
    sourceUrl: "https://www.skinnytaste.com/protein-shake-recipes/",
    inspirationTitle: "Mixed Berry Protein Smoothie",
    adaptationNotes: "Greek yogurt base, crew batch scaling, no added sugar syrup",
  },
  "peanut-butter-banana-recovery": {
    recipeId: "peanut-butter-banana-recovery",
    publisher: "EatingWell",
    sourceUrl: "https://www.eatingwell.com/recipe/252875/peanut-butter-banana-smoothie/",
    inspirationTitle: "Peanut Butter Banana Smoothie",
    adaptationNotes: "Powder optional, milk flexibility, hall blender timing",
  },
  "tropical-mango-greek": {
    recipeId: "tropical-mango-greek",
    publisher: "Ambitious Kitchen",
    sourceUrl: "https://www.ambitiouskitchen.com/mango-smoothie/",
    inspirationTitle: "Mango Greek Yogurt Smoothie",
    adaptationNotes: "Frozen mango for texture, lime acid balance",
  },
  "green-pineapple": {
    recipeId: "green-pineapple",
    publisher: "Love & Lemons",
    sourceUrl: "https://www.loveandlemons.com/green-smoothie-recipe/",
    inspirationTitle: "Pineapple Green Smoothie",
    adaptationNotes: "Spinach mild with pineapple, coconut water base",
  },
  "strawberry-oat-breakfast": {
    recipeId: "strawberry-oat-breakfast",
    publisher: "EatingWell",
    sourceUrl: "https://www.eatingwell.com/recipe/278631/strawberry-oatmeal-breakfast-smoothie/",
    inspirationTitle: "Strawberry Oatmeal Breakfast Smoothie",
    adaptationNotes: "Rolled oats blended smooth, cinnamon for warmth",
  },
  "mocha-protein": {
    recipeId: "mocha-protein",
    publisher: "Skinnytaste",
    sourceUrl: "https://www.skinnytaste.com/coffee-protein-shake/",
    inspirationTitle: "Mocha Protein Smoothie",
    adaptationNotes: "Cold brew + cocoa, morning shift framing",
  },
  "blueberry-almond": {
    recipeId: "blueberry-almond",
    publisher: "The Mediterranean Dish",
    sourceUrl: "https://www.themediterraneandish.com/blueberry-smoothie/",
    inspirationTitle: "Blueberry Almond Smoothie",
    adaptationNotes: "Almond butter fat, blueberry antioxidant angle",
  },
  "chocolate-banana-recovery": {
    recipeId: "chocolate-banana-recovery",
    publisher: "Minimalist Baker",
    sourceUrl: "https://minimalistbaker.com/chocolate-peanut-butter-banana-shake/",
    inspirationTitle: "Chocolate Banana Shake",
    adaptationNotes: "Cocoa + banana thickness without ice cream",
  },
  "citrus-ginger": {
    recipeId: "citrus-ginger",
    publisher: "Love & Lemons",
    sourceUrl: "https://www.loveandlemons.com/orange-smoothie/",
    inspirationTitle: "Citrus Ginger Smoothie",
    adaptationNotes: "Orange + ginger brightness, post-call refresh",
  },
  "strawberry-spinach": {
    recipeId: "strawberry-spinach",
    publisher: "Skinnytaste",
    sourceUrl: "https://www.skinnytaste.com/strawberry-banana-spinach-smoothie/",
    inspirationTitle: "Strawberry Spinach Smoothie",
    adaptationNotes: "Hidden greens, banana sweetness only",
  },
};
