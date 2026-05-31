#!/usr/bin/env tsx
/**
 * Generate unique hero replacements from the firehall photo standard queue.
 *
 * Prerequisite:
 *   npm run audit:firehall-photo-standard
 *
 * Usage:
 *   npm run generate:firehall-photo-replacements
 *   npm run generate:firehall-photo-replacements -- --dry-run
 *   npm run generate:firehall-photo-replacements -- --limit=5
 *   npm run generate:firehall-photo-replacements -- --only=pad-thai
 *   npm run generate:firehall-photo-replacements -- --priority=p0
 *   npm run generate:firehall-photo-replacements -- --collection=golden_100
 *   npm run generate:firehall-photo-replacements -- --force
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
import { hasOpenAIKey } from "../server/openai-client.js";
import {
  writeEditorialImageVariants,
  writeBreakfastCatalogImageVariants,
  writeBbqCatalogImageVariants,
  writeHallExpansionCatalogImageVariants,
} from "../server/imagery/variants.js";
import { imageFileExists } from "../shared/explore-image-paths.js";
import { FIREHALL_KITCHEN_PHOTO_STANDARD_VERSION } from "../shared/food-imagery/firehall-kitchen-photo-standard.js";

type QueueItem = {
  collection: string;
  slug: string;
  title: string;
  protein: string;
  mealFormat: string;
  category: string;
  photoCategory: string;
  heroImage: string;
  priority: "p0" | "p1";
};

const QUEUE_PATH = path.join("review", "firehall-photo-replacement-queue.json");

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force") || !args.includes("--no-force"),
    limit: parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0", 10),
    priority:
      (args.find((a) => a.startsWith("--priority="))?.split("=")[1] as "p0" | "p1" | undefined) ??
      undefined,
    collection: args.find((a) => a.startsWith("--collection="))?.split("=")[1],
    only:
      args
        .find((a) => a.startsWith("--only="))
        ?.replace("--only=", "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? null,
  };
}

function loadQueue(): QueueItem[] {
  if (!fs.existsSync(QUEUE_PATH)) {
    throw new Error(`Missing ${QUEUE_PATH}. Run: npm run audit:firehall-photo-standard`);
  }
  const raw = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8")) as { queue: QueueItem[] };
  return raw.queue || [];
}

async function writeVariants(collection: string, slug: string, buffer: Buffer): Promise<void> {
  switch (collection) {
    case "golden_100":
    case "performance_meals":
    case "pizza_night":
      await writeEditorialImageVariants(slug, buffer, "comfort_firehall", 2);
      return;
    case "breakfast":
      await writeBreakfastCatalogImageVariants(slug, buffer, 2);
      return;
    case "bbq":
      await writeBbqCatalogImageVariants(slug, buffer, 2);
      return;
    case "hall_expansion":
      await writeHallExpansionCatalogImageVariants(slug, buffer, 2);
      return;
    case "smoothies":
      await writeEditorialImageVariants(slug, buffer, "healthy_performance", 2);
      return;
    default:
      throw new Error(`Unsupported collection for replacement: ${collection}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const cfg = getFoodImageryConfig();
  if (!args.dryRun && !hasOpenAIKey()) {
    logOpenAIKeyDiagnostics();
    throw new Error("OPENAI_API_KEY required for image generation");
  }

  let queue = loadQueue();
  if (args.priority) queue = queue.filter((q) => q.priority === args.priority);
  if (args.collection) queue = queue.filter((q) => q.collection === args.collection);
  if (args.only?.length) {
    const set = new Set(args.only);
    queue = queue.filter((q) => set.has(q.slug));
  }
  if (args.limit > 0) queue = queue.slice(0, args.limit);

  console.log(
    `[generate:firehall-photo-replacements] standard=${FIREHALL_KITCHEN_PHOTO_STANDARD_VERSION} items=${queue.length} dryRun=${args.dryRun}`,
  );

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of queue) {
    if (!args.force && imageFileExists(item.heroImage)) {
      const isDuplicate = item.heroImage.includes("donor");
      if (!isDuplicate) {
        skipped += 1;
        console.log(`[skip] ${item.slug} — hero exists (use --force to replace)`);
        continue;
      }
    }

    const prompt = buildEditorialModelPrompt({
      mealName: item.title,
      category: item.category,
      protein: item.protein,
      mealFormat: item.mealFormat,
      moodTags: [item.photoCategory, item.collection],
    });

    if (args.dryRun) {
      console.log(`[dry-run] ${item.collection}:${item.slug}`);
      console.log(prompt.slice(0, 240) + "…");
      continue;
    }

    try {
      const buffer = await generateFoodImageBuffer(prompt, DEFAULT_HERO_GENERATION_SIZE);
      const heuristic = validateImageBufferHeuristic(buffer);
      if (!heuristic.ok) {
        failed += 1;
        console.warn(`[fail-heuristic] ${item.slug}: ${heuristic.reason}`);
        continue;
      }
      await writeVariants(item.collection, item.slug, buffer);
      generated += 1;
      console.log(`[ok] ${item.collection}:${item.slug}`);
    } catch (err) {
      failed += 1;
      console.error(`[fail] ${item.slug}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(
    `[generate:firehall-photo-replacements] generated=${generated} skipped=${skipped} failed=${failed}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
