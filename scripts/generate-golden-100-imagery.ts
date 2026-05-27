#!/usr/bin/env tsx

/**

 * Golden 100 + Hall Classics editorial imagery pipeline.

 *

 *   npx tsx scripts/generate-golden-100-imagery.ts --dry-run

 *   npx tsx scripts/generate-golden-100-imagery.ts --limit=5

 *   npx tsx scripts/generate-golden-100-imagery.ts --only=smash-burgers,chicken-parm

 *   npx tsx scripts/generate-golden-100-imagery.ts --classics

 *   npx tsx scripts/generate-golden-100-imagery.ts --approve

 *   npx tsx scripts/generate-golden-100-imagery.ts --force

 *   npx tsx scripts/generate-golden-100-imagery.ts --skip-qa-fail

 */

import { loadProjectEnv, logOpenAIKeyDiagnostics } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";

import { runDbMigrations } from "../server/db/migrate.js";

import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";

import { CLASSIC_HALL_MEALS } from "../shared/classic-hall-meals.js";

import { buildEditorialModelPrompt, buildEditorialImagePrompt } from "../server/imagery/build-image-prompt.js";

import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { DEFAULT_HERO_GENERATION_SIZE } from "../server/lib/image-sizes.js";

import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";

import { getFoodImageryConfig } from "../server/food-imagery/config.js";

import { writeEditorialImageVariants } from "../server/imagery/variants.js";

import { attachEditorialImagesToSlug, getEditorialImageForSlug } from "../server/imagery/update-recipe-images.js";

import { createEmptyEditorialImageMetadata } from "../shared/editorial-image-metadata.js";

import { buildSocialPackStub } from "../shared/editorial-image-social.js";

import { scoreEditorialImageQuality } from "../server/imagery/score-image-quality.js";

import { flushSqliteToDisk } from "../server/sqlite.js";

import { getCuratedPackageDef } from "../shared/curated-hall-packages.js";



interface ImageryTarget {

  slug: string;

  title: string;

  category: string;

  cuisine: string;

  protein: string;

  mealFormat: string;

  hookLine?: string;

  ingredientHints?: string[];

}



function targetsFromGolden(): ImageryTarget[] {

  return GOLDEN_100_RECIPES.map((r) => ({

    slug: r.classicSlug || r.slug,

    title: r.title,

    category: r.masterCategoryId,

    cuisine: r.cuisine,

    protein: r.protein,

    mealFormat: r.mealFormat,

    hookLine: r.hookLine,

    ingredientHints: [],

  }));

}



function targetsFromClassics(filter: Set<string> | null): ImageryTarget[] {

  return CLASSIC_HALL_MEALS.filter((m) => !filter || filter.has(m.slug)).map((m) => {

    const pkg = getCuratedPackageDef(m.slug);

    return {

      slug: m.slug,

      title: m.title,

      category: "firehall_classics",

      cuisine: m.cuisine,

      protein: m.protein,

      mealFormat: m.mealFormat,

      hookLine: m.exploreSummary ?? m.description,

      ingredientHints: pkg?.ingredients?.map((i) => i.name).slice(0, 8),

    };

  });

}



