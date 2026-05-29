/**
 * Editorial guide: 10 Healthy Smoothies to Make at the Hall
 * Recipe bodies live in fuel catalog — guide embeds reference the same source.
 */

import type { EditorialArticle } from "./content-schema.js";
import { SMOOTHIE_CATALOG_ITEMS } from "../fuel-catalog/smoothies/catalog-data.js";
import { smoothieCatalogToEmbedded } from "../fuel-catalog/smoothies/to-editorial.js";

const PUBLISHED = "2026-05-28T12:00:00.000Z";

const EMBEDDED_SMOOTHIES = SMOOTHIE_CATALOG_ITEMS.map(smoothieCatalogToEmbedded);

export const HEALTHY_HALL_SMOOTHIES_ARTICLE: EditorialArticle = {
  slug: "healthy-smoothies-at-the-hall",
  title: "10 Healthy Smoothies to Make at the Hall",
  subtitle: "Fast protein, easy cleanup, and flavors crews actually finish",
  seoTitle: "Healthy Smoothies for Firefighters",
  description:
    "Ten healthy smoothies adapted for fire station kitchens: high-protein, recovery, breakfast, and green options with realistic ingredients and shift-friendly cleanup.",
  topic: "nutrition_performance",
  pillar: "nutrition_performance",
  readMinutes: 12,
  publishedAt: PUBLISHED,
  updatedAt: PUBLISHED,
  keywords: [
    "healthy smoothies",
    "smoothies for firefighters",
    "firefighter breakfast ideas",
    "high protein smoothies",
    "shift worker smoothies",
    "firehall breakfast",
    "station blender recipes",
  ],
  heroImage: "/images/editorial/healthy-hall-smoothies-hero.webp",
  heroImageAlt: "Assorted healthy smoothies on a fire station kitchen counter",
  intro:
    "Smoothies are not dinner — and they do not need to be. At the hall they fill the gaps: between calls, after a workout, or on a morning when nobody wants to run a full cook. A decent blender, frozen fruit, and yogurt or milk in the fridge beat gas-station shakes on price and protein. Rinse the jar right away and cleanup stays honest. These ten blends use normal station ingredients — no obscure powders, no lecture, just drinks crews will finish.",
  practicalAdvice: [
    "Rinse the blender jar immediately after pouring — dried yogurt is the enemy on busy shifts.",
    "Stock frozen fruit, bananas, Greek yogurt, and milk before buying exotic add-ins.",
    "Blend liquids and greens first, then frozen fruit — fewer air pockets and less blade strain.",
    "Label a hall protein powder tub if you use one — unmarked powder causes trust issues.",
    "Pour into cups before the next call; smoothies separate and thicken oddly after an hour in the fridge.",
  ],
  sections: [
    {
      id: "station-setup",
      heading: "What the hall actually needs",
      paragraphs: [
        "A 48-ounce or larger blender, a rubber spatula, and freezer space for fruit bags. Immersion blenders work for single servings but slow you down for six or eight cups.",
        "Keep one dedicated cutting board for fruit if you are adding fresh ginger or citrus — cross-contamination with raw chicken is how smoothie night goes wrong.",
      ],
      tips: [
        "Freeze overripe bananas peeled in zip bags — they are the hall’s best thickener.",
        "Write a simple shopping list on the whiteboard: yogurt, milk, frozen berries, spinach.",
      ],
    },
    {
      id: "when-to-use",
      heading: "When smoothies help on shift",
      paragraphs: [
        "They fit the gaps: after a workout, before a long night when dinner might slip, or at breakfast when the cook is running eggs and pancakes already.",
        "They do not replace a crew dinner. Pair smoothie availability with real food later — or point people to the catalog meals below when it is time to eat properly.",
      ],
    },
  ],
  embeddedRecipes: EMBEDDED_SMOOTHIES,
  mealRecommendations: [
    {
      slug: "breakfast-burrito-bar",
      title: "Breakfast Burrito Bar",
      blurb: "When the crew needs more than a shake — full breakfast line.",
    },
    {
      slug: "pancake-short-stack",
      title: "Pancake Short Stack",
      blurb: "Classic hall morning after smoothies are not enough.",
    },
    {
      slug: "sausage-egg-bake",
      title: "Sausage Egg Bake",
      blurb: "Batch protein for the whole tour — oven, not blender.",
    },
    {
      slug: "greek-chicken-bowls",
      title: "Greek Chicken Power Bowls",
      blurb: "Lunch or dinner — protein-forward when smoothies were morning only.",
    },
    {
      slug: "turkey-chili",
      title: "High-Protein Turkey Chili",
      blurb: "Hearty pot for later in the tour — balances a light smoothie morning.",
    },
    {
      slug: "performance-burrito-bowls",
      title: "Performance Chicken Burrito Bowls",
      blurb: "Macros-friendly bowl line when the shift turns serious.",
    },
  ],
  faqs: [
    {
      question: "Do we need an expensive blender?",
      answer:
        "No. A commercial-duty consumer blender (Vitamix-style) helps with frozen fruit, but a mid-range blender works if you add liquid first and do not overload ice. Replace blades when smoothies stay chunky — dull blades are the usual problem.",
    },
    {
      question: "Are smoothies enough after a hard call?",
      answer:
        "Sometimes for a short window — but after heavy work most crews need salt, starch, and more calories. Use smoothies as a bridge, then cook or reheat a real meal when the board allows.",
    },
    {
      question: "How do we keep sugar reasonable?",
      answer:
        "Use ripe fruit for sweetness, plain yogurt instead of flavored, and add honey only after tasting. Flavored yogurt and juice blends are where sugar sneaks in.",
    },
  ],
  relatedArticleSlugs: [
    "eating-well-on-24-hour-shifts",
    "healthy-station-snacks",
    "firefighter-breakfast-ideas",
  ],
};
