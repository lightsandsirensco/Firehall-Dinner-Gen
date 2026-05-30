#!/usr/bin/env tsx
/**
 * Copy donor heroes onto Performance Meals slugs (when AI regen is unavailable).
 *
 *   npx tsx scripts/remediate-performance-meals-images.ts --fix
 *   npx tsx scripts/remediate-performance-meals-images.ts --fix --only=boneless-chicken-thighs-sweet-potato-spinach
 */
import fs from "node:fs";
import path from "node:path";
import { PERFORMANCE_MEAL_IMAGE_DONOR_OVERRIDES } from "../shared/performance-meals/image-donor-overrides.js";
import { writeEditorialImageVariants } from "../server/imagery/variants.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client/public");

function parseArgs(argv: string[]) {
  const fix = argv.includes("--fix");
  const onlyArg = argv.find((a) => a.startsWith("--only="));
  const onlySlugs = onlyArg
    ? new Set(onlyArg.replace("--only=", "").split(",").map((s) => s.trim()).filter(Boolean))
    : null;
  return { fix, onlySlugs };
}

function resolveGoldenHeroAbs(donorSlug: string): string | null {
  const candidates = [
    path.join(PUBLIC, "images/golden-100", `${donorSlug}.jpg`),
    path.join(PUBLIC, "images/golden-100", `${donorSlug}.webp`),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function main(): Promise<void> {
  const { fix, onlySlugs } = parseArgs(process.argv);
  const entries = Object.entries(PERFORMANCE_MEAL_IMAGE_DONOR_OVERRIDES).filter(([slug]) =>
    onlySlugs ? onlySlugs.has(slug) : true,
  );

  if (entries.length === 0) {
    console.log("[performance-meals-images] no donor overrides configured");
    return;
  }

  let ok = 0;
  let fail = 0;

  for (const [slug, donorSlug] of entries) {
    const donorAbs = resolveGoldenHeroAbs(donorSlug);
    if (!donorAbs) {
      fail++;
      console.warn(`  ✗ ${slug}: donor hero missing for ${donorSlug}`);
      continue;
    }

    console.log(`  → ${slug} ← ${donorSlug}`);
    if (!fix) continue;

    const heroBuffer = fs.readFileSync(donorAbs);
    await writeEditorialImageVariants(slug, heroBuffer, "healthy_performance", 1);
    ok++;
    console.log(`  ✓ ${slug}: wrote editorial variants`);
  }

  if (!fix) {
    console.log("[performance-meals-images] dry run — pass --fix to copy images");
    return;
  }

  console.log(`[performance-meals-images] done ok=${ok} fail=${fail}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
