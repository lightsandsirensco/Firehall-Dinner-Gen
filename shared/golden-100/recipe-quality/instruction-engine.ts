/**
 * Editorial instruction engine — recipe-class steps, slug packs, no universal skeleton.
 */

import type { GoldenRecipeDefinition } from "../types.js";
import type { GoldenRecipePageIngredient, GoldenRecipePageStep } from "../recipe-page-schema.js";
import {
  inferRecipeInstructionClass,
  type RecipeInstructionClass,
} from "./recipe-instruction-class.js";
import { buildLegacySlugBlueprint } from "./blueprints-legacy-slugs.js";
import { getMealSpecificPack } from "./meal-specific-packs.js";

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

export function mainProteinLabel(def: GoldenRecipeDefinition): string {
  switch (def.protein) {
    case "seafood":
      return /salmon/i.test(def.title) ? "salmon fillets" : "large shrimp";
    case "beef":
      return /ground|burger|nacho|chili|meatloaf/i.test(def.title)
        ? "ground beef"
        : "thinly sliced beef sirloin";
    case "pork":
      return "boneless pork chops";
    case "vegetarian":
      return /chickpea/i.test(def.title) ? "chickpeas" : "extra-firm tofu";
    default:
      return "boneless chicken thighs";
  }
}

function mainProteinDoneTemp(def: GoldenRecipeDefinition): string {
  if (def.protein === "seafood") {
    return /salmon/i.test(def.title) ? "125°F for medium salmon" : "145°F for shrimp";
  }
  if (def.protein === "beef" && !/ground|meatloaf/i.test(def.title)) return "145°F for beef slices";
  if (def.protein === "pork") return "145°F for pork";
  if (def.protein === "vegetarian") return "heated through";
  return "165°F for chicken";
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

// ─── Slug-specific packs (highest priority) ───────────────────────────────

function slugPack(
  def: GoldenRecipeDefinition,
  scale: number,
): { ingredients: Ing[]; steps: Step[] } | null {
  const specific = getMealSpecificPack(def, scale);
  if (specific) return specific;

  const slug = def.slug;

  if (slug === "smoked-wings-white-sauce") {
    return {
      ingredients: [
        m("Chicken wings, split and tips trimmed", mult(5, scale), "lb", "Main", "pat very dry"),
        m("Kosher salt", mult(2, scale), "tbsp", "Rub"),
        m("Black pepper", mult(1, scale), "tbsp", "Rub"),
        m("Smoked paprika", mult(2, scale), "tbsp", "Rub"),
        m("Garlic powder", mult(1, scale), "tbsp", "Rub"),
        m("Brown sugar", mult(1, scale), "tbsp", "Rub", "helps bronzing"),
        m("Mayonnaise", mult(1, scale), "cup", "White BBQ sauce"),
        m("Apple cider vinegar", mult(0.25, scale), "cup", "White BBQ sauce"),
        m("Prepared horseradish", mult(3, scale), "tbsp", "White BBQ sauce"),
        m("Fresh lemon juice", mult(2, scale), "tbsp", "White BBQ sauce"),
        m("Worcestershire sauce", mult(1, scale), "tbsp", "White BBQ sauce"),
        m("Cayenne pepper", mult(0.25, scale), "tsp", "White BBQ sauce"),
        m("Celery seed", mult(0.5, scale), "tsp", "White BBQ sauce", "optional"),
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Dry and season wings",
          instruction:
            "Pat wings completely dry with paper towels — moisture blocks smoke and crisping. Toss with salt, pepper, smoked paprika, garlic powder, and brown sugar. Arrange skin-side up on wire racks set over sheet pans with space between each wing so smoke circulates.",
          minutes: 15,
          heatLevel: "",
        },
        {
          stepNumber: 2,
          title: "Smoke low and slow",
          instruction:
            "Run smoker at 250°F with hickory or oak. Smoke wings 45–60 minutes until the skin looks dry, lightly bronzed, and pulls tight — internal temp at the thickest joint should read 165°F. Avoid saucing now; sugars will burn before the skin crisps.",
          minutes: 55,
          heatLevel: "low",
        },
        {
          stepNumber: 3,
          title: "Crisp the skin",
          instruction:
            "Finish over high heat on the grill (lid open) or under a broiler 3–5 minutes per side until the skin crackles and blisters lightly. Work in batches so wings are not stacked — steam softens skin. Hold crisped wings on a rack, not a closed container.",
          minutes: 8,
          heatLevel: "high",
        },
        {
          stepNumber: 4,
          title: "Mix white BBQ sauce",
          instruction:
            "Whisk mayo, cider vinegar, horseradish, lemon juice, Worcestershire, cayenne, and celery seed until smooth. Taste — it should be tangy, creamy, and peppery. Chill 20 minutes if time allows so flavors settle; thin with a splash of vinegar if too thick.",
          minutes: 10,
          heatLevel: "",
        },
        {
          stepNumber: 5,
          title: "Toss and serve hot",
          instruction:
            "Toss wings with just enough sauce to coat — add more at the table. Serve immediately on sheet trays with extra sauce and lemon wedges. Hold backup wings uncovered at 200°F up to 20 minutes; do not cover sauced wings or they steam soggy.",
          minutes: 5,
          heatLevel: "low",
        },
      ],
    };
  }

  if (slug === "five-ingredient-pasta" || slug === "garlic-butter-shrimp") return null; // handled in class imports from legacy

  if (slug === "smoked-brisket") {
    return {
      ingredients: [
        m("Whole packer brisket, trimmed", mult(6, scale), "lb", "Main", "about 12 oz raw per firefighter after trim"),
        m("Kosher salt", mult(0.5, scale), "cup", "Rub"),
        m("Coarse black pepper", mult(0.25, scale), "cup", "Rub"),
        m("Garlic powder", mult(2, scale), "tbsp", "Rub"),
        m("Yellow mustard", mult(0.25, scale), "cup", "Binder", "optional slather"),
        m("Beef broth", mult(2, scale), "cups", "Wrap"),
        m("Apple cider vinegar", mult(0.5, scale), "cup", "Spritz"),
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Trim and season",
          instruction:
            "Trim hard fat cap to ¼ inch. Score the fat cap lightly. Slather with mustard if using, then coat heavily with salt and pepper (Texas-style is salt and pepper only — that's fine). Rest seasoned brisket 1 hour at room temp while the smoker comes up.",
          minutes: 60,
          heatLevel: "",
        },
        {
          stepNumber: 2,
          title: "Smoke until bark sets",
          instruction:
            "Run smoker at 250–275°F with oak or hickory. Place brisket fat-cap up. Smoke unwrapped until bark is dark mahogany and internal temp hits 165–170°F in the flat (roughly 6–8 hours). Spritz with vinegar and broth every 90 minutes if the surface looks dry.",
          minutes: 180,
          heatLevel: "low",
        },
        {
          stepNumber: 3,
          title: "Wrap the stall",
          instruction:
            "When the flat stalls around 165°F or bark is set, wrap tightly in butcher paper or foil with a splash of broth. Return to smoker until probe slides like butter into the flat at 203–205°F (another 3–5 hours).",
          minutes: 180,
          heatLevel: "low",
        },
        {
          stepNumber: 4,
          title: "Rest and slice",
          instruction:
            "Rest wrapped brisket in a cooler or warm oven (170°F) at least 1 hour — up to 3 for a hall feed. Slice against the grain: flat in thin slices, point chopped for burnt-end style bites. Hold slices in broth-lined pans covered with foil at 180°F for late eaters.",
          minutes: 75,
          heatLevel: "low",
        },
      ],
    };
  }

  if (slug === "memphis-dry-rub-ribs" || slug === "texas-beef-ribs") {
    const beef = slug === "texas-beef-ribs";
    return {
      ingredients: beef
        ? [
            m("Beef short ribs, plate style", mult(6, scale), "lb", "Main", "about 12 oz bone-in per firefighter"),
            m("Kosher salt", mult(3, scale), "tbsp", "Rub"),
            m("Coarse black pepper", mult(3, scale), "tbsp", "Rub"),
            m("Garlic powder", mult(1, scale), "tbsp", "Rub"),
            m("Beef broth", mult(1, scale), "cup", "Hold", "for spritz"),
            m("Apple cider vinegar", mult(0.25, scale), "cup", "Spritz"),
          ]
        : [
            m("St. Louis spare ribs", mult(6, scale), "racks", "Main", "about 3 lb each"),
            m("Brown sugar", mult(0.5, scale), "cup", "Rub"),
            m("Paprika", mult(3, scale), "tbsp", "Rub"),
            m("Garlic powder", mult(1, scale), "tbsp", "Rub"),
            m("Onion powder", mult(1, scale), "tbsp", "Rub"),
            m("Cayenne", mult(1, scale), "tsp", "Rub"),
            m("Kosher salt", mult(2, scale), "tbsp", "Rub"),
          ],
      steps: beef
        ? [
            {
              stepNumber: 1,
              title: "Season the beef ribs",
              instruction:
                "Pull silver skin if present. Coat ribs with salt and pepper (heavy — Texas style). Let sit 30 minutes while smoker preheats to 275°F with oak.",
              minutes: 30,
              heatLevel: "",
            },
            {
              stepNumber: 2,
              title: "Smoke until tender",
              instruction:
                "Smoke bone-side down 6–8 hours until meat pulls back from bone and internal temp reads 200–205°F. Wrap in butcher paper if bark gets too dark before tenderness. Meat should jiggle when you shake the rack.",
              minutes: 180,
              heatLevel: "low",
            },
            {
              stepNumber: 3,
              title: "Rest and portion",
              instruction:
                "Rest 20 minutes tented with foil. Cut between bones. Hold on sheet trays at 180°F — beef ribs dry out fast, so keep a backup pan lightly spritzed with broth.",
              minutes: 25,
              heatLevel: "low",
            },
            {
              stepNumber: 4,
              title: "Serve on the line",
              instruction:
                "Pile ribs on sheet trays with extra pepper on the side. Backup pan in a warm oven — do not cover tightly or bark softens.",
              minutes: 5,
              heatLevel: "low",
            },
          ]
        : [
            {
              stepNumber: 1,
              title: "Remove membrane",
              instruction:
                "Peel the silverskin off the bone side with a paper towel grip — it will not soften in smoke. Mix dry rub and coat both sides. Rest 30 minutes at room temp.",
              minutes: 25,
              heatLevel: "",
            },
            {
              stepNumber: 2,
              title: "Smoke 3-2-1 style",
              instruction:
                "Smoke at 250°F meat-side up for 3 hours. Spritz with apple juice if bark looks dry. Wrap in foil with a splash of juice for 2 hours. Unwrap, sauce if desired, finish 1 hour to set bark. Ribs bend without breaking when done.",
              minutes: 180,
              heatLevel: "low",
            },
            {
              stepNumber: 3,
              title: "Slice and serve",
              instruction:
                "Rest 10 minutes, slice between bones. Memphis dry rub ribs should have sticky bark and pull clean — not mush. Serve on trays; hold backup rack at 180°F.",
              minutes: 15,
              heatLevel: "low",
            },
            {
              stepNumber: 4,
              title: "Hold for late eaters",
              instruction:
                "Wrap cut ribs in foil on a sheet tray at 180°F up to 30 minutes. Spritz apple juice if edges look dry before the second tray goes out.",
              minutes: 5,
              heatLevel: "low",
            },
          ],
    };
  }

  if (slug === "biscuits-gravy") {
    return {
      ingredients: [
        m("Breakfast sausage", mult(2, scale), "lb", "Gravy"),
        m("All-purpose flour", mult(0.5, scale), "cup", "Gravy"),
        m("Whole milk", mult(4, scale), "cups", "Gravy"),
        m("Black pepper", mult(1, scale), "tbsp", "Gravy"),
        m("Buttermilk biscuit mix", mult(4, scale), "cups", "Biscuits"),
        m("Cold butter", mult(8, scale), "tbsp", "Biscuits"),
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Bake the biscuits",
          instruction:
            "Bake biscuits at 425°F per mix directions until tall and golden — 14–18 minutes. Split and hold in a towel while gravy finishes.",
          minutes: 18,
          heatLevel: "high",
        },
        {
          stepNumber: 2,
          title: "Brown the sausage",
          instruction:
            "Crumble sausage in a large skillet over medium-high until no pink remains. Leave the fat — that's the gravy body.",
          minutes: 10,
          heatLevel: "medium-high",
        },
        {
          stepNumber: 3,
          title: "Make the pepper gravy",
          instruction:
            "Sprinkle flour over sausage; stir 1 minute. Whisk in milk gradually. Simmer 5–8 minutes until thick enough to coat a spoon. Season with plenty of black pepper.",
          minutes: 10,
          heatLevel: "medium",
        },
        {
          stepNumber: 4,
          title: "Split and smother",
          instruction:
            "Split biscuits on sheet trays. Ladle hot gravy over the line. Hold gravy in a warm pot on low — stir before each ladle so it doesn't skin over.",
          minutes: 5,
          heatLevel: "low",
        },
      ],
    };
  }

  if (slug === "flank-chimichurri") {
    return {
      ingredients: [
        m("Flank steak", mult(4, scale), "lb", "Main"),
        m("Fresh parsley", mult(1, scale), "bunch", "Chimichurri"),
        m("Fresh oregano", mult(2, scale), "tbsp", "Chimichurri"),
        m("Garlic cloves", mult(4, scale), "cloves", "Chimichurri"),
        m("Red wine vinegar", mult(0.25, scale), "cup", "Chimichurri"),
        m("Olive oil", mult(0.5, scale), "cup", "Chimichurri"),
        m("Kosher salt", mult(2, scale), "tbsp", "Seasoning"),
        m("Red pepper flakes", mult(0.5, scale), "tsp", "Chimichurri"),
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Blend chimichurri",
          instruction:
            "Pulse parsley, oregano, garlic, vinegar, oil, salt, and pepper flakes until saucy but not puréed. Rest 20 minutes at room temp so vinegar mellows.",
          minutes: 15,
          heatLevel: "",
        },
        {
          stepNumber: 2,
          title: "Season the flank",
          instruction:
            "Pat steak dry; salt aggressively 30 minutes ahead. Grill over high heat 450°F when ready.",
          minutes: 30,
          heatLevel: "",
        },
        {
          stepNumber: 3,
          title: "Grill and rest",
          instruction:
            "Grill 4–5 minutes per side to 125–130°F. Rest 8 minutes — carryover hits medium-rare. Slice thin against the grain.",
          minutes: 12,
          heatLevel: "high",
        },
        {
          stepNumber: 4,
          title: "Dress and serve",
          instruction:
            "Spoon chimichurri over sliced steak; serve extra sauce on the line. Hold steak loosely tented — saucing too early washes away crust.",
          minutes: 5,
          heatLevel: "",
        },
      ],
    };
  }

  if (slug === "crispy-chicken-cutlets" || def.title.toLowerCase().includes("marinara")) {
    return {
      ingredients: [
        m("Chicken cutlets, pounded thin", mult(3, scale), "lb", "Main"),
        m("All-purpose flour", mult(2, scale), "cups", "Breading"),
        m("Eggs, beaten", mult(4, scale), "count", "Breading"),
        m("Panko breadcrumbs", mult(3, scale), "cups", "Breading"),
        m("Marinara sauce", mult(3, scale), "cups", "Sauce"),
        m("Fresh mozzarella, sliced", mult(12, scale), "oz", "Cheese"),
        m("Parmesan, grated", mult(4, scale), "oz", "Finish"),
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Bread the cutlets",
          instruction:
            "Season cutlets with salt. Dredge flour → egg → panko, pressing crumbs to adhere. Rest breaded cutlets on a rack 10 minutes so coating sets.",
          minutes: 20,
          heatLevel: "",
        },
        {
          stepNumber: 2,
          title: "Fry until golden",
          instruction:
            "Fry in 350°F oil in batches 3–4 minutes per side until deep golden and 165°F inside. Drain on a rack, not paper-only — steam softens crust.",
          minutes: 15,
          heatLevel: "high",
        },
        {
          stepNumber: 3,
          title: "Simmer marinara",
          instruction:
            "Warm marinara in a wide skillet over medium heat. Season with a pinch of salt and basil if you have it — sauce should bubble gently, not spit.",
          minutes: 8,
          heatLevel: "medium",
        },
        {
          stepNumber: 4,
          title: "Melt cheese and serve",
          instruction:
            "Nestle cutlets in sauce, top with mozzarella, cover 2–3 minutes until cheese melts. Finish with Parmesan. Serve from the skillet or transfer to sheet trays at 200°F for late eaters.",
          minutes: 6,
          heatLevel: "medium-low",
        },
      ],
    };
  }

  if (slug === "bbq-brisket-burnt-ends") {
    return {
      ingredients: [
        m("Chuck or brisket point, cubed", mult(6, scale), "lb", "Main"),
        m("Kosher salt", mult(2, scale), "tbsp", "Rub"),
        m("Black pepper", mult(2, scale), "tbsp", "Rub"),
        m("Brown sugar", mult(0.5, scale), "cup", "Glaze"),
        m("BBQ sauce", mult(2, scale), "cups", "Glaze"),
        m("Honey", mult(0.25, scale), "cup", "Glaze"),
        m("Unsalted butter", mult(4, scale), "tbsp", "Glaze"),
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Cube and season",
          instruction:
            "Cut point into 1-inch cubes. Toss with salt and pepper. Preheat smoker to 275°F.",
          minutes: 20,
          heatLevel: "",
        },
        {
          stepNumber: 2,
          title: "Smoke the cubes",
          instruction:
            "Smoke cubes 3–4 hours until deeply browned and tender (internal 195°F+). Toss halfway for even color.",
          minutes: 180,
          heatLevel: "low",
        },
        {
          stepNumber: 3,
          title: "Glaze in the pan",
          instruction:
            "Transfer to a foil pan with butter, brown sugar, honey, and BBQ sauce. Cover and cook 1–2 hours until saucy and sticky. Uncover last 15 minutes to caramelize edges — watch for burning.",
          minutes: 90,
          heatLevel: "medium",
        },
        {
          stepNumber: 4,
          title: "Serve with toothpicks",
          instruction:
            "Burnt ends should be lacquered, not soupy. Serve in pans with picks for the line. Hold at 180°F up to 45 minutes.",
          minutes: 5,
          heatLevel: "low",
        },
      ],
    };
  }

  return null;
}

