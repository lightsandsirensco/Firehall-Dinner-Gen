#!/usr/bin/env tsx
/**
 * Generate hero + variants for Phase 6 BBQ & grill recipes (30).
 *
 *   npm run generate:bbq-batch-30-imagery
 *   npm run generate:bbq-batch-30-imagery -- --dry-run
 *   npm run generate:bbq-batch-30-imagery -- --limit=3
 *   npm run generate:bbq-batch-30-imagery -- --force
 */
import { loadProjectEnv, logOpenAIKeyDiagnostics } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

import { BATCH_30_BBQ_GRILL_RECIPES } from "../shared/bbq-expansion/batch-30-bbq-grill-recipes.js";
import { buildEditorialModelPrompt } from "../server/imagery/build-image-prompt.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { DEFAULT_HERO_GENERATION_SIZE } from "../server/lib/image-sizes.js";
import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";
import { getFoodImageryConfig } from "../server/food-imagery/config.js";
import { writeBbqCatalogImageVariants } from "../server/imagery/variants.js";
import { imageFileExists } from "../shared/explore-image-paths.js";
import { bbqCatalogHeroPath } from "../shared/bbq-catalog/slug-registry.js";
import { getFirehallKitchenNegativePromptLines } from "../shared/food-imagery/firehall-kitchen-photo-standard.js";

const BBQ_GRILL_PROMPT_SUFFIX =
  "Active Canadian firehall kitchen — commercial stainless prep tables, crew-sized BBQ and grill spread on sheet pan or hotel pan serving tray, flat-top grill or outdoor grill station visible in background, industrial kitchen lighting, matte surfaces, hearty firefighter portions — NOT stock photo, NOT extreme close-up, NOT fire truck, NOT bunker gear, NOT single tiny portion";

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    limit: parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0", 10),
    only:
      args
        .find((a) => a.startsWith("--only="))
        ?.replace("--only=", "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? null,
  };
}

async function main(): Promise<void> {
  const { dryRun, force, limit, only } = parseArgs(process.argv);
  logOpenAIKeyDiagnostics("[bbq-batch-30-imagery]");
  const cfg = getFoodImageryConfig();

  let targets = BATCH_30_BBQ_GRILL_RECIPES.map((r) => ({
    slug: r.manifest.slug,
    title: r.manifest.title,
    subtitle: r.manifest.subtitle,
    protein: r.manifest.protein,
    cuisine: r.manifest.cuisine,
    mealFormat: r.manifest.mealFormat,
    hook: r.manifest.hookLine,
    ingredients: r.ingredients.map((i) => i.name).slice(0, 10),
  }));

  if (only?.length) {
    const set = new Set(only);
    targets = targets.filter((t) => set.has(t.slug));
  }
  if (limit > 0) targets = targets.slice(0, limit);

  if (!dryRun && !cfg.enabled) {
    console.error("[bbq-batch-30-imagery] Set OPENAI_API_KEY and FOOD_IMAGERY_ENABLED=true");
    process.exit(1);
  }

  console.log(`[bbq-batch-30-imagery] ${targets.length} targets (dryRun=${dryRun}, force=${force})`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]!;
    const heroPath = bbqCatalogHeroPath(t.slug);
    if (!force && imageFileExists(heroPath)) {
      skip++;
      console.log(`  ○ ${t.slug} — hero exists`);
      continue;
    }

    const stylePreset = "hall_bbq_dark" as const;

    const basePrompt = buildEditorialModelPrompt({
      mealName: t.title,
      category: "bbq_grill_nights",
      cuisine: t.cuisine,
      protein: t.protein,
      mealFormat: t.mealFormat,
      stylePreset,
      hookLine: t.hook,
      ingredientHints: t.ingredients,
    });
    const modelPrompt = `${basePrompt}\n\nDepict exactly: ${t.title} — ${t.subtitle}\n\n${BBQ_GRILL_PROMPT_SUFFIX}\n\nAvoid: ${getFirehallKitchenNegativePromptLines().join("; ")}`;

    if (dryRun) {
      console.log(`  ✓ ${t.slug} — ${modelPrompt.slice(0, 160)}…`);
      ok++;
      continue;
    }

    try {
      const buf = await generateFoodImageBuffer(modelPrompt, DEFAULT_HERO_GENERATION_SIZE);
      const heuristic = validateImageBufferHeuristic(buf);
      if (!heuristic.ok) {
        fail++;
        console.warn(`  ✗ ${t.slug}: heuristic — ${heuristic.reason}`);
        continue;
      }
      await writeBbqCatalogImageVariants(t.slug, buf, 1);
      ok++;
      console.log(`  ✓ ${t.slug} → ${heroPath}`);
    } catch (err: unknown) {
      fail++;
      console.warn(`  ✗ ${t.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n[bbq-batch-30-imagery] ok=${ok} skip=${skip} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
