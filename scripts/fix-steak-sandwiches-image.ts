#!/usr/bin/env tsx
/**
 * Replace Steak Sandwiches hero with proper closed bun sandwich (not open-faced toast).
 *
 *   npx tsx scripts/fix-steak-sandwiches-image.ts
 *   npx tsx scripts/fix-steak-sandwiches-image.ts --dry-run
 */
import { loadProjectEnv, logOpenAIKeyDiagnostics } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

import fs from "node:fs";
import path from "node:path";
import {
  buildEditorialImagePrompt,
  buildEditorialModelPrompt,
} from "../server/imagery/build-image-prompt.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";
import { getFoodImageryConfig } from "../server/food-imagery/config.js";
import { hasOpenAIKey } from "../server/openai-client.js";
import { DEFAULT_HERO_GENERATION_SIZE } from "../server/lib/image-sizes.js";
import { writeEditorialImageVariants } from "../server/imagery/variants.js";
import { buildRecipeHeroAlt } from "../shared/seo/recipe-image-seo.js";

const SLUG = "steak-sandwiches";
const TITLE = "Steak Sandwiches";
const PAGE_PATH = path.join("client/public/catalog/golden-100/pages", `${SLUG}.json`);

const SHOT_DIRECTIVES = [
  "Closed grilled steak sandwich — both top and bottom bun clearly visible (kaiser roll, brioche, or hoagie roll)",
  "Thin-sliced grilled steak piled inside the sandwich with grill marks; optional sautéed onions, mushrooms, melted provolone",
  "45-degree cross-section or stacked diagonal hero so fillings and bun layers read as a real sandwich",
  "Crew-sized hearty portion on stainless prep counter or sheet tray — shift-dinner firehall kitchen",
  "Warm practical lighting, shallow depth of field, visible steam from hot steak",
  "NOT open-faced toast, NOT bread slices without a bun, NOT crostini, NOT bruschetta",
  "NOT steak on a plate without bun, NOT steak on cutting board only, NOT deconstructed components",
];

function buildPrompt(): string {
  const base = buildEditorialModelPrompt({
    mealName: TITLE,
    category: "firehall_classics",
    cuisine: "american",
    protein: "beef",
    mealFormat: "sandwich",
    ingredientHints: [
      "toasted kaiser bun",
      "grilled sirloin strips",
      "melted cheese",
      "sautéed onions",
    ],
    moodTags: ["sandwiches", "handheld", "firehall_classics"],
  });
  return `${base}. ${SHOT_DIRECTIVES.join(". ")}.`;
}

async function updatePageMetadata(heroAlt: string): Promise<void> {
  const page = JSON.parse(fs.readFileSync(PAGE_PATH, "utf8")) as Record<string, unknown>;
  page.heroImageAlt = heroAlt;
  page.description =
    "Grilled steak piled on toasted rolls with melted cheese — proper hall sandwiches for the crew line, not open-faced toast.";
  page.shortDescription = "Grilled steak on toasted rolls, hall classic";
  page.subtitle = "Grilled steak on toasted rolls, hall classic";
  fs.writeFileSync(PAGE_PATH, `${JSON.stringify(page, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  const promptResult = buildEditorialImagePrompt({
    mealName: TITLE,
    category: "firehall_classics",
    cuisine: "american",
    protein: "beef",
    mealFormat: "sandwich",
    ingredientHints: ["toasted kaiser bun", "grilled steak", "melted cheese"],
  });
  const modelPrompt = buildPrompt();

  if (dryRun) {
    console.log("[fix-steak-sandwiches-image] DRY RUN — model prompt preview:\n");
    console.log(modelPrompt);
    process.exit(0);
  }

  if (!hasOpenAIKey()) {
    logOpenAIKeyDiagnostics();
    throw new Error("OPENAI_API_KEY required for image generation");
  }

  const cfg = getFoodImageryConfig();
  if (!cfg.enabled) {
    throw new Error("FOOD_IMAGERY_ENABLED must be true");
  }

  console.log("[fix-steak-sandwiches-image] Generating hero…");
  const buffer = await generateFoodImageBuffer(modelPrompt, DEFAULT_HERO_GENERATION_SIZE);
  const heuristic = validateImageBufferHeuristic(buffer);
  if (!heuristic.ok) {
    throw new Error(`Heuristic failed: ${heuristic.reason}`);
  }

  const paths = await writeEditorialImageVariants(
    SLUG,
    buffer,
    promptResult.stylePreset,
    Date.now() % 1000,
  );

  const heroAlt = buildRecipeHeroAlt(
    `${TITLE} — closed grilled steak sandwich on toasted kaiser bun with sliced steak, melted cheese, and sautéed onions on a firehall kitchen tray`,
  );
  await updatePageMetadata(heroAlt);

  console.log("[fix-steak-sandwiches-image] Wrote variants:");
  console.log(`  hero:   ${paths.hero}`);
  console.log(`  thumb:  ${paths.thumb}`);
  console.log(`  mobile: ${paths.mobile}`);
  console.log(`  rail:   ${paths.rail}`);
  console.log(`  alt:    ${heroAlt}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
