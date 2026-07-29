#!/usr/bin/env tsx
/**
 * Generate Firehall Breakfast static catalog pages + index.
 * Replaces placeholder station-breakfast-* entries with editorial recipes.
 */
import { writeBreakfastCatalogIndex, writeBreakfastRecipePage, writeBreakfastPerformanceIndex } from "../server/breakfast-catalog/page-store.js";
import type { BreakfastCatalogIndex, BreakfastRecipePage, BreakfastFilterId } from "../shared/breakfast-schema.js";
import type { BreakfastRecipePageDraft } from "../shared/breakfast-expansion/new-breakfast-pages.js";
import { breakfastRecipePageSchema } from "../shared/breakfast-schema.js";
import { NEW_BREAKFAST_PAGES } from "../shared/breakfast-expansion/new-breakfast-pages.js";
import { BATCH_25_BREAKFAST_PAGES } from "../shared/breakfast-expansion/batch-25-breakfast-pages.js";
import { BATCH_A_BREAKFAST_PAGES } from "../shared/breakfast-expansion/batch-a-breakfast-pages.js";
import { BATCH_WAVE1_BREAKFAST_PAGES } from "../shared/breakfast-expansion/batch-wave1-breakfast-pages.js";
import { calculateNutritionFromIngredients } from "../shared/nutrition/calculate.js";
import { PHASE5_REMOVED_SLUGS } from "../shared/catalog-consolidation/phase5-redirects.js";
import { buildFirehallHeroImageAlt } from "../shared/curated-image-governance/firehall-hero-alt.js";
import { getBreakfastGovernanceMap } from "../shared/breakfast-catalog/governance.js";
import { isPerformanceBreakfastSlug } from "../shared/breakfast-catalog/governance-types.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Kind =
  | "burritos"
  | "tacos"
  | "skillet"
  | "egg_bake"
  | "sheet_pan_hash"
  | "sandwich_tray"
  | "breakfast_sandwich"
  | "pancake_tray"
  | "pancakes"
  | "french_toast_bake"
  | "oats_pot"
  | "yogurt_parfaits"
  | "bbq_hash"
  | "steak_eggs"
  | "salmon_bagels"
  | "breakfast_pizza"
  | "quiche_slab"
  | "breakfast_rice"
  | "breakfast_fried_rice";

type Seed = {
  slug: string;
  title: string;
  kind: Kind;
  filters: BreakfastFilterId[];
  tags: string[];
  crewSize: 4 | 6 | 8 | 10 | 12;
  difficulty: BreakfastRecipePage["difficulty"];
  minutes: { prep: number; cook: number };
};

const now = new Date();
const iso = now.toISOString();
const HERO = (slug: string) => `/images/breakfast/${slug}.jpg`;
const THUMB = (slug: string) => `/images/thumbs/breakfast/${slug}.jpg`;

function clampTotal(prep: number, cook: number): number {
  return Math.max(5, Math.min(300, prep + cook));
}

function pageBase(seed: Seed): Omit<
  BreakfastRecipePage,
  | "subtitle"
  | "description"
  | "ingredients"
  | "steps"
  | "stationWorkflow"
  | "cleanupNotes"
  | "leftovers"
  | "imageAlt"
  | "publishedAt"
  | "updatedAt"
  | "readMinutes"
> {
  return {
    slug: seed.slug,
    title: seed.title,
    filters: seed.filters,
    tags: seed.tags,
    crewSize: seed.crewSize,
    baseServings: seed.crewSize,
    prepTime: seed.minutes.prep,
    cookTime: Math.max(5, seed.minutes.cook),
    totalTime: clampTotal(seed.minutes.prep, Math.max(5, seed.minutes.cook)),
    difficulty: seed.difficulty,
    heroImage: HERO(seed.slug),
    thumbImage: THUMB(seed.slug),
    seoTitle: `${seed.title} | Firehall Breakfast`,
  };
}

function commonStationNotes(): { stationWorkflow: string[]; cleanupNotes: string[]; leftovers: string[] } {
  return {
    stationWorkflow: [
      "Assign one cook to the hot surface and one to assembly. Keep the line moving; don’t crowd the griddle.",
      "Set a warm holding zone (oven at 200°F, food covered) so staggered eaters still get a hot plate.",
      "Run a quick call-proof check: anything crispy stays uncovered; anything soft stays covered.",
    ],
    cleanupNotes: [
      "While plates are served, scrape the griddle/pan and wipe with a damp towel (use tongs + folded towel).",
      "Soak the mixing bowl and sheet pan immediately—breakfast starch sets fast when it cools.",
    ],
    leftovers: [
      "Cool fast: spread on a sheet pan 10 minutes, then portion into containers so it doesn’t sweat.",
      "Reheat rule: eggs reheat best covered at 50% power or low oven heat; don’t nuke on high.",
    ],
  };
}