// ─── Class builders ───────────────────────────────────────────────────────

function wingsSmokeIngredients(scale: number): Ing[] {
  return [
    m("Chicken wings, split", mult(5, scale), "lb", "Main"),
    m("Kosher salt", mult(2, scale), "tbsp", "Rub"),
    m("Smoked paprika", mult(2, scale), "tbsp", "Rub"),
    m("Garlic powder", mult(1, scale), "tbsp", "Rub"),
    m("BBQ sauce", mult(1.5, scale), "cups", "Finish", "optional toss"),
  ];
}

function buildForClass(
  cls: RecipeInstructionClass,
  def: GoldenRecipeDefinition,
  scale: number,
): { ingredients: Ing[]; steps: Step[] } {
  const title = def.title;

  switch (cls) {
    case "wings_smoke":
      return {
        ingredients: wingsSmokeIngredients(scale),
        steps: [
          {
            stepNumber: 1,
            title: "Dry and season",
            instruction:
              "Pat wings dry. Toss with salt, paprika, and garlic powder. Arrange skin-side up on racks with space between pieces.",
            minutes: 15,
            heatLevel: "",
          },
          {
            stepNumber: 2,
            title: "Smoke until bronzed",
            instruction:
              "Smoke at 250°F 45–60 minutes until skin is dry and lightly bronzed (165°F at the joint). Do not sauce early — sugars burn before crisping.",
            minutes: 55,
            heatLevel: "low",
          },
          {
            stepNumber: 3,
            title: "Crisp and toss",
            instruction:
              "Crisp over high heat or broiler 3–5 minutes. Toss with warmed sauce just before serving. Hold on racks, not closed containers.",
            minutes: 8,
            heatLevel: "high",
          },
        ],
      };

    case "pizza":
      return {
        ingredients: [
          m("Bread flour", mult(4, scale), "cups", "Dough"),
          m("Active dry yeast", mult(2, scale), "tsp", "Dough"),
          m("Warm water", mult(1.5, scale), "cups", "Dough", "110°F"),
          m("Olive oil", mult(3, scale), "tbsp", "Dough"),
          m("Kosher salt", mult(2, scale), "tsp", "Dough"),
          m("Crushed tomatoes", mult(2, scale), "cans", "Sauce", "28 oz"),
          m("Fresh mozzarella, torn", mult(24, scale), "oz", "Cheese"),
          m("Pepperoni or toppings", mult(12, scale), "oz", "Toppings"),
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Proof the dough",
            instruction: `Stir yeast into warm water with a pinch of sugar; bloom 5 minutes until foamy. Mix flour, salt, oil, and yeast water until a shaggy dough forms. Knead 8–10 minutes until smooth. Rise covered 1–1½ hours until doubled — ${title} needs relaxed gluten for an open crumb.`,
            minutes: 90,
            heatLevel: "",
          },
          {
            stepNumber: 2,
            title: "Heat oven and stone",
            instruction:
              "Place a pizza stone or inverted sheet pan in the oven. Preheat to 500°F for at least 45 minutes — surface temp matters more than air temp. Prep sauce and cheese while the oven saturates.",
            minutes: 45,
            heatLevel: "high",
          },
          {
            stepNumber: 3,
            title: "Stretch and top",
            instruction:
              "Divide dough; stretch by hand (don't roll with a pin unless Detroit-style). Sauce lightly — wet centers sag. Add cheese and toppings. Work on parchment or floured peel; jiggle to confirm it slides.",
            minutes: 15,
            heatLevel: "",
          },
          {
            stepNumber: 4,
            title: "Bake until blistered",
            instruction:
              "Slide onto the hot stone. Bake 10–14 minutes until cheese bubbles with brown spots and the underside sounds hollow when tapped. Rotate once if your oven has hot spots.",
            minutes: 12,
            heatLevel: "high",
          },
          {
            stepNumber: 5,
            title: "Rest and cut",
            instruction:
              "Rest 2 minutes before cutting so cheese sets. Cut on sheet trays for the hall line. Hold backup pies at 200°F uncovered up to 15 minutes — covering traps steam and softens crust.",
            minutes: 3,
            heatLevel: "low",
          },
        ],
      };

    case "bbq_smoke":
    case "bbq_ribs":
    case "burnt_ends":
    case "steak_grill":
    case "chicken_grill":
    case "pork_grill":
    case "salmon_grill":
    case "veg_grill":
      return buildGrillClass(cls, def, scale);

    case "chili":
      return buildChili(def, scale);
    case "pasta":
      return buildPasta(def, scale);
    case "burger":
      return buildBurger(scale);
    case "tacos":
      return buildTacos(def, scale);
    case "breakfast":
      return buildBreakfast(def, scale);
    case "sheet_pan":
      return buildSheetPan(def, scale);
    case "bar":
      return getMealSpecificPack(def, scale) ?? buildBowl(def, scale);
    case "bowl":
      return buildBowl(def, scale);
    case "sandwich":
      return buildSandwich(def, scale);
    case "soup":
      return buildSoup(def, scale);
    case "skillet":
      return buildSkillet(def, scale);
    case "bake":
      return buildBake(def, scale);
    case "dip":
      return buildDip(scale);
    case "one_pot":
      return buildOnePot(def, scale);
    case "roast":
      return buildRoast(def, scale);
    case "salad":
      return buildSalad(def, scale);
    case "plated":
    default:
      return buildPlated(def, scale);
  }
}

