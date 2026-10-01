#!/usr/bin/env tsx
/**
 * Regenerate recipe hero images from the recipe itself, gated by vision QA.
 *
 * The prompt is built only from recipe data (server/imagery/recipe-image-prompt.ts)
 * on top of the shared Firehall art direction. Every candidate is inspected
 * before it is written; a candidate that fails the publish gate is never
 * written and the slug lands in the failure queue for manual review.
 *
 * Usage:
 *   npm run images:regen -- --only=breakfast/monte-cristo-sandwiches
 *   npm run images:regen -- --from-audit                 # P0 records only
 *   npm run images:regen -- --from-audit --priority=P0,P1
 *   npm run images:regen -- --only=bbq/brisket --dry-run # print prompt only
 *   npm run images:regen -- --only=bbq/brisket --reject="steam on a cold dish;missing coleslaw"
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

applyDevOpenAiTlsIfAllowed();

import { createOpenAIClient, hasOpenAIKey } from "../server/openai-client.js";
import { buildEditorialModelPrompt } from "../server/imagery/build-image-prompt.js";
import {
  buildRecipeImageAlt,
  buildRecipeImagePromptInput,
  titleIngredientConflicts,
} from "../server/imagery/recipe-image-prompt.js";
import { inspectRecipeImage, passesPublishGate, type QaRecipe, type VisionVerdict } from "../server/imagery/recipe-image-qa.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import {
  writeBbqCatalogImageVariants,
  writeBreakfastCatalogImageVariants,
  writeEditorialImageVariants,
  writeHallExpansionCatalogImageVariants,
  writeSmoothieCatalogImageVariants,
} from "../server/imagery/variants.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const OUT_DIR = path.join(ROOT, "scripts", "output");
const AUDIT_JSON = path.join(OUT_DIR, "recipe-image-audit.json");
const LOG_JSON = path.join(OUT_DIR, "recipe-image-regen-log.json");
const FAIL_JSON = path.join(OUT_DIR, "recipe-image-regen-failures.json");

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const list = (v?: string) => v?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
const DRY_RUN = process.argv.includes("--dry-run");
const FROM_AUDIT = process.argv.includes("--from-audit");
const PRIORITIES = list(arg("priority")).length ? list(arg("priority")) : ["P0"];
const MAX_ATTEMPTS = Number(arg("attempts")) || 3;
const CONCURRENCY = Number(arg("concurrency")) || 1;
/** Reasons a human reviewer rejected the current image, fed into the first prompt (`;`-separated). */
const MANUAL_REJECT = (process.argv.find((a) => a.startsWith("--reject="))?.slice("--reject=".length) ?? "")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

type Page = QaRecipe & { heroImage?: string; imageAlt?: string; heroImageAlt?: string };
type Client = ReturnType<typeof createOpenAIClient>;

interface Target {
  collection: string;
  slug: string;
}

function resolveTargets(): Target[] {
  const only = list(arg("only")).map((t) => {
    const [collection, slug] = t.includes("/") ? t.split("/") : ["", t];
    return { collection: collection!, slug: slug! };
  });
  if (only.length) return only;
  if (!FROM_AUDIT) throw new Error("Pass --only=<collection>/<slug>[,...] or --from-audit");
  const audit = JSON.parse(fs.readFileSync(AUDIT_JSON, "utf8")) as {
    records: Array<{ collection: string; slug: string; priority: string }>;
  };
  return audit.records.filter((r) => PRIORITIES.includes(r.priority)).map((r) => ({ collection: r.collection, slug: r.slug }));
}

const pagePath = (t: Target) => path.join(PUBLIC, "catalog", t.collection, "pages", `${t.slug}.json`);

/** Writes all variants at the paths the live page already references. */
async function writeVariants(collection: string, page: Page, buffer: Buffer): Promise<string> {
  const base = path.basename(page.heroImage ?? "").replace(/\.(jpe?g|webp|png)$/i, "");
  switch (collection) {
    case "breakfast":
      return (await writeBreakfastCatalogImageVariants(page.slug, buffer, 2)).hero;
    case "bbq":
      return (await writeBbqCatalogImageVariants(page.slug, buffer, 2)).hero;
    case "hall-expansion":
      return (await writeHallExpansionCatalogImageVariants(page.slug, buffer, 2)).hero;
    case "smoothies":
      return (await writeSmoothieCatalogImageVariants(page.slug, buffer, 2)).hero;
    default:
      return (await writeEditorialImageVariants(base, buffer, "comfort_firehall", 2, "golden100")).hero;
  }
}

function expectedHeroDir(collection: string): string {
  const dirs: Record<string, string> = {
    breakfast: "/images/breakfast/",
    bbq: "/images/smoker-catalog/",
    "hall-expansion": "/images/hall-expansion/",
    smoothies: "/images/smoothies/",
  };
  return dirs[collection] ?? "/images/golden-100/";
}

/**
 * Account/config failures (no credits, bad key, unknown model) fail every
 * remaining target identically — stop the run instead of retrying each one.
 */
