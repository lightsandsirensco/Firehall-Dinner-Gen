#!/usr/bin/env tsx
/**
 * IMAGE-CONTENT ACCURACY FIX — Mediterranean Chickpea Bowls (golden-100).
 *
 * Root cause: the hero image showed a grilled chicken breast plated beside
 * the chickpeas/rice/veg — this recipe has NO chicken or any meat
 * (protein: "vegetarian", roasted chickpeas ARE the protein). The
 * heroImageAlt field was also stale, describing a completely different
 * recipe's photo (pasta e ceci in a baking dish).
 *
 * Regenerates the hero (+ mobile/thumb/rail/webp variants, same crop rule
 * and dimensions as every other golden-100 recipe) with a prompt locked to
 * this recipe's actual ingredients and an explicit no-meat constraint, then
 * corrects the alt text.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

applyDevOpenAiTlsIfAllowed();

import { buildEditorialModelPrompt } from "../server/imagery/build-image-prompt.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";
import { writeEditorialImageVariants } from "../server/imagery/variants.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const DRY_RUN = process.argv.includes("--dry-run");

const SLUG = "mediterranean-chickpea";
const PAGE_REL = "catalog/golden-100/pages/mediterranean-chickpea.json";

const NO_MEAT_CONSTRAINT =
  "Avoid: chicken, any meat, seafood, grilled protein of any kind — this recipe's only protein is roasted chickpeas. Show ONLY: a grain bowl with visible roasted/crisped chickpeas, quinoa base, halved cherry tomatoes, diced cucumber, thinly sliced red onion, crumbled feta, and a lemon-tahini drizzle.";

const promptInput: Parameters<typeof buildEditorialModelPrompt>[0] = {
  mealName: "Mediterranean Chickpea Bowls",
  category: "healthy_performance",
  cuisine: "mediterranean",
  protein: "vegetarian",
  mealFormat: "bowl",
  ingredientHints: [
    "quinoa base",
    "roasted crisp golden chickpeas as the main visible protein",
    "halved cherry tomatoes",
    "diced cucumber",
    "thinly sliced red onion",
    "crumbled feta cheese on top",
    "lemon-tahini dressing drizzled over the bowl",
  ],
  hookLine:
    "Plant-forward Mediterranean grain bowl — roasted chickpeas, quinoa, cherry tomatoes, cucumber, red onion, feta, lemon-tahini drizzle. No chicken, no meat, no seafood anywhere in frame.",
};

async function main(): Promise<void> {
  const prompt = `${buildEditorialModelPrompt(promptInput)} ${NO_MEAT_CONSTRAINT}`;

  if (DRY_RUN) {
    console.log(`[fix-mediterranean-chickpea] prompt (${prompt.length} chars):\n${prompt}`);
    return;
  }

  const buffer = await generateFoodImageBuffer(prompt);
  const heuristic = validateImageBufferHeuristic(buffer);
  if (!heuristic.ok) {
    console.warn(`  ! ${SLUG}: heuristic flagged: ${heuristic.reason} ${heuristic.notes ?? ""} — writing anyway (manual review queued)`);
  }

  await writeEditorialImageVariants(SLUG, buffer, "comfort_firehall", 2, "golden100");
  console.log(`  \u2713 ${SLUG}: wrote ${buffer.length} bytes`);

  const pagePath = path.join(PUBLIC, PAGE_REL);
  const page = JSON.parse(fs.readFileSync(pagePath, "utf8"));
  const correctedAlt =
    "Mediterranean Chickpea Bowls — quinoa bowl topped with roasted crisp chickpeas, cherry tomatoes, cucumber, red onion, feta, and lemon-tahini drizzle, no meat";
  if (typeof page.heroImageAlt === "string") page.heroImageAlt = correctedAlt;
  if (typeof page.imageAlt === "string") page.imageAlt = correctedAlt;
  fs.writeFileSync(pagePath, `${JSON.stringify(page, null, 2)}\n`, "utf8");

  console.log("[fix-mediterranean-chickpea] done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
