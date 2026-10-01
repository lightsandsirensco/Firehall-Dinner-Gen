/**
 * Editorial guide: 10 Healthy Smoothies to Make at the Hall
 * Recipe bodies live in the fuel catalog; guide embeds reference the same source.
 */

import type { EditorialArticle } from "./content-schema.js";
import { SMOOTHIE_CATALOG_ITEMS } from "../fuel-catalog/smoothies/catalog-data.js";
import { smoothieCatalogToEmbedded } from "../fuel-catalog/smoothies/to-editorial.js";
import { SRC } from "./guide-sources.js";

const PUBLISHED = "2026-05-28T12:00:00.000Z";
const UPDATED = "2026-09-30T12:00:00.000Z";

const EMBEDDED_SMOOTHIES = SMOOTHIE_CATALOG_ITEMS.map(smoothieCatalogToEmbedded);

export const HEALTHY_HALL_SMOOTHIES_ARTICLE: EditorialArticle = {
  slug: "healthy-smoothies-at-the-hall",
  title: "10 Healthy Smoothies to Make at the Hall",
  subtitle:
    "Ten batch recipes built on frozen fruit, Greek yogurt and milk, with freezer packs, safe holding times and allergen notes for a shared blender.",
  seoTitle: "10 Healthy Smoothie Recipes and How to Batch Them",
  description:
    "Ten healthy smoothies for a fire station kitchen, with batch sizes, freezer packs, safe holding times and allergen tips for a shared blender.",
  topic: "nutrition_performance",
  pillar: "nutrition_performance",
  readMinutes: 12,
  publishedAt: PUBLISHED,
  updatedAt: UPDATED,
  keywords: [
    "healthy smoothies",
    "smoothies for firefighters",
    "high protein smoothies",
    "shift worker smoothies",
    "station blender recipes",
  ],
  heroImage: "/images/smoothies/mixed-berry-protein.webp",
  heroImageAlt: "Glass of mixed berry smoothie with fresh raspberries and blueberries on a dark plate",
  intro:
    "At a station, a smoothie does three jobs well: breakfast when there is no time to cook, something after training, and a stopgap when a call pushes dinner back. It does not replace a cooked crew dinner. The ten recipes below are written as batches of roughly four 12 oz (350 ml) glasses and use what most station kitchens already keep: frozen fruit, plain Greek yogurt, milk, bananas and oats. Only the mocha calls for protein powder. The blends built on Greek yogurt and milk carry the most protein and keep people full longest. The fruit-only blends, like citrus ginger and green pineapple, are snacks.",
  practicalAdvice: [
    "Load the jar in this order: liquid, yogurt, greens, then frozen fruit and ice on top. The blade catches the liquid first and pulls the frozen fruit down.",
    "If the blender stalls, add liquid 1/4 cup (60 ml) at a time. More ice makes a stall worse.",
    "Rinse the jar, lid and blade as soon as you pour. Dried yogurt and banana take several times longer to scrub off.",
    "Peel and slice overripe bananas, then freeze them flat on a tray before bagging so the slices don't fuse into one block.",
    "Use plain yogurt and taste the batch before adding honey. Ripe fruit usually makes it sweet enough.",
    "Fill the jar only to its maximum line. An overfilled jar pushes out through the lid when the blender speeds up.",
  ],
  sections: [
    {
      id: "batch-sizes",
      heading: "How much to make for a crew",
      paragraphs: [
        "Each recipe here makes about four 12 oz (350 ml) glasses. Loaded with frozen fruit, one batch nearly fills a standard 64 oz (1.9 L) blender jar, so blend one batch at a time, and split it in half if your jar is smaller. For eight people, run two batches back to back. A jar filled past the maximum line blends unevenly, leaves frozen chunks at the top and can force the lid off.",
        "Plan on one glass per person. If the smoothie is breakfast rather than a snack, use one of the Greek yogurt and milk recipes, and put out toast, eggs or the breakfast burritos below for anyone who needs more.",
      ],
      steps: [
        "Pour in the milk, juice or coconut water first.",
        "Add the yogurt, nut butter and any greens or oats.",
        "Add the frozen fruit and ice last.",
        "Start on low for 10 to 15 seconds, then run on high for 30 to 60 seconds until smooth.",
        "Pour straight into glasses, then fill the jar with warm water and a drop of soap and run it for 10 seconds to clean it.",
      ],
    },
    {
      id: "filling-smoothie",
      heading: "What makes a smoothie fill you up",
      paragraphs: [
        "Protein and fiber are what keep a smoothie from wearing off within the hour. Plain Greek yogurt and milk are the cheapest protein sources on the shelf. Oats, whole bananas and chia seeds add fiber. A blend of juice, fruit and ice has neither, so treat it as a drink rather than a meal.",
        "For a glass with more protein and no powder, blend 1 cup (250 ml) of milk with 3/4 cup (170 g) of plain Greek yogurt. Together they give roughly 25 g of protein, based on USDA FoodData Central values. A tablespoon of peanut or almond butter adds another 3 to 4 g.",
        "Each recipe card below lists an estimated calorie and protein figure per glass. They are planning estimates that change with brands and portion sizes, and they are not medical or dietary advice.",
      ],
      tips: [
        "For a breakfast smoothie, add 1/4 cup (25 g) of rolled oats per glass.",
        "Swap flavored yogurt for plain. Flavored yogurt can add several teaspoons of sugar per cup.",
      ],
    },
    {
      id: "freezer-packs",
      heading: "Freezer packs for fast mornings",
      paragraphs: [
        "The fastest way to make smoothies on a busy morning is to prep the solid ingredients ahead, not the finished drink. For each batch, put the frozen fruit, greens, oats and any chia or cocoa into a gallon freezer bag, press out the air and write the recipe name and date on it. At blend time, tip the bag into the jar and add the milk and yogurt fresh.",
        "Food kept at 0°F (-18°C) stays safe indefinitely, according to USDA. The limit is quality: fruit packs develop ice crystals and freezer burn over time, so use them within a few months.",
      ],
    },
    {
      id: "holding-storage",
      heading: "How long a finished smoothie can sit out",
      paragraphs: [
        "A smoothie made with milk or yogurt is perishable. USDA's limit for perishable food at room temperature is 2 hours, or 1 hour above 90°F (32°C). If the crew gets called out mid-pour, put the jar or glasses in the fridge before you leave. A glass left on the counter through a long call should be thrown out.",
        "Covered in the fridge, drink it within about a day. That limit is about quality: it separates and thickens, and a quick re-blend or stir brings it back. In a shared fridge, label it with your name and the date. For anything that won't be finished within a day, pour it into popsicle molds and freeze it.",
      ],
    },
    {
      id: "allergens",
      heading: "Allergies and a shared blender",
      paragraphs: [
        "Several of these recipes contain milk, peanuts or tree nuts (almond butter), all of which are major food allergens. A blender jar is hard to clean completely around the blade and gasket. If someone on the crew has a nut allergy, make their smoothie first in a freshly washed jar, or keep a separate jar for nut-free blends.",
        "If the station keeps a shared tub of protein powder, leave it in its original container with the ingredient label visible so anyone with an allergy can check it.",
      ],
    },
  ],
  embeddedRecipes: EMBEDDED_SMOOTHIES,
  mealRecommendations: [
    {
      slug: "hall-breakfast-burritos",
      title: "Hall Breakfast Burritos",
      blurb: "A full breakfast line for mornings when a smoothie isn't enough.",
      catalog: "breakfast",
    },
    {
      slug: "buttermilk-pancakes",
      title: "Buttermilk Pancakes for the Crew",
      blurb: "A cooked breakfast that feeds the whole crew from one griddle.",
      catalog: "breakfast",
    },
    {
      slug: "sausage-egg-bake",
      title: "Sausage Egg Bake",
      blurb: "A make-ahead egg bake that feeds the crew from the oven.",
    },
    {
      slug: "greek-chicken-bowls",
      title: "Greek Chicken Power Bowls",
      blurb: "A protein-forward lunch or dinner for later in the shift.",
    },
    {
      slug: "turkey-chili",
      title: "High-Protein Turkey Chili",
      blurb: "A big pot for dinner that holds on low heat.",
    },
    {
      slug: "performance-burrito-bowls",
      title: "Performance Chicken Burrito Bowls",
      blurb: "A build-your-own bowl line where everyone sets their own portions.",
    },
  ],
  faqs: [
    {
      question: "Do we need an expensive blender?",
      answer:
        "No. A mid-range blender with a 64 oz (1.9 L) jar handles these recipes if you add the liquid first and don't overload it with ice. If smoothies stay chunky even with enough liquid, the blade assembly is usually worn and is cheaper to replace than the blender.",
    },
    {
      question: "Can a smoothie replace a meal on shift?",
      answer:
        "Occasionally, if it is built like one: Greek yogurt or milk for protein, whole fruit, and oats or nut butter. That covers breakfast or a delayed lunch. It is not a substitute for a cooked crew dinner.",
    },
    {
      question: "How do we keep the sugar down?",
      answer:
        "Use plain yogurt instead of flavored, use water or milk instead of juice where the recipe allows, and taste before adding honey. Ripe or frozen bananas add enough sweetness for most blends.",
    },
    {
      question: "How long can a smoothie sit out if we get a call?",
      answer:
        "Up to 2 hours at room temperature, or 1 hour above 90°F (32°C), which is USDA's limit for perishable food. After that, throw it out. Kept covered in the fridge, drink it within about a day.",
    },
  ],
  sources: [SRC.usdaDangerZone, SRC.usdaFreezing, SRC.fdaAllergies, SRC.usdaFoodData],
  relatedArticleSlugs: [
    "best-meals-24-hour-shift",
    "healthy-station-snacks",
    "firefighter-breakfast-guide",
  ],
};
