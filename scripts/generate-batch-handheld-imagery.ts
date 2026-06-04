#!/usr/bin/env tsx
/**
 * Generate unique hero + card variants for handheld batch (no donors).
 *
 *   npx tsx scripts/generate-batch-handheld-imagery.ts --dry-run
 *   npx tsx scripts/generate-batch-handheld-imagery.ts --force
 *   npx tsx scripts/generate-batch-handheld-imagery.ts --only=chicken-caesar-wraps
 */
import { loadProjectEnv, logOpenAIKeyDiagnostics } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

import fs from "node:fs";
import path from "node:path";
import { BATCH_HANDHELD_WRAP_RECIPES } from "../shared/hall-expansion/adapted/batch-handheld-wraps.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { buildEditorialModelPrompt } from "../server/imagery/build-image-prompt.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { DEFAULT_HERO_GENERATION_SIZE } from "../server/lib/image-sizes.js";
import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";
import { getFoodImageryConfig } from "../server/food-imagery/config.js";
import { writeHallExpansionCatalogImageVariants, writeEditorialImageVariants } from "../server/imagery/variants.js";
import { TITLE_LOCKED_IMAGE_PROMPTS } from "../shared/food-imagery/title-locked-prompts.js";
import { getFirehallKitchenNegativePromptLines } from "../shared/food-imagery/firehall-kitchen-photo-standard.js";
import { buildRecipeHeroAlt } from "../shared/seo/recipe-image-seo.js";

const HANDHELD_SLUGS = [
  "chicken-caesar-wraps",
  "buffalo-chicken-wraps",
  "greek-chicken-pitas",
  "beef-gyros-for-the-hall",
  "chicken-shawarma-pitas",
  "sausage-peppers-on-buns",
] as const;

const GOLDEN_SLUG = "chicken-dumpling-soup";

const FIREHALL_SUFFIX =
  "Realistic Canadian firehall kitchen food photography — commercial stainless prep line, warm practical lighting, hearty crew portions, natural textures, visible steam where hot — NOT stock photo, NOT AI gloss, NOT generic chicken bowl, NOT influencer styling";

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    only:
      args
        .find((a) => a.startsWith("--only="))
        ?.replace("--only=", "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? null,
  };
}

function buildPromptForSlug(slug: string, title: string, mealFormat: string, protein: string, cuisine: string): string {
  const locked = TITLE_LOCKED_IMAGE_PROMPTS[slug];
  const base = buildEditorialModelPrompt({
    mealName: title,
    category: slug === GOLDEN_SLUG ? "comfort_food" : "crew_feeders",
    cuisine,
    protein,
    mealFormat,
    stylePreset: "comfort_firehall",
    ingredientHints: [],
  });
  return [base, locked, FIREHALL_SUFFIX, `Avoid: ${getFirehallKitchenNegativePromptLines().join("; ")}`]
    .filter(Boolean)
    .join("\n\n");
}

function updatePageJson(
  pagePath: string,
  paths: { hero: string; thumb: string; mobile: string; rail: string },
  heroAlt: string,
): void {
  if (!fs.existsSync(pagePath)) return;
  const page = JSON.parse(fs.readFileSync(pagePath, "utf8")) as Record<string, unknown>;
  page.heroImage = paths.hero;
  page.thumbImage = paths.thumb;
  page.mobileImage = paths.mobile;
  page.railImage = paths.rail;
  page.heroImageAlt = heroAlt;
  fs.writeFileSync(pagePath, `${JSON.stringify(page, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const { dryRun, force, only } = parseArgs(process.argv);
  logOpenAIKeyDiagnostics("[handheld-imagery]");
  const cfg = getFoodImageryConfig();

  type Target = { slug: string; title: string; mealFormat: string; protein: string; cuisine: string; collection: "hall" | "golden" };
  const targets: Target[] = [];

  for (const slug of HANDHELD_SLUGS) {
    const def = BATCH_HANDHELD_WRAP_RECIPES.find((r) => r.slug === slug);
    if (!def) continue;
    targets.push({
      slug,
      title: def.title,
      mealFormat: def.mealFormat,
      protein: def.protein,
      cuisine: def.cuisine,
      collection: "hall",
    });
  }

  const dumpling = GOLDEN_100_RECIPES.find((r) => r.slug === GOLDEN_SLUG);
  if (dumpling) {
    targets.push({
      slug: GOLDEN_SLUG,
      title: dumpling.title,
      mealFormat: dumpling.mealFormat,
      protein: dumpling.protein,
      cuisine: dumpling.cuisine,
      collection: "golden",
    });
  }

  let filtered = targets;
  if (only?.length) {
    const set = new Set(only);
    filtered = targets.filter((t) => set.has(t.slug));
  }

  if (!dryRun && !cfg.enabled) {
    console.error("[handheld-imagery] Set OPENAI_API_KEY and FOOD_IMAGERY_ENABLED=true");
    process.exit(1);
  }

  console.log(`[handheld-imagery] ${filtered.length} targets (dryRun=${dryRun}, force=${force})`);

  let ok = 0;
  let fail = 0;

  for (const t of filtered) {
    const modelPrompt = buildPromptForSlug(t.slug, t.title, t.mealFormat, t.protein, t.cuisine);
    if (dryRun) {
      console.log(`  [dry-run] ${t.slug} — ${t.title}`);
      console.log(`    prompt length: ${modelPrompt.length}`);
      ok++;
      continue;
    }

    try {
      console.log(`  … generating ${t.slug}`);
      const buffer = await generateFoodImageBuffer(modelPrompt, DEFAULT_HERO_GENERATION_SIZE);
      const heuristic = validateImageBufferHeuristic(buffer);
      if (!heuristic.ok) {
        throw new Error(`heuristic: ${heuristic.reason}`);
      }

      const version = Date.now() % 10000;
      let paths: { hero: string; thumb: string; mobile: string; rail: string };

      if (t.collection === "hall") {
        paths = await writeHallExpansionCatalogImageVariants(t.slug, buffer, version);
        const pagePath = path.join(process.cwd(), "client/public/catalog/hall-expansion/pages", `${t.slug}.json`);
        const heroAlt = buildRecipeHeroAlt(
          `${t.title} — crew-sized platter on firehall prep line, realistic kitchen photography`,
        );
        updatePageJson(pagePath, paths, heroAlt);
      } else {
        const editorial = await writeEditorialImageVariants(t.slug, buffer, "comfort_firehall", version, "golden100");
        paths = {
          hero: editorial.hero,
          thumb: editorial.thumb,
          mobile: editorial.mobile,
          rail: editorial.rail,
        };
        const pagePath = path.join(process.cwd(), "client/public/catalog/golden-100/pages", `${t.slug}.json`);
        const heroAlt = buildRecipeHeroAlt(`${t.title} — thick chicken stew with fluffy dumplings on top, firehall Dutch oven`);
        updatePageJson(pagePath, paths, heroAlt);
      }

      console.log(`  ✓ ${t.slug}`);
      console.log(`    hero: ${paths.hero}`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${t.slug}:`, e instanceof Error ? e.message : e);
      fail++;
    }
  }

  console.log(`[handheld-imagery] done ok=${ok} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
