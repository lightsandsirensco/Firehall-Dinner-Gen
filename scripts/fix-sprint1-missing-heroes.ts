#!/usr/bin/env tsx
/**
 * One-off remediation: generate + write hero imagery for the 10 recipes
 * flagged by `audit:sitemap` as missing hero image files (Sprint 1 recipe
 * platform audit). Writes directly to the collection's standard image
 * paths — bypasses the curated_recipes DB (these recipes already live in
 * their catalog JSON with the correct heroImage path; they just never had
 * a physical file generated).
 *
 *   npx tsx scripts/fix-sprint1-missing-heroes.ts --dry-run
 *   npx tsx scripts/fix-sprint1-missing-heroes.ts
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";
import { buildEditorialModelPrompt } from "../server/imagery/build-image-prompt.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";
import {
  writeEditorialImageVariants,
  writeHallExpansionCatalogImageVariants,
  writeBreakfastCatalogImageVariants,
} from "../server/imagery/variants.js";

applyDevOpenAiTlsIfAllowed();

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const DRY_RUN = process.argv.includes("--dry-run");

type Collection = "golden-100" | "hall-expansion" | "breakfast";

interface Target {
  slug: string;
  collection: Collection;
}

const TARGETS: Target[] = [
  { slug: "30-minute-pasta-e-fagioli-for-the-hall", collection: "golden-100" },
  { slug: "french-onion-soup-for-the-hall", collection: "golden-100" },
  { slug: "spaghetti-aglio-e-olio-for-the-hall", collection: "golden-100" },
  { slug: "classic-patty-melt-for-the-crew", collection: "hall-expansion" },
  { slug: "best-tuna-melt-for-the-hall", collection: "hall-expansion" },
  { slug: "hall-blt-sandwich-feed", collection: "hall-expansion" },
  { slug: "bagel-sandwich-line", collection: "breakfast" },
  { slug: "hash-brown-breakfast-casserole", collection: "breakfast" },
  { slug: "overnight-oat-bar-crew", collection: "breakfast" },
  { slug: "sheet-pan-eggs-sausage-crew", collection: "breakfast" },
];

function readJson(rel: string): any {
  return JSON.parse(fs.readFileSync(path.join(PUBLIC, rel), "utf8"));
}

function tagValue(tags: string[] | undefined, prefix: string): string | undefined {
  const hit = (tags || []).find((t) => t.startsWith(`${prefix}:`));
  return hit ? hit.slice(prefix.length + 1) : undefined;
}

function buildPromptInputForGolden(page: any) {
  return {
    mealName: page.title,
    category: page.category,
    cuisine: page.cuisine,
    protein: page.protein && typeof page.protein === "string" ? page.protein : tagValue(page.tags, "protein"),
    mealFormat: tagValue(page.tags, "format"),
    ingredientHints: (page.ingredients || []).slice(0, 8).map((i: any) => i.name),
    hookLine: page.whyCrewsLikeIt,
  };
}

function buildPromptInputForHallExpansion(page: any) {
  return {
    mealName: page.title,
    category: "hall_expansion",
    cuisine: page.cuisine,
    protein: tagValue(page.tags, "protein") || "mixed",
    mealFormat: tagValue(page.tags, "format") || "plated_main",
    ingredientHints: (page.ingredients || []).slice(0, 8).map((i: any) => i.name),
  };
}

function buildPromptInputForBreakfast(page: any) {
  return {
    mealName: page.title,
    category: "breakfast",
    cuisine: "american",
    protein: (page.tags || []).find((t: string) => /bacon|sausage|egg/i.test(t)) || "eggs",
    mealFormat: "breakfast_spread",
    ingredientHints: (page.ingredients || []).slice(0, 8).map((i: any) => i.name),
    hookLine: page.subtitle,
  };
}

function pageRelPath(collection: Collection, slug: string): string {
  return `catalog/${collection}/pages/${slug}.json`;
}

async function main(): Promise<void> {
  console.log(`[fix-sprint1-heroes] ${TARGETS.length} targets (dryRun=${DRY_RUN})`);
  let ok = 0;
  let fail = 0;

  for (const target of TARGETS) {
    const { slug, collection } = target;
    try {
      const page = readJson(pageRelPath(collection, slug));

      const promptInput =
        collection === "golden-100"
          ? buildPromptInputForGolden(page)
          : collection === "hall-expansion"
            ? buildPromptInputForHallExpansion(page)
            : buildPromptInputForBreakfast(page);

      const prompt = buildEditorialModelPrompt(promptInput);

      if (DRY_RUN) {
        console.log(`  ○ ${slug} [${collection}] would generate — prompt ${prompt.length} chars`);
        ok++;
        continue;
      }

      const buffer = await generateFoodImageBuffer(prompt);
      const heuristic = validateImageBufferHeuristic(buffer);
      if (!heuristic.ok) {
        console.warn(`  ! ${slug}: heuristic QA flagged: ${heuristic.reason} ${heuristic.notes ?? ""} — writing anyway (manual review)`);
      }

      if (collection === "golden-100") {
        await writeEditorialImageVariants(slug, buffer, "comfort_firehall", 1, "golden100");
      } else if (collection === "hall-expansion") {
        await writeHallExpansionCatalogImageVariants(slug, buffer, 1);
      } else {
        await writeBreakfastCatalogImageVariants(slug, buffer, 1);
      }

      console.log(`  \u2713 ${slug} [${collection}]: wrote ${buffer.length} bytes`);
      ok++;
      await new Promise((r) => setTimeout(r, 300));
    } catch (err: any) {
      fail++;
      console.error(`  \u2717 ${slug} [${collection}]: ${err?.message || String(err)}`);
    }
  }

  console.log(`[fix-sprint1-heroes] done ok=${ok} fail=${fail}`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