const SYSTEMIC_API_ERROR =
  /no credits|insufficient_quota|exceeded your current quota|billing|hard limit|\b401\b|\b403\b|invalid api key|incorrect api key|model .*does not exist|model_not_found|organization must be verified/i;
let systemicAbort: string | null = null;
let imageCalls = 0;

function appendJson(file: string, entry: unknown): void {
  const prev = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as unknown[]) : [];
  fs.writeFileSync(file, `${JSON.stringify([...prev, entry], null, 2)}\n`, "utf8");
}

async function regenOne(target: Target, client: Client | null): Promise<void> {
  if (!fs.existsSync(pagePath(target))) {
    console.warn(`  ! ${target.collection}/${target.slug}: recipe page not found — skipped`);
    return;
  }
  const page = JSON.parse(fs.readFileSync(pagePath(target), "utf8")) as Page;
  if (!page.heroImage?.startsWith(expectedHeroDir(target.collection))) {
    console.warn(`  ! ${target.slug}: heroImage ${page.heroImage} is outside ${expectedHeroDir(target.collection)} — skipped (would not update the live image)`);
    return;
  }
  const conflicts = titleIngredientConflicts(page);
  if (conflicts.length) {
    console.warn(`  ! ${target.slug}: recipe data conflict (${conflicts.join("; ")}) — skipped until the recipe is fixed`);
    return;
  }

  const basePrompt = buildEditorialModelPrompt(buildRecipeImagePromptInput(page, target.collection));
  if (DRY_RUN) {
    console.log(`\n=== ${target.collection}/${target.slug} (${basePrompt.length} chars) ===\n${basePrompt}\n`);
    return;
  }

  const feedback: string[] = [...MANUAL_REJECT];
  const attempts: Array<{ attempt: number; ok: boolean; reasons: string[] }> = [];
  let accepted: { buffer: Buffer; verdict: VisionVerdict } | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !accepted; attempt++) {
    const prompt = feedback.length
      ? `${basePrompt} Previous attempt was rejected by photo QA for: ${feedback.join("; ")}. Correct every one of these.`
      : basePrompt;
    try {
      imageCalls++;
      const buffer = await generateFoodImageBuffer(prompt);
      const verdict = await inspectRecipeImage(client!, buffer, page);
      const gate = passesPublishGate(verdict, page);
      attempts.push({ attempt, ok: gate.ok, reasons: gate.reasons });
      console.log(`  ${gate.ok ? "✓" : "✗"} ${target.slug} attempt ${attempt}: ${gate.ok ? `accuracy=${verdict.accuracy}` : gate.reasons.join("; ")}`);
      if (gate.ok) accepted = { buffer, verdict };
      else feedback.push(...gate.reasons);
    } catch (err) {
      const reason = `generation/QA error: ${(err as Error).message}`;
      attempts.push({ attempt, ok: false, reasons: [reason] });
      console.warn(`  ✗ ${target.slug} attempt ${attempt}: ${reason}`);
      if (SYSTEMIC_API_ERROR.test(reason)) {
        systemicAbort = reason;
        break;
      }
      await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }

  if (!accepted) {
    appendJson(FAIL_JSON, { at: new Date().toISOString(), ...target, attempts });
    console.warn(`  ! ${target.slug}: no candidate passed QA — live image left untouched, queued for manual review`);
    return;
  }

  const heroWritten = await writeVariants(target.collection, page, accepted.buffer);
  if (!accepted.verdict.alt_text_accurate || (!page.imageAlt && !page.heroImageAlt)) {
    const alt = buildRecipeImageAlt(page, accepted.verdict.visible_foods);
    if ("heroImageAlt" in page) page.heroImageAlt = alt;
    else page.imageAlt = alt;
    fs.writeFileSync(pagePath(target), `${JSON.stringify(page, null, 2)}\n`, "utf8");
  }
  appendJson(LOG_JSON, {
    at: new Date().toISOString(),
    ...target,
    hero: heroWritten,
    attempts,
    visible_foods: accepted.verdict.visible_foods,
    camera_angle: accepted.verdict.camera_angle,
  });
  console.log(`  → wrote ${heroWritten} + mobile/thumb/rail/WebP variants`);
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const targets = resolveTargets();
  console.log(`[regen] ${targets.length} target(s), attempts<=${MAX_ATTEMPTS}, concurrency=${CONCURRENCY}, dryRun=${DRY_RUN}`);
  if (!DRY_RUN && !hasOpenAIKey()) throw new Error("No OpenAI key configured");
  const client = DRY_RUN ? null : createOpenAIClient();

  let next = 0;
  const worker = async () => {
    while (next < targets.length && !systemicAbort) await regenOne(targets[next++]!, client);
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));
  console.log(`[regen] image generation calls: ${imageCalls}`);
  if (systemicAbort) {
    console.error(`[regen] STOPPED — systemic API failure; ${targets.length - next} target(s) not attempted: ${systemicAbort}`);
    process.exit(2);
  }
  console.log("[regen] done — re-run the audit for replaced slugs to refresh the report");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