function buildGrillClass(
  cls: RecipeInstructionClass,
  def: GoldenRecipeDefinition,
  scale: number,
): { ingredients: Ing[]; steps: Step[] } {
  const title = def.title;

  if (cls === "steak_grill") {
    return {
      ingredients: [
        m("NY strip or flank steak", mult(4, scale), "lb", "Main"),
        m("Kosher salt", mult(2, scale), "tbsp", "Seasoning"),
        m("Black pepper", mult(1, scale), "tbsp", "Seasoning"),
        m("Unsalted butter", mult(6, scale), "tbsp", "Herb butter"),
        m("Fresh parsley", mult(0.5, scale), "cup", "Herb butter"),
        m("Garlic cloves, minced", mult(3, scale), "cloves", "Herb butter"),
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Season and temper",
          instruction:
            "Pat steaks dry. Salt heavily 40 minutes ahead (or right before if rushed). Pepper just before cooking. Let meat sit out 20 minutes — cold centers overcook the exterior.",
          minutes: 45,
          heatLevel: "",
        },
        {
          stepNumber: 2,
          title: "Grill over high heat",
          instruction:
            "Grill over high heat (450–500°F surface) 3–5 minutes per side for strip to 130°F medium-rare. Flank: sear 4 minutes per side, then medium until 125°F; rest and slice thin against the grain.",
          minutes: 12,
          heatLevel: "high",
        },
        {
          stepNumber: 3,
          title: "Baste with herb butter",
          instruction:
            "Melt butter with garlic and parsley. Rest steaks 8 minutes tented with foil, then slice and spoon butter over. Hold on warm trays at 180°F no more than 20 minutes.",
          minutes: 10,
          heatLevel: "low",
        },
        {
          stepNumber: 4,
          title: "Serve on sheet trays",
          instruction: `${title} goes out sliced on trays with extra herb butter melting on top — crew grabs with tongs, not forks and knives.`,
          minutes: 5,
          heatLevel: "low",
        },
      ],
    };
  }

  if (cls === "chicken_grill") {
    return {
      ingredients: [
        m("Whole chicken or bone-in thighs", mult(5, scale), "lb", "Main"),
        m("Beer can", mult(1, scale), "count", "Roast", "room temp, half full"),
        m("Jerk or poultry rub", mult(3, scale), "tbsp", "Seasoning"),
        m("Kosher salt", mult(2, scale), "tbsp", "Seasoning"),
        m("Lime juice", mult(3, scale), "tbsp", "Finish"),
        m("Vegetable oil", mult(2, scale), "tbsp", "Seasoning"),
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Season under the skin",
          instruction:
            "Dry chicken thoroughly. Season under skin and in cavity. For beer-can method: open a room-temp beer, set can in cavity, stand bird on indirect zone.",
          minutes: 15,
          heatLevel: "",
        },
        {
          stepNumber: 2,
          title: "Grill indirect then crisp",
          instruction:
            "Run grill 375°F indirect with lid down until thickest part reads 165°F (60–75 minutes for a whole bird). Move to direct heat 5 minutes to crisp skin. Juices should run clear, not pink.",
          minutes: 70,
          heatLevel: "medium",
        },
        {
          stepNumber: 3,
          title: "Rest and portion",
          instruction: `Rest 10 minutes before carving. ${title} stays juicier if you don't slice immediately. Hold quarters on sheet trays at 180°F for late eaters.`,
          minutes: 12,
          heatLevel: "low",
        },
        {
          stepNumber: 4,
          title: "Carve for the line",
          instruction:
            "Quarter birds or slice thighs. Serve on sheet trays with pan juices — backup bird stays whole in a 180°F oven up to 25 minutes.",
          minutes: 8,
          heatLevel: "low",
        },
      ],
    };
  }

  if (cls === "pork_grill") {
    return {
      ingredients: [
        m("Pork chops or tenderloin", mult(4, scale), "lb", "Main"),
        m("Brown sugar", mult(2, scale), "tbsp", "Glaze"),
        m("Soy sauce", mult(3, scale), "tbsp", "Glaze"),
        m("Garlic cloves, minced", mult(4, scale), "cloves", "Glaze"),
        m("Kosher salt", mult(1, scale), "tbsp", "Seasoning"),
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Brine or season",
          instruction:
            "Pat pork dry. Salt 30 minutes ahead. Whisk glaze ingredients. Chops should be 1–1½ inches thick for even cooking.",
          minutes: 30,
          heatLevel: "",
        },
        {
          stepNumber: 2,
          title: "Grill to 145°F",
          instruction:
            "Grill over medium-high 4–5 minutes per side until 140°F, then glaze and cook 1 minute per side until 145°F. Tenderloin: sear all sides, finish indirect to 145°F. Meat should spring back lightly.",
          minutes: 18,
          heatLevel: "medium-high",
        },
        {
          stepNumber: 3,
          title: "Rest and slice",
          instruction:
            "Rest 5 minutes. Slice tenderloin on a bias. Hold chops on warm trays — pork dries out above 160°F, so don't overcook while waiting for the crew.",
          minutes: 8,
          heatLevel: "low",
        },
        {
          stepNumber: 4,
          title: "Glaze and hold",
          instruction:
            "Brush any remaining glaze over slices. Keep backup chops on a rack at 180°F — stacked pork steams and loses crust.",
          minutes: 5,
          heatLevel: "low",
        },
      ],
    };
  }

  if (cls === "salmon_grill") {
    return {
      ingredients: [
        m("Salmon fillets, skin on", mult(3, scale), "lb", "Main"),
        m("Cedar plank", mult(1, scale), "count", "Equipment", "soaked 1 hour"),
        m("Brown sugar", mult(2, scale), "tbsp", "Glaze"),
        m("Soy sauce", mult(3, scale), "tbsp", "Glaze"),
        m("Fresh ginger, grated", mult(1, scale), "tbsp", "Glaze"),
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Soak plank and prep fish",
          instruction:
            "Soak cedar plank 1 hour. Pat salmon dry. Mix glaze. Score skin lightly so it doesn't curl.",
          minutes: 60,
          heatLevel: "",
        },
        {
          stepNumber: 2,
          title: "Grill on the plank",
          instruction:
            "Grill indirect at 375°F on the plank 12–18 minutes until salmon flakes at 125–130°F in the thickest part (medium). Skin may stick — that's fine; serve flesh side up.",
          minutes: 16,
          heatLevel: "medium",
        },
        {
          stepNumber: 3,
          title: "Glaze and serve",
          instruction:
            "Brush glaze in the last 3 minutes. Rest 2 minutes. Serve from plank or transfer with a wide spatula. Hold backup fillets at 160°F max — salmon toughens fast.",
          minutes: 5,
          heatLevel: "low",
        },
        {
          stepNumber: 4,
          title: "Portion for the hall",
          instruction:
            "Break fillets into portions on trays. Keep skin on for transport — crew can peel if they want. Do not cover tightly or fish steams.",
          minutes: 3,
          heatLevel: "",
        },
      ],
    };
  }

  if (cls === "veg_grill") {
    return {
      ingredients: [
        m("Corn on the cob, husks peeled", mult(12, scale), "ears", "Main"),
        m("Mayonnaise", mult(0.5, scale), "cup", "Coating"),
        m("Cotija cheese, crumbled", mult(8, scale), "oz", "Finish"),
        m("Chili powder", mult(1, scale), "tbsp", "Finish"),
        m("Fresh lime", mult(4, scale), "count", "Finish"),
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Char the corn",
          instruction:
            "Grill corn over high heat 10–12 minutes, turning until kernels blister and smell sweet. Do not boil first — you want smoke and char.",
          minutes: 12,
          heatLevel: "high",
        },
        {
          stepNumber: 2,
          title: "Coat elote-style",
          instruction:
            "Brush warm corn with mayo, roll in cotija and chili powder, squeeze lime. Serve on sheet trays — street corn is best within 15 minutes but holds 30 minutes warm.",
          minutes: 8,
          heatLevel: "",
        },
        {
          stepNumber: 3,
          title: "Set up the station",
          instruction:
            "Stand corn in shallow pans for easy grabbing. Keep cotija and lime wedges in bowls for touch-ups — corn dries out under heat lamps.",
          minutes: 5,
          heatLevel: "",
        },
        {
          stepNumber: 4,
          title: "Hold and refill",
          instruction:
            "Grill backup ears while the first batch goes out. Hold finished corn at 200°F up to 20 minutes; do not wrap in foil or mayo turns oily.",
          minutes: 5,
          heatLevel: "low",
        },
      ],
    };
  }

  // bbq_smoke / ribs fallback handled by slug packs; generic smoke copy if missed
  return {
    ingredients: [
      m("Main protein", mult(4, scale), "lb", "Main"),
      m("BBQ rub", mult(3, scale), "tbsp", "Rub"),
      m("Kosher salt", mult(2, scale), "tbsp", "Rub"),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Season for smoke",
        instruction: `Coat ${title} protein with rub and salt. Preheat smoker to 250°F.`,
        minutes: 20,
        heatLevel: "low",
      },
      {
        stepNumber: 2,
        title: "Smoke to tenderness",
        instruction:
          "Smoke until probe-tender and target internal temp is met (poultry 165°F, pork 145°F+, beef brisket 203°F). Look for bark color and jiggle, not clock alone.",
        minutes: 240,
        heatLevel: "low",
      },
      {
        stepNumber: 3,
        title: "Rest and serve",
        instruction:
          "Rest 15–30 minutes before slicing. Hold on warm trays at 180°F. Label backup pans for the line.",
        minutes: 20,
        heatLevel: "low",
      },
      {
        stepNumber: 4,
        title: "Slice for the crew",
        instruction: `Portion ${title} on sheet trays with bark side up so the line sees the good crust first.`,
        minutes: 10,
        heatLevel: "low",
      },
    ],
  };
}

