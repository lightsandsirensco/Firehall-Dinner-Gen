/**
 * Hand-tuned slug blueprints kept from original editorial work.
 */

import type { GoldenRecipeDefinition } from "../types.js";
import type { GoldenRecipePageIngredient, GoldenRecipePageStep } from "../recipe-page-schema.js";

type Ing = GoldenRecipePageIngredient;
type Step = GoldenRecipePageStep;

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

function aromatics(scale: number): Ing[] {
  return [
    m("Yellow onion", mult(2, scale), "large", "Aromatics"),
    m("Garlic cloves, minced", mult(6, scale), "cloves", "Aromatics"),
    m("Kosher salt", mult(2, scale), "tbsp", "Seasoning"),
    m("Black pepper, freshly cracked", mult(1, scale), "tbsp", "Seasoning"),
    m("Olive oil", mult(0.25, scale), "cup", "Aromatics"),
  ];
}

function garlicButterSauce(scale: number): Ing[] {
  return [
    m("Unsalted butter", mult(0.5, scale), "lb", "Garlic butter"),
    m("Garlic cloves, minced", mult(8, scale), "cloves", "Garlic butter"),
    m("Fresh parsley, chopped", mult(0.5, scale), "cup", "Garnish"),
    m("Lemon juice", mult(3, scale), "tbsp", "Garnish"),
  ];
}

function chiliIngredients(scale: number, turkey: boolean): Ing[] {
  return [
    m(turkey ? "Ground turkey" : "Ground beef (80/20)", mult(3.5, scale), "lb", "Main"),
    m("Yellow onion", mult(3, scale), "large", "Aromatics"),
    m("Bell peppers, diced", mult(3, scale), "count", "Aromatics"),
    m("Garlic cloves, minced", mult(8, scale), "cloves", "Aromatics"),
    m("Kidney beans, drained", mult(3, scale), "cans", "Main", "15 oz cans"),
    m("Crushed tomatoes", mult(2, scale), "cans", "Main", "28 oz"),
    m("Diced tomatoes", mult(2, scale), "cans", "Main", "14 oz"),
    m("Tomato paste", mult(3, scale), "tbsp", "Sauce"),
    m("Beef or chicken broth", mult(4, scale), "cups", "Sauce"),
    m("Chili powder", mult(3, scale), "tbsp", "Seasoning"),
    m("Smoked paprika", mult(2, scale), "tbsp", "Seasoning"),
    m("Ground cumin", mult(2, scale), "tsp", "Seasoning"),
    m("Brown sugar", mult(1, scale), "tbsp", "Seasoning"),
    m("Worcestershire sauce", mult(2, scale), "tbsp", "Sauce"),
    m("Kosher salt", mult(2, scale), "tbsp", "Seasoning"),
  ];
}

function chiliSteps(title: string, turkey: boolean): Step[] {
  const protein = turkey ? "turkey" : "beef";
  return [
    {
      stepNumber: 1,
      title: "Prep the pots",
      instruction:
        "Dice onions and peppers into even ¼-inch pieces. Mince garlic. Drain beans. Open tomatoes. Set out your largest stock pot (or two medium pots if feeding 10+). Line a sheet pan if you're making garlic bread on the side.",
      minutes: 15,
      heatLevel: "",
    },
    {
      stepNumber: 2,
      title: "Brown the meat",
      instruction: `Heat 2 tbsp oil in the pot over medium-high until it shimmers. Add ground ${protein} in two batches — don't crowd. Break into crumbles and cook until deeply browned with no pink (160°F+). You want fond on the bottom, not gray steam. Drain excess grease if the pot looks oily.`,
      minutes: 12,
      heatLevel: "medium-high",
    },
    {
      stepNumber: 3,
      title: "Bloom spices",
      instruction:
        "Add onions and peppers; cook 6–8 minutes until edges soften and smell sweet. Stir in garlic, chili powder, smoked paprika, and cumin for 45 seconds until fragrant. Add tomato paste and brown sugar; cook 1 minute until the paste darkens slightly.",
      minutes: 10,
      heatLevel: "medium",
    },
    {
      stepNumber: 4,
      title: "Simmer the chili",
      instruction: `Pour in crushed tomatoes, diced tomatoes, broth, and beans. Bring to a gentle bubble, then lower to a steady simmer — small bubbles, not a rolling boil. Cook uncovered 35–40 minutes, stirring every 10 minutes. ${title} is ready when it coats the back of a spoon and a drag through the pot leaves a clear trail. Season with salt and Worcestershire.`,
      minutes: 40,
      heatLevel: "medium-low",
    },
    {
      stepNumber: 5,
      title: "Hold and serve the hall",
      instruction:
        "Keep on low (or transfer to a cambro) for late eaters. Set a topping bar: shredded cheese, diced onion, jalapeños, sour cream. Call the crew while it's hot — chili holds well but the first bowl is always the best.",
      minutes: 5,
      heatLevel: "low",
    },
  ];
}

