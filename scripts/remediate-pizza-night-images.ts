#!/usr/bin/env tsx
/**
 * Audit + regenerate Pizza Night hero/thumb/mobile/rail imagery.
 *
 *   npx tsx scripts/remediate-pizza-night-images.ts --audit
 *   npx tsx scripts/remediate-pizza-night-images.ts --fix --all
 *   npx tsx scripts/remediate-pizza-night-images.ts --fix --only=margherita-pizza,hawaiian-pizza
 */
import "dotenv/config";
import { loadProjectEnv, logOpenAIKeyDiagnostics } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PIZZA_NIGHT_RECIPES } from "../shared/pizza-night/manifest.js";
import { pizzaVisualFocus } from "../shared/pizza-night/image-focus.js";
import { PIZZA_NIGHT_PACKS } from "../shared/golden-100/recipe-quality/pizza-night-packs.js";
import { goldenPageImageSet } from "../shared/golden-100/recipe-page-paths.js";
import { buildEditorialImagePrompt, buildEditorialModelPrompt } from "../server/imagery/build-image-prompt.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";
import { getFoodImageryConfig } from "../server/food-imagery/config.js";
import { writeEditorialImageVariants } from "../server/imagery/variants.js";
import { scoreEditorialImageQuality } from "../server/imagery/score-image-quality.js";
import { DEFAULT_HERO_GENERATION_SIZE } from "../server/lib/image-sizes.js";
import type { GoldenRecipeDefinition } from "../shared/golden-100/types.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client/public");
const REPORT_PATH = path.join(ROOT, "review/pizza-night-image-audit.json");

type AuditIssue = {
  slug: string;
  title: string;
  issue: "duplicate_hero_image" | "missing_hero_image";
  heroImage: string;
  duplicatePeers?: string[];
};

type Replacement = {
  slug: string;
  title: string;
  action: "generated" | "skipped";
  note?: string;
};

function md5File(absPath: string): string | null {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash("md5").update(fs.readFileSync(absPath)).digest("hex");
}

