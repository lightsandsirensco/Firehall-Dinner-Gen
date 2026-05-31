#!/usr/bin/env tsx
/**
 * Recipe-audited regen for Breakfast Enchiladas — vision QA gate before replace.
 *
 *   npx tsx scripts/regen-breakfast-enchiladas-imagery.ts --dry-run
 *   npx tsx scripts/regen-breakfast-enchiladas-imagery.ts --apply
 *   npx tsx scripts/regen-breakfast-enchiladas-imagery.ts --apply --max-attempts=3
 */
import { loadProjectEnv, logOpenAIKeyDiagnostics } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

import fs from "node:fs";
import path from "node:path";
import { buildEditorialModelPrompt } from "../server/imagery/build-image-prompt.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { DEFAULT_HERO_GENERATION_SIZE } from "../server/lib/image-sizes.js";
import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";
import { getFoodImageryConfig } from "../server/food-imagery/config.js";
import { writeBreakfastCatalogImageVariants } from "../server/imagery/variants.js";
import { createOpenAIClient, hasOpenAIKey } from "../server/openai-client.js";
import {
  BREAKFAST_ENCHILADAS_IMAGE_NEGATIVES,
  BREAKFAST_ENCHILADAS_IMAGE_PROMPT,
} from "../shared/food-imagery/title-locked-prompts.js";

const SLUG = "breakfast-enchiladas";
const PAGE_PATH = path.join(process.cwd(), "client/public/catalog/breakfast/pages/breakfast-enchiladas.json");
const SOURCE_PATH = path.join(process.cwd(), "shared/breakfast-expansion/new-breakfast-pages.ts");
const REPORT_PATH = path.join(process.cwd(), "review/breakfast-enchiladas-image-audit.json");

const REQUIRED_VISIBLE = [
  "rolled flour tortilla enchiladas",
  "scrambled eggs in filling",
  "crumbled chorizo in filling",
  "green chile enchilada sauce",
  "melted baked cheese (Monterey Jack or cheddar)",
  "multiple enchiladas in casserole/hotel pan",
  "crew-sized family-style portion",
];

const FORBIDDEN_IN_IMAGE = [
  "fried egg on top",
  "sunny-side-up egg on top",
  "bacon strips on top",
  "single tiny brunch plate",
  "restaurant influencer styling",
];

const RECIPE_INGREDIENTS = [
  "large eggs",
  "Mexican chorizo",
  "shredded Monterey Jack",
  "8-inch flour tortillas",
  "green enchilada sauce",
  "sour cream",
  "cotija or feta",
  "cilantro",
];

const NOT_IN_RECIPE = ["bacon", "fried egg on top", "sunny-side-up egg", "onions and peppers as hero focus"];

const VISION_RUBRIC = `Audit this breakfast enchilada hero for Firehall Meals accuracy.
Return JSON only:
{
  "pass": boolean,
  "requiredVisible": { "rolledTortillas": boolean, "greenSauce": boolean, "bakedCheese": boolean, "eggsInFilling": boolean, "chorizoInFilling": boolean, "casseroleOrPlatter": boolean, "crewPortions": boolean },
  "forbiddenPresent": { "friedEggsOnTop": boolean, "baconOnTop": boolean, "singleTinyPlate": boolean, "restaurantStyling": boolean },
  "extraIngredientsNotInRecipe": string[],
  "reasons": string[],
  "confidence": 1-100
}
FAIL if fried eggs on top, bacon on top, single-serving plate, missing green sauce/cheese/tortilla rolls, or missing eggs+chorizo in visible filling.`;

type VisionAudit = {
  pass: boolean;
  reasons: string[];
  confidence: number;
  requiredVisible: Record<string, boolean>;
  forbiddenPresent: Record<string, boolean>;
  extraIngredientsNotInRecipe: string[];
};

async function auditGeneratedImage(buf: Buffer, title: string): Promise<VisionAudit> {
  if (!hasOpenAIKey()) {
    return { pass: true, reasons: ["vision_skipped"], confidence: 0, requiredVisible: {}, forbiddenPresent: {}, extraIngredientsNotInRecipe: [] };
  }

  const client = createOpenAIClient();
  const mime = buf[0] === 0xff ? "image/jpeg" : "image/png";
  const res = await client.chat.completions.create({
    model: process.env.FOOD_IMAGERY_VISION_MODEL?.trim() || "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: VISION_RUBRIC },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Recipe: ${title}`,
              `Must show: ${REQUIRED_VISIBLE.join("; ")}`,
              `Must NOT show: ${FORBIDDEN_IN_IMAGE.join("; ")}`,
              `Recipe ingredients: ${RECIPE_INGREDIENTS.join(", ")}`,
              `Not in recipe: ${NOT_IN_RECIPE.join(", ")}`,
            ].join("\n"),
          },
          { type: "image_url", image_url: { url: `data:${mime};base64,${buf.toString("base64")}`, detail: "low" } },
        ],
      },
    ],
  });

  const parsed = JSON.parse(res.choices[0]?.message?.content || "{}") as Record<string, unknown>;
  const forbidden = (parsed.forbiddenPresent || {}) as Record<string, boolean>;
  const required = (parsed.requiredVisible || {}) as Record<string, boolean>;
  const extra = Array.isArray(parsed.extraIngredientsNotInRecipe)
    ? parsed.extraIngredientsNotInRecipe.map(String)
    : [];

  const hasForbidden =
    forbidden.friedEggsOnTop ||
    forbidden.baconOnTop ||
    forbidden.singleTinyPlate ||
    forbidden.restaurantStyling;
  const missingRequired = Object.values(required).some((v) => v === false);

  const pass = parsed.pass !== false && !hasForbidden && !missingRequired && extra.length === 0;

  return {
    pass,
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : [],
    confidence: Number(parsed.confidence) || 80,
    requiredVisible: required,
    forbiddenPresent: forbidden,
    extraIngredientsNotInRecipe: extra,
  };
}