function buildChili(def: GoldenRecipeDefinition, scale: number): { ingredients: Ing[]; steps: Step[] } {
  const turkey = def.protein === "turkey";
  return {
    ingredients: [
      m(turkey ? "Ground turkey" : "Ground beef (80/20)", mult(3.5, scale), "lb", "Main"),
      m("Yellow onion", mult(3, scale), "large", "Aromatics"),
      m("Bell peppers, diced", mult(3, scale), "count", "Aromatics"),
      m("Garlic cloves, minced", mult(8, scale), "cloves", "Aromatics"),
      m("Kidney beans, drained", mult(3, scale), "cans", "Main", "15 oz"),
      m("Crushed tomatoes", mult(2, scale), "cans", "Main", "28 oz"),
      m("Chili powder", mult(3, scale), "tbsp", "Seasoning"),
      m("Smoked paprika", mult(2, scale), "tbsp", "Seasoning"),
      m("Beef or chicken broth", mult(4, scale), "cups", "Sauce"),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Dice and open cans",
        instruction:
          "Dice onions and peppers ¼ inch. Drain beans. Open tomatoes. Set out your largest stock pot — chili splatters, so have a lid nearby.",
        minutes: 15,
        heatLevel: "",
      },
      {
        stepNumber: 2,
        title: "Brown the meat hard",
        instruction: `Brown ${turkey ? "turkey" : "beef"} in batches over medium-high until deeply colored (160°F+). Don't crowd the pot or you'll steam gray meat.`,
        minutes: 12,
        heatLevel: "medium-high",
      },
      {
        stepNumber: 3,
        title: "Bloom the spices",
        instruction:
          "Add vegetables; cook 6–8 minutes. Stir in garlic, chili powder, and paprika 45 seconds until fragrant. Add tomatoes, broth, and beans.",
        minutes: 10,
        heatLevel: "medium",
      },
      {
        stepNumber: 4,
        title: "Simmer until thick",
        instruction:
          "Simmer uncovered 35–45 minutes at a gentle bubble until a spoon dragged through leaves a clear trail. Taste for salt — chili should be bold, not flat.",
        minutes: 40,
        heatLevel: "medium-low",
      },
      {
        stepNumber: 5,
        title: "Hold for the hall",
        instruction:
          "Keep on low or in a cambro for late eaters. Topping bar: cheese, onion, jalapeños, sour cream. First bowl is best; stir before each refill.",
        minutes: 5,
        heatLevel: "low",
      },
    ],
  };
}