function build(seed: Seed): BreakfastRecipePage {
  const base = pageBase(seed);
  const notes = commonStationNotes();

  const subtitle =
    seed.kind === "burritos"
      ? "Big-batch burritos that hold on the line and reheat clean."
      : seed.kind === "egg_bake"
        ? "A crew-sized bake that feeds staggered eaters without turning rubbery."
        : seed.kind === "skillet"
          ? "Cast-iron breakfast built for crispy edges and fast cleanup."
          : seed.kind === "breakfast_sandwich"
            ? "Station sandwiches with real structure—no soggy bottoms."
            : "A practical station breakfast that scales from 4 to 12.";

  const description =
    seed.kind === "yogurt_parfaits"
      ? "For mornings when the crew wants fast protein without firing up the stove. These parfaits use sturdy add-ins that stay crisp, and a build order that prevents a sad, watery bowl."
      : seed.kind === "oats_pot"
        ? "A single pot of oats that tastes like a real breakfast, not diet culture. We finish with salt, butter, and a sensible topping bar so everyone can customize without slowing the line."
        : "Breakfast at the station has to survive interruptions. This recipe is written for real timing, clear heat cues, and a workflow that keeps food hot while the board gets loud.";

  const ingredients: BreakfastRecipePage["ingredients"] = [];
  const steps: BreakfastRecipePage["steps"] = [];

  const add = (i: BreakfastRecipePage["ingredients"][number]) => ingredients.push(i);
  const step = (s: BreakfastRecipePage["steps"][number]) => steps.push(s);

  // Shared basics (scaled textually; we keep quantities readable for 4–12).
  const eggCount = seed.crewSize <= 6 ? "10" : seed.crewSize <= 10 ? "14" : "18";
  const potato = seed.crewSize <= 6 ? "2.5 lb" : seed.crewSize <= 10 ? "3.5 lb" : "4.5 lb";

  switch (seed.kind) {
    case "burritos": {
      add({ group: "Eggs", quantity: eggCount, name: "large eggs", notes: "whisked with a pinch of salt" });
      add({ group: "Eggs", quantity: seed.crewSize >= 10 ? "2 cups" : "1 1/2 cups", name: "shredded cheddar or pepper jack" });
      add({ group: "Fillings", quantity: potato, name: "frozen hash browns", notes: "or diced par-cooked potatoes" });
      add({ group: "Fillings", quantity: seed.crewSize >= 10 ? "2 lb" : "1 1/2 lb", name: "breakfast sausage or chorizo", notes: "browned and drained" });
      add({ group: "Fillings", quantity: "1", name: "yellow onion", notes: "diced" });
      add({ group: "Fillings", quantity: "1–2", name: "bell peppers", notes: "diced" });
      add({ group: "Build", quantity: seed.crewSize >= 10 ? "16" : "12", name: "10-inch flour tortillas" });
      add({ group: "Build", quantity: "1 cup", name: "salsa or pico de gallo" });
      add({ group: "Build", quantity: "1", name: "hot sauce", optional: true });

      step({ stepNumber: 1, title: "Crisp the potatoes", minutes: 12, instruction: "Heat a large skillet or griddle over medium-high. Add hash browns in an even layer; press with a spatula. Let them sit until browned, flip in sections, and season with salt and pepper. Move to a warm tray." });
      step({ stepNumber: 2, title: "Brown the meat + veg", minutes: 10, instruction: "In the same pan, brown sausage/chorizo. Add onion and peppers; cook until softened. Drain excess fat if needed so burritos don’t get greasy." });
      step({ stepNumber: 3, title: "Soft-scramble the eggs", minutes: 6, instruction: "Lower heat to medium. Add a touch of butter, then the eggs. Stir gently until just set (slightly glossy). Fold in cheese off heat so it melts without overcooking." });
      step({ stepNumber: 4, title: "Build and wrap for the line", minutes: 10, instruction: "Warm tortillas briefly. Add potatoes, meat/veg, eggs, and a spoon of salsa. Roll tight: fold sides, then roll forward. Hold wrapped burritos seam-side down on a warm sheet pan." });
      step({ stepNumber: 5, title: "Serve + hold", minutes: 0, instruction: "Keep burritos warm in a 200°F oven (uncovered for crispy tortillas; covered for softer). If you’re feeding in waves, build half, serve, then build the rest." });
      break;
    }
    case "skillet": {
      add({ quantity: potato, name: "Yukon gold potatoes", notes: "diced 1/2-inch" });
      add({ quantity: eggCount, name: "large eggs" });
      add({ quantity: "1 1/2 lb", name: "breakfast sausage or diced ham", notes: "or leftover brisket" });
      add({ quantity: "1", name: "onion", notes: "diced" });
      add({ quantity: "3", name: "garlic cloves", notes: "minced" });
      add({ quantity: "1–2 cups", name: "shredded cheese", notes: "cheddar blend" });
      add({ quantity: "2 tbsp", name: "butter", optional: true });

      step({ stepNumber: 1, title: "Par-cook potatoes", minutes: 8, instruction: "Microwave diced potatoes with a splash of water in a covered bowl until just tender (they should still hold shape). This cuts skillet time and saves the crew." });
      step({ stepNumber: 2, title: "Build the crispy base", minutes: 12, instruction: "Heat cast iron over medium-high with oil. Add potatoes in a single layer; don’t stir for 3–4 minutes so you get crust. Toss, then add onion and meat. Cook until browned." });
      step({ stepNumber: 3, title: "Season + make wells", minutes: 3, instruction: "Add garlic, salt, pepper, and any spice tag you like (paprika/Chile). Make shallow wells for the eggs." });
      step({ stepNumber: 4, title: "Eggs on top", minutes: 6, instruction: "Crack eggs into wells. Cover the skillet (lid or sheet pan) until whites set and yolks are where you want them. Finish with cheese; cover 60 seconds to melt." });
      break;
    }
    case "egg_bake": {
      add({ quantity: eggCount, name: "large eggs" });
      add({ quantity: seed.crewSize >= 10 ? "3 cups" : "2 cups", name: "whole milk", notes: "or half-and-half for richer" });
      add({ quantity: seed.crewSize >= 10 ? "2 lb" : "1 1/2 lb", name: "turkey sausage or lean pork sausage", notes: "browned" });
      add({ quantity: "1", name: "onion", notes: "diced" });
      add({ quantity: "8–10 oz", name: "baby spinach", notes: "or chopped kale, sautéed and squeezed dry" });
      add({ quantity: seed.crewSize >= 10 ? "3 cups" : "2 cups", name: "shredded cheese", notes: "cheddar + mozzarella works well" });
      add({ quantity: "1", name: "loaf day-old bread", notes: "cubed (optional), turns it into a strata", optional: true });

      step({ stepNumber: 1, title: "Heat the oven", tempF: 375, minutes: 0, instruction: "Heat oven to 375°F. Grease a deep 9x13 pan. If using bread cubes, toast them 6–8 minutes so the bake doesn’t go soggy." });
      step({ stepNumber: 2, title: "Build the pan", minutes: 10, instruction: "Spread sausage, onion, and spinach in the pan. Add half the cheese. (If using bread cubes, fold them through now.)" });
      step({ stepNumber: 3, title: "Egg mix", minutes: 5, instruction: "Whisk eggs with milk, salt, pepper, and a pinch of paprika. Pour evenly. Top with remaining cheese." });
      step({ stepNumber: 4, title: "Bake to set", tempF: 375, minutes: 35, instruction: "Bake until the center is set and the edges are browned. If it jiggles like loose custard, give it 5 more minutes." });
      step({ stepNumber: 5, title: "Rest for clean slices", minutes: 10, instruction: "Rest 10 minutes so slices hold for the line. Cut into squares; hold warm covered." });
      break;
    }
    case "sheet_pan_hash": {
      add({ quantity: potato, name: "Yukon gold potatoes", notes: "diced 1/2-inch" });
      add({ quantity: eggCount, name: "large eggs" });
      add({ quantity: seed.crewSize >= 10 ? "2 lb" : "1 1/2 lb", name: "breakfast sausage", notes: "browned and crumbled" });
      add({ quantity: "1", name: "yellow onion", notes: "diced" });
      add({ quantity: "1–2", name: "bell peppers", notes: "diced" });
      add({ quantity: "2 tbsp", name: "olive oil or bacon fat" });
      add({ quantity: "1–2 cups", name: "shredded cheddar", notes: "optional finish" });

      step({ stepNumber: 1, title: "Heat the oven", tempF: 425, minutes: 0, instruction: "Heat oven to 425°F. Line a full sheet pan with parchment or foil for easy cleanup." });
      step({ stepNumber: 2, title: "Roast the hash base", minutes: 18, instruction: "Toss potatoes with oil, salt, and pepper. Spread in one layer and roast 15 minutes. Add sausage, onion, and peppers; roast until potatoes are browned and sausage is hot." });
      step({ stepNumber: 3, title: "Make wells for eggs", minutes: 3, instruction: "Pull pan from oven. Make shallow wells across the hash. Crack eggs into wells and season lightly." });
      step({ stepNumber: 4, title: "Bake until eggs set", tempF: 425, minutes: 10, instruction: "Return to oven until whites are set and yolks are still slightly soft (or longer for firm yolks). Finish with cheese if using." });
      break;
    }
    case "tacos": {
      add({ quantity: eggCount, name: "large eggs", notes: "whisked with salt" });
      add({ quantity: seed.crewSize >= 8 ? "16" : "12", name: "6-inch corn or flour tortillas" });
      add({ quantity: "1 cup", name: "shredded cheese", notes: "cheddar or pepper jack" });
      add({ quantity: "1 cup", name: "salsa or pico de gallo" });
      add({ quantity: "1", name: "avocado", notes: "sliced", optional: true });
      add({ quantity: "1/2 cup", name: "sour cream or crema", optional: true });
      add({ quantity: "1", name: "hot sauce", optional: true });

      step({ stepNumber: 1, title: "Warm tortillas", minutes: 3, instruction: "Warm tortillas in a dry skillet or wrapped in foil in a 200°F oven so they stay pliable and don't crack when folded." });
      step({ stepNumber: 2, title: "Scramble the eggs", minutes: 6, instruction: "Scramble eggs over medium-low heat until just set and still glossy. Fold in cheese off heat." });
      step({ stepNumber: 3, title: "Build tacos for the line", minutes: 5, instruction: "Fill each tortilla with eggs, salsa, and optional avocado. Keep built tacos seam-side down on a warm tray." });
      step({ stepNumber: 4, title: "Serve immediately", minutes: 0, instruction: "Tacos don't hold well—serve in two waves if needed. Pass hot sauce and crema on the side." });
      break;
    }
    case "sandwich_tray":
    case "breakfast_sandwich": {
      add({ quantity: eggCount, name: "large eggs", notes: "for scrambling or fried" });
      add({ quantity: seed.crewSize >= 10 ? "16" : "12", name: "English muffins or brioche buns" });
      add({ quantity: seed.crewSize >= 10 ? "2 lb" : "1 1/2 lb", name: "breakfast sausage patties or links", notes: "cooked through" });
      add({ quantity: "2 cups", name: "sliced cheese", notes: "American or cheddar" });
      add({ quantity: "4 tbsp", name: "butter", notes: "for toasting buns" });
      add({ quantity: "1", name: "hot sauce", optional: true });

      step({ stepNumber: 1, title: "Toast the buns", minutes: 6, instruction: "Butter split buns and toast on a griddle or sheet pan under the broiler until golden. Hold warm on a tray." });
      step({ stepNumber: 2, title: "Cook sausage + eggs", minutes: 12, instruction: "Cook sausage until browned and 165°F internal. Scramble or fry eggs in batches—keep finished eggs covered on a warm tray." });
      step({ stepNumber: 3, title: "Assemble sandwiches", minutes: 8, instruction: "Build sausage, egg, and cheese on toasted buns. Wrap in foil for the line if serving in waves." });
      step({ stepNumber: 4, title: "Hold and serve", minutes: 0, instruction: "Hold wrapped sandwiches in a 200°F oven up to 20 minutes. Serve with hot sauce on the side." });
      break;
    }
    case "bbq_hash": {
      add({ quantity: potato, name: "Yukon gold potatoes", notes: "diced" });
      add({ quantity: eggCount, name: "large eggs" });
      add({ quantity: seed.crewSize >= 10 ? "2 lb" : "1 1/2 lb", name: "pulled pork or brisket", notes: "warm leftover BBQ" });
      add({ quantity: "1/2 cup", name: "BBQ sauce", notes: "your hall favorite" });
      add({ quantity: "1", name: "yellow onion", notes: "diced" });
      add({ quantity: "2 tbsp", name: "vegetable oil" });
      add({ quantity: "1 cup", name: "shredded cheddar", optional: true });

      step({ stepNumber: 1, title: "Crisp the potatoes", minutes: 14, instruction: "Heat cast iron over medium-high with oil. Add potatoes in one layer; let them sit 4 minutes before tossing for crust. Season with salt and pepper." });
      step({ stepNumber: 2, title: "Warm the BBQ", minutes: 5, instruction: "Fold in onion and pulled pork with a splash of BBQ sauce. Heat through without drying the meat." });
      step({ stepNumber: 3, title: "Eggs on top", minutes: 6, instruction: "Make wells in the hash. Crack eggs in, cover until whites set. Finish with cheese if using." });
      step({ stepNumber: 4, title: "Serve with extra sauce", minutes: 0, instruction: "Serve straight from the skillet with extra BBQ sauce on the side for the crew." });
      break;
    }
    case "steak_eggs": {
      add({ quantity: potato, name: "Yukon gold potatoes", notes: "diced 1/2-inch" });
      add({ quantity: eggCount, name: "large eggs" });
      add({ quantity: seed.crewSize >= 10 ? "3 lb" : "2 lb", name: "sirloin or flat iron steak", notes: "cut in bite-size pieces" });
      add({ quantity: "1", name: "yellow onion", notes: "diced" });
      add({ quantity: "3", name: "garlic cloves", notes: "minced" });
      add({ quantity: "2 tbsp", name: "butter" });
      add({ quantity: "1–2 cups", name: "shredded cheddar" });

      step({ stepNumber: 1, title: "Sear the steak", minutes: 8, instruction: "Pat steak dry; season with salt and pepper. Sear in hot cast iron in batches until browned but still pink inside. Rest on a tray." });
      step({ stepNumber: 2, title: "Crisp the hash", minutes: 12, instruction: "In the same pan, cook potatoes until golden. Add onion and garlic; toss until softened." });
      step({ stepNumber: 3, title: "Combine and make wells", minutes: 4, instruction: "Return steak and any juices to the hash. Make wells; crack eggs in. Cover until whites set." });
      step({ stepNumber: 4, title: "Finish with cheese", minutes: 2, instruction: "Top with cheese; cover 60 seconds to melt. Serve from the skillet for the crew." });
      break;
    }
    case "pancake_tray":
    case "pancakes": {
      add({ quantity: seed.crewSize >= 10 ? "8 cups" : "6 cups", name: "complete pancake mix", notes: "or from-scratch dry mix" });
      add({ quantity: seed.crewSize >= 10 ? "6 cups" : "4 cups", name: "whole milk" });
      add({ quantity: "4", name: "large eggs" });
      add({ quantity: "1/4 cup", name: "melted butter", notes: "plus more for the griddle" });
      add({ quantity: "2 tbsp", name: "sugar", optional: true });
      add({ quantity: "1 tsp", name: "vanilla extract", optional: true });
      add({ quantity: "1 cup", name: "Greek yogurt or protein powder", notes: "for protein tray version", optional: seed.kind === "pancake_tray" });

      step({ stepNumber: 1, title: "Mix the batter", minutes: 5, instruction: "Whisk mix, milk, eggs, and melted butter until smooth. Rest 5 minutes so bubbles settle—don't over-mix." });
      step({ stepNumber: 2, title: "Heat the griddle", minutes: 3, instruction: "Heat griddle or large skillet to medium. Lightly butter between batches." });
      step({ stepNumber: 3, title: "Cook in batches", minutes: seed.minutes.cook - 5, instruction: "Pour 1/3-cup scoops. Flip when bubbles set at the edges and bottoms are golden. Hold finished pancakes on a sheet pan in a 200°F oven." });
      step({ stepNumber: 4, title: "Serve the stack", minutes: 0, instruction: "Serve with syrup and butter. For the protein tray, add yogurt on the side." });
      break;
    }
    case "french_toast_bake": {
      add({ quantity: "2", name: "loaves day-old bread", notes: "cubed" });
      add({ quantity: eggCount, name: "large eggs" });
      add({ quantity: seed.crewSize >= 10 ? "4 cups" : "3 cups", name: "whole milk" });
      add({ quantity: "1/2 cup", name: "brown sugar" });
      add({ quantity: "2 tsp", name: "cinnamon" });
      add({ quantity: "1 tsp", name: "vanilla extract" });
      add({ quantity: "1/4 cup", name: "butter", notes: "melted" });

      step({ stepNumber: 1, title: "Heat the oven", tempF: 375, minutes: 0, instruction: "Heat oven to 375°F. Grease a deep 9x13 pan." });
      step({ stepNumber: 2, title: "Build the pan", minutes: 10, instruction: "Spread bread cubes evenly. Whisk eggs, milk, sugar, cinnamon, vanilla, and melted butter; pour over bread. Press gently so all cubes soak." });
      step({ stepNumber: 3, title: "Bake until set", tempF: 375, minutes: 35, instruction: "Bake until the center is set and the top is golden. If the center jiggles like loose custard, bake 5 more minutes." });
      step({ stepNumber: 4, title: "Rest and slice", minutes: 10, instruction: "Rest 10 minutes for clean squares. Serve with maple syrup." });
      break;
    }
    case "oats_pot": {
      add({ quantity: seed.crewSize >= 10 ? "6 cups" : "4 cups", name: "rolled oats" });
      add({ quantity: seed.crewSize >= 10 ? "12 cups" : "8 cups", name: "water or broth", notes: "half broth for savory" });
      add({ quantity: "2 tsp", name: "kosher salt" });
      add({ quantity: "3 tbsp", name: "butter" });
      add({ quantity: "1 cup", name: "shredded cheddar", notes: "topping bar" });
      add({ quantity: "6", name: "soft-cooked eggs", notes: "for topping", optional: true });
      add({ quantity: "1/2 cup", name: "green onions", notes: "sliced", optional: true });

      step({ stepNumber: 1, title: "Simmer the oats", minutes: 12, instruction: "Bring liquid and salt to a boil. Stir in oats; reduce to a simmer. Cook until creamy, stirring often so nothing sticks." });
      step({ stepNumber: 2, title: "Finish savory", minutes: 3, instruction: "Stir in butter. Taste and adjust salt. Keep covered on low while the crew builds bowls." });
      step({ stepNumber: 3, title: "Set the topping bar", minutes: 5, instruction: "Lay out cheese, green onions, hot sauce, and soft eggs. Let everyone build without crowding the pot." });
      step({ stepNumber: 4, title: "Serve and hold", minutes: 0, instruction: "Hold the pot on the lowest heat with a splash of water if it thickens. Refill toppings as needed." });
      break;
    }
    case "yogurt_parfaits": {
      add({ quantity: seed.crewSize >= 8 ? "64 oz" : "48 oz", name: "Greek yogurt", notes: "plain, 2% or full-fat" });
      add({ quantity: seed.crewSize >= 8 ? "6 cups" : "4 cups", name: "granola", notes: "sturdy, not dust-fine" });
      add({ quantity: "4 cups", name: "mixed berries", notes: "fresh or thawed" });
      add({ quantity: "1/2 cup", name: "honey or maple syrup" });
      add({ quantity: "1/2 cup", name: "chia seeds or ground flax", notes: "optional protein boost" });
      add({ quantity: "1 tsp", name: "vanilla extract", optional: true });

      step({ stepNumber: 1, title: "Prep the line", minutes: 5, instruction: "Set yogurt, granola, berries, and honey in separate bowls so the crew can build without cross-contamination." });
      step({ stepNumber: 2, title: "Build order", minutes: 8, instruction: "Layer yogurt, then granola, then berries. Drizzle honey last so granola stays crisp until eaten." });
      step({ stepNumber: 3, title: "Hold briefly", minutes: 0, instruction: "Parfaits hold 15–20 minutes covered in the fridge. Don't assemble more than one wave ahead." });
      step({ stepNumber: 4, title: "Serve cold", minutes: 0, instruction: "Pass spoons and napkins—this is a fast, no-stove breakfast when the hall is busy." });
      break;
    }
    default: {
      // For less common kinds, keep a solid, non-fluffy baseline.
      add({ quantity: eggCount, name: "large eggs" });
      add({ quantity: "1 1/2 tsp", name: "kosher salt", notes: "start low; adjust at the end" });
      add({ quantity: "2 tbsp", name: "butter or oil" });
      add({ quantity: "1", name: "black pepper", notes: "to taste" });

      step({ stepNumber: 1, title: "Get your station set", minutes: 5, instruction: "Set a warm holding zone (200°F oven). Lay out a tray for finished food, a tray for clean toast/tortillas, and a trash bowl so you’re not chasing scraps mid-cook." });
      step({ stepNumber: 2, title: "Cook the main", minutes: Math.max(10, seed.minutes.cook - 5), instruction: "Cook the main components over medium to medium-high heat. Keep things in a single layer for browning, and season in layers so the finished plate doesn’t taste flat." });
      step({ stepNumber: 3, title: "Eggs last", minutes: 6, instruction: "Cook eggs last so they stay tender. For scrambled: low heat and pull early. For fried: cover to set whites without blasting the yolk." });
      step({ stepNumber: 4, title: "Serve and hold", minutes: 0, instruction: "Serve immediately; hold the rest warm. If a call hits, cover soft items; keep crispy items uncovered so they don’t steam." });
      break;
    }
  }

  const readMinutes = Math.max(4, Math.min(14, Math.round((ingredients.length + steps.length) / 2)));

  return withBreakfastNutrition({
    ...base,
    subtitle,
    description,
    ingredients,
    steps,
    stationWorkflow: notes.stationWorkflow,
    cleanupNotes: notes.cleanupNotes,
    leftovers: notes.leftovers,
    imageAlt: buildFirehallHeroImageAlt(seed.title, [`Main: ${seed.title}`, "Sides: eggs, toast, and fruit on the line"]),
    publishedAt: iso,
    updatedAt: iso,
    readMinutes,
  });
}

