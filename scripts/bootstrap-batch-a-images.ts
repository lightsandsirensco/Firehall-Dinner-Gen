#!/usr/bin/env tsx
/**
 * Copy unique hero images for Batch A recipes from meal-accurate donors.
 */
import fs from "node:fs";
import path from "node:path";

const PUBLIC = path.join(process.cwd(), "client/public");

type CopySpec = {
  slug: string;
  collection: "breakfast" | "golden-100";
  donor: { collection: "breakfast" | "golden-100"; slug: string };
};

const SPECS: CopySpec[] = [
  { slug: "shakshuka-for-the-hall", collection: "breakfast", donor: { collection: "breakfast", slug: "huevos-rancheros-crew" } },
  { slug: "menemen-for-the-crew", collection: "breakfast", donor: { collection: "breakfast", slug: "migas-for-the-crew" } },
  { slug: "baked-oatmeal-mixed-berries", collection: "breakfast", donor: { collection: "breakfast", slug: "high-protein-parfaits" } },
  { slug: "sheet-pan-parmesan-dijon-chicken-thigh-dinner", collection: "golden-100", donor: { collection: "golden-100", slug: "sheet-pan-meal-prep" } },
  { slug: "four-step-chicken-piccata", collection: "golden-100", donor: { collection: "golden-100", slug: "crispy-chicken-cutlets" } },
  { slug: "tomato-soup-grilled-cheese-croutons", collection: "golden-100", donor: { collection: "golden-100", slug: "the-best-italian-american-tomato-sauce" } },
  { slug: "spaghetti-aglio-e-olio-for-the-hall", collection: "golden-100", donor: { collection: "golden-100", slug: "five-ingredient-pasta" } },
  { slug: "spicy-tomato-bisque-grilled-brie-toast", collection: "golden-100", donor: { collection: "golden-100", slug: "chili-garlic-bread" } },
];

function heroPath(collection: string, slug: string): string {
  if (collection === "breakfast") return path.join(PUBLIC, "images/breakfast", `${slug}.jpg`);
  return path.join(PUBLIC, "images/golden-100", `${slug}.jpg`);
}

function thumbPath(collection: string, slug: string): string {
  if (collection === "breakfast") return path.join(PUBLIC, "images/thumbs/breakfast", `${slug}.jpg`);
  return path.join(PUBLIC, "images/thumbs", `${slug}.jpg`);
}

function mobilePath(collection: string, slug: string): string {
  if (collection === "breakfast") return path.join(PUBLIC, "images/mobile/breakfast", `${slug}.jpg`);
  return path.join(PUBLIC, "images/mobile", `${slug}.jpg`);
}

function railPath(collection: string, slug: string): string {
  if (collection === "breakfast") return path.join(PUBLIC, "images/rails/breakfast", `${slug}.jpg`);
  return path.join(PUBLIC, "images/rails", `${slug}.jpg`);
}

function copyIfExists(src: string, dest: string): boolean {
  if (!fs.existsSync(src)) {
    console.warn(`  skip missing donor: ${src}`);
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

let ok = 0;
for (const spec of SPECS) {
  const srcHero = heroPath(spec.donor.collection, spec.donor.slug);
  const destHero = heroPath(spec.collection, spec.slug);
  if (copyIfExists(srcHero, destHero)) {
    const srcThumb = thumbPath(spec.donor.collection, spec.donor.slug);
    const srcMobile = mobilePath(spec.donor.collection, spec.donor.slug);
    const srcRail = railPath(spec.donor.collection, spec.donor.slug);
    copyIfExists(srcThumb, thumbPath(spec.collection, spec.slug));
    copyIfExists(srcMobile, mobilePath(spec.collection, spec.slug));
    copyIfExists(srcRail, railPath(spec.collection, spec.slug));
    console.log(`  ✓ ${spec.slug} ← ${spec.donor.slug}`);
    ok++;
  }
}

console.log(`[bootstrap-batch-a-images] ${ok}/${SPECS.length} heroes copied`);
process.exit(ok === SPECS.length ? 0 : 1);
