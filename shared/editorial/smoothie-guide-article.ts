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
  heroImage: "/images/smoothies/mixed-berry-protein.webp",
  heroImageAlt: "Assorted healthy smoothies on a fire station kitchen counter",
  intro:
    "Smoothies are not dinner, and at a fire station they don't need to be. Their job is narrower: something fast after a workout, real food on a rushed morning, or a stand-in when the next meal is hours away and nobody knows when the next call is coming. A blender, frozen fruit, and yogurt or milk beat a gas-station shake on both price and protein, and a jar rinsed right after pouring keeps cleanup out of the way. The ten recipes below use ingredients most stations already stock — no specialty powders required — and range from about 160 to 340 calories with up to 22 grams of protein per serving, depending on the blend.",
  practicalAdvice: [
    "Rinse the blender jar immediately after pouring — dried yogurt is the enemy on busy shifts.",
    "Stock frozen fruit, bananas, Greek yogurt, and milk before buying exotic add-ins.",
    "Blend liquids and greens first, then frozen fruit — fewer air pockets and less blade strain.",
    "Label a hall protein powder tub if you use one — unmarked powder causes trust issues.",
    "Pour into cups before the next call; smoothies separate and thicken oddly after an hour in the fridge.",
    "Freeze pre-portioned fruit-and-greens packs in quart bags, and add yogurt or milk fresh at blend time — the packs keep for weeks; a finished smoothie doesn't.",
  ],
  sections: [
    {
      id: "station-setup",
      heading: "What equipment a station kitchen actually needs",
      paragraphs: [
        "A 48-ounce or larger blender, a rubber spatula, and freezer space for fruit bags cover most of it. Immersion blenders work for a single serving but slow things down when making six or eight cups at once.",
        "Keep one cutting board reserved for fruit and ginger if raw chicken or other proteins are prepped on the same counter — cross-contamination is the more likely failure point than anything in the smoothie itself.",
      ],
      tips: [
        "Freeze overripe bananas, peeled, in zip bags — they're the most reliable thickener on hand.",
        "Post a short shopping list on the whiteboard: yogurt, milk, frozen berries, spinach.",
      ],
    },
    {
      id: "breakfast-or-recovery",
      heading: "Breakfast smoothie or post-workout recovery drink?",
      paragraphs: [
        "The two jobs call for slightly different builds. A breakfast smoothie needs staying power, since the next meal might be hours off — that means yogurt or milk for protein, oats or a whole banana for slower-digesting carbohydrate, and a spoon of nut butter or chia for fat. A post-workout smoothie can lean lighter: fruit for quick carbohydrate, a protein source, less fat, so it clears the stomach faster before the next set of calls.",
        "A smoothie built from juice and ice alone struggles at either job — it digests fast, and people are hungry again within the hour. Yogurt, milk, or a scoop of protein powder is what turns a fruit slush into something that actually holds someone over.",
      ],
      tips: [
        "For breakfast, add oats or half an avocado if the crew tends to get hungry again before lunch.",
        "Right after a workout, go lighter on added fat — it slows how fast the protein and carbs get absorbed.",
      ],
    },
    {
      id: "snack-vs-meal",
      heading: "Smoothie as a snack, light meal, or meal replacement?",
      paragraphs: [
        "A smoothie works fine as a snack between calls or as a light meal when a full cook isn't happening — but fruit and ice with nothing else in it is a poor stand-in for dinner on a 24-hour shift. The recipes below built on Greek yogurt, milk, and a fat source land closer to 250–340 calories with roughly 16 to 22 grams of protein, which is substantial enough to cover breakfast or a delayed meal. The lighter, mostly-fruit blends are better treated as a snack or a between-meals top-up than a meal replacement.",
        "On a 24-hour tour, a smoothie works best as a bridge, not the anchor. Use it to cover a gap — after training, before a delayed dinner, or first thing in the morning — and still plan a cooked meal for the crew later in the tour.",
      ],
    },
    {
      id: "make-ahead-safety",
      heading: "Prepping and storing smoothies safely at the station",
      paragraphs: [
        "The fastest way to speed up smoothie mornings is prepping the solid ingredients ahead, not the finished drink. Portion fruit and greens into quart freezer bags, one bag per serving, and add yogurt, milk, or protein powder fresh at blend time. The fruit keeps for weeks in the freezer; a fully blended smoothie does not.",
        "Treat a finished smoothie like any other dairy-based drink: refrigerate it right away if it isn't being served immediately, keep it covered, and don't leave it sitting on the counter through a shift's worth of interruptions. A same-day smoothie kept cold is fine; one left out for hours, or held more than a day or two in the fridge, is a food-safety risk rather than a convenience.",
        "For a full crew, double or triple the base recipe rather than running the blender twice — most station blenders handle a 48-to-64-ounce batch without trouble, and pouring once means less standing at the counter before the next call.",
      ],
      tips: [
        "Write the date on any smoothie packs you freeze — rotation keeps the freezer from turning into a guessing game.",
        "If a batch won't be finished within a day, freeze the extra in a popsicle mold instead of holding it in the fridge.",
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
    {
      question: "Can a smoothie replace a full meal on shift?",
      answer:
        "Occasionally, if it's built like one. Greek yogurt or milk, whole fruit, and a fat source can land around 250–340 calories with 16 to 22 grams of protein — enough to cover breakfast or a delayed lunch. It's not a substitute for a cooked crew dinner on a regular basis; use it as a stand-in when timing is tight, not as the default.",
    },
    {
      question: "How long can a finished smoothie sit before it's unsafe to drink?",
      answer:
        "Treat it like any dairy-based drink: refrigerate it promptly if you're not drinking it right away, and don't leave it out on the counter for hours between calls. A smoothie kept cold and covered is fine for same-day drinking; one left at room temperature for an extended stretch, or held more than a day or two in the fridge, should be tossed.",
    },
  ],
  relatedArticleSlugs: [
    "eating-well-on-24-hour-shifts",
    "healthy-station-snacks",
    "firefighter-breakfast-ideas",
  ],
};
