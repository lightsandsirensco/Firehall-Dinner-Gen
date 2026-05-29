/**
 * Smoothie catalog source — fuel section only (not dinner).
 */
import type { EditorialEmbeddedRecipe } from "../../editorial/content-schema.js";

function ing(
  name: string,
  quantity: string,
  unit?: string,
  notes?: string,
): EditorialEmbeddedRecipe["ingredients"][number] {
  return { name, quantity, unit, notes };
}

const SMOOTHIE_IMAGE = (id: string) => `/images/smoothies/${id}.jpg`;

export const SMOOTHIE_RECIPES_SOURCE: EditorialEmbeddedRecipe[] = [
  {
    id: "mixed-berry-protein",
    name: "Mixed Berry Protein Smoothie",
    category: "High protein",
    intro:
      "Frozen berries and Greek yogurt give this one milkshake thickness without ice cream. It is the hall default when someone wants protein after a workout or before a long night.",
    ingredients: [
      ing("frozen mixed berries", "4", "cups"),
      ing("plain Greek yogurt", "2", "cups", "2% or whole"),
      ing("milk", "1.5", "cups", "dairy or unsweetened oat"),
      ing("vanilla extract", "1", "tsp"),
      ing("honey or maple syrup", "2", "tbsp", "optional"),
      ing("ice cubes", "1", "cup", "only if berries are soft/thawed"),
    ],
    instructions: [
      "Add yogurt, milk, and berries to the blender. Pulse a few times to break up frozen fruit before blending on high.",
      "Blend 45–60 seconds until completely smooth — no berry seeds stuck to the sides. Texture should pour like thick cream, not run like juice.",
      "Taste once. Add honey only if the berries were tart; frozen commercial blends are often sweet enough on their own.",
      "Serve immediately in tall cups, or hold in the fridge up to 4 hours — stir before drinking because separation is normal.",
    ],
    nutritionHighlights:
      "~280 cal per 12 oz serving · ~22 g protein · fiber from whole fruit · no added sugar required if berries are ripe",
    substitutions: [
      "Swap Greek yogurt for skyr for even more protein per cup.",
      "Use whey or plant protein powder (1 scoop) if you need a bigger protein bump.",
    ],
    shiftNote:
      "Works when the crew wants something cold and filling between meals without firing up the stove. Cleanup is one blender jar.",
    imagePath: SMOOTHIE_IMAGE("mixed-berry-protein"),
    imageAlt: "Mixed berry protein smoothie in a glass on a station counter",
  },
  {
    id: "peanut-butter-banana-recovery",
    name: "Peanut Butter Banana Recovery Shake",
    category: "Recovery",
    intro:
      "Banana and peanut butter are the hall’s answer to a recovery shake that does not taste like chalk. Frozen banana keeps the texture thick without needing ice cream or sweetened yogurt.",
    ingredients: [
      ing("ripe bananas", "4", "medium", "peeled, sliced and frozen"),
      ing("natural peanut butter", "6", "tbsp"),
      ing("milk", "2", "cups"),
      ing("plain Greek yogurt", "1", "cup", "optional but recommended"),
      ing("cocoa powder", "1", "tbsp", "optional"),
      ing("pinch of kosher salt", "1", "pinch"),
    ],
    instructions: [
      "Break frozen banana slices apart and add to the blender with peanut butter, milk, yogurt, and salt.",
      "Blend on high 60–90 seconds, stopping once to scrape down the sides if the blade stalls.",
      "The shake should be thick enough to coat a spoon and slowly fall off — add ¼ cup milk if your blender struggles.",
      "Pour into cups right away; this one thickens as it sits.",
    ],
    nutritionHighlights:
      "~340 cal · ~16 g protein (higher with yogurt) · potassium from banana · healthy fats from peanut butter",
    substitutions: [
      "Sunflower seed butter works for nut-free halls.",
      "Add a scoop of chocolate protein powder after hard training days.",
    ],
    shiftNote:
      "Higher in calories by design — good after workouts, yard work, or a physically heavy call when someone needs fuel fast.",
    imagePath: SMOOTHIE_IMAGE("peanut-butter-banana-recovery"),
    imageAlt: "Peanut butter banana recovery shake in a tall glass",
  },
  {
    id: "tropical-mango-greek",
    name: "Tropical Mango Greek Yogurt Smoothie",
    category: "Tropical",
    intro:
      "Frozen mango and lime read like vacation, but Greek yogurt keeps it from being pure sugar. Crews who think they do not like “healthy smoothies” usually finish this one.",
    ingredients: [
      ing("frozen mango chunks", "4", "cups"),
      ing("plain Greek yogurt", "1.5", "cups"),
      ing("orange juice", "1", "cup", "calcium-fortified works fine"),
      ing("fresh lime juice", "3", "tbsp"),
      ing("honey", "1", "tbsp", "optional"),
      ing("shredded coconut", "2", "tbsp", "to garnish"),
    ],
    instructions: [
      "Blend mango, yogurt, and orange juice on high until the mixture is completely smooth and pale orange.",
      "Add lime juice and blend 10 seconds more — the acid should taste bright, not sour.",
      "Adjust sweetness with honey only if needed; ripe frozen mango is often enough.",
      "Pour into cups and top with a pinch of coconut if you have it — skip if the pantry is bare.",
    ],
    nutritionHighlights:
      "~260 cal · ~18 g protein · vitamin C from citrus · natural sweetness mostly from mango",
    substitutions: [
      "Pineapple replaces half the mango for a sharper tropical flavor.",
      "Coconut milk (¼ cup) adds richness if the smoothie tastes too sharp.",
    ],
    shiftNote:
      "Bright flavor helps on afternoon shifts when coffee alone is not cutting it. No cooking, minimal dishes.",
    imagePath: SMOOTHIE_IMAGE("tropical-mango-greek"),
    imageAlt: "Tropical mango Greek yogurt smoothie with lime",
  },
  {
    id: "green-pineapple",
    name: "Green Pineapple Smoothie",
    category: "Green",
    intro:
      "Spinach disappears behind pineapple and coconut water. This is how you get greens in without the “salad in a cup” face from the crew.",
    ingredients: [
      ing("baby spinach", "3", "cups", "packed"),
      ing("frozen pineapple chunks", "3", "cups"),
      ing("coconut water", "2", "cups", "chilled"),
      ing("banana", "1", "medium", "fresh or frozen"),
      ing("fresh lime juice", "1", "tbsp"),
      ing("ice", "0.5", "cup", "optional"),
    ],
    instructions: [
      "Blend spinach with coconut water first until no leaf flecks remain — this step prevents green stringiness.",
      "Add pineapple, banana, and lime. Blend on high until smooth and bright green.",
      "The color should look tropical, not muddy. Add ice only if you want it colder and thicker.",
      "Serve cold within a few hours; oxidation will dull the color but it is still fine to drink.",
    ],
    nutritionHighlights:
      "~180 cal · light on fat · hydration from coconut water · fiber from fruit and spinach",
    substitutions: [
      "Kale works but blanch flavor is stronger — use half spinach, half kale.",
      "Regular water replaces coconut water in a pinch.",
    ],
    shiftNote:
      "Light enough for early morning or post-call when heavy food sounds wrong. Good “reset” option.",
    imagePath: SMOOTHIE_IMAGE("green-pineapple"),
    imageAlt: "Green pineapple spinach smoothie in a clear glass",
  },
  {
    id: "strawberry-oat-breakfast",
    name: "Strawberry Oatmeal Breakfast Smoothie",
    category: "Breakfast",
    intro:
      "Rolled oats blend into a creamy breakfast shake — filling enough to last until lunch on a busy tour. Tastes like strawberry oatmeal, not raw oats.",
    ingredients: [
      ing("rolled oats", "1", "cup", "old-fashioned, not steel-cut"),
      ing("frozen strawberries", "3", "cups"),
      ing("milk", "2", "cups"),
      ing("plain Greek yogurt", "1", "cup"),
      ing("ground cinnamon", "0.5", "tsp"),
      ing("honey or maple syrup", "2", "tbsp", "to taste"),
      ing("vanilla extract", "0.5", "tsp"),
    ],
    instructions: [
      "Add oats and half the milk to the blender. Let sit 5 minutes if you have time — softens oats for a smoother texture.",
      "Add strawberries, remaining milk, yogurt, cinnamon, and vanilla. Blend 90 seconds until completely smooth.",
      "If you feel grit, blend 30 seconds more on high. Sweeten with honey to taste.",
      "Serve immediately for best texture; can refrigerate up to 6 hours and shake before drinking.",
    ],
    nutritionHighlights:
      "~310 cal · ~20 g protein · soluble fiber from oats · steady energy vs. a sugar-only fruit blend",
    substitutions: [
      "Use a frozen banana instead of some strawberries for extra thickness.",
      "Dairy-free: oat milk + soy yogurt.",
    ],
    shiftNote:
      "Strong choice for breakfast handoff or crews eating light before a busy morning block.",
    imagePath: SMOOTHIE_IMAGE("strawberry-oat-breakfast"),
    imageAlt: "Strawberry oatmeal breakfast smoothie with cinnamon",
  },
  {
    id: "mocha-protein",
    name: "Mocha Protein Smoothie",
    category: "Coffee",
    intro:
      "Cold brew, cocoa, and yogurt give you coffee-shop flavor without the drive-thru sugar bomb. Popular on tours that start early and stay loud.",
    ingredients: [
      ing("cold brew coffee", "1.5", "cups", "chilled or ice cubes + strong coffee"),
      ing("plain Greek yogurt", "1.5", "cups"),
      ing("milk", "1", "cup"),
      ing("unsweetened cocoa powder", "2", "tbsp"),
      ing("banana", "1", "medium", "frozen slices optional"),
      ing("honey or maple syrup", "1", "tbsp", "optional"),
      ing("vanilla protein powder", "1", "scoop", "optional"),
    ],
    instructions: [
      "Blend yogurt, milk, cocoa, and coffee until the cocoa is fully dissolved — no dry cocoa pockets.",
      "Add banana or protein powder if using. Blend until frothy on top, about 60 seconds.",
      "Taste before adding sweetener — coffee bitterness varies batch to batch.",
      "Serve over ice if you want it colder; foam on top is normal from the yogurt.",
    ],
    nutritionHighlights:
      "~220 cal base · ~18 g protein with yogurt · caffeine for alertness · lower sugar than flavored lattes",
    substitutions: [
      "Instant espresso (2 tsp + ½ cup water) works if cold brew is not stocked.",
      "Skip protein powder if the crew prefers whole-food protein only.",
    ],
    shiftNote:
      "Caffeine plus protein in one cup — useful when the pot is empty but the board is not.",
    imagePath: SMOOTHIE_IMAGE("mocha-protein"),
    imageAlt: "Mocha protein smoothie with foam on top",
  },
  {
    id: "blueberry-almond",
    name: "Blueberry Almond Smoothie",
    category: "Berry",
    intro:
      "Blueberries and almond butter give you antioxidants and staying power without a long ingredient list. Mild, crowd-friendly, not “health food” weird.",
    ingredients: [
      ing("frozen blueberries", "3", "cups"),
      ing("almond butter", "4", "tbsp"),
      ing("milk", "2", "cups"),
      ing("plain Greek yogurt", "1", "cup"),
      ing("rolled oats", "0.25", "cup", "optional for thickness"),
      ing("lemon juice", "1", "tsp", "brightens flavor"),
    ],
    instructions: [
      "Combine blueberries, almond butter, milk, and yogurt in the blender.",
      "Blend on high until the purple color is even and the almond butter is fully incorporated.",
      "Add oats and lemon if using; blend 30 seconds more until smooth.",
      "Should taste nutty and fruity, not bitter — add a teaspoon of honey only if blueberries were tart.",
    ],
    nutritionHighlights:
      "~290 cal · ~17 g protein · vitamin E and fats from almond butter · anthocyanins from blueberries",
    substitutions: [
      "Peanut butter swaps in if almond butter is not on hand.",
      "Silken tofu (½ cup) can replace part of the yogurt for a dairy-free batch.",
    ],
    shiftNote:
      "Berries hide in the freezer well — good pantry item for halls trying to stock healthier grab-and-go options.",
    imagePath: SMOOTHIE_IMAGE("blueberry-almond"),
    imageAlt: "Blueberry almond smoothie with purple color",
  },
  {
    id: "chocolate-banana-recovery",
    name: "Chocolate Banana Recovery Smoothie",
    category: "Recovery",
    intro:
      "Tastes like a treat, behaves like recovery food. Cocoa and banana do the heavy lifting — no syrup, no ice cream required.",
    ingredients: [
      ing("frozen banana slices", "4", "medium bananas worth"),
      ing("unsweetened cocoa powder", "3", "tbsp"),
      ing("milk", "2", "cups"),
      ing("plain Greek yogurt", "1", "cup"),
      ing("peanut butter or almond butter", "2", "tbsp"),
      ing("pinch of kosher salt", "1", "pinch"),
      ing("ice", "0.5", "cup", "optional"),
    ],
    instructions: [
      "Blend banana, cocoa, milk, yogurt, nut butter, and salt until the color is uniform chocolate brown.",
      "Scrape the sides and blend again — cocoa can cling to the jar.",
      "Texture should be thick and shake-like. Thin with milk 2 tbsp at a time if needed.",
      "Serve right away for best flavor; salt is small but makes the chocolate taste deeper.",
    ],
    nutritionHighlights:
      "~320 cal · ~18 g protein · potassium · satisfies sweet cravings without bakery sugar levels",
    substitutions: [
      "Chocolate protein powder (1 scoop) replaces cocoa + some yogurt.",
      "Dairy-free milk and yogurt alternatives work fine.",
    ],
    shiftNote:
      "This one works well after workouts or overnight calls because it is higher in protein but still light.",
    imagePath: SMOOTHIE_IMAGE("chocolate-banana-recovery"),
    imageAlt: "Chocolate banana recovery smoothie",
  },
  {
    id: "citrus-ginger",
    name: "Citrus Ginger Smoothie",
    category: "Recovery",
    intro:
      "Orange, carrot, and ginger taste sharp and clean — good when the crew wants something refreshing, not heavy. Ginger is optional but worth it.",
    ingredients: [
      ing("navel oranges", "3", "large", "peeled, seeds removed"),
      ing("carrot", "1", "large", "peeled, chopped"),
      ing("fresh ginger", "1", "tbsp", "peeled, or ½ tsp ground"),
      ing("frozen pineapple", "1.5", "cups", "optional for sweetness"),
      ing("ice", "1", "cup"),
      ing("water or coconut water", "0.5", "cup", "to thin"),
    ],
    instructions: [
      "Blend orange segments, carrot, ginger, and liquid until completely smooth — carrot should not leave fibers.",
      "Add pineapple and ice. Blend until slushy and bright orange.",
      "Ginger heat should be noticeable but not burning — reduce ginger next batch if the crew complains.",
      "Serve immediately over ice; separates faster than creamy smoothies — stir before drinking.",
    ],
    nutritionHighlights:
      "~160 cal · vitamin C · lighter than cream-based shakes · ginger for digestion comfort",
    substitutions: [
      "Bottled 100% orange juice (1.5 cups) replaces fresh oranges in a pinch.",
      "Skip carrot if the blender is weak — add more pineapple instead.",
    ],
    shiftNote:
      "Hydration-forward option on hot days or after heat exposure — not a meal replacement, but a solid bridge.",
    imagePath: SMOOTHIE_IMAGE("citrus-ginger"),
    imageAlt: "Citrus ginger smoothie with orange color",
  },
  {
    id: "strawberry-spinach",
    name: "Strawberry Spinach Smoothie",
    category: "Green",
    intro:
      "Strawberry-banana sweetness hides the spinach completely. A good first step when the hall wants to eat better without a lecture.",
    ingredients: [
      ing("frozen strawberries", "3", "cups"),
      ing("banana", "2", "medium", "ripe, fresh or frozen"),
      ing("baby spinach", "2", "cups", "packed"),
      ing("milk", "1.5", "cups"),
      ing("plain Greek yogurt", "1", "cup"),
      ing("chia seeds", "2", "tbsp", "optional"),
    ],
    instructions: [
      "Blend spinach with milk first until smooth — no visible leaves.",
      "Add strawberries, banana, and yogurt. Blend until thick and pink, not brown.",
      "Stir in chia at the end if using, or blend 10 seconds on low.",
      "Drink within a few hours; chia will thicken if it sits overnight.",
    ],
    nutritionHighlights:
      "~250 cal · ~16 g protein · fiber from fruit and optional chia · greens without salad fatigue",
    substitutions: [
      "Frozen mixed berries replace strawberries.",
      "Flax meal (1 tbsp) instead of chia.",
    ],
    shiftNote:
      "Easy sell to crews skeptical of green food — looks and tastes like a berry shake.",
    imagePath: SMOOTHIE_IMAGE("strawberry-spinach"),
    imageAlt: "Strawberry spinach smoothie pink color",
  },
];
