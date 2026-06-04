/**
 * Batch A — hand-written golden packs (Tier 1–inspired, Firehall-original instructions).
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

type PackBuilder = (scale: number, def: GoldenRecipeDefinition) => MealSpecificPack;

export const BATCH_A_SOURCE_URLS: Record<string, string> = {
  "sheet-pan-parmesan-dijon-chicken-thigh-dinner":
    "https://www.americastestkitchen.com/recipes/8522-baked-mustard-chicken",
  "four-step-chicken-piccata": "https://www.americastestkitchen.com/recipes/4555-easy-chicken-piccata",
  "tomato-soup-grilled-cheese-croutons":
    "https://www.seriouseats.com/15-minute-creamy-tomato-soup-vegan-recipe",
  "spaghetti-aglio-e-olio-for-the-hall": "https://www.seriouseats.com/spaghetti-aglio-olio-recipe",
  "spicy-tomato-bisque-grilled-brie-toast":
    "https://www.seriouseats.com/15-minute-creamy-tomato-soup-vegan-recipe",
};

export const BATCH_A_GOLDEN_PACKS: Record<string, PackBuilder> = {
  "sheet-pan-parmesan-dijon-chicken-thigh-dinner": (scale) => ({
    prepMinutes: 20,
    cookMinutes: 35,
    ingredients: [
      m("Bone-in, skin-on chicken thighs", mult(8, scale), "count", "Main", "about 5 oz each"),
      m("Baby potatoes", mult(3, scale), "lb", "Vegetables", "halved if large"),
      m("Fresh green beans", mult(2, scale), "lb", "Vegetables", "trimmed"),
      m("Panko bread crumbs", mult(1.5, scale), "cups", "Crust"),
      m("Grated Parmesan cheese", mult(0.75, scale), "cup", "Crust"),
      m("Unsalted butter", mult(0.5, scale), "cup", "Sauce", "melted"),
      m("Dijon mustard", mult(0.25, scale), "cup", "Sauce"),
      m("Dried thyme", mult(2, scale), "tsp", "Seasoning"),
      m("Kosher salt and black pepper", mult(1, scale), "batch", "Seasoning"),
    ],
    steps: [
      step(
        1,
        "Heat the oven and prep the pan",
        "Heat oven to 425°F. Line a full-size rimmed sheet pan with foil and coat lightly with oil spray. Pat chicken thighs completely dry — wet skin will not crisp. Mix panko and Parmesan in a shallow bowl.",
        8,
      ),
      step(
        2,
        "Coat chicken and vegetables",
        "Whisk melted butter and Dijon in a large bowl. Brush the top and sides of each thigh with a thin layer of the butter-Dijon mix. Toss potatoes and green beans in the remaining butter-Dijon, spread in a single layer on the pan, and nestle thighs skin-side up with space between pieces. Season everything with thyme, salt, and pepper.",
        10,
      ),
      step(
        3,
        "Press on the Parmesan crust",
        "Press the panko-Parmesan mixture firmly onto the mustard-coated tops of the thighs only — not the skin underneath. The crust should look evenly coated; loose crumbs will burn before the chicken cooks through.",
        5,
      ),
      step(
        4,
        "Roast until done",
        "Roast 25–30 minutes, rotating the pan halfway, until potatoes pierce easily with a fork, green beans are tender with browned edges, and chicken registers 175°F in the thickest part near the bone. If crust browns too fast, tent loosely with foil for the last 8 minutes.",
        30,
        "high",
      ),
      step(
        5,
        "Rest and serve from the sheet",
        "Rest the pan 5 minutes so juices settle. Serve two thighs per firefighter with potatoes and beans spooned from the same pan. Hold covered at 200°F up to 25 minutes if a call interrupts service.",
        5,
        "low",
      ),
    ],
  }),

  "four-step-chicken-piccata": (scale) => ({
    prepMinutes: 25,
    cookMinutes: 25,
    ingredients: [
      m("Boneless, skinless chicken breasts", mult(4, scale), "lb", "Main", "split into 12 cutlets, pounded ¼ inch"),
      m("All-purpose flour", mult(1.5, scale), "cups", "Breading"),
      m("Unsalted butter", mult(6, scale), "tbsp", "Sauce", "divided"),
      m("Olive oil", mult(3, scale), "tbsp", "Sear"),
      m("Garlic cloves", mult(4, scale), "count", "Sauce", "minced"),
      m("Capers", mult(0.5, scale), "cup", "Sauce", "drained"),
      m("Low-sodium chicken broth", mult(2, scale), "cups", "Sauce"),
      m("Dry white wine", mult(0.75, scale), "cup", "Sauce"),
      m("Fresh lemon juice", mult(0.33, scale), "cup", "Sauce", "plus 2 lemons zested in strips"),
      m("Fresh parsley", mult(0.25, scale), "cup", "Finish", "chopped"),
    ],
    steps: [
      step(
        1,
        "Pound and season cutlets",
        "Working one breast at a time, slice horizontally into three even pieces and pound to ¼ inch between plastic wrap. Season both sides with salt and pepper. Spread flour in a sheet pan and dredge cutlets, shaking off excess — a thin dusting is enough.",
        15,
      ),
      step(
        2,
        "Sear cutlets in batches",
        "Heat 1 tablespoon oil and 1 tablespoon butter in a 12-inch skillet over medium-high until shimmering. Sear cutlets in batches without crowding, 2–3 minutes per side until golden. Transfer to a warm platter and tent with foil while you finish the sauce.",
        12,
        "medium-high",
      ),
      step(
        3,
        "Build the lemon-caper sauce",
        "Reduce heat to medium. Add garlic and capers to the pan; cook 30 seconds until fragrant. Pour in broth, wine, and lemon zest strips. Simmer, scraping browned bits, until reduced to about ½ cup and slightly syrupy, 8–10 minutes. Off heat, whisk in remaining butter and lemon juice until glossy.",
        10,
        "medium",
      ),
      step(
        4,
        "Coat cutlets in lemon-caper sauce",
        "Return cutlets and any resting juices to the skillet. Turn each piece once in the sauce over low heat until warmed through, about 1 minute — do not boil or the cutlets toughen. Spoon glossy sauce over every portion and scatter parsley at the line. Plate two to three cutlets per firefighter with pasta or crusty bread; hold sauced chicken covered at 200°F up to 15 minutes if a call delays seating.",
        5,
        "low",
      ),
    ],
  }),

  "tomato-soup-grilled-cheese-croutons": (scale) => ({
    prepMinutes: 15,
    cookMinutes: 25,
    ingredients: [
      m("Canned whole peeled tomatoes", mult(4, scale), "cans", "Soup", "28 oz, with juice"),
      m("Yellow onion", mult(2, scale), "count", "Soup", "diced"),
      m("Garlic cloves", mult(6, scale), "count", "Soup", "minced"),
      m("Chicken broth", mult(6, scale), "cups", "Soup", "low-sodium"),
      m("Heavy cream", mult(1, scale), "cup", "Soup"),
      m("Olive oil", mult(0.25, scale), "cup", "Soup"),
      m("Dried basil", mult(2, scale), "tsp", "Seasoning"),
      m("Sandwich bread", mult(16, scale), "slices", "Croutons", "sturdy white or sourdough"),
      m("Sharp cheddar cheese", mult(24, scale), "oz", "Croutons", "grated"),
      m("Unsalted butter", mult(0.5, scale), "cup", "Croutons", "softened"),
    ],
    steps: [
      step(
        1,
        "Start the tomato base",
        "Heat olive oil in a large pot over medium. Cook onion with a pinch of salt until soft and translucent, 6–8 minutes. Add garlic and basil; stir 45 seconds until fragrant. Add tomatoes with their juice and broth. Bring to a simmer.",
        12,
        "medium",
      ),
      step(
        2,
        "Simmer and blend smooth",
        "Simmer uncovered 15 minutes, stirring occasionally, until the soup thickens slightly and raw onion flavor is gone. Blend with an immersion blender until completely smooth — or cool slightly and blend in batches if using a countertop blender. Return to the pot, stir in cream, and season with salt and pepper. Hold at a bare simmer (do not boil cream).",
        18,
        "medium-low",
      ),
      step(
        3,
        "Make grilled cheese croutons",
        "Butter one side of each bread slice. Flip dry sides up and cover with cheddar. Pair slices into sandwiches and press in a skillet over medium-low with a spatula weight until deeply golden and cheese melts, about 4 minutes per side. Transfer to a cutting board.",
        12,
        "medium-low",
      ),
      step(
        4,
        "Cube the melts and finish soup",
        "Cut grilled cheese sandwiches into ¾-inch cubes — these are your croutons, not raw bread. Ladle hot soup into bowls and float a handful of cheesy croutons on top. Serve extra croutons in a warm pan at the line so they stay crisp.",
        5,
        "low",
      ),
    ],
  }),

  "spaghetti-aglio-e-olio-for-the-hall": (scale) => ({
    prepMinutes: 10,
    cookMinutes: 25,
    ingredients: [
      m("Dried spaghetti", mult(2, scale), "lb", "Pasta"),
      m("Extra-virgin olive oil", mult(1, scale), "cup", "Sauce", "divided"),
      m("Garlic cloves", mult(12, scale), "count", "Sauce", "thinly sliced"),
      m("Red pepper flakes", mult(1, scale), "tsp", "Sauce", "adjust to crew heat tolerance"),
      m("Fresh parsley", mult(1, scale), "cup", "Finish", "chopped"),
      m("Grated Parmesan", mult(1, scale), "cup", "Finish", "optional at the line"),
      m("Kosher salt", mult(1, scale), "batch", "Seasoning"),
    ],
    steps: [
      step(
        1,
        "Boil pasta in well-salted water",
        "Bring a large pot of water to a rolling boil with salt that tastes like the sea. Add spaghetti and stir once. Cook 1 minute shy of package directions — the pasta finishes in the skillet.",
        12,
        "high",
      ),
      step(
        2,
        "Infuse garlic oil gently",
        "While pasta cooks, combine ¾ cup olive oil and sliced garlic in a large skillet over medium heat. Add pepper flakes. Cook slowly until garlic is pale gold and fragrant, not brown — brown garlic turns bitter fast. If it darkens, pull the pan off heat for 30 seconds.",
        8,
        "medium",
      ),
      step(
        3,
        "Toss pasta off heat with starchy water",
        "Reserve 2 cups pasta water, then drain spaghetti. Transfer pasta to the skillet off heat. Add ½ cup pasta water and remaining ¼ cup olive oil. Toss vigorously 1–2 minutes until the oil emulsifies into a glossy, clingy sauce that coats every strand.",
        5,
      ),
      step(
        4,
        "Serve immediately",
        "Fold in parsley and taste for salt. Portion into bowls right away — aglio e olio waits for no one. Pass Parmesan at the line if your crew wants it; the dish is traditionally cheese-optional.",
        3,
        "low",
      ),
    ],
  }),

  "spicy-tomato-bisque-grilled-brie-toast": (scale) => ({
    prepMinutes: 20,
    cookMinutes: 30,
    ingredients: [
      m("Canned crushed tomatoes", mult(3, scale), "cans", "Bisque", "28 oz"),
      m("Fire-roasted diced tomatoes", mult(2, scale), "cans", "Bisque", "14 oz"),
      m("Yellow onion", mult(2, scale), "count", "Aromatics", "diced"),
      m("Garlic cloves", mult(5, scale), "count", "Aromatics", "minced"),
      m("Chicken broth", mult(5, scale), "cups", "Bisque"),
      m("Heavy cream", mult(1.5, scale), "cups", "Bisque"),
      m("Smoked paprika", mult(2, scale), "tsp", "Seasoning"),
      m("Cayenne pepper", mult(0.25, scale), "tsp", "Seasoning", "plus more at service"),
      m("Crusty bread", mult(16, scale), "slices", "Toast", "ciabatta or sourdough"),
      m("Brie cheese", mult(2, scale), "lb", "Toast", "rind on, sliced ¼ inch"),
      m("Unsalted butter", mult(0.5, scale), "cup", "Toast", "softened"),
    ],
    steps: [
      step(
        1,
        "Build the spicy tomato base",
        "Sweat onion in olive oil over medium heat until soft, 6–8 minutes. Add garlic, smoked paprika, and cayenne; cook 45 seconds. Add crushed tomatoes, diced tomatoes, and broth. Simmer 20 minutes until flavors meld and raw onion taste is gone.",
        22,
        "medium",
      ),
      step(
        2,
        "Blend bisque and finish with cream",
        "Blend until completely smooth. Return to pot, stir in cream, and simmer gently 5 minutes — do not boil after cream is added or the bisque can break. Season with salt, pepper, and a pinch more cayenne if the hall likes heat. Hold at 180–190°F for service.",
        10,
        "medium-low",
      ),
      step(
        3,
        "Grill brie toasts",
        "Butter bread on one side. Top dry sides with brie slices. Cook in a skillet or on a flat top over medium heat, buttered side down first, until bread is deep golden and brie starts to ooze, 3–4 minutes per side. Cut each slice in half for manageable portions.",
        12,
        "medium",
      ),
      step(
        4,
        "Plate soup and toast",
        "Ladle about 1½ cups bisque per bowl. Serve grilled brie toast on the side or resting on the rim so the cheese stays visible. If a call holds service, keep toast uncovered at 200°F up to 15 minutes so the bread stays crisp.",
        5,
        "low",
      ),
    ],
  }),
};
