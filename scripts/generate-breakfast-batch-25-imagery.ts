#!/usr/bin/env tsx
/**
 * Generate hero + mobile + thumb + rail for batch-25 breakfast recipes.
 *
 *   npm run generate:breakfast-batch-25-imagery
 *   npm run generate:breakfast-batch-25-imagery -- --dry-run
 *   npm run generate:breakfast-batch-25-imagery -- --limit=3
 *   npm run generate:breakfast-batch-25-imagery -- --force
 */
import { loadProjectEnv, logOpenAIKeyDiagnostics } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

import { BATCH_25_BREAKFAST_PAGES } from "../shared/breakfast-expansion/batch-25-breakfast-pages.js";
import { buildEditorialModelPrompt } from "../server/imagery/build-image-prompt.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { DEFAULT_HERO_GENERATION_SIZE } from "../server/lib/image-sizes.js";
import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";
import { getFoodImageryConfig } from "../server/food-imagery/config.js";
import { writeBreakfastCatalogImageVariants } from "../server/imagery/variants.js";
import { imageFileExists } from "../shared/explore-image-paths.js";
import { breakfastCatalogHeroPath } from "../shared/breakfast-catalog/slug-registry.js";

const BREAKFAST_PROMPT_SUFFIX =
  "Active Canadian firehall station kitchen — commercial stainless prep tables, crew-sized breakfast spread on sheet pan or serving tray, griddle and breakfast station atmosphere, wide composition showing entire meal, industrial kitchen lighting, matte surfaces, hearty firefighter portions — NOT stock photo, NOT extreme close-up, NOT wellness blog pastel, NOT single tiny portion, NOT firefighter marketing";

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

function mealFormatFromTags(tags: string[]): string {
  if (tags.some((t) => /burrito|wrap|crunchwrap/.test(t))) return "wrap";
  if (tags.some((t) => /sandwich|benedict|bagel|slider|stromboli/.test(t))) return "sandwich";
  if (tags.some((t) => /waffle|pancake|johnnycake|french-toast/.test(t))) return "breakfast";
  if (tags.some((t) => /hash|skillet|fry-up|grits/.test(t))) return "skillet";
  if (tags.some((t) => /casserole|strata|bake|chilaquiles/.test(t))) return "sheet_pan";
  if (tags.some((t) => /fried-rice|rice/.test(t))) return "bowl";
  return "breakfast";
}

function proteinFromTags(tags: string[]): string {
  if (tags.some((t) => /steak|beef|corned|scrapple|bacon|sausage|pork/.test(t))) return "pork";
  if (tags.some((t) => /chicken|waffle/.test(t))) return "chicken";
  if (tags.some((t) => /shrimp|salmon|lox|fish/.test(t))) return "seafood";
  if (tags.some((t) => /egg|huevos|migas/.test(t))) return "eggs";
  return "eggs";
}

async function main(): Promise<void> {
  const { dryRun, force, limit, only } = parseArgs(process.argv);
  logOpenAIKeyDiagnostics("[breakfast-batch-25-imagery]");
  const cfg = getFoodImageryConfig();

  let targets = BATCH_25_BREAKFAST_PAGES.map((page) => ({
    slug: page.slug,
    title: page.title,
    subtitle: page.subtitle,
    tags: page.tags,
    imageAlt: page.imageAlt,
    ingredients: page.ingredients.map((i) => i.name).slice(0, 8),
  }));

  if (only?.length) {
    const set = new Set(only);
    targets = targets.filter((t) => set.has(t.slug));
  }
  if (limit > 0) targets = targets.slice(0, limit);

  if (!dryRun && !cfg.enabled) {
    console.error("[breakfast-batch-25-imagery] Set OPENAI_API_KEY and FOOD_IMAGERY_ENABLED=true");
    process.exit(1);
  }

  console.log(`[breakfast-batch-25-imagery] ${targets.length} targets (dryRun=${dryRun}, force=${force})`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]!;
    const heroPath = breakfastCatalogHeroPath(t.slug);
    if (!force && imageFileExists(heroPath)) {
      skip++;
      console.log(`  ○ ${t.slug} — hero exists`);
      continue;
    }

    const basePrompt = buildEditorialModelPrompt({
      mealName: t.title,
      category: "breakfast_brunch",
      cuisine: "American",
      protein: proteinFromTags(t.tags),
      mealFormat: mealFormatFromTags(t.tags),
      stylePreset: "breakfast_shift",
      hookLine: t.subtitle,
      ingredientHints: t.ingredients,
    });
    const modelPrompt = `${basePrompt}\n\nDepict exactly: ${t.imageAlt}\n\n${BREAKFAST_PROMPT_SUFFIX}`;

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
        console.warn(`  ✗ ${t.slug}: ${heuristic.reason}`);
        continue;
      }

      const paths = await writeBreakfastCatalogImageVariants(t.slug, buf, 1);
      ok++;
      console.log(`  ✓ ${t.slug} → ${paths.hero}`);
    } catch (err: unknown) {
      fail++;
      console.warn(`  ✗ ${t.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (i < targets.length - 1) {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  console.log(`\n[breakfast-batch-25-imagery] done ok=${ok} skip=${skip} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
