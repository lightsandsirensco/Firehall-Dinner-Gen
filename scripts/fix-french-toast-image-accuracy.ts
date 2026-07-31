#!/usr/bin/env tsx
/**
 * IMAGE-CONTENT ACCURACY FIX — French Toast Bake family.
 *
 * Root cause: three French-toast recipes had hero images showing food items
 * that are NOT part of the published recipe:
 *   - crew-french-toast-bake (breakfast): correct dish (baked casserole in a
 *     pan) but topped with a fried egg + woven bacon strips — neither is an
 *     ingredient or serving instruction in this recipe (eggs are whisked
 *     into the custard, not plated as a fried egg; no bacon anywhere).
 *   - overnight-french-toast-bake (breakfast): correct dish + correct
 *     pecan-streusel/powdered-sugar/berries topping, but the plated shot
 *     also shows two strips of bacon on the side — not in the ingredient
 *     list, and directly contradicts this recipe's own porkFree:true /
 *     vegetarian:true dietary flags, which is a dietary-filter trust bug
 *     (a pork-free user could visually distrust a perfectly safe recipe).
 *   - french-toast-casserole (golden-100): WRONG DISH ENTIRELY — the hero
 *     shows a stack of pancakes with butter/syrup, breakfast sausage links,
 *     bacon, a fried egg, and hash browns. None of that is French toast.
 *
 * This regenerates all three with prompts locked to each recipe's actual
 * ingredients/instructions and an explicit negative constraint against
 * bacon, sausage, and fried/whole eggs as a plated garnish.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

applyDevOpenAiTlsIfAllowed();

import { buildEditorialModelPrompt } from "../server/imagery/build-image-prompt.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";
import { writeEditorialImageVariants, writeBreakfastCatalogImageVariants } from "../server/imagery/variants.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const DRY_RUN = process.argv.includes("--dry-run");

const NO_MEAT_GARNISH_CONSTRAINT =
  "Avoid: bacon, pork, sausage, ham, any cured or fried meat, fried whole egg, egg yolk garnish, hash browns, home fries, pancakes, waffles — none of these are in this recipe; show ONLY the baked custard bread casserole and its actual listed toppings.";

interface Target {
  collection: "golden-100" | "breakfast";
  slug: string;
  pageRel: string;
  promptInput: Parameters<typeof buildEditorialModelPrompt>[0];
}

const TARGETS: Target[] = [
  {
    collection: "breakfast",
    slug: "crew-french-toast-bake",
    pageRel: "catalog/breakfast/pages/crew-french-toast-bake.json",
    promptInput: {
      mealName: "Crew French Toast Bake",
      category: "breakfast",
      cuisine: "american",
      protein: "eggs",
      mealFormat: "casserole",
      ingredientHints: [
        "cubed day-old bread soaked in cinnamon custard",
        "baked golden and set in a deep 9x13 metal pan",
        "crisp golden-brown edges",
        "visible custard-soaked bread cubes in cross-section",
        "cut into clean squares",
        "maple syrup drizzled on top and pooling at the edge",
      ],
      hookLine:
        "Day-old bread soaked in cinnamon custard, baked in a 9x13, sliced into squares, maple syrup on the side — no meat, no eggs plated as a garnish, just the baked casserole.",
    },
  },
  {
    collection: "breakfast",
    slug: "overnight-french-toast-bake",
    pageRel: "catalog/breakfast/pages/overnight-french-toast-bake.json",
    promptInput: {
      mealName: "Overnight French Toast Bake",
      category: "breakfast",
      cuisine: "american",
      protein: "eggs",
      mealFormat: "casserole",
      ingredientHints: [
        "brioche or challah bread cubes soaked in custard",
        "baked puffed and golden in a 9x13 ceramic dish",
        "brown sugar and chopped pecan streusel topping",
        "dusted with powdered sugar",
        "fresh berries scattered on top and beside the plated square",
        "maple syrup drizzled over the top",
      ],
      hookLine:
        "Custard-soaked brioche baked with a pecan-brown-sugar streusel top, dusted with powdered sugar, served with maple syrup and fresh berries — no bacon, no meat of any kind on the plate.",
    },
  },
  {
    collection: "golden-100",
    slug: "french-toast-casserole",
    pageRel: "catalog/golden-100/pages/french-toast-casserole.json",
    promptInput: {
      mealName: "French Toast Casserole",
      category: "breakfast_brunch",
      cuisine: "american",
      protein: "eggs",
      mealFormat: "casserole",
      ingredientHints: [
        "thick brioche or Texas toast cubes soaked in cinnamon custard",
        "baked in a large sheet-pan casserole dish, puffed and deep golden at the edges",
        "cut into crew-sized squares",
        "brushed with melted butter and a scatter of brown sugar",
        "maple syrup poured over the top and pooling on the plate",
      ],
      hookLine:
        "Feed the hall before the bell — a full casserole tray of baked French toast, brushed with butter and brown sugar, maple syrup on the side. This is a baked casserole, not a plate of pancakes, sausage, bacon, or hash browns.",
    },
  },
];

function pageAbsPath(rel: string): string {
  return path.join(PUBLIC, rel);
}

async function main(): Promise<void> {
  console.log(`[fix-french-toast] ${TARGETS.length} targets (dryRun=${DRY_RUN})`);
  for (const target of TARGETS) {
    const prompt = `${buildEditorialModelPrompt(target.promptInput)} ${NO_MEAT_GARNISH_CONSTRAINT}`;

    if (DRY_RUN) {
      console.log(`  ○ ${target.slug} — prompt ${prompt.length} chars`);
      continue;
    }

    const buffer = await generateFoodImageBuffer(prompt);
    const heuristic = validateImageBufferHeuristic(buffer);
    if (!heuristic.ok) {
      console.warn(`  ! ${target.slug}: heuristic flagged: ${heuristic.reason} ${heuristic.notes ?? ""} — writing anyway (manual review queued)`);
    }

    if (target.collection === "golden-100") {
      await writeEditorialImageVariants(target.slug, buffer, "comfort_firehall", 2, "golden100");
    } else {
      await writeBreakfastCatalogImageVariants(target.slug, buffer, 2);
    }

    console.log(`  \u2713 ${target.slug} [${target.collection}]: wrote ${buffer.length} bytes`);

    // Fix the stale imageAlt text too (it previously described bacon/eggs).
    const pagePath = pageAbsPath(target.pageRel);
    const page = JSON.parse(fs.readFileSync(pagePath, "utf8"));
    if (typeof page.imageAlt === "string") {
      page.imageAlt = `${target.promptInput.mealName} — baked golden French toast casserole, cut into squares, served with maple syrup`;
    }
    if (typeof page.heroImageAlt === "string") {
      page.heroImageAlt = `${target.promptInput.mealName} — baked golden French toast casserole, cut into squares, served with maple syrup`;
    }
    fs.writeFileSync(pagePath, `${JSON.stringify(page, null, 2)}\n`, "utf8");

    await new Promise((r) => setTimeout(r, 500));
  }
  console.log("[fix-french-toast] done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