async function main(): Promise<void> {

  const args = process.argv.slice(2);

  const dryRun = args.includes("--dry-run");

  const force = args.includes("--force");

  const approve = args.includes("--approve");

  const classics = args.includes("--classics");

  const skipQaFail = args.includes("--skip-qa-fail");

  const limit = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0", 10);

  const onlyArg = args.find((a) => a.startsWith("--only="));

  const onlySlugs = onlyArg

    ? new Set(onlyArg.replace("--only=", "").split(",").map((s) => s.trim()).filter(Boolean))

    : null;



  await runDbMigrations();

  await initCuratedRecipeStore();



  logOpenAIKeyDiagnostics("[golden-imagery]");

  const cfg = getFoodImageryConfig();

  if (!dryRun && !cfg.enabled) {

    console.error("[golden-imagery] Set OPENAI_API_KEY and FOOD_IMAGERY_ENABLED=true in .env");

    process.exit(1);

  }



  let targets: ImageryTarget[] = classics ? targetsFromClassics(onlySlugs) : targetsFromGolden();

  if (!classics && onlySlugs) {

    targets = targets.filter((t) => onlySlugs.has(t.slug));

  }

  if (limit > 0) targets = targets.slice(0, limit);



  console.log(`[golden-imagery] ${targets.length} targets (dryRun=${dryRun}, force=${force})`);



  let ok = 0;

  let skip = 0;

  let fail = 0;

  let qaFlagged = 0;



  for (let i = 0; i < targets.length; i++) {

    const t = targets[i]!;

    const existing = getEditorialImageForSlug(t.slug);

    if (existing?.imageApproved && !force) {

      skip++;

      console.log(`  ○ ${t.slug} — already approved`);

      continue;

    }

    if (existing?.heroImage && !force && !dryRun) {

      skip++;

      console.log(`  ○ ${t.slug} — has editorial hero (use --force)`);

      continue;

    }



    const promptResult = buildEditorialImagePrompt({

      mealName: t.title,

      category: t.category,

      cuisine: t.cuisine,

      protein: t.protein,

      mealFormat: t.mealFormat,

      moodTags: [t.category, t.mealFormat],

      ingredientHints: t.ingredientHints,

      hookLine: t.hookLine,

    });



    if (dryRun) {

      console.log(`  ✓ ${t.slug} [${promptResult.stylePreset}] lock+mobile crop embedded`);

      console.log(`    ${buildEditorialModelPrompt({

        mealName: t.title,

        category: t.category,

        cuisine: t.cuisine,

        protein: t.protein,

        mealFormat: t.mealFormat,

        stylePreset: promptResult.stylePreset,

      }).slice(0, 220)}…`);

      ok++;

      continue;

    }



    try {

      const modelPrompt = buildEditorialModelPrompt({

        mealName: t.title,

        category: t.category,

        cuisine: t.cuisine,

        protein: t.protein,

        mealFormat: t.mealFormat,

        stylePreset: promptResult.stylePreset,

        hookLine: t.hookLine,

        ingredientHints: t.ingredientHints,

      });



      const buf = await generateFoodImageBuffer(modelPrompt, DEFAULT_HERO_GENERATION_SIZE);

      const heuristic = validateImageBufferHeuristic(buf);

      if (!heuristic.ok) {

        fail++;

        console.warn(`  ✗ ${t.slug}: buffer — ${heuristic.reason}`);

        continue;

      }



      const nextVersion = (existing?.imageVersion || 0) + 1;

      const quality = await scoreEditorialImageQuality({

        buffer: buf,

        mealName: t.title,

        stylePreset: promptResult.stylePreset,

        useVision: cfg.visionValidate,

      });



      if (quality.needsRegeneration && !skipQaFail && !force) {

        qaFlagged++;

        console.warn(

          `  ⚠ ${t.slug}: QA composite=${quality.composite} flags=${quality.flags.join(",")} — use --force or --skip-qa-fail`,

        );

        continue;

      }



      const paths = await writeEditorialImageVariants(

        t.slug,

        buf,

        promptResult.stylePreset,

        nextVersion,

      );



      const meta = createEmptyEditorialImageMetadata(

        t.slug,

        promptResult.stylePreset,

        promptResult.promptSeed,

        nextVersion,

      );

      meta.heroImage = paths.hero;

      meta.mobileHeroImage = paths.mobile;

      meta.thumbnailImage = paths.thumb;

      meta.railPreviewImage = paths.rail;

      meta.promptHash = promptResult.promptHash;

      meta.generatedAt = new Date().toISOString();

      meta.model = cfg.model;

      meta.imageVersion = nextVersion;

      meta.imageApproved = approve && quality.pass;

      meta.regenerationCount = (existing?.regenerationCount || 0) + (quality.needsRegeneration ? 1 : 0);

      meta.lqip = paths.lqip ?? undefined;

      meta.delivery = paths.delivery;

      meta.quality = quality;

      meta.social = buildSocialPackStub({

        slug: t.slug,

        title: t.title,

        stylePreset: promptResult.stylePreset,

        hookLine: t.hookLine,

        categoryLabel: t.category,

      });



      if (!attachEditorialImagesToSlug({ slug: t.slug, metadata: meta, markApproved: approve && quality.pass })) {

        fail++;

        console.warn(`  ✗ ${t.slug}: no curated row — run seed:golden-100 first`);

        continue;

      }



      ok++;

      const qaNote = quality.pass ? "QA pass" : `QA ${quality.composite}`;

      console.log(`  ✓ ${t.slug} → ${paths.mobile} [${promptResult.stylePreset}] ${qaNote}`);

    } catch (err: unknown) {

      fail++;

      console.warn(`  ✗ ${t.slug}: ${err instanceof Error ? err.message : String(err)}`);

    }



    if (i < targets.length - 1) {

      await new Promise((r) => setTimeout(r, 1200));

    }

  }



  flushSqliteToDisk();

  console.log(`\n[golden-imagery] done ok=${ok} skip=${skip} fail=${fail} qaFlagged=${qaFlagged}`);

  process.exit(fail > 0 ? 1 : 0);

}



main().catch((e) => {

  console.error(e);

  process.exit(1);

});

