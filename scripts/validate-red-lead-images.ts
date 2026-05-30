#!/usr/bin/env tsx
/**
 * Validate Red Lead hero imagery — SEO page + catalog slugs.
 * Usage: tsx scripts/validate-red-lead-images.ts
 */
import fs from "node:fs";
import path from "node:path";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import {
  FIREFIGHTER_RED_LEAD_RECIPE,
  FIREFIGHTER_RED_LEAD_HERO_IMAGE,
} from "../shared/seo/firefighter-red-lead-recipe-data.js";
import { validateRedLeadImageRef } from "../shared/curated-image-governance/red-lead-rules.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client/public");

function publicFile(rel: string): string {
  return path.join(PUBLIC, rel.replace(/^\//, ""));
}

const failures: string[] = [];

function check(label: string, title: string, hero: string, alt = "") {
  const rule = validateRedLeadImageRef(title, hero, alt);
  if (!rule.ok) {
    failures.push(`${label}: ${rule.forbidden || rule.missingRequired} (${hero})`);
  }
  const file = publicFile(hero);
  if (!fs.existsSync(file)) {
    failures.push(`${label}: missing file ${hero}`);
  }
}

check(
  "SEO /firefighter-red-lead-recipe",
  "Firefighter Red Lead Recipe",
  FIREFIGHTER_RED_LEAD_RECIPE.heroImage,
  FIREFIGHTER_RED_LEAD_RECIPE.heroImageAlt,
);

if (FIREFIGHTER_RED_LEAD_RECIPE.heroImage !== FIREFIGHTER_RED_LEAD_HERO_IMAGE) {
  failures.push("SEO heroImage constant mismatch in firefighter-red-lead-recipe-data.ts");
}

for (const rel of [
  FIREFIGHTER_RED_LEAD_HERO_IMAGE,
  FIREFIGHTER_RED_LEAD_HERO_IMAGE.replace("/images/breakfast/", "/images/thumbs/breakfast/"),
  FIREFIGHTER_RED_LEAD_HERO_IMAGE.replace("/images/breakfast/", "/images/mobile/breakfast/"),
  FIREFIGHTER_RED_LEAD_HERO_IMAGE.replace("/images/breakfast/", "/images/rails/breakfast/"),
]) {
  if (!fs.existsSync(publicFile(rel))) {
    failures.push(`Missing derivative asset: ${rel}`);
  }
}

const catalog = buildApprovedCatalog();
for (const entry of catalog.recipes) {
  if (!/red lead/i.test(entry.title)) continue;
  check(`catalog ${entry.slug}`, entry.title, entry.heroImage || "", entry.title);
}

const forbiddenOnSeo = [
  "/images/breakfast/cast-iron-breakfast-skillet.jpg",
  "/images/breakfast/hall-sausage-biscuits-gravy.jpg",
];
for (const bad of forbiddenOnSeo) {
  if (FIREFIGHTER_RED_LEAD_RECIPE.heroImage === bad) {
    failures.push(`SEO page still uses forbidden biscuits/gravy hero: ${bad}`);
  }
}

if (failures.length) {
  console.error("[validate:red-lead-images] FAIL");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("[validate:red-lead-images] OK");
console.log(`  hero=${FIREFIGHTER_RED_LEAD_HERO_IMAGE}`);
process.exit(0);