function buildPasta(def: GoldenRecipeDefinition, scale: number): { ingredients: Ing[]; steps: Step[] } {
  const title = def.title;
  const beef = def.protein === "beef";
  return {
    ingredients: [
      m("Dried pasta", mult(1.5, scale), "lb", "Main"),
      m(beef ? "Ground beef" : "Boneless chicken thighs", mult(2.5, scale), "lb", "Main"),
      m("Crushed tomatoes", mult(2, scale), "cans", "Sauce", "28 oz"),
      m("Heavy cream", mult(1, scale), "cup", "Sauce"),
      m("Parmesan, grated", mult(8, scale), "oz", "Finish"),
      ...aromatics(scale).slice(0, 3),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Salt the pasta water",
        instruction:
          "Bring a large pot of water to a rolling boil with enough salt that it tastes like the sea. This is your only chance to season the pasta itself.",
        minutes: 10,
        heatLevel: "high",
      },
      {
        stepNumber: 2,
        title: "Cook sauce base",
        instruction:
          "Meanwhile, brown meat, add onions and garlic, then tomatoes (and cream if Alfredo-style). Simmer 15 minutes while pasta cooks.",
        minutes: 15,
        heatLevel: "medium",
      },
      {
        stepNumber: 3,
        title: "Boil pasta al dente",
        instruction:
          "Cook pasta 1 minute shy of package time. Reserve 2 cups pasta water. Drain — do not rinse.",
        minutes: 12,
        heatLevel: "high",
      },
      {
        stepNumber: 4,
        title: "Finish in the pan",
        instruction: `Toss pasta in sauce over medium heat, splashing pasta water until glossy and clinging. ${title} should coat a spoon — if it pools, reduce another minute.`,
        minutes: 4,
        heatLevel: "medium",
      },
      {
        stepNumber: 5,
        title: "Serve from the pot",
        instruction:
          "Fold in Parmesan off heat. Serve immediately — pasta waits for no one. Backup tray: cover lightly with foil at 200°F up to 15 minutes, add water if it tightens.",
        minutes: 3,
        heatLevel: "low",
      },
    ],
  };
}

