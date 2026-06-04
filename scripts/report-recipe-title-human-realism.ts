#!/usr/bin/env tsx
/**
 * Report human title rewrites (slug → old → new).
 *   npx tsx scripts/report-recipe-title-human-realism.ts
 */
import fs from "node:fs";
import path from "node:path";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/index.js";
import { PERFORMANCE_ADAPTED_RECIPES } from "../shared/performance-meals/adapted/index.js";
import { CLASSIC_HALL_MEALS } from "../shared/classic-hall-meals.js";
import { HUMAN_RECIPE_TITLES } from "../shared/recipe-human-titles.js";

/** Manifest titles before humanRecipeTitle() overrides (from recipes-data / batch sources). */
const GOLDEN_SOURCE_TITLE: Record<string, string> = {
  "beef-dip": "Blackstone Steak Sandwiches",
  "chicken-caesar": "Hall Caesar Chicken",
  "loaded-nacho-skillet": "Loaded Nacho Skillet",
  "meatball-hoagies": "Firehall Meatball Hoagies",
  "hall-taco-bar": "Hall Taco Bar Night",
  "ny-strip-herb-butter": "Grilled NY Strip with Herb Butter",
  "grilled-pork-chops": "Charcoal Grilled Pork Chops",
  "smoked-wings-white-sauce": "Smoked Wings with White BBQ Sauce",
  "cedar-plank-salmon": "Cedar Plank Grilled Salmon",
  "honey-garlic-pork-tenderloin": "Honey Garlic Grilled Pork Tenderloin",
  "flank-chimichurri": "Grilled Flank Steak with Chimichurri",
  "grilled-corn-cotija": "Grilled Street Corn with Cotija",
  "teriyaki-salmon-grill": "Teriyaki Grilled Salmon",
  "shepherds-pie": "Shepherd's Pie with Greek Salad",
  "meatloaf-mashed": "Classic Meatloaf with Mashed Potatoes",
  "loaded-baked-potato-bar": "Loaded Baked Potato Bar",
  "creamy-tuscan-chicken": "Creamy Tuscan Chicken",
  "lemon-herb-salmon": "Lemon Herb Grilled Salmon",
  "turkey-chili": "High-Protein Turkey Chili",
  "sheet-pan-fajitas": "Sheet Pan Chicken Fajitas",
  "chicken-souvlaki": "Grilled Chicken Souvlaki",
  "performance-burrito-bowls": "Performance Chicken Burrito Bowls",
  "sheet-pan-sausage-peppers": "Sheet Pan Sausage and Peppers",
  "skillet-chicken-alfredo": "One-Skillet Chicken Alfredo",
  "beef-broccoli": "Quick Beef and Broccoli",
  "fast-philly-skillet": "Fast Philly Cheesesteak Skillet",
  "pork-carnitas-tacos": "Quick Pork Carnitas Tacos",
  "pad-thai": "Firehall Pad Thai",
  "pepperoni-pizza-night": "Classic Pepperoni Pizza",
  "meat-lovers-sheet-pizza": "Meat Lover's Sheet Pan Pizza",
  "margherita-pizza": "Fresh Margherita Pizza",
  "batch-lasagna": "Giant Batch Lasagna",
  "big-chili": "Hall-Sized Beef and Bean Chili",
  "sausage-egg-bake": "Sausage Egg Bake for the Crew",
  "jambalaya": "Cajun Jambalaya for the Hall",
  "loaded-potato-feed": "Loaded Potato Feed",
  "pancake-short-stack": "Pancake Short Stack for the Crew",
  "thai-basil-chicken": "Thai Basil Chicken Stir Fry",
  "bulgogi-bowls": "Korean Bulgogi Rice Bowls",
  "street-corn-chicken": "Mexican Street Corn Chicken Bowls",
  "moroccan-meatballs": "Moroccan Spiced Lamb Meatballs",
  "game-day-nachos": "Loaded Game Day Nachos",
  "slider-bar": "Hall Slider Bar",
  "sheet-pan-meal-prep": "Sheet Pan Chicken Trays",
  "one-pot-chicken-rice": "One-Pot Chicken and Rice",
  "chicken-parm": "Chicken Parm",
  "steak-tacos": "Chimichurri Steak Tacos",
  "chicken-quesadillas": "Shredded Chicken Quesadillas",
};