function pastaGarlicButterSteps(title: string, _scale: number): Step[] {
  return [
    {
      stepNumber: 1,
      title: "Boil the pasta",
      instruction:
        "Bring a large pot of salted water to a rolling boil (water should taste like the sea). Add spaghetti and stir once so strands don't stick. Cook 1 minute shy of package time — you'll finish in the butter. Reserve 2 cups pasta water before draining.",
      minutes: 12,
      heatLevel: "high",
    },
    {
      stepNumber: 2,
      title: "Make garlic butter",
      instruction:
        "While pasta cooks, melt butter in a large skillet or Dutch oven over medium heat. When foam subsides, add garlic and swirl 45–60 seconds until fragrant and pale gold — not brown. If garlic darkens fast, pull the pan off heat for 10 seconds.",
      minutes: 3,
      heatLevel: "medium",
    },
    {
      stepNumber: 3,
      title: "Toss and finish",
      instruction: `Add drained pasta to the garlic butter. Toss vigorously, adding pasta water a splash at a time until the sauce clings glossy to every strand. Fold in Parmesan off heat. Taste — ${title} should be rich, salty, and silky. Adjust with salt, pepper, and more butter if needed.`,
      minutes: 4,
      heatLevel: "medium-low",
    },
    {
      stepNumber: 4,
      title: "Serve immediately",
      instruction:
        "Serve straight from the pot or transfer to a warm tray lined with foil. Top with parsley and extra Parmesan. This dish does not hold well on a steam table — call the crew as soon as it is tossed.",
      minutes: 2,
      heatLevel: "",
    },
  ];
}

function shrimpGarlicButterSteps(title: string): Step[] {
  return [
    {
      stepNumber: 1,
      title: "Prep shrimp",
      instruction:
        "Pat shrimp completely dry with paper towels — moisture is the enemy of browning. Season with salt and pepper. Mince garlic and chop parsley. Have butter measured; this moves fast.",
      minutes: 10,
      heatLevel: "",
    },
    {
      stepNumber: 2,
      title: "Sear shrimp",
      instruction:
        "Heat a large skillet over medium-high until just smoking. Add 1 tbsp oil, then shrimp in a single layer (work in batches). Cook 60–90 seconds per side until pink with light browning. Remove immediately to a warm tray — do not overcook.",
      minutes: 6,
      heatLevel: "medium-high",
    },
    {
      stepNumber: 3,
      title: "Garlic butter sauce",
      instruction:
        "Lower heat to medium. Add butter and garlic; swirl until butter foams and garlic smells sweet (30–45 seconds). Deglaze with wine or broth, scraping brown bits. Simmer 1 minute until slightly thickened. Return shrimp and any juices; toss to coat.",
      minutes: 4,
      heatLevel: "medium",
    },
    {
      stepNumber: 4,
      title: "Plate with lemon",
      instruction: `Finish with lemon juice, parsley, and red pepper flakes if using. ${title} should smell like butter and garlic, not fishy. Serve over rice, pasta, or with crusty bread on a warm tray — keep backup covered at 200°F for late calls so shrimp do not overcook.`,
      minutes: 2,
      heatLevel: "low",
    },
  ];
}