function buildBurger(scale: number): { ingredients: Ing[]; steps: Step[] } {
  return {
    ingredients: [
      m("Ground beef (80/20)", mult(3, scale), "lb", "Main"),
      m("Potato buns", mult(8, scale), "count", "Buns"),
      m("American cheese", mult(12, scale), "slices", "Cheese"),
      m("Mayonnaise", mult(0.5, scale), "cup", "Sauce"),
      m("Yellow mustard", mult(3, scale), "tbsp", "Sauce"),
      m("Dill pickles", mult(2, scale), "cups", "Toppings"),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Form loose balls",
        instruction:
          "Mix sauce. Split buns. Form beef into loose 3 oz balls — tight patties steam instead of crisp.",
        minutes: 12,
        heatLevel: "",
      },
      {
        stepNumber: 2,
        title: "Smash for crust",
        instruction:
          "Heat griddle until smoking. Smash balls immediately; season with salt. Cook 2 minutes until edges lace brown. Flip, add cheese, melt 1 minute.",
        minutes: 8,
        heatLevel: "high",
      },
      {
        stepNumber: 3,
        title: "Build and run",
        instruction:
          "Toast buns in fat. Stack and serve within 2 minutes — smash burgers go soft fast. Run a sheet-tray line, not plated dinners.",
        minutes: 5,
        heatLevel: "",
      },
      {
        stepNumber: 4,
        title: "Batch the next round",
        instruction:
          "Wipe griddle between batches. Keep cooked burgers on a rack in a 200°F oven — max 10 minutes or edges soften.",
        minutes: 5,
        heatLevel: "low",
      },
    ],
  };
}

function buildTacos(def: GoldenRecipeDefinition, scale: number): { ingredients: Ing[]; steps: Step[] } {
  return {
    ingredients: [
      m(def.protein === "beef" ? "Flank or skirt steak" : "Boneless chicken thighs", mult(3, scale), "lb", "Main"),
      m("Flour or corn tortillas", mult(24, scale), "count", "Serve"),
      m("White onion", mult(2, scale), "large", "Toppings"),
      m("Fresh cilantro", mult(1, scale), "bunch", "Toppings"),
      m("Lime", mult(6, scale), "count", "Finish"),
      m("Cumin", mult(1, scale), "tbsp", "Seasoning"),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Prep toppings",
        instruction:
          "Dice onion, pick cilantro leaves, cut limes into wedges. Warm a sheet tray for holding cooked protein — tacos move fast once meat hits the board.",
        minutes: 10,
        heatLevel: "",
      },
      {
        stepNumber: 2,
        title: "Cook the filling",
        instruction: `Season protein with salt and cumin. Sear over medium-high until cooked through (chicken 165°F, steak 130°F then rest). Rest steak 8 minutes; slice thin against the grain.`,
        minutes: 18,
        heatLevel: "medium-high",
      },
      {
        stepNumber: 3,
        title: "Warm tortillas",
        instruction:
          "Char tortillas on a dry griddle 20 seconds per side or wrap in foil at 300°F 10 minutes. Stack in a towel so they stay pliable.",
        minutes: 10,
        heatLevel: "medium",
      },
      {
        stepNumber: 4,
        title: "Run the taco line",
        instruction: `${def.title}: protein, onion, cilantro, lime. Crew builds their own — fastest way to feed eight without cold plates.`,
        minutes: 5,
        heatLevel: "",
      },
    ],
  };
}

function buildBreakfast(def: GoldenRecipeDefinition, scale: number): { ingredients: Ing[]; steps: Step[] } {
  return {
    ingredients: [
      m("Large eggs", mult(18, scale), "count", "Main"),
      m("Buttermilk", mult(4, scale), "cups", "Batter"),
      m("All-purpose flour", mult(4, scale), "cups", "Batter"),
      m("Thick-cut bacon", mult(2, scale), "lb", "Side"),
      m("Maple syrup", mult(2, scale), "cups", "Serve"),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Mix batter gently",
        instruction:
          "Whisk dry and wet separately; combine until just mixed. Lumps are fine — over-mixing makes tough pancakes.",
        minutes: 10,
        heatLevel: "",
      },
      {
        stepNumber: 2,
        title: "Bake bacon, hold oven",
        instruction:
          "Bake bacon at 400°F on sheet pans 15–18 minutes until crisp. Set oven to 200°F to hold finished pancakes and eggs.",
        minutes: 18,
        heatLevel: "high",
      },
      {
        stepNumber: 3,
        title: "Griddle in batches",
        instruction:
          "Griddle at 375°F: pancakes 2–3 minutes per side until golden; eggs if serving scrambled in batches. Common mistake: heat too high — outside burns before center sets.",
        minutes: 20,
        heatLevel: "medium",
      },
      {
        stepNumber: 4,
        title: "Serve the line",
        instruction: `${def.title} does not wait — call the crew as batches finish. Syrup and butter on the table; backup tray in the 200°F oven.`,
        minutes: 5,
        heatLevel: "low",
      },
    ],
  };
}

function buildSheetPan(def: GoldenRecipeDefinition, scale: number): { ingredients: Ing[]; steps: Step[] } {
  return {
    ingredients: [
      m("Boneless chicken thighs", mult(3, scale), "lb", "Main"),
      m("Bell peppers, sliced", mult(4, scale), "count", "Veg"),
      m("Red onion, sliced", mult(2, scale), "large", "Veg"),
      m("Olive oil", mult(0.33, scale), "cup", "Aromatics"),
      m("Fajita seasoning", mult(3, scale), "tbsp", "Seasoning"),
      m("Lime", mult(4, scale), "count", "Finish"),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Heat oven and prep pans",
        instruction:
          "Preheat 425°F. Toss chicken and veg with oil and seasoning on two rimmed pans — single layer only or you'll steam.",
        minutes: 12,
        heatLevel: "",
      },
      {
        stepNumber: 2,
        title: "Roast until charred",
        instruction:
          "Roast 18–22 minutes, swap racks halfway, until chicken reads 165°F and peppers have blistered edges.",
        minutes: 22,
        heatLevel: "high",
      },
      {
        stepNumber: 3,
        title: "Serve family-style",
        instruction: `Pile ${def.title} onto trays. Hold backup pan foil-covered at 200°F. Squeeze lime at the line if using.`,
        minutes: 5,
        heatLevel: "low",
      },
      {
        stepNumber: 4,
        title: "Batch the next pan",
        instruction:
          "While the crew eats, start a second batch on clean pans if you're feeding stragglers. Scrape burned bits — they smoke up the hall.",
        minutes: 10,
        heatLevel: "",
      },
    ],
  };
}

function buildBowl(def: GoldenRecipeDefinition, scale: number): { ingredients: Ing[]; steps: Step[] } {
  const hasBbq = /bbq/i.test(def.title);
  const proteinName = mainProteinLabel(def);
  const doneTemp = mainProteinDoneTemp(def);
  const vegName = def.protein === "vegetarian" ? "cherry tomatoes and cucumber" : "broccoli florets";
  return {
    ingredients: [
      m("Jasmine rice, uncooked", mult(3, scale), "cups", "Base"),
      m(proteinName.charAt(0).toUpperCase() + proteinName.slice(1), mult(2.5, scale), "lb", "Main"),
      m(def.protein === "vegetarian" ? "Cherry tomatoes, halved" : "Broccoli florets", mult(2, scale), def.protein === "vegetarian" ? "pints" : "lb", "Veg"),
      m(hasBbq ? "BBQ sauce" : "Soy sauce", mult(0.5, scale), "cup", "Sauce"),
      m("Sesame oil", mult(2, scale), "tbsp", "Sauce"),
      m("Red onion, sliced", mult(1, scale), "large", "Toppings"),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Cook rice",
        instruction:
          "Rinse rice until water runs clear. Cook 1:1.5 rice to water with salt; fluff and hold covered at 200°F.",
        minutes: 20,
        heatLevel: "medium",
      },
      {
        stepNumber: 2,
        title: `Cook ${proteinName} and vegetables`,
        instruction: `Sear ${proteinName} in batches over medium-high heat until browned and cooked through (${doneTemp}). Stir-fry ${vegName} 4–5 minutes in the same pan until bright with light char.`,
        minutes: 14,
        heatLevel: "medium-high",
      },
      {
        stepNumber: 3,
        title: "Warm the sauce",
        instruction: hasBbq
          ? "Warm BBQ sauce in a small pot over low heat — do not boil or it turns candy-sweet. Keep a ladle on the line."
          : "Whisk soy sauce and sesame oil; add a splash of rice water if it needs to loosen for drizzling.",
        minutes: 5,
        heatLevel: "low",
      },
      {
        stepNumber: 4,
        title: "Build the bowls",
        instruction: `Set out rice, ${proteinName}, vegetables, and sauce in separate pans. ${def.title} moves fastest when the crew builds bowls in one direction down the counter.`,
        minutes: 5,
        heatLevel: "",
      },
    ],
  };
}