const PERFORMANCE_SOURCE: Record<string, string> = {
  "sheet-pan-chicken-fajitas-lite": "Sheet Pan Chicken Fajitas Lite",
  "korean-beef-rice-bowls": "Korean Beef Rice Bowls",
  "mediterranean-baked-fish-tray": "Mediterranean Baked Cod Tray",
  "moroccan-chicken-chickpea-tray": "Moroccan Chicken Chickpea Tray",
  "grilled-shrimp-quinoa-bowls": "Grilled Shrimp Quinoa Bowls",
  "boneless-chicken-thighs-sweet-potato-spinach":
    "Boneless Chicken Thighs with Sweet Potato & Fresh Spinach",
  "italian-sausage-veg-sheet-pan": "Italian Sausage and Veg Sheet Pan",
  "cottage-cheese-protein-pasta": "Cottage Cheese Protein Pasta Bake",
  "lemon-garlic-chicken-tray": "Lemon Garlic Chicken Tray Bake",
  "herb-baked-salmon-tray": "Herb-Crusted Baked Salmon Tray",
  "crispy-fish-taco-night": "Crispy Fish Taco Night",
  "asian-chicken-lettuce-cups": "Asian Chicken Lettuce Cups",
  "blackened-cod-taco-night": "Blackened Cod Taco Night",
  "chicken-enchilada-skillet-light": "Light Chicken Enchilada Skillet",
  "peri-peri-chicken-platter": "Peri Peri Chicken Platter",
};

const CLASSICS_SOURCE: Record<string, string> = {
  "steak-tacos": "Street-Style Chimichurri Steak Tacos",
  "smash-burgers": "Double Smash Burgers with Caramelized Onions & Dirty Sauce",
  "chili-garlic-bread": "Firehouse Smoked Beef Chili with Cheesy Garlic Bread",
  "jerk-chicken": "Jerk Chicken & Peas and Rice",
  "chicken-parm": "Chicken Parm",
};

type Row = { source: string; slug: string; oldTitle: string; newTitle: string };

function rows(): Row[] {
  const out: Row[] = [];
  for (const [slug, newTitle] of Object.entries(HUMAN_RECIPE_TITLES)) {
    const old =
      GOLDEN_SOURCE_TITLE[slug] ??
      PERFORMANCE_SOURCE[slug] ??
      CLASSICS_SOURCE[slug] ??
      GOLDEN_100_RECIPES.find((r) => r.slug === slug)?.title ??
      PERFORMANCE_ADAPTED_RECIPES.find((r) => r.manifest.slug === slug)?.manifest.title ??
      CLASSIC_HALL_MEALS.find((m) => m.slug === slug)?.title;
    if (!old || old === newTitle) continue;
    const source = GOLDEN_SOURCE_TITLE[slug]
      ? "golden_100"
      : PERFORMANCE_SOURCE[slug]
        ? "performance"
        : CLASSICS_SOURCE[slug]
          ? "classics_wheel"
          : "catalog";
    out.push({ source, slug, oldTitle: old, newTitle });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

function main(): void {
  const changes = rows();
  const md = [
    "# Recipe title human realism rewrites",
    "",
    `Total: **${changes.length}** recipes (slugs unchanged)`,
    "",
    "| Source | Slug | Old title | New title |",
    "|--------|------|-----------|-----------|",
    ...changes.map(
      (r) => `| ${r.source} | ${r.slug} | ${r.oldTitle} | ${r.newTitle} |`,
    ),
    "",
  ].join("\n");

  const outPath = path.join("review", "recipe-title-human-realism-report.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md, "utf8");
  console.log(`[report] ${changes.length} rewrites → ${outPath}`);
  for (const r of changes) {
    console.log(`  ${r.slug}: "${r.oldTitle}" → "${r.newTitle}"`);
  }
}

main();
