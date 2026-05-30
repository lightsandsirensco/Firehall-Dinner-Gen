#!/usr/bin/env tsx
/**
 * Audit Golden 100 for wrong-dish failures — title vs ingredients/steps/timing.
 *
 *   npx tsx scripts/audit-golden-dish-realism.ts
 */
import "dotenv/config";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { buildGoldenRecipePage } from "../server/golden-100/recipe-page-builder.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { goldenPageImageSet } from "../shared/golden-100/recipe-page-paths.js";

type Issue = { slug: string; code: string; message: string };

const DISH_CHECKS: Array<{
  slug: string;
  mustMention?: RegExp[];
  mustNotMention?: RegExp[];
  minCookMinutes?: number;
}> = [
  {
    slug: "chicken-parm",
    mustMention: [/breadcrumb|breaded|cutlet/i, /marinara|mozzarella|parmesan/i],
    mustNotMention: [/heavy cream.*tomato/i, /cajun/i],
  },
  {
    slug: "beef-stroganoff",
    mustMention: [/sour cream/i, /mushroom/i, /egg noodle|wide noodle/i],
    mustNotMention: [/marinara/i, /crushed tomato/i],
  },
  {
    slug: "mac-and-cheese-bake",
    mustMention: [/elbow macaroni|macaroni/i, /cheddar|cheese sauce/i, /breadcrumb|panko/i],
    mustNotMention: [/chicken thigh/i],
  },
  {
    slug: "chili-mac",
    mustMention: [/macaroni|elbow/i, /chili|kidney bean|ground beef/i],
  },
  {
    slug: "one-pot-chicken-rice",
    mustMention: [/chicken thigh|chicken breast/i, /rice/i, /broth/i],
    mustNotMention: [/andouille/i, /cajun seasoning/i, /jambalaya/i],
  },
  {
    slug: "pulled-pork",
    mustMention: [/pork shoulder|pork butt/i, /shred/i, /bbq|barbecue|vinegar/i],
    mustNotMention: [/marinara.*hoagie/i, /provolone.*marinara/i],
    minCookMinutes: 360,
  },
  {
    slug: "breakfast-sausage-pizza",
    mustMention: [/sausage/i, /egg/i, /gravy/i],
    mustNotMention: [/pepperoni.*only/i],
  },
  {
    slug: "detroit-style-pizza",
    mustMention: [/9x13|steel pan|rectangular/i, /sauce.*top|stripes/i, /edge/i],
    mustNotMention: [/pizza stone.*round/i],
  },
  {
    slug: "pepperoni-pizza-night",
    mustMention: [/pepperoni/i, /mozzarella|cheese/i, /dough|crust/i],
  },
  {
    slug: "slider-bar",
    mustMention: [/slider bun|mini patty|2.?ounce|toppings bar/i],
    mustNotMention: [/8.*hoagie/i],
  },
  {
    slug: "baked-ziti",
    mustMention: [/ziti|rigatoni/i, /ricotta|mozzarella/i, /bake/i],
    mustNotMention: [/finish in the pan.*toss/i],
  },
  {
    slug: "pulled-pork-mac",
    mustMention: [/pork shoulder|pulled pork|shred/i, /macaroni|mac and cheese/i, /bbq/i],
    mustNotMention: [/boneless chicken/i, /heavy cream.*tomato/i],
  },
  {
    slug: "carolina-mustard-pork",
    mustMention: [/mustard/i, /pork shoulder|shred/i, /vinegar/i],
    mustNotMention: [/pork chops.*145/i, /grill over medium-high 4/i],
    minCookMinutes: 360,
  },
  {
    slug: "smoked-brisket",
    minCookMinutes: 360,
  },
  {
    slug: "texas-beef-ribs",
    minCookMinutes: 300,
  },
  {
    slug: "memphis-dry-rub-ribs",
    minCookMinutes: 240,
  },
  {
    slug: "carolina-mustard-pork",
    minCookMinutes: 360,
  },
  {
    slug: "bbq-brisket-burnt-ends",
    minCookMinutes: 360,
  },
];

function textBlob(page: ReturnType<typeof buildGoldenRecipePage>): string {
  const parts = [
    page.title,
    page.description ?? "",
    ...page.ingredients.map((i) => `${i.name} ${i.notes ?? ""}`),
    ...page.steps.map((s) => `${s.title} ${s.instruction}`),
    ...(page.tonightSpread ?? []),
  ];
  return parts.join("\n").toLowerCase();
}

function ingredientNames(page: ReturnType<typeof buildGoldenRecipePage>): string {
  return page.ingredients.map((i) => i.name.toLowerCase()).join("\n");
}

function stepIngredientsMissing(page: ReturnType<typeof buildGoldenRecipePage>): string[] {
  const common = ["salt", "pepper", "oil", "butter", "water"];
  const ingText = ingredientNames(page);
  const stepText = page.steps.map((s) => s.instruction.toLowerCase()).join("\n");
  const missing: string[] = [];
  for (const word of common) {
    if (stepText.includes(word) && !ingText.includes(word)) {
      missing.push(word);
    }
  }
  return missing;
}

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const issues: Issue[] = [];

  for (const def of GOLDEN_100_RECIPES) {
    const page = buildGoldenRecipePage(def);
    const blob = textBlob(page);
    const images = goldenPageImageSet(def.slug);
    const publicRoot = join(process.cwd(), "client", "public");

    for (const rel of [images.heroImage, images.mobileImage, images.thumbImage, images.railImage]) {
      if (!existsSync(join(publicRoot, rel.replace(/^\//, "")))) {
        issues.push({ slug: def.slug, code: "missing_image", message: `Missing image ${rel}` });
      }
    }

    for (const check of DISH_CHECKS) {
      if (check.slug !== def.slug) continue;
      for (const re of check.mustMention ?? []) {
        if (!re.test(blob)) {
          issues.push({
            slug: def.slug,
            code: "dish_mismatch",
            message: `Expected content matching ${re} for ${def.title}`,
          });
        }
      }
      for (const re of check.mustNotMention ?? []) {
        if (re.test(blob)) {
          issues.push({
            slug: def.slug,
            code: "wrong_dish_signal",
            message: `Unexpected content matching ${re}`,
          });
        }
      }
      if (check.minCookMinutes != null && page.cookTime < check.minCookMinutes) {
        issues.push({
          slug: def.slug,
          code: "timing_mismatch",
          message: `cookTime ${page.cookTime} min is below expected ${check.minCookMinutes} min for low-and-slow workflow`,
        });
      }
    }

    const missing = stepIngredientsMissing(page);
    if (missing.length >= 4) {
      issues.push({
        slug: def.slug,
        code: "ingredient_gap",
        message: `Steps mention common ingredients not listed: ${missing.join(", ")}`,
      });
    }
  }

  console.log("\n=== GOLDEN 100 DISH REALISM AUDIT ===\n");
  console.log(`recipes: ${GOLDEN_100_RECIPES.length}`);
  console.log(`issues: ${issues.length}`);

  if (issues.length) {
    for (const issue of issues) {
      console.log(`  [${issue.code}] ${issue.slug}: ${issue.message}`);
    }
    process.exit(1);
  }

  console.log("All dish realism checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