function withBreakfastNutrition(page: BreakfastRecipePageDraft): BreakfastRecipePage {
  const record = calculateNutritionFromIngredients(page.ingredients, {
    servings: page.baseServings || page.crewSize,
    mealType: "breakfast",
    mealPrepFriendly: page.tags.includes("make-ahead"),
    existing: page.nutrition
      ? {
          calories: page.nutrition.calories,
          protein: page.nutrition.protein,
          carbs: page.nutrition.carbs,
          fat: page.nutrition.fat,
        }
      : undefined,
  });

  return breakfastRecipePageSchema.parse({
    ...page,
    nutrition: {
      calories: record.calories,
      protein: record.protein,
      carbs: record.carbs,
      fat: record.fat,
      label: "per serving (hall portion)",
      source: record.source,
      filterFlags: record.filterFlags,
      badgeCandidates: record.badgeCandidates,
    },
  });
}

const SEEDS: Seed[] = [
  { slug: "hall-breakfast-burritos", title: "Hall Breakfast Burritos", kind: "burritos", filters: ["feed_a_crew", "high_protein"], tags: ["burritos", "make-ahead", "line-friendly", "cheddar"], crewSize: 10, difficulty: "easy", minutes: { prep: 15, cook: 20 } },
  { slug: "chorizo-breakfast-burritos", title: "Chorizo Breakfast Burritos", kind: "burritos", filters: ["feed_a_crew", "high_protein"], tags: ["burritos", "chorizo", "spicy", "handheld"], crewSize: 8, difficulty: "easy", minutes: { prep: 15, cook: 18 } },
  { slug: "turkey-sausage-burritos", title: "Turkey Sausage Breakfast Burritos", kind: "burritos", filters: ["healthy_breakfasts", "high_protein"], tags: ["burritos", "turkey", "make-ahead", "pepper-jack"], crewSize: 8, difficulty: "easy", minutes: { prep: 15, cook: 18 } },
  { slug: "bacon-hash-burritos", title: "Bacon Hash Burritos", kind: "burritos", filters: ["feed_a_crew"], tags: ["burritos", "bacon", "hash", "hot-sauce"], crewSize: 10, difficulty: "easy", minutes: { prep: 15, cook: 22 } },
  { slug: "veggie-egg-burritos", title: "Veggie Egg Burritos", kind: "burritos", filters: ["healthy_breakfasts", "feed_a_crew"], tags: ["burritos", "vegetarian", "peppers", "spinach"], crewSize: 8, difficulty: "easy", minutes: { prep: 18, cook: 16 } },

  { slug: "cast-iron-breakfast-skillet", title: "Cast Iron Breakfast Skillet", kind: "skillet", filters: ["skillets", "feed_a_crew"], tags: ["cast-iron", "potatoes", "sausage", "eggs"], crewSize: 8, difficulty: "easy", minutes: { prep: 15, cook: 22 } },
  { slug: "bacon-egg-hash-skillet", title: "Bacon Egg Hash Skillet", kind: "skillet", filters: ["skillets"], tags: ["bacon", "hash", "cast-iron", "eggs"], crewSize: 6, difficulty: "easy", minutes: { prep: 12, cook: 22 } },
  { slug: "ham-pepper-skillet", title: "Ham & Pepper Breakfast Skillet", kind: "skillet", filters: ["skillets", "quick_breakfasts"], tags: ["ham", "peppers", "eggs", "one-pan"], crewSize: 6, difficulty: "easy", minutes: { prep: 10, cook: 18 } },
  { slug: "steakhouse-hash-skillet", title: "Steakhouse Hash Skillet", kind: "steak_eggs", filters: ["skillets", "high_protein"], tags: ["steak", "eggs", "potatoes", "cast-iron"], crewSize: 8, difficulty: "medium", minutes: { prep: 15, cook: 25 } },

  { slug: "turkey-sausage-egg-bake", title: "Turkey Sausage Egg Bake", kind: "egg_bake", filters: ["feed_a_crew", "healthy_breakfasts", "high_protein"], tags: ["egg-bake", "turkey", "spinach", "9x13"], crewSize: 12, difficulty: "easy", minutes: { prep: 20, cook: 40 } },
  { slug: "ham-cheddar-egg-bake", title: "Ham & Cheddar Egg Bake", kind: "egg_bake", filters: ["feed_a_crew", "high_protein"], tags: ["egg-bake", "ham", "cheddar", "9x13"], crewSize: 10, difficulty: "easy", minutes: { prep: 18, cook: 38 } },
  { slug: "southwest-egg-bake", title: "Southwest Egg Bake", kind: "egg_bake", filters: ["feed_a_crew", "high_protein"], tags: ["egg-bake", "peppers", "salsa", "pepper-jack"], crewSize: 10, difficulty: "easy", minutes: { prep: 20, cook: 38 } },

  // 50 total: fill remaining with a balanced mix; default builder keeps the content grounded.
  { slug: "sheet-pan-breakfast-hash", title: "Sheet Pan Breakfast Hash", kind: "sheet_pan_hash", filters: ["feed_a_crew"], tags: ["sheet-pan", "potatoes", "easy-cleanup", "eggs"], crewSize: 10, difficulty: "easy", minutes: { prep: 15, cook: 30 } },
  { slug: "quick-egg-tacos", title: "Quick Egg Tacos", kind: "tacos", filters: ["quick_breakfasts"], tags: ["tacos", "eggs", "handheld", "salsa"], crewSize: 6, difficulty: "easy", minutes: { prep: 10, cook: 12 } },
  { slug: "breakfast-sandwich-trays", title: "Breakfast Sandwich Trays", kind: "sandwich_tray", filters: ["feed_a_crew", "breakfast_sandwiches"], tags: ["sandwiches", "tray", "eggs", "cheddar"], crewSize: 10, difficulty: "easy", minutes: { prep: 15, cook: 18 } },
  { slug: "sausage-egg-cheese-sandwiches", title: "Sausage Egg & Cheese Sandwiches", kind: "breakfast_sandwich", filters: ["breakfast_sandwiches"], tags: ["sandwiches", "sausage", "eggs", "cheese"], crewSize: 8, difficulty: "easy", minutes: { prep: 12, cook: 15 } },
  { slug: "bbq-breakfast-hash", title: "BBQ Breakfast Hash", kind: "bbq_hash", filters: ["bbq_breakfast", "feed_a_crew"], tags: ["bbq", "hash", "cast-iron", "eggs"], crewSize: 8, difficulty: "medium", minutes: { prep: 15, cook: 28 } },
  { slug: "protein-pancake-tray", title: "Protein Pancake Tray", kind: "pancake_tray", filters: ["feed_a_crew", "high_protein"], tags: ["pancakes", "tray-bake", "make-ahead"], crewSize: 12, difficulty: "easy", minutes: { prep: 15, cook: 22 } },
  { slug: "crew-french-toast-bake", title: "Crew French Toast Bake", kind: "french_toast_bake", filters: ["feed_a_crew"], tags: ["french-toast", "bake", "make-ahead", "9x13"], crewSize: 12, difficulty: "easy", minutes: { prep: 20, cook: 40 } },
  { slug: "buttermilk-pancakes", title: "Buttermilk Pancakes for the Crew", kind: "pancakes", filters: ["feed_a_crew"], tags: ["pancakes", "griddle", "classic"], crewSize: 8, difficulty: "easy", minutes: { prep: 12, cook: 18 } },
  { slug: "big-pot-savory-oats", title: "Big-Pot Savory Oats", kind: "oats_pot", filters: ["healthy_breakfasts", "feed_a_crew"], tags: ["oats", "one-pot", "topping-bar"], crewSize: 10, difficulty: "easy", minutes: { prep: 10, cook: 18 } },
  { slug: "high-protein-parfaits", title: "High-Protein Yogurt Parfaits", kind: "yogurt_parfaits", filters: ["quick_breakfasts", "healthy_breakfasts", "high_protein"], tags: ["yogurt", "parfaits", "no-cook", "granola"], crewSize: 6, difficulty: "easy", minutes: { prep: 12, cook: 0 } },
];

