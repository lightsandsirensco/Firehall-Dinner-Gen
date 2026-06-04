#!/usr/bin/env tsx
/**
 * Auto-fix P0 rows from review/meal-image-trust-tier-report.json (+ warm-spinach trust report).
 *
 *   npx tsx scripts/fix-trust-tier-p0.ts --dry-run
 *   npx tsx scripts/fix-trust-tier-p0.ts --apply
 */
import { loadProjectEnv, logOpenAIKeyDiagnostics } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  hallExpansionHeroPath,
  hallExpansionMobilePath,
  hallExpansionRailPath,
  hallExpansionThumbPath,
} from "../shared/hall-expansion/recipe-page-paths.js";
import { getMobileCropRule } from "../shared/mobile-crop-rules.js";
import { loadSharp } from "../server/imagery/sharp-utils.js";

const PUBLIC = path.join(process.cwd(), "client", "public");
const TIER_REPORT = path.join("review", "meal-image-trust-tier-report.json");

/** Slug → existing donor file (public path) when hero file is missing or path is wrong. */
const HERO_PATH_REPAIRS: Record<
  string,
  { hero: string; note: string }
> = {
  "cajun-grilled-cod-crew": {
    hero: "/images/smoker-catalog/cajun-grilled-catfish-crew.jpg",
    note: "rename mismatch: catfish hero until cod regen",
  },
  "grilled-cod-lemon-packets": {
    hero: "/images/smoker-catalog/grilled-halibut-lemon-packets.jpg",
    note: "rename mismatch: halibut foil packets until cod regen",
  },
  "garlic-butter-shrimp-skewers": {
    hero: "/images/golden-100/garlic-butter-shrimp.jpg",
    note: "interim: golden garlic butter shrimp until BBQ skewer regen",
  },
};

const REGEN_SLUGS = [
  "warm-spinach-chicken-salad",
  "butter-chicken",
  "chicken-caesar",
  "chicken-tikka-masala",
  "jerk-chicken",
  "cajun-chicken-rice-bowl",
  "enchilada-beef-skillet",
];

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes("--dry-run"),
    apply: argv.includes("--apply"),
    skipRegen: argv.includes("--skip-regen"),
  };
}

