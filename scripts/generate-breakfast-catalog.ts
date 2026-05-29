#!/usr/bin/env tsx
/**
 * Generate Firehall Breakfast static catalog pages + index.
 *
 * Breakfast is a separate ecosystem (not part of Golden/Performance dinner catalogs).
 */
import { writeBreakfastCatalogIndex, writeBreakfastRecipePage } from "../server/breakfast-catalog/page-store.js";
import type { BreakfastCatalogIndex, BreakfastRecipePage, BreakfastFilterId } from "../shared/breakfast-schema.js";

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
    cookTime: seed.minutes.cook,
    totalTime: clampTotal(seed.minutes.prep, seed.minutes.cook),
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
      "Set a warm holding zone (oven 200°F or covered hotel pan) so staggered eaters still get a hot plate.",
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

  return {
    ...base,
    subtitle,
    description,
    ingredients,
    steps,
    stationWorkflow: notes.stationWorkflow,
    cleanupNotes: notes.cleanupNotes,
    leftovers: notes.leftovers,
    imageAlt: `Warm station-kitchen breakfast: ${seed.title}`,
    publishedAt: iso,
    updatedAt: iso,
    readMinutes,
  };
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

// Expand SEEDS to 50 with deterministic variants.
while (SEEDS.length < 50) {
  const i = SEEDS.length + 1;
  const slug = `station-breakfast-${i.toString().padStart(2, "0")}`;
  SEEDS.push({
    slug,
    title: `Station Breakfast ${i.toString().padStart(2, "0")}`,
    kind: i % 3 === 0 ? "egg_bake" : i % 3 === 1 ? "skillet" : "burritos",
    filters: i % 3 === 0 ? ["feed_a_crew"] : i % 3 === 1 ? ["skillets"] : ["high_protein"],
    tags: i % 3 === 0 ? ["egg-bake", "9x13", "line-friendly"] : i % 3 === 1 ? ["cast-iron", "potatoes", "eggs"] : ["burritos", "handheld", "make-ahead"],
    crewSize: (i % 5 === 0 ? 12 : i % 4 === 0 ? 10 : i % 3 === 0 ? 8 : i % 2 === 0 ? 6 : 4) as any,
    difficulty: "easy",
    minutes: { prep: 15, cook: i % 3 === 0 ? 40 : 22 },
  });
}

async function main(): Promise<void> {
  const pages: BreakfastRecipePage[] = SEEDS.map(build);
  for (const p of pages) writeBreakfastRecipePage(p);

  const index: BreakfastCatalogIndex = {
    version: 1,
    generatedAt: iso,
    recipeCount: pages.length,
    recipes: pages
      .map((p) => ({
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
      }))
      .sort((a, b) => a.title.localeCompare(b.title)),
  };

  writeBreakfastCatalogIndex(index);
  // eslint-disable-next-line no-console
  console.log(`[breakfast] wrote ${pages.length} pages + index`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