function buildSandwich(def: GoldenRecipeDefinition, scale: number): { ingredients: Ing[]; steps: Step[] } {
  const isPork = def.protein === "pork";
  return {
    ingredients: [
      m(isPork ? "Pork shoulder" : "Ground beef", mult(4, scale), "lb", "Main"),
      m("Hoagie rolls", mult(8, scale), "count", "Buns"),
      m("Provolone slices", mult(12, scale), "count", "Cheese"),
      m("Marinara sauce", mult(2, scale), "cups", "Sauce"),
      m("Yellow onion", mult(1, scale), "large", "Aromatics"),
      m("Garlic cloves", mult(4, scale), "cloves", "Aromatics"),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Cook and sauce filling",
        instruction:
          "Slow-cook or simmer filling until shreddable (pork 203°F, meatballs cooked through). Simmer in sauce 15 minutes so flavor penetrates.",
        minutes: 30,
        heatLevel: "medium-low",
      },
      {
        stepNumber: 2,
        title: "Toast buns",
        instruction:
          "Toast split buns on a dry griddle until golden. Melt cheese on top if desired.",
        minutes: 6,
        heatLevel: "medium",
      },
      {
        stepNumber: 3,
        title: "Build the sandwich line",
        instruction: `${def.title} on sheet trays: bottom bun, meat, sauce, cheese, top bun. Serve immediately; hold wrapped sandwiches at 200°F up to 20 minutes.`,
        minutes: 8,
        heatLevel: "low",
      },
      {
        stepNumber: 4,
        title: "Hold for late calls",
        instruction:
          "Keep backup sandwiches foil-wrapped at 200°F. Slice hoagies in half for easier grabbing — crew eats with one hand when tones are quiet.",
        minutes: 5,
        heatLevel: "low",
      },
    ],
  };
}

function buildSoup(def: GoldenRecipeDefinition, scale: number): { ingredients: Ing[]; steps: Step[] } {
  return {
    ingredients: [
      m("Chicken thighs or beef stew meat", mult(3, scale), "lb", "Main"),
      m("Yellow onion", mult(2, scale), "large", "Aromatics"),
      m("Carrots, diced", mult(4, scale), "cups", "Veg"),
      m("Celery, diced", mult(3, scale), "cups", "Veg"),
      m("Chicken or beef broth", mult(8, scale), "cups", "Broth"),
      m("Pearl barley", mult(1, scale), "cup", "Main"),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Sear aromatics",
        instruction:
          "Brown meat in batches; remove. Sweat onion, carrot, celery in the same pot 8 minutes until edges soften.",
        minutes: 15,
        heatLevel: "medium",
      },
      {
        stepNumber: 2,
        title: "Simmer the pot",
        instruction:
          "Add broth, meat back, and barley or dumplings per recipe. Simmer gently 45–60 minutes until meat shreds easily and barley is tender.",
        minutes: 55,
        heatLevel: "medium-low",
      },
      {
        stepNumber: 3,
        title: "Skim and serve",
        instruction: `Skim fat if needed. ${def.title} tastes better after 20 minutes off heat — hold at 180°F for late shifts.`,
        minutes: 10,
        heatLevel: "low",
      },
    ],
  };
}

function buildSkillet(def: GoldenRecipeDefinition, scale: number): { ingredients: Ing[]; steps: Step[] } {
  const title = def.title;
  const proteinName = mainProteinLabel(def);
  const doneTemp = mainProteinDoneTemp(def);
  return {
    ingredients: [
      m(proteinName.charAt(0).toUpperCase() + proteinName.slice(1), mult(2.5, scale), "lb", "Main"),
      m("Unsalted butter", mult(6, scale), "tbsp", "Sauce"),
      m("Garlic cloves, minced", mult(6, scale), "cloves", "Sauce"),
      m("Soy sauce", mult(3, scale), "tbsp", "Sauce"),
      ...aromatics(scale).slice(0, 2),
    ],
    steps: [
      {
        stepNumber: 1,
        title: `Prep ${proteinName}`,
        instruction: `Pat ${proteinName} dry with paper towels. Mince garlic. Measure sauce ingredients — the skillet moves fast once heat is on.`,
        minutes: 10,
        heatLevel: "",
      },
      {
        stepNumber: 2,
        title: "Sear over high heat",
        instruction: `Heat a large skillet until just smoking. Sear ${proteinName} in batches until browned and cooked through (${doneTemp}). Do not crowd the pan.`,
        minutes: 10,
        heatLevel: "high",
      },
      {
        stepNumber: 3,
        title: "Finish sauce in pan",
        instruction: `Lower to medium. Add butter, garlic, and sauce; toss 1–2 minutes until glossy. ${title} should smell bright, not burnt garlic.`,
        minutes: 4,
        heatLevel: "medium",
      },
      {
        stepNumber: 4,
        title: "Serve immediately",
        instruction:
          "Serve from the skillet or transfer to warm trays. Backup: foil at 200°F up to 12 minutes — seafood toughens if held too long.",
        minutes: 3,
        heatLevel: "low",
      },
    ],
  };
}

function buildBake(def: GoldenRecipeDefinition, scale: number): { ingredients: Ing[]; steps: Step[] } {
  return {
    ingredients: [
      m("Large eggs", mult(12, scale), "count", "Main"),
      m("Breakfast sausage", mult(2, scale), "lb", "Main"),
      m("Shredded cheddar", mult(12, scale), "oz", "Cheese"),
      m("Half-and-half", mult(2, scale), "cups", "Egg mix"),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Brown sausage",
        instruction:
          "Cook sausage in a large oven-safe skillet until no pink remains. Drain excess fat — grease pools make soggy bakes.",
        minutes: 12,
        heatLevel: "medium-high",
      },
      {
        stepNumber: 2,
        title: "Whisk egg base",
        instruction:
          "Whisk eggs, half-and-half, salt, and pepper. Pour over sausage and cheese.",
        minutes: 5,
        heatLevel: "",
      },
      {
        stepNumber: 3,
        title: "Bake until set",
        instruction:
          "Bake at 375°F 25–35 minutes until center jiggles slightly then sets (160°F+ in center). Rest 10 minutes before cutting — cleaner squares for the crew.",
        minutes: 35,
        heatLevel: "medium",
      },
    ],
  };
}

function buildDip(scale: number): { ingredients: Ing[]; steps: Step[] } {
  return {
    ingredients: [
      m("Cooked chicken, shredded", mult(2, scale), "lb", "Main"),
      m("Cream cheese, softened", mult(16, scale), "oz", "Dip base"),
      m("Frank's hot sauce", mult(0.75, scale), "cup", "Dip"),
      m("Ranch dressing", mult(1, scale), "cup", "Dip"),
      m("Shredded cheddar", mult(8, scale), "oz", "Top"),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Fold the buffalo dip",
        instruction:
          "Mix cream cheese, hot sauce, ranch, and chicken until smooth. Spread in a buttered baking dish; top with cheddar.",
        minutes: 10,
        heatLevel: "",
      },
      {
        stepNumber: 2,
        title: "Bake until bubbling",
        instruction:
          "Bake at 375°F 20–25 minutes until edges bubble and center reaches 165°F. Rest 5 minutes — molten cheese burns tongues.",
        minutes: 25,
        heatLevel: "medium",
      },
      {
        stepNumber: 3,
        title: "Serve with chips",
        instruction:
          "Serve hot with chips and celery. Hold in a slow cooker on warm — do not reheat cold dip in microwave (greasy separation).",
        minutes: 5,
        heatLevel: "low",
      },
      {
        stepNumber: 4,
        title: "Refresh the dip",
        instruction:
          "Stir dip between waves of eaters. If skin forms on top, fold it in — add a splash of hot sauce if it tastes flat.",
        minutes: 3,
        heatLevel: "low",
      },
    ],
  };
}

