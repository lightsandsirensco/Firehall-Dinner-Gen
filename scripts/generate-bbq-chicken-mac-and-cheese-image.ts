#!/usr/bin/env tsx
/**
 * Hero imagery for BBQ Chicken Mac and Cheese — shredded BBQ chicken in creamy baked mac.
 *
 *   npx tsx scripts/generate-bbq-chicken-mac-and-cheese-image.ts
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

const SLUG = "bbq-chicken-mac-and-cheese";
const TITLE = "BBQ Chicken Mac and Cheese";
const PAGE_PATH = path.join("client/public/catalog/golden-100/pages", `${SLUG}.json`);

const SHOT_DIRECTIVES = [
  "Creamy baked mac and cheese in a large stainless hotel pan or sheet tray — crew-sized portion",
  "Visible shredded BBQ chicken mixed through the mac with BBQ sauce glaze and caramelized edges",
  "Melted sharp cheddar and mozzarella with cheese pull from a serving spoon lift",
  "Warm Canadian firehall kitchen, commercial stainless equipment, shallow depth of field, visible steam",
  "NOT pulled pork, NOT plain mac without chicken, NOT whole chicken breast plated separately",
  "NOT pulled pork mac, NOT white alfredo pasta, NOT rice bowl",
];

function buildPrompt(): string {
  const base = buildEditorialModelPrompt({
    mealName: TITLE,
    category: "comfort_food",
    cuisine: "american",
    protein: "chicken",
    mealFormat: "bake",
    ingredientHints: [
      "shredded BBQ chicken",
      "elbow macaroni",
      "sharp cheddar",
      "mozzarella",
      "BBQ sauce drizzle",
    ],
    moodTags: ["comfort", "bbq", "mac and cheese"],
  });
  return `${base}. ${SHOT_DIRECTIVES.join(". ")}.`;
}

async function updatePageMetadata(heroAlt: string): Promise<void> {
  if (!fs.existsSync(PAGE_PATH)) return;
  const page = JSON.parse(fs.readFileSync(PAGE_PATH, "utf8")) as Record<string, unknown>;
  page.heroImageAlt = heroAlt;
  fs.writeFileSync(PAGE_PATH, `${JSON.stringify(page, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  if (!hasOpenAIKey()) {
    logOpenAIKeyDiagnostics();
    throw new Error("OPENAI_API_KEY required for image generation");
  }
  const cfg = getFoodImageryConfig();
  if (!cfg.enabled) {
    throw new Error("FOOD_IMAGERY_ENABLED must be true");
  }

  const promptResult = buildEditorialImagePrompt({
    mealName: TITLE,
    category: "comfort_food",
    cuisine: "american",
    protein: "chicken",
    mealFormat: "bake",
    ingredientHints: ["shredded BBQ chicken", "baked mac and cheese", "BBQ sauce"],
  });
  const modelPrompt = buildPrompt();

  console.log("[bbq-chicken-mac-image] Generating hero…");
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
    `${TITLE} — creamy baked mac and cheese with shredded BBQ chicken, melted cheddar and mozzarella, BBQ sauce glaze, and cheese pull in a firehall kitchen hotel pan`,
  );
  await updatePageMetadata(heroAlt);

  console.log("[bbq-chicken-mac-image] Wrote variants:");
  console.log(`  hero:   ${paths.hero}`);
  console.log(`  thumb:  ${paths.thumb}`);
  console.log(`  mobile: ${paths.mobile}`);
  console.log(`  rail:   ${paths.rail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
