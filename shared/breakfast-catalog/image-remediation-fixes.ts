/**
 * High-priority breakfast image remediation — slug → accurate donor fallback + AI prompt hints.
 * Operational donor mappings live in image-donor-plan.ts (trust-first). Run npm run remediate:trust-p0.
 */
export type BreakfastImageRemediationFix = {
  slug: string;
  title: string;
  /** Peer breakfast slug with correct meal format (all variants copied when AI unavailable). */
  donorSlug: string;
  ingredientHints: string[];
  visualRequirements: string;
  forbiddenImagery: string;
};

export const BREAKFAST_IMAGE_REMEDIATION_FIXES: BreakfastImageRemediationFix[] = [
  {
    slug: "bbq-breakfast-hash",
    title: "BBQ Breakfast Hash",
    donorSlug: "chorizo-breakfast-hash",
    ingredientHints: [
      "crispy diced Yukon gold potatoes",
      "pulled pork or brisket with BBQ sauce",
      "fried eggs",
      "diced onion and bell peppers",
      "cast iron skillet",
    ],
    visualRequirements:
      "Cast iron skillet breakfast hash with crispy potatoes, BBQ meat, eggs, onion and peppers — hearty firehall crew breakfast",
    forbiddenImagery: "dessert, cake, coffee cake, granola bar, baked square, brownie",
  },
  {
    slug: "bacon-hash-burritos",
    title: "Bacon Hash Burritos",
    donorSlug: "breakfast-crunchwraps",
    ingredientHints: [
      "flour tortillas",
      "bacon",
      "scrambled eggs",
      "crispy hash browns",
      "shredded cheddar cheese",
      "cut burritos showing filling",
    ],
    visualRequirements:
      "Breakfast burritos cut in half on a platter showing bacon, eggs, hash browns and cheese inside flour tortillas",
    forbiddenImagery: "biscuits and gravy, open-faced plate, sandwich, no tortillas",
  },
  {
    slug: "big-pot-savory-oats",
    title: "Big-Pot Savory Oats",
    donorSlug: "denver-breakfast-casserole",
    ingredientHints: [
      "large pot of creamy savory oatmeal",
      "soft-cooked eggs",
      "crumbled bacon or breakfast sausage",
      "sliced green onions",
      "shredded cheddar topping bar",
      "black pepper",
    ],
    visualRequirements:
      "Large stock pot and serving bowls of savory oatmeal with eggs, bacon, green onions and cheese — clearly oatmeal not biscuits",
    forbiddenImagery: "biscuits and gravy, sweet oatmeal, dessert, pancakes, baked squares",
  },
];

export const BREAKFAST_REMEDIATION_SLUG_SET = new Set(
  BREAKFAST_IMAGE_REMEDIATION_FIXES.map((f) => f.slug),
);