function publicPath(rel: string): string {
  return path.join(PUBLIC, rel.replace(/^\//, ""));
}

function fileExists(rel: string): boolean {
  return fs.existsSync(publicPath(rel));
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

async function mirrorSmokerCatalogVariants(slug: string, heroBuffer: Buffer): Promise<string> {
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

  const paths = {
    hero: `/images/smoker-catalog/${slug}.jpg`,
    mobile: `/images/mobile/smoker-catalog/${slug}.jpg`,
    thumb: `/images/thumbs/smoker-catalog/${slug}.jpg`,
    rail: `/images/rails/smoker-catalog/${slug}.jpg`,
  };
  const buffers = [heroBuffer, mobileBuf, thumbBuf, railBuf];
  const rels = [paths.hero, paths.mobile, paths.thumb, paths.rail];
  for (let i = 0; i < rels.length; i += 1) {
    const abs = publicPath(rels[i]!);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buffers[i]!);
  }
  return paths.hero;
}

async function mirrorHallExpansionVariants(slug: string, heroBuffer: Buffer): Promise<string> {
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

  const rels = [
    hallExpansionHeroPath(slug),
    hallExpansionMobilePath(slug),
    hallExpansionThumbPath(slug),
    hallExpansionRailPath(slug),
  ];
  const buffers = [heroBuffer, mobileBuf, thumbBuf, railBuf];
  for (let i = 0; i < rels.length; i += 1) {
    const abs = publicPath(rels[i]!);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buffers[i]!);
  }
  return hallExpansionHeroPath(slug);
}

function updateCatalogPage(
  collection: string,
  slug: string,
  images: { hero: string; thumb: string; mobile: string; rail: string },
): void {
  const pagePath = path.join(PUBLIC, "catalog", collection, "pages", `${slug}.json`);
  if (!fs.existsSync(pagePath)) return;
  const page = JSON.parse(fs.readFileSync(pagePath, "utf8")) as Record<string, unknown>;
  page.heroImage = images.hero;
  page.thumbImage = images.thumb;
  page.mobileImage = images.mobile;
  page.railImage = images.rail;
  page.updatedAt = new Date().toISOString();
  fs.writeFileSync(pagePath, `${JSON.stringify(page, null, 2)}\n`);
}

type FixLog = {
  slug: string;
  title: string;
  action: string;
  beforeHero: string;
  afterHero: string;
};

async function applyPathRepair(
  slug: string,
  collection: string,
  beforeHero: string,
  dryRun: boolean,
): Promise<FixLog | null> {
  const repair = HERO_PATH_REPAIRS[slug];
  if (!repair || !fileExists(repair.hero)) return null;

  if (dryRun) {
    return {
      slug,
      title: slug,
      action: `path-repair (${repair.note})`,
      beforeHero,
      afterHero: repair.hero,
    };
  }

  const buffer = fs.readFileSync(publicPath(repair.hero));
  let afterHero = repair.hero;
  if (collection === "bbq") {
    afterHero = await mirrorSmokerCatalogVariants(slug, buffer);
  } else if (collection === "hall_expansion") {
    afterHero = await mirrorHallExpansionVariants(slug, buffer);
  }

  const images = {
    hero: afterHero,
    thumb:
      collection === "bbq"
        ? `/images/thumbs/smoker-catalog/${slug}.jpg`
        : hallExpansionThumbPath(slug),
    mobile:
      collection === "bbq"
        ? `/images/mobile/smoker-catalog/${slug}.jpg`
        : hallExpansionMobilePath(slug),
    rail:
      collection === "bbq"
        ? `/images/rails/smoker-catalog/${slug}.jpg`
        : hallExpansionRailPath(slug),
  };
  updateCatalogPage(collection, slug, images);
  return {
    slug,
    title: slug,
    action: `path-repair (${repair.note})`,
    beforeHero,
    afterHero,
  };
}

async function main(): Promise<void> {
  const { dryRun, apply, skipRegen } = parseArgs(process.argv);
  if (!dryRun && !apply) {
    console.error("Use --dry-run or --apply");
    process.exit(1);
  }

  if (!fs.existsSync(TIER_REPORT)) {
    console.error("Run: npx tsx scripts/audit-meal-image-trust-tier.ts");
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(TIER_REPORT, "utf8")) as {
    p0: Array<{ slug: string; title: string; collection: string; heroImage: string }>;
  };

  const fixes: FixLog[] = [];
  const p0Slugs = new Set(report.p0.map((r) => r.slug));
  p0Slugs.add("warm-spinach-chicken-salad");

  for (const row of report.p0) {
    if (!fileExists(row.heroImage) && HERO_PATH_REPAIRS[row.slug]) {
      const log = await applyPathRepair(row.slug, row.collection, row.heroImage, dryRun);
      if (log) fixes.push({ ...log, title: row.title });
    }
  }

  if (!dryRun && fixes.length > 0) {
    console.log(`[fix-trust-tier-p0] path repairs: ${fixes.length}`);
    for (const f of fixes) console.log(`  ${f.slug}: ${f.beforeHero} → ${f.afterHero}`);
  } else if (dryRun) {
    for (const f of fixes) console.log(`  [dry-run] ${f.slug}: ${f.action}`);
  }

  const regenList = [
    ...new Set([
      "warm-spinach-chicken-salad",
      ...REGEN_SLUGS,
      ...report.p0.map((r) => r.slug),
    ]),
  ].filter((s) => REGEN_SLUGS.includes(s) || s === "warm-spinach-chicken-salad" || !HERO_PATH_REPAIRS[s]);

  if (skipRegen) {
    console.log("[fix-trust-tier-p0] skip-regen");
    writeReport(fixes);
    return;
  }

  const slugsFile = path.join("review", "trust-tier-p0-regen-slugs.txt");
  fs.mkdirSync(path.dirname(slugsFile), { recursive: true });
  fs.writeFileSync(slugsFile, `${regenList.join("\n")}\n`);

  if (dryRun) {
    console.log(`[fix-trust-tier-p0] would regen ${regenList.length} slugs → ${slugsFile}`);
    writeReport(fixes);
    return;
  }

  logOpenAIKeyDiagnostics("[fix-trust-tier-p0]");
  const regenArgs = [
    "tsx",
    "scripts/regen-meal-image-trust.ts",
    "--apply",
    "--force",
    `--slugs-file=${slugsFile}`,
    "--limit=20",
  ];
  console.log(`[fix-trust-tier-p0] regen: ${regenArgs.join(" ")}`);
  const r = spawnSync("npx", regenArgs, { cwd: process.cwd(), stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.warn("[fix-trust-tier-p0] regen exited", r.status);
  }

  writeReport(fixes);
}

function writeReport(fixes: FixLog[]): void {
  const out = path.join("review", "trust-tier-p0-fix-log.json");
  fs.writeFileSync(
    out,
    JSON.stringify({ generatedAt: new Date().toISOString(), fixes }, null, 2),
  );
  console.log(`[fix-trust-tier-p0] log → ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