/**
 * Looks up the original (pre-scale) ingredient list + base crew size for an algorithmically
 * generated breakfast recipe (one defined via SEEDS + build(), not a hand-authored expansion
 * page). Used by scripts/repair-breakfast-ingredient-units.ts to recompute correctly-scaled
 * quantities without duplicating the switch-case ingredient logic above.
 */
export function getAlgorithmicBreakfastSource(
  slug: string,
): { baseServings: number; ingredients: BreakfastRecipePage["ingredients"] } | null {
  const seed = SEEDS.find((s) => s.slug === slug);
  if (!seed) return null;
  const page = build(seed);
  return { baseServings: seed.crewSize, ingredients: page.ingredients };
}

async function main(): Promise<void> {
  const basePages: BreakfastRecipePage[] = SEEDS.filter((seed) => !PHASE5_REMOVED_SLUGS.has(seed.slug)).map(
    (seed) => build(seed),
  );
  const newSlugs = new Set([
    ...NEW_BREAKFAST_PAGES.map((p) => p.slug),
    ...BATCH_25_BREAKFAST_PAGES.map((p) => p.slug),
    ...BATCH_A_BREAKFAST_PAGES.map((p) => p.slug),
    ...BATCH_WAVE1_BREAKFAST_PAGES.map((p) => p.slug),
  ]);
  const merged = [
    ...basePages.filter((p) => !newSlugs.has(p.slug)),
    ...NEW_BREAKFAST_PAGES.map((p) => withBreakfastNutrition(p)),
    ...BATCH_25_BREAKFAST_PAGES.map((p) => withBreakfastNutrition(p)),
    ...BATCH_A_BREAKFAST_PAGES.map((p) => withBreakfastNutrition(p)),
    ...BATCH_WAVE1_BREAKFAST_PAGES.map((p) => withBreakfastNutrition(p)),
  ];

  const gov = getBreakfastGovernanceMap();
  const governed = merged.map((p) => {
    const g = gov[p.slug];
    if (!g) return p;
    return {
      ...p,
      description: g.description,
      subtitle: g.subtitle ?? p.subtitle,
      collectionTier: g.tier,
    };
  });

  for (const p of governed) writeBreakfastRecipePage(p);

  const primaryPages = governed.filter((p) => !isPerformanceBreakfastSlug(p.slug));
  const performancePages = governed.filter((p) => isPerformanceBreakfastSlug(p.slug));

  const indexEntry = (p: BreakfastRecipePage) => ({
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    description: p.description,
    filters: p.filters,
    tags: p.tags,
    totalTime: p.totalTime,
    heroImage: p.heroImage,
    thumbImage: p.thumbImage,
    publishedAt: p.publishedAt,
    collectionTier: p.collectionTier,
  });

  const index: BreakfastCatalogIndex = {
    version: 1,
    generatedAt: iso,
    recipeCount: primaryPages.length,
    collection: "primary",
    recipes: primaryPages.map(indexEntry).sort((a, b) => a.title.localeCompare(b.title)),
  };

  writeBreakfastCatalogIndex(index);
  writeBreakfastPerformanceIndex({
    version: 1,
    generatedAt: iso,
    recipeCount: performancePages.length,
    collection: "performance",
    recipes: performancePages.map(indexEntry).sort((a, b) => a.title.localeCompare(b.title)),
  });

  // Remove legacy placeholder pages no longer in the catalog.
  const pagesDir = path.join(process.cwd(), "client/public/catalog/breakfast/pages");
  if (fs.existsSync(pagesDir)) {
    const keep = new Set(governed.map((p) => `${p.slug}.json`));
    for (const file of fs.readdirSync(pagesDir)) {
      if (file.endsWith(".json") && !keep.has(file)) {
        fs.unlinkSync(path.join(pagesDir, file));
      }
    }
  }

  console.log(
    `[breakfast] wrote ${governed.length} pages — primary ${primaryPages.length}, performance ${performancePages.length} (${NEW_BREAKFAST_PAGES.length} expansion + ${BATCH_25_BREAKFAST_PAGES.length} batch-25 + ${BATCH_A_BREAKFAST_PAGES.length} batch-a + ${BATCH_WAVE1_BREAKFAST_PAGES.length} wave1)`,
  );
}

// Guarded so other scripts can import getAlgorithmicBreakfastSource() without triggering a
// full (destructive) catalog rewrite as a side effect of the import.
const isDirectRun = fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "");
if (isDirectRun) {
  main().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });
}

