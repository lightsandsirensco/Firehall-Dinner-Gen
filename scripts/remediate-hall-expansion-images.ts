#!/usr/bin/env tsx
/**
 * Audit + remediate Hall Expansion hero/thumb/mobile/rail imagery.
 *
 *   npx tsx scripts/remediate-hall-expansion-images.ts --audit
 *   npx tsx scripts/remediate-hall-expansion-images.ts --fix
 *   npx tsx scripts/remediate-hall-expansion-images.ts --fix --only=applewood-pork-shoulder-steaks
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import {
  buildCuratedMealImageProfile,
  profileAllowsSignal,
  validateCuratedImageGovernance,
} from "../shared/curated-image-governance/index.js";
import { inferTagsFromImageRef } from "../shared/curated-image-governance/infer-tags.js";
import { HALL_EXPANSION_IMAGE_DONOR_OVERRIDES } from "../shared/hall-expansion/image-donor-overrides.js";
import {
  hallExpansionHeroPath,
  hallExpansionMobilePath,
  hallExpansionRailPath,
  hallExpansionThumbPath,
} from "../shared/hall-expansion/recipe-page-paths.js";
import { getMobileCropRule } from "../shared/mobile-crop-rules.js";
import { loadSharp } from "../server/imagery/sharp-utils.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client/public");
const INDEX_PATH = path.join(PUBLIC, "catalog/hall-expansion/index.json");
const REPORT_PATH = path.join(ROOT, "review/hall-expansion-image-audit.json");

type HallRecipe = {
  slug: string;
  title: string;
  protein: string;
  mealFormat: string;
  cuisine: string;
};

type GoldenDonor = {
  slug: string;
  title: string;
  protein: string;
  mealFormat: string;
  heroPath: string;
};

type AuditIssue = {
  slug: string;
  title: string;
  issue: string;
  heroImage: string;
  duplicatePeers?: string[];
};

function md5File(absPath: string): string | null {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash("md5").update(fs.readFileSync(absPath)).digest("hex");
}

function absPublic(publicPath: string): string {
  return path.join(PUBLIC, publicPath.replace(/^\//, ""));
}

function resolveGoldenHeroPath(slug: string): string | null {
  const candidates = [
    path.join(PUBLIC, "images/golden-100", `${slug}.jpg`),
    path.join(PUBLIC, "images/golden-100", `${slug}.webp`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function loadGoldenDonors(): GoldenDonor[] {
  const donors: GoldenDonor[] = [];
  for (const recipe of GOLDEN_100_RECIPES) {
    const heroAbs = resolveGoldenHeroPath(recipe.slug);
    if (!heroAbs) continue;
    donors.push({
      slug: recipe.slug,
      title: recipe.title,
      protein: recipe.protein,
      mealFormat: recipe.mealFormat,
      heroPath: heroAbs,
    });
  }
  return donors;
}

function loadHallRecipes(): HallRecipe[] {
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")) as {
    recipes: Array<{
      slug: string;
      title: string;
      protein: string;
      mealFormat: string;
      cuisine: string;
    }>;
  };
  return index.recipes.map((r) => ({
    slug: r.slug,
    title: r.title,
    protein: r.protein,
    mealFormat: r.mealFormat,
    cuisine: r.cuisine,
  }));
}

function proteinCompatible(recipeProtein: string, donorProtein: string): boolean {
  const want = recipeProtein.toLowerCase();
  const got = donorProtein.toLowerCase();
  if (!want || want === "any" || want === "mixed" || want === "pantry") return true;
  if (want === got) return true;
  if (want === "turkey" && got === "chicken") return true;
  if ((want === "seafood" || want === "shrimp") && (got === "fish" || got === "seafood" || got === "shrimp")) {
    return true;
  }
  if (want === "vegetarian" && got === "vegetarian") return true;
  return false;
}

function formatCompatible(recipeFormat: string, donorFormat: string): number {
  const rf = recipeFormat.toLowerCase();
  const df = donorFormat.toLowerCase();
  if (rf === df) return 30;
  const groups: Record<string, string[]> = {
    grill: ["grill", "smoker"],
    smoker: ["smoker", "grill"],
    bar_line: ["bar_line", "tacos", "burger", "bowl", "pasta", "sandwich", "handheld"],
    sheet_pan: ["sheet_pan", "bake", "tray"],
    skillet: ["skillet", "one_pot", "stir_fry"],
    pasta: ["pasta", "bake"],
    salad: ["salad", "bowl"],
    soup_chili: ["soup_chili", "stew", "one_pot"],
    baked: ["baked", "roast", "plated_main", "grill"],
    roast: ["roast", "baked", "grill"],
    braise: ["braise", "stew", "plated_main"],
    handheld: ["handheld", "sandwich", "burger", "tacos"],
  };
  for (const vals of Object.values(groups)) {
    if (vals.includes(rf) && vals.includes(df)) return 20;
  }
  return 0;
}

function titleTokenOverlap(a: string, b: string): number {
  const tokens = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 3),
    );
  const ta = tokens(a);
  const tb = tokens(b);
  let n = 0;
  for (const t of ta) {
    if (tb.has(t)) n += 1;
  }
  return n;
}

function donorAllowedForRecipe(recipe: HallRecipe, donor: GoldenDonor): boolean {
  const profile = buildCuratedMealImageProfile(recipe);
  const tags = inferTagsFromImageRef(donor.slug, donor.title);
  if (tags.signals.includes("taco") && !profileAllowsSignal(profile, "taco")) return false;
  if (/\bnacho/i.test(donor.slug) && !/\b(nacho|taco|burrito|fajita)\b/i.test(recipe.title)) {
    return false;
  }
  if (/\btaco/i.test(donor.slug) && !profileAllowsSignal(profile, "taco")) return false;

  const barLine = recipe.mealFormat.toLowerCase() === "bar_line";
  const sharedBarVisual =
    barLine &&
    (tags.signals.includes("taco") ||
      tags.signals.includes("burger") ||
      /\b(bowl|pasta|nacho|slider|bar)\b/i.test(donor.slug));
  const enchiladaVisual =
    /\b(enchilada|skillet)\b/i.test(recipe.title) && /\b(enchilada|skillet)\b/i.test(donor.slug);
  const soupStewVisual =
    /\b(stew|soup|chili)\b/i.test(recipe.title) && /\b(stew|soup|chili)\b/i.test(donor.slug);

  if (sharedBarVisual || enchiladaVisual || soupStewVisual) return true;
  return proteinCompatible(recipe.protein, donor.protein);
}

function scoreDonor(recipe: HallRecipe, donor: GoldenDonor, used: Set<string>): number {
  if (used.has(donor.slug)) return -999;
  if (!donorAllowedForRecipe(recipe, donor)) return -999;
  let score = formatCompatible(recipe.mealFormat, donor.mealFormat);
  if (proteinCompatible(recipe.protein, donor.protein)) score += 40;
  score += titleTokenOverlap(recipe.title, donor.title) * 4;
  const profile = buildCuratedMealImageProfile(recipe);
  for (const sig of inferTagsFromImageRef(donor.slug, donor.title).signals) {
    if (profileAllowsSignal(profile, sig)) score += 5;
  }
  return score;
}

function pickDonor(
  recipe: HallRecipe,
  donors: GoldenDonor[],
  used: Set<string>,
): GoldenDonor | null {
  const override = HALL_EXPANSION_IMAGE_DONOR_OVERRIDES[recipe.slug];
  if (override && !used.has(override)) {
    const fixed = donors.find((d) => d.slug === override);
    if (fixed && donorAllowedForRecipe(recipe, fixed)) return fixed;
    console.warn(`[hall-expansion-images] override donor missing/blocked: ${recipe.slug} → ${override}`);
  }

  let best: GoldenDonor | null = null;
  let bestScore = -999;
  for (const donor of donors) {
    if (used.has(donor.slug)) continue;
    const score = scoreDonor(recipe, donor, used);
    if (score > bestScore) {
      bestScore = score;
      best = donor;
    }
  }
  return bestScore > 0 ? best : null;
}

function buildHashGroups(recipes: HallRecipe[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const recipe of recipes) {
    const hero = absPublic(hallExpansionHeroPath(recipe.slug));
    const hash = md5File(hero);
    if (!hash) continue;
    const list = groups.get(hash) || [];
    list.push(recipe.slug);
    groups.set(hash, list);
  }
  return groups;
}

function tacoImageMisassigned(recipe: HallRecipe, hashGroups: Map<string, string[]>): boolean {
  const hero = absPublic(hallExpansionHeroPath(recipe.slug));
  const hash = md5File(hero);
  if (!hash) return false;
  const peers = hashGroups.get(hash) || [];
  const profile = buildCuratedMealImageProfile(recipe);
  if (profileAllowsSignal(profile, "taco")) return false;
  const tacoPeer = peers.some((peer) => /\b(taco|fajita|burrito|enchilada|nacho)\b/i.test(peer));
  return tacoPeer && peers.length > 1;
}

function auditRecipes(recipes: HallRecipe[]): AuditIssue[] {
  const hashGroups = buildHashGroups(recipes);
  const issues: AuditIssue[] = [];

  for (const recipe of recipes) {
    const hero = hallExpansionHeroPath(recipe.slug);
    const hash = md5File(absPublic(hero));
    const peers = hash ? (hashGroups.get(hash) || []) : [];
    const duplicatePeers = peers.length > 1 ? peers.filter((s) => s !== recipe.slug) : [];

    if (duplicatePeers.length > 0) {
      issues.push({
        slug: recipe.slug,
        title: recipe.title,
        issue: "duplicate_hero_image",
        heroImage: hero,
        duplicatePeers,
      });
    }

    if (tacoImageMisassigned(recipe, hashGroups)) {
      issues.push({
        slug: recipe.slug,
        title: recipe.title,
        issue: "taco_image_on_non_taco_recipe",
        heroImage: hero,
        duplicatePeers,
      });
    }
  }

  return issues;
}

async function resizeVariant(
  buffer: Buffer,
  width: number,
  height: number,
  position: string,
): Promise<Buffer> {
  const sharp = await loadSharp();
  if (!sharp) return buffer;
  try {
    return await sharp(buffer)
      .resize(width, height, { fit: "cover", position })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
  } catch {
    return buffer;
  }
}

async function writeHallExpansionVariants(slug: string, heroBuffer: Buffer): Promise<void> {
  const specs = getMobileCropRule("firehall_editorial_v1").variants;
  const mobileBuf = await resizeVariant(
    heroBuffer,
    specs.mobile.width,
    specs.mobile.height,
    specs.mobile.cropPosition,
  );
  const thumbBuf = await resizeVariant(
    heroBuffer,
    specs.thumb.width,
    specs.thumb.height,
    specs.thumb.cropPosition,
  );
  const railBuf = await resizeVariant(
    heroBuffer,
    specs.rail.width,
    specs.rail.height,
    specs.rail.cropPosition,
  );

  const targets = [
    absPublic(hallExpansionHeroPath(slug)),
    absPublic(hallExpansionThumbPath(slug)),
    absPublic(hallExpansionMobilePath(slug)),
    absPublic(hallExpansionRailPath(slug)),
  ];
  const buffers = [heroBuffer, thumbBuf, mobileBuf, railBuf];
  for (let i = 0; i < targets.length; i += 1) {
    fs.mkdirSync(path.dirname(targets[i]!), { recursive: true });
    fs.writeFileSync(targets[i]!, buffers[i]!);
  }
}

async function main(): Promise<void> {
  const auditOnly = process.argv.includes("--audit");
  const fix = process.argv.includes("--fix");
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

  const recipes = loadHallRecipes();
  const donors = loadGoldenDonors();
  const issues = auditRecipes(recipes);
  const issueSlugs = new Set(issues.map((i) => i.slug));

  const report: {
    generatedAt: string;
    totalRecipes: number;
    uniqueHeroHashes: number;
    issueCount: number;
    affectedSlugs: string[];
    issues: AuditIssue[];
    replacements: Array<{ slug: string; title: string; donor: string; reason: string }>;
  } = {
    generatedAt: new Date().toISOString(),
    totalRecipes: recipes.length,
    uniqueHeroHashes: buildHashGroups(recipes).size,
    issueCount: issues.length,
    affectedSlugs: [...issueSlugs].sort(),
    issues,
    replacements: [],
  };

  if (fix) {
    const usedDonors = new Set<string>();
    const toFix = recipes.filter((r) => {
      if (onlySlugs) return onlySlugs.has(r.slug);
      return issueSlugs.has(r.slug);
    });

    for (const recipe of toFix.sort((a, b) => a.slug.localeCompare(b.slug))) {
      const donor = pickDonor(recipe, donors, usedDonors);
      if (!donor) {
        console.error(`[hall-expansion-images] no donor for ${recipe.slug}`);
        continue;
      }
      const heroBuffer = fs.readFileSync(donor.heroPath);
      await writeHallExpansionVariants(recipe.slug, heroBuffer);
      usedDonors.add(donor.slug);

      report.replacements.push({
        slug: recipe.slug,
        title: recipe.title,
        donor: donor.slug,
        reason: HALL_EXPANSION_IMAGE_DONOR_OVERRIDES[recipe.slug]
          ? "manual_override"
          : "auto_scored",
      });
      console.log(`[hall-expansion-images] ${recipe.slug} ← ${donor.slug}`);
    }

    const postIssues = auditRecipes(recipes);
    report.issueCount = postIssues.length;
    report.issues = postIssues;
    report.uniqueHeroHashes = buildHashGroups(recipes).size;
    report.affectedSlugs = [...new Set(postIssues.map((i) => i.slug))].sort();
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(
    `[hall-expansion-images] audited ${report.totalRecipes} recipes — ${report.issueCount} issue(s), ${report.uniqueHeroHashes} unique hero hash(es)`,
  );
  console.log(`[hall-expansion-images] report → ${REPORT_PATH}`);

  if (auditOnly && report.issueCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