function buildModelPrompt(title: string, subtitle: string): string {
  const base = buildEditorialModelPrompt({
    mealName: title,
    category: "breakfast_brunch",
    cuisine: "Mexican-American",
    protein: "eggs",
    mealFormat: "casserole",
    stylePreset: "breakfast_shift",
    hookLine: subtitle,
    ingredientHints: RECIPE_INGREDIENTS,
  });

  return [
    base,
    BREAKFAST_ENCHILADAS_IMAGE_PROMPT,
    `Avoid: ${BREAKFAST_ENCHILADAS_IMAGE_NEGATIVES.join(", ")}`,
  ].join("\n\n");
}

function updateImageAlt(): void {
  const alt =
    "Crew-sized breakfast enchiladas baked in a 9x13 casserole — green chile sauce, melted cheese, scrambled egg and chorizo filling visible in rolled flour tortillas";

  const page = JSON.parse(fs.readFileSync(PAGE_PATH, "utf8")) as Record<string, unknown>;
  page.imageAlt = alt;
  page.updatedAt = new Date().toISOString();
  fs.writeFileSync(PAGE_PATH, JSON.stringify(page, null, 2) + "\n");

  let src = fs.readFileSync(SOURCE_PATH, "utf8");
  src = src.replace(
    /slug: "breakfast-enchiladas"[\s\S]*?imageAlt: "[^"]+"/,
    (block) => block.replace(/imageAlt: "[^"]+"/, `imageAlt: "${alt}"`),
  );
  fs.writeFileSync(SOURCE_PATH, src);
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run") || !apply;
  const maxAttempts = parseInt(
    process.argv.find((a) => a.startsWith("--max-attempts="))?.replace("--max-attempts=", "") || "3",
    10,
  );

  const page = JSON.parse(fs.readFileSync(PAGE_PATH, "utf8")) as { title: string; subtitle: string };
  logOpenAIKeyDiagnostics("[breakfast-enchiladas-imagery]");

  const recipeAudit = {
    slug: SLUG,
    title: page.title,
    requiredVisible: REQUIRED_VISIBLE,
    forbiddenInImage: FORBIDDEN_IN_IMAGE,
    recipeIngredients: RECIPE_INGREDIENTS,
    notInRecipe: NOT_IN_RECIPE,
    currentIssues: [
      "fried eggs on top",
      "decorative bacon strips",
      "single-serving restaurant plate",
      "missing casserole crew presentation",
    ],
  };

  console.log("\n=== Recipe audit ===");
  console.log(JSON.stringify(recipeAudit, null, 2));

  if (dryRun) {
    console.log("\n=== Prompt preview ===\n");
    console.log(buildModelPrompt(page.title, page.subtitle).slice(0, 1200));
    console.log("\n…\nUse --apply to generate and vision-QA before replace.");
    return;
  }

  const cfg = getFoodImageryConfig();
  if (!cfg.enabled) {
    console.error("FOOD_IMAGERY_ENABLED=true and OPENAI_API_KEY required");
    process.exit(1);
  }

  let lastVision: VisionAudit | null = null;
  let replaced = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n[attempt ${attempt}/${maxAttempts}] Generating…`);
    const buf = await generateFoodImageBuffer(buildModelPrompt(page.title, page.subtitle), DEFAULT_HERO_GENERATION_SIZE);
    const heuristic = validateImageBufferHeuristic(buf);
    if (!heuristic.ok) {
      console.warn(`  heuristic fail: ${heuristic.reason}`);
      continue;
    }

    console.log("[vision] Auditing generated image against recipe…");
    lastVision = await auditGeneratedImage(buf, page.title);
    console.log(`  pass=${lastVision.pass} confidence=${lastVision.confidence}`);
    for (const r of lastVision.reasons) console.log(`  - ${r}`);

    if (!lastVision.pass) continue;

    const paths = await writeBreakfastCatalogImageVariants(SLUG, buf, attempt);
    updateImageAlt();
    replaced = true;
    console.log(`\n✓ Replaced hero → ${paths.hero}`);
    break;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    recipeAudit,
    replaced,
    vision: lastVision,
    passed: replaced,
  };
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  if (!replaced) {
    console.error("\n✗ Did not replace — vision QA failed. See review/breakfast-enchiladas-image-audit.json");
    process.exit(1);
  }

  console.log(`\nReport: ${REPORT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