function absPublic(publicPath: string): string {
  return path.join(PUBLIC, publicPath.replace(/^\//, ""));
}

function ingredientHints(def: GoldenRecipeDefinition): string[] {
  const builder = PIZZA_NIGHT_PACKS[def.slug];
  if (!builder) {
    return pizzaVisualFocus(def.slug, def.title, def.hookLine)
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  const pack = builder(10, def);
  return pack.ingredients.map((i) => i.name).slice(0, 8);
}

function buildHashGroups(): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const def of PIZZA_NIGHT_RECIPES) {
    const hero = absPublic(goldenPageImageSet(def.slug).heroImage);
    const hash = md5File(hero);
    if (!hash) continue;
    const list = groups.get(hash) || [];
    list.push(def.slug);
    groups.set(hash, list);
  }
  return groups;
}

function auditPizzaNight(): AuditIssue[] {
  const hashGroups = buildHashGroups();
  const issues: AuditIssue[] = [];

  for (const def of PIZZA_NIGHT_RECIPES) {
    const paths = goldenPageImageSet(def.slug);
    const heroAbs = absPublic(paths.heroImage);
    if (!fs.existsSync(heroAbs)) {
      issues.push({
        slug: def.slug,
        title: def.title,
        issue: "missing_hero_image",
        heroImage: paths.heroImage,
      });
      continue;
    }

    const hash = md5File(heroAbs);
    const peers = hash ? (hashGroups.get(hash) || []) : [];
    const duplicatePeers = peers.length > 1 ? peers.filter((s) => s !== def.slug) : [];
    if (duplicatePeers.length > 0) {
      issues.push({
        slug: def.slug,
        title: def.title,
        issue: "duplicate_hero_image",
        heroImage: paths.heroImage,
        duplicatePeers,
      });
    }
  }

  return issues;
}

async function generatePizzaImage(def: GoldenRecipeDefinition, force: boolean): Promise<Replacement> {
  const cfg = getFoodImageryConfig();
  if (!cfg.enabled) {
    return { slug: def.slug, title: def.title, action: "skipped", note: "FOOD_IMAGERY disabled" };
  }

  const hints = ingredientHints(def);
  const focus = pizzaVisualFocus(def.slug, def.title, def.hookLine);
  const promptResult = buildEditorialImagePrompt({
    mealName: def.title,
    category: "pizza_night",
    cuisine: def.cuisine,
    protein: def.protein,
    mealFormat: "pizza",
    moodTags: ["pizza_night", "pizza"],
    ingredientHints: [...hints, focus],
    hookLine: def.hookLine,
  });

  const modelPrompt = buildEditorialModelPrompt({
    mealName: def.title,
    category: "pizza_night",
    cuisine: def.cuisine,
    protein: def.protein,
    mealFormat: "pizza",
    stylePreset: promptResult.stylePreset,
    hookLine: def.hookLine,
    ingredientHints: [...hints, focus],
  });

  const buf = await generateFoodImageBuffer(modelPrompt, DEFAULT_HERO_GENERATION_SIZE);
  const heuristic = validateImageBufferHeuristic(buf);
  if (!heuristic.ok) {
    return { slug: def.slug, title: def.title, action: "skipped", note: heuristic.reason };
  }

  const quality = await scoreEditorialImageQuality({
    buffer: buf,
    mealName: def.title,
    stylePreset: promptResult.stylePreset,
    useVision: cfg.visionValidate,
  });

  if (quality.needsRegeneration && !force) {
    return {
      slug: def.slug,
      title: def.title,
      action: "skipped",
      note: `QA flags: ${quality.flags.join(",")}`,
    };
  }

  const nextVersion = Date.now();
  await writeEditorialImageVariants(def.slug, buf, promptResult.stylePreset, nextVersion);
  return { slug: def.slug, title: def.title, action: "generated" };
}

async function main(): Promise<void> {
  const auditOnly = process.argv.includes("--audit");
  const fix = process.argv.includes("--fix");
  const fixAll = process.argv.includes("--all");
  const force = process.argv.includes("--force") || fix;
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const onlySlugs = onlyArg
    ? new Set(
        onlyArg
          .slice("--only=".length)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      )
    : null;

  const issues = auditPizzaNight();
  const issueSlugs = new Set(issues.map((i) => i.slug));
  const hashGroups = buildHashGroups();

  const report: {
    generatedAt: string;
    totalRecipes: number;
    uniqueHeroHashes: number;
    issueCount: number;
    duplicateGroups: Array<{ hash: string; slugs: string[] }>;
    issues: AuditIssue[];
    replacements: Replacement[];
    remainingIssues: AuditIssue[];
  } = {
    generatedAt: new Date().toISOString(),
    totalRecipes: PIZZA_NIGHT_RECIPES.length,
    uniqueHeroHashes: hashGroups.size,
    issueCount: issues.length,
    duplicateGroups: [...hashGroups.entries()]
      .filter(([, slugs]) => slugs.length > 1)
      .map(([hash, slugs]) => ({ hash, slugs: slugs.sort() })),
    issues,
    replacements: [],
    remainingIssues: [],
  };

  if (fix) {
    logOpenAIKeyDiagnostics("[pizza-night-images]");
    const targets = PIZZA_NIGHT_RECIPES.filter((def) => {
      if (onlySlugs) return onlySlugs.has(def.slug);
      if (fixAll) return true;
      return issueSlugs.has(def.slug);
    });

    console.log(`[pizza-night-images] generating ${targets.length} pizza hero set(s)…`);

    for (const def of targets) {
      try {
        const result = await generatePizzaImage(def, force);
        report.replacements.push(result);
        const mark = result.action === "generated" ? "✓" : "○";
        console.log(`  ${mark} ${def.slug}${result.note ? ` — ${result.note}` : ""}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        report.replacements.push({ slug: def.slug, title: def.title, action: "skipped", note: msg });
        console.error(`  ✗ ${def.slug} — ${msg}`);
      }
    }

    const postIssues = auditPizzaNight();
    report.issueCount = postIssues.length;
    report.remainingIssues = postIssues;
    report.uniqueHeroHashes = buildHashGroups().size;
    report.issues = postIssues;
    report.duplicateGroups = [...buildHashGroups().entries()]
      .filter(([, slugs]) => slugs.length > 1)
      .map(([hash, slugs]) => ({ hash, slugs: slugs.sort() }));
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(
    `[pizza-night-images] audited ${report.totalRecipes} recipes — ${report.issueCount} issue(s), ${report.uniqueHeroHashes} unique hero hash(es)`,
  );
  console.log(`[pizza-night-images] report → ${REPORT_PATH}`);

  if (auditOnly && report.issueCount > 0) process.exit(1);
  if (fix && report.issueCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