function smashBurgerSteps(): Step[] {
  return [
    {
      stepNumber: 1,
      title: "Mix sauce & prep",
      instruction:
        "Stir mayo, mustard, and ketchup into a quick burger sauce. Slice onions paper-thin. Split buns. Form beef into loose balls (about 3 oz each) — don't pack tight or burgers steam instead of crisp.",
      minutes: 15,
      heatLevel: "",
    },
    {
      stepNumber: 2,
      title: "Smash on the flat-top",
      instruction:
        "Heat griddle or cast iron over high until smoking. Ball down, smash immediately with a stiff spatula into a thin patty. Season with salt. Cook 2 minutes until edges lace and brown. Flip, add cheese, stack if doing doubles. Toast buns in leftover fat.",
      minutes: 8,
      heatLevel: "high",
    },
    {
      stepNumber: 3,
      title: "Stack the burgers",
      instruction:
        "Bottom bun → sauce → pickles → patty with melted cheese → onions → top bun. Serve within 2 minutes — smash burgers lose their crisp edge fast. Run a sheet-tray line, not individual plating.",
      minutes: 5,
      heatLevel: "",
    },
    {
      stepNumber: 4,
      title: "Hold the batch",
      instruction:
        "Keep finished burgers on a rack in a 200°F oven up to 8 minutes. Wipe the griddle between batches so fat does not burn the next round.",
      minutes: 5,
      heatLevel: "low",
    },
  ];
}

export function buildLegacySlugBlueprint(
  def: GoldenRecipeDefinition,
  scale: number,
): { ingredients: Ing[]; steps: Step[] } | null {
  const slug = def.slug;
  const title = def.title.toLowerCase();

  if (slug === "five-ingredient-pasta" || (title.includes("garlic") && title.includes("pasta"))) {
    return {
      ingredients: [
        m("Dried spaghetti", mult(1.5, scale), "lb", "Main"),
        m("Unsalted butter", mult(0.5, scale), "lb", "Garlic butter"),
        m("Garlic cloves, minced", mult(10, scale), "cloves", "Garlic butter"),
        m("Parmesan cheese, finely grated", mult(12, scale), "oz", "Finish"),
        m("Kosher salt", mult(2, scale), "tbsp", "Seasoning"),
        m("Black pepper, freshly cracked", mult(1, scale), "tsp", "Seasoning"),
        m("Fresh parsley, chopped", mult(0.5, scale), "cup", "Garnish"),
      ],
      steps: pastaGarlicButterSteps(def.title, scale),
    };
  }

  if (slug === "garlic-butter-shrimp" || (title.includes("shrimp") && title.includes("garlic"))) {
    return {
      ingredients: [
        m("Large shrimp, peeled and deveined", mult(2.5, scale), "lb", "Main", "pat dry"),
        ...garlicButterSauce(scale),
        m("Dry white wine or chicken broth", mult(0.5, scale), "cup", "Sauce"),
        m("Red pepper flakes", mult(0.5, scale), "tsp", "Seasoning", "optional heat"),
      ],
      steps: shrimpGarlicButterSteps(def.title),
    };
  }

  if (slug === "big-chili" || slug === "chili-garlic-bread" || slug === "sunday-chili-batch" || slug === "turkey-chili") {
    const isTurkey = slug === "turkey-chili" || def.protein === "turkey";
    return {
      ingredients: chiliIngredients(scale, isTurkey),
      steps: chiliSteps(def.title, isTurkey),
    };
  }

  if (slug === "smash-burgers") {
    return {
      ingredients: [
        m("Ground beef (80/20)", mult(3, scale), "lb", "Main"),
        m("Potato burger buns", mult(8, scale), "count", "Buns"),
        m("American cheese slices", mult(16, scale), "count", "Cheese"),
        m("Yellow onion, thinly sliced", mult(2, scale), "large", "Toppings"),
        m("Dill pickle chips", mult(2, scale), "cups", "Toppings"),
        m("Unsalted butter", mult(4, scale), "tbsp", "Garlic butter", "for buns"),
        m("Mayonnaise", mult(0.5, scale), "cup", "Sauce"),
        m("Yellow mustard", mult(3, scale), "tbsp", "Sauce"),
        m("Ketchup", mult(3, scale), "tbsp", "Sauce"),
        ...aromatics(scale).slice(3),
      ],
      steps: smashBurgerSteps(),
    };
  }

  return null;
}
