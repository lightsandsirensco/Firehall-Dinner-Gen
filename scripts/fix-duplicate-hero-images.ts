#!/usr/bin/env tsx
/**
 * Sprint 1.5 remediation: generate brand-new, unique hero imagery for every
 * recipe currently flagged by `audit:hero-images` as sharing hero-image
 * bytes with another recipe (`review/hero-image-validation.json`).
 *
 * For each duplicate cluster we keep the recipe whose slug matches the
 * shared file's basename exactly (the recipe the image was almost
 * certainly generated for originally) and regenerate a distinct photo for
 * every other recipe in the cluster ("peers").
 *
 *   npx tsx scripts/fix-duplicate-hero-images.ts --dry-run
 *   npx tsx scripts/fix-duplicate-hero-images.ts
 *   npx tsx scripts/fix-duplicate-hero-images.ts --slugs=slug-a,slug-b
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
const SLUG_FILTER = process.argv
  .find((a) => a.startsWith("--slugs="))
  ?.replace("--slugs=", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

type Collection = "golden-100" | "hall-expansion" | "breakfast";

interface Target {
  slug: string;
  collection: Collection;
  title: string;
  sharedWith: string;
}

const VALIDATION_REPORT = path.join(ROOT, "review", "hero-image-validation.json");
const REPORT_OUT = path.join(ROOT, "review", "duplicate-hero-remediation-report.json");

function collectionFromReportValue(v: string): Collection {
  if (v === "golden_100") return "golden-100";
  if (v === "hall_expansion") return "hall-expansion";
  if (v === "breakfast") return "breakfast";
  throw new Error(`Unmapped collection value: ${v}`);
}

/** Build the {peer-slug -> keep-slug} remediation targets from the hash audit. */
function buildTargets(): Target[] {
  const report = JSON.parse(fs.readFileSync(VALIDATION_REPORT, "utf8"));
  const flagged = report.rows.filter(
    (row: any) => row.exploreMapping && row.exploreMapping.status === "duplicate_conflict",
  );

  const byMd5 = new Map<string, any[]>();
  for (const row of flagged) {
    const md5 = row.exploreMapping.heroMd5;
    const list = byMd5.get(md5) ?? [];
    list.push(row);
    byMd5.set(md5, list);
  }

  const targets: Target[] = [];
  for (const rows of byMd5.values()) {
    const heroPath = rows[0].heroImage as string;
    const heroBase = heroPath.split("/").pop()!.replace(/\.[a-z]+$/, "");
    const primary = rows.find((r) => r.slug === heroBase);
    if (!primary) {
      console.warn(`  ! no exact-filename primary for cluster ${heroPath} — skipping (needs manual review)`);
      continue;
    }
    for (const row of rows) {
      if (row.slug === heroBase) continue;
      targets.push({
        slug: row.slug,
        collection: collectionFromReportValue(row.collection),
        title: row.title,
        sharedWith: primary.slug,
      });
    }
  }
  return targets;
}

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
    hookLine: page.whyCrewsLikeIt,
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
  let targets = buildTargets();
  if (SLUG_FILTER?.length) {
    targets = targets.filter((t) => SLUG_FILTER.includes(t.slug));
  }

  console.log(`[fix-duplicate-heroes] ${targets.length} targets (dryRun=${DRY_RUN})`);
  let ok = 0;
  let fail = 0;
  const results: Array<Record<string, unknown>> = [];

  for (const target of targets) {
    const { slug, collection, sharedWith } = target;
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
        console.log(`  \u25cb ${slug} [${collection}] (was sharing bytes with ${sharedWith}) — prompt ${prompt.length} chars`);
        results.push({ slug, collection, sharedWith, action: "dry_run", promptLength: prompt.length });
        ok++;
        continue;
      }

      const buffer = await generateFoodImageBuffer(prompt);
      const heuristic = validateImageBufferHeuristic(buffer);
      if (!heuristic.ok) {
        console.warn(`  ! ${slug}: heuristic QA flagged: ${heuristic.reason} ${heuristic.notes ?? ""} — writing anyway (manual review)`);
      }

      if (collection === "golden-100") {
        await writeEditorialImageVariants(slug, buffer, "comfort_firehall", 2, "golden100");
      } else if (collection === "hall-expansion") {
        await writeHallExpansionCatalogImageVariants(slug, buffer, 2);
      } else {
        await writeBreakfastCatalogImageVariants(slug, buffer, 2);
      }

      console.log(`  \u2713 ${slug} [${collection}]: wrote ${buffer.length} bytes (was sharing bytes with ${sharedWith})`);
      results.push({
        slug,
        collection,
        sharedWith,
        action: "generated",
        bytes: buffer.length,
        heuristicOk: heuristic.ok,
        heuristicReason: heuristic.ok ? undefined : heuristic.reason,
      });
      ok++;
      await new Promise((r) => setTimeout(r, 300));
    } catch (err: any) {
      fail++;
      const message = err?.message || String(err);
      console.error(`  \u2717 ${slug} [${collection}]: ${message}`);
      results.push({ slug, collection, sharedWith, action: "error", error: message });
    }
  }

  fs.writeFileSync(
    REPORT_OUT,
    JSON.stringify({ generatedAt: new Date().toISOString(), dryRun: DRY_RUN, ok, fail, results }, null, 2),
  );
  console.log(`[fix-duplicate-heroes] done ok=${ok} fail=${fail}`);
  console.log(`[fix-duplicate-heroes] wrote ${REPORT_OUT}`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
