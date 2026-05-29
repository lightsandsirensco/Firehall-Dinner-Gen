#!/usr/bin/env tsx
/**
 * Generate curated smoothie catalog imagery (Firehall dark aesthetic).
 *
 *   npx tsx scripts/generate-smoothie-catalog-imagery.ts --dry-run
 *   npx tsx scripts/generate-smoothie-catalog-imagery.ts --limit=2
 *   npx tsx scripts/generate-smoothie-catalog-imagery.ts --force
 */
import { loadProjectEnv, logOpenAIKeyDiagnostics } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

import { SMOOTHIE_CATALOG_ITEMS } from "../shared/fuel-catalog/smoothies/catalog-data.js";
import { buildEditorialModelPrompt } from "../server/imagery/build-image-prompt.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { DEFAULT_HERO_GENERATION_SIZE } from "../server/lib/image-sizes.js";
import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";
import { getFoodImageryConfig } from "../server/food-imagery/config.js";
import { writeSmoothieCatalogImageVariants } from "../server/imagery/variants.js";
import { imageFileExists } from "../shared/explore-image-paths.js";

const SMOOTHIE_PROMPT_SUFFIX =
  "Dark moody firehall station counter, matte black or stainless surface, warm low-key lighting, realistic cup or glass or blender bottle, condensation and natural ingredient texture nearby, rugged crew-shift fuel — NOT bright wellness blog, NOT pastel Pinterest smoothie, NOT white marble kitchen";

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    limit: parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0", 10),
    only: args.find((a) => a.startsWith("--only="))?.replace("--only=", "").split(",").map((s) => s.trim()).filter(Boolean) ?? null,
  };
}

async function main(): Promise<void> {
  const { dryRun, force, limit, only } = parseArgs(process.argv);
  logOpenAIKeyDiagnostics("[smoothie-catalog-imagery]");
  const cfg = getFoodImageryConfig();

  let targets = SMOOTHIE_CATALOG_ITEMS.map((item) => ({
    slug: item.slug,
    title: item.title,
    subtitle: item.subtitle,
    taxonomy: item.taxonomyCategory,
    ingredients: item.ingredients.map((i) => i.name).slice(0, 8),
  }));

  if (only?.length) {
    const set = new Set(only);
    targets = targets.filter((t) => set.has(t.slug));
  }
  if (limit > 0) targets = targets.slice(0, limit);

  if (!dryRun && !cfg.enabled) {
    console.error("[smoothie-catalog-imagery] Set OPENAI_API_KEY and FOOD_IMAGERY_ENABLED=true");
    process.exit(1);
  }

  console.log(`[smoothie-catalog-imagery] ${targets.length} targets (dryRun=${dryRun}, force=${force})`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const t of targets) {
    const heroPath = `/images/smoothies/${t.slug}.jpg`;
    if (!force && imageFileExists(heroPath)) {
      skip++;
      console.log(`  ○ ${t.slug} — hero exists`);
      continue;
    }

    const basePrompt = buildEditorialModelPrompt({
      mealName: t.title,
      category: "smoothies",
      cuisine: "American",
      protein: t.taxonomy.includes("protein") ? "protein" : "blend",
      mealFormat: "smoothie",
      stylePreset: "healthy_performance",
      hookLine: t.subtitle,
      ingredientHints: t.ingredients,
    });
    const modelPrompt = `${basePrompt}\n\n${SMOOTHIE_PROMPT_SUFFIX}`;

    if (dryRun) {
      console.log(`  ✓ ${t.slug} — ${modelPrompt.slice(0, 180)}…`);
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

      await writeSmoothieCatalogImageVariants(t.slug, buf, 1);
      ok++;
      console.log(`  ✓ ${t.slug} → ${heroPath}`);
    } catch (err) {
      fail++;
      console.warn(`  ✗ ${t.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n[smoothie-catalog-imagery] ok=${ok} skip=${skip} fail=${fail}`);
  if (fail > 0) process.exit(1);
}

main();
