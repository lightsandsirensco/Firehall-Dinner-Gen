#!/usr/bin/env tsx
/**
 * Apply catalog image donor fixes (Golden 100 + Performance Meals).
 *
 *   npm run remediate:catalog-image-fixes
 *   npm run remediate:catalog-image-fixes -- --only=bacon-egg-hash,boneless-chicken-thighs-sweet-potato-spinach
 */
import fs from "node:fs";
import path from "node:path";
import {
  CATALOG_IMAGE_DONOR_OVERRIDES,
  resolveDonorHeroPath,
} from "../shared/catalog-image-donor-overrides.js";
import { PERFORMANCE_MEAL_IMAGE_DONOR_OVERRIDES } from "../shared/performance-meals/image-donor-overrides.js";
import { writeEditorialImageVariants } from "../server/imagery/variants.js";

const PUBLIC = path.join(process.cwd(), "client/public");

function parseOnly(argv: string[]): Set<string> | null {
  const arg = argv.find((a) => a.startsWith("--only="));
  if (!arg) return null;
  return new Set(arg.replace("--only=", "").split(",").map((s) => s.trim()).filter(Boolean));
}

function absPublic(publicPath: string): string {
  return path.join(PUBLIC, publicPath.replace(/^\//, ""));
}

async function copyToSlug(
  targetSlug: string,
  donorHeroPath: string,
  stylePreset: "healthy_performance" | "breakfast_shift" = "healthy_performance",
): Promise<boolean> {
  const donorAbs = absPublic(donorHeroPath);
  if (!fs.existsSync(donorAbs)) {
    console.warn(`  ✗ ${targetSlug}: donor missing ${donorHeroPath}`);
    return false;
  }
  const heroBuffer = fs.readFileSync(donorAbs);
  await writeEditorialImageVariants(targetSlug, heroBuffer, stylePreset, 2);
  console.log(`  ✓ ${targetSlug} ← ${donorHeroPath}`);
  return true;
}

async function main(): Promise<void> {
  const only = parseOnly(process.argv);
  let ok = 0;
  let fail = 0;

  for (const [slug, override] of Object.entries(CATALOG_IMAGE_DONOR_OVERRIDES)) {
    if (only && !only.has(slug)) continue;
    const donorPath = resolveDonorHeroPath(override.donorSlug, override.donorCollection);
    const preset = slug.includes("hash") || override.donorCollection === "breakfast" ? "breakfast_shift" : "healthy_performance";
    if (await copyToSlug(slug, donorPath, preset)) ok++;
    else fail++;
  }

  for (const [slug, donorSlug] of Object.entries(PERFORMANCE_MEAL_IMAGE_DONOR_OVERRIDES)) {
    if (only && !only.has(slug)) continue;
    const donorPath = resolveDonorHeroPath(donorSlug, "golden_100");
    if (await copyToSlug(slug, donorPath, "healthy_performance")) ok++;
    else fail++;
  }

  console.log(`[remediate:catalog-image-fixes] done ok=${ok} fail=${fail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