function buildOnePot(def: GoldenRecipeDefinition, scale: number): { ingredients: Ing[]; steps: Step[] } {
  return {
    ingredients: [
      m("Andouille sausage", mult(1.5, scale), "lb", "Main"),
      m("Boneless chicken thighs", mult(1.5, scale), "lb", "Main"),
      m("Long-grain rice", mult(2, scale), "cups", "Main"),
      m("Crushed tomatoes", mult(1, scale), "can", "Sauce", "28 oz"),
      m("Chicken broth", mult(4, scale), "cups", "Broth"),
      m("Cajun seasoning", mult(3, scale), "tbsp", "Seasoning"),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Brown sausage and chicken",
        instruction:
          "In a large Dutch oven, brown sliced sausage and chicken over medium-high. Remove — fond is flavor.",
        minutes: 15,
        heatLevel: "medium-high",
      },
      {
        stepNumber: 2,
        title: "Toast rice and simmer",
        instruction:
          "Sauté trinity vegetables, stir in rice 1 minute, add tomatoes, broth, and Cajun seasoning. Nestle meat back in. Simmer covered 25 minutes.",
        minutes: 30,
        heatLevel: "medium-low",
      },
      {
        stepNumber: 3,
        title: "Rest and fluff",
        instruction: `Off heat 10 minutes covered, then fluff. ${def.title} should be moist but not soupy — add broth if rice is chalky.`,
        minutes: 12,
        heatLevel: "",
      },
      {
        stepNumber: 4,
        title: "Serve from the pot",
        instruction:
          "Serve straight from the Dutch oven or transfer to a cambro on warm. Scrape the fond from the bottom — that's free flavor.",
        minutes: 5,
        heatLevel: "low",
      },
    ],
  };
}

function buildRoast(def: GoldenRecipeDefinition, scale: number): { ingredients: Ing[]; steps: Step[] } {
  return {
    ingredients: [
      m("Bone-in chicken thighs", mult(4, scale), "lb", "Main"),
      m("Fresh thyme", mult(3, scale), "tbsp", "Herbs"),
      m("Fresh rosemary", mult(2, scale), "tbsp", "Herbs"),
      m("Olive oil", mult(3, scale), "tbsp", "Roast"),
      m("Kosher salt", mult(2, scale), "tbsp", "Seasoning"),
      m("Black pepper", mult(1, scale), "tbsp", "Seasoning"),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Season and arrange",
        instruction:
          "Pat thighs dry; season under and over skin. Arrange skin-up on oiled sheet pans with space between pieces.",
        minutes: 10,
        heatLevel: "",
      },
      {
        stepNumber: 2,
        title: "Roast until crisp",
        instruction:
          "Roast at 425°F 35–42 minutes until skin crackles and thickest part reads 165°F. Juices run clear when pierced.",
        minutes: 40,
        heatLevel: "high",
      },
      {
        stepNumber: 3,
        title: "Rest and hold",
        instruction:
          "Rest 5 minutes. Hold on racks at 200°F — stacking steams skin soft.",
        minutes: 8,
        heatLevel: "low",
      },
      {
        stepNumber: 4,
        title: "Crisp skin under broiler",
        instruction:
          "If skin softened while holding, broil 1–2 minutes skin-up until crackly. Watch closely — thighs go from crisp to burnt fast.",
        minutes: 3,
        heatLevel: "high",
      },
    ],
  };
}

function buildSalad(def: GoldenRecipeDefinition, scale: number): { ingredients: Ing[]; steps: Step[] } {
  return {
    ingredients: [
      m("Chicken breasts", mult(2.5, scale), "lb", "Main"),
      m("Romaine hearts", mult(4, scale), "count", "Salad"),
      m("Parmesan, shaved", mult(4, scale), "oz", "Salad"),
      m("Caesar dressing", mult(1.5, scale), "cups", "Dressing"),
      m("Croutons", mult(3, scale), "cups", "Crunch"),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Cook chicken",
        instruction:
          "Season chicken; grill or sear to 165°F. Rest 5 minutes; slice into strips.",
        minutes: 18,
        heatLevel: "medium-high",
      },
      {
        stepNumber: 2,
        title: "Chop and toss",
        instruction:
          "Chop romaine dry — wet lettuce dilutes dressing. Toss with dressing, half the cheese, and croutons just before serving.",
        minutes: 8,
        heatLevel: "",
      },
      {
        stepNumber: 3,
        title: "Serve cold line",
        instruction: `${def.title} stays crisp only 10 minutes dressed — dress in batches for the crew.`,
        minutes: 5,
        heatLevel: "",
      },
    ],
  };
}

function buildPlated(def: GoldenRecipeDefinition, scale: number): { ingredients: Ing[]; steps: Step[] } {
  const title = def.title;
  const proteinName = mainProteinLabel(def);
  const doneTemp = mainProteinDoneTemp(def);
  return {
    ingredients: [
      m(proteinName.charAt(0).toUpperCase() + proteinName.slice(1), mult(3, scale), "lb", "Main"),
      m("Yellow onion", mult(2, scale), "large", "Aromatics"),
      m("Garlic cloves", mult(5, scale), "cloves", "Aromatics"),
      m("Crushed tomatoes or broth", mult(2, scale), "cans", "Sauce"),
      ...aromatics(scale).slice(3, 5),
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Prep components",
        instruction: `Dice vegetables; measure sauce ingredients. ${title} moves smoother when everything is on the counter before the burner goes on.`,
        minutes: 15,
        heatLevel: "",
      },
      {
        stepNumber: 2,
        title: `Brown ${proteinName}`,
        instruction: `Brown ${proteinName} over medium-high heat in batches until deeply colored, then finish in sauce or the oven until ${doneTemp}. Watch for color and spring-back, not the clock alone.`,
        minutes: 25,
        heatLevel: "medium-high",
      },
      {
        stepNumber: 3,
        title: "Reduce and season",
        instruction:
          "Simmer sauce until it coats a spoon. Taste for salt and acid — add a splash of vinegar or lemon if flat.",
        minutes: 12,
        heatLevel: "medium",
      },
      {
        stepNumber: 4,
        title: "Plate for the hall",
        instruction:
          "Serve on sheet trays for family-style or portioned plates. Hold backup at 200°F; cover lightly with foil so skins stay crisp where applicable.",
        minutes: 5,
        heatLevel: "low",
      },
    ],
  };
}

/** Slug-specific hand packs only — does not fall back to class blueprints. */
export function resolveExplicitSlugInstructionPack(
  def: GoldenRecipeDefinition,
  crewSize: number,
): { ingredients: Ing[]; steps: Step[] } | null {
  return slugPack(def, crewSize / 8);
}

export function resolveSlugInstructionPack(
  def: GoldenRecipeDefinition,
  crewSize: number,
): { ingredients: Ing[]; steps: Step[] } | null {
  const scale = crewSize / 8;
  return slugPack(def, scale) ?? buildLegacySlugBlueprint(def, scale);
}

export function buildEditorialInstructions(
  def: GoldenRecipeDefinition,
  crewSize: number,
): { ingredients: Ing[]; steps: Step[] } {
  const scale = crewSize / 8;

  const slug = slugPack(def, scale);
  if (slug) return slug;

  const legacy = buildLegacySlugBlueprint(def, scale);
  if (legacy) return legacy;

  const cls = inferRecipeInstructionClass(def);
  return buildForClass(cls, def, scale);
}

/** @deprecated name — use buildEditorialInstructions */
export const buildEditorialBlueprint = buildEditorialInstructions;
