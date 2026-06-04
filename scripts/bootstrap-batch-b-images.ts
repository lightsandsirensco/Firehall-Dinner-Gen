#!/usr/bin/env tsx
/**
 * Copy unique hero images for Batch B from meal-accurate donors.
 */
import fs from "node:fs";
import path from "node:path";

const PUBLIC = path.join(process.cwd(), "client/public");

type CopySpec = {
  slug: string;
  collection: "hall-expansion" | "golden-100";
  donor: { collection: "hall-expansion" | "golden-100"; slug: string };
};

const SPECS: CopySpec[] = [
  {
    slug: "classic-patty-melt-for-the-crew",
    collection: "hall-expansion",
    donor: { collection: "golden-100", slug: "smash-burgers" },
  },
  {
    slug: "best-tuna-melt-for-the-hall",
    collection: "hall-expansion",
    donor: { collection: "golden-100", slug: "mediterranean-inspired-tuna-almond-whole-wheat-spaghetti" },
  },
  {
    slug: "hall-blt-sandwich-feed",
    collection: "hall-expansion",
    donor: { collection: "golden-100", slug: "monte-cristo-sandwiches" },
  },
  {
    slug: "30-minute-pasta-e-fagioli-for-the-hall",
    collection: "golden-100",
    donor: { collection: "golden-100", slug: "chili-mac" },
  },
  {
    slug: "red-beans-and-rice-for-the-hall",
    collection: "golden-100",
    donor: { collection: "golden-100", slug: "slow-cooker-red-beans-and-rice" },
  },
  {
    slug: "french-onion-soup-for-the-hall",
    collection: "golden-100",
    donor: { collection: "golden-100", slug: "loaded-baked-potato-soup-with-crispy-fried-potato-skins" },
  },
  {
    slug: "chicken-tortilla-soup-for-the-hall",
    collection: "golden-100",
    donor: { collection: "golden-100", slug: "tangy-savory-mexican-soup" },
  },
  {
    slug: "pasta-e-ceci-for-the-hall",
    collection: "golden-100",
    donor: { collection: "hall-expansion", slug: "pasta-bar-night" },
  },
];

function heroPath(collection: string, slug: string): string {
  if (collection === "hall-expansion") {
    return path.join(PUBLIC, "images/hall-expansion", `${slug}.jpg`);
  }
  return path.join(PUBLIC, "images/golden-100", `${slug}.jpg`);
}

function thumbPath(collection: string, slug: string): string {
  if (collection === "hall-expansion") {
    return path.join(PUBLIC, "images/thumbs/hall-expansion", `${slug}.jpg`);
  }
  return path.join(PUBLIC, "images/thumbs", `${slug}.jpg`);
}

function mobilePath(collection: string, slug: string): string {
  if (collection === "hall-expansion") {
    return path.join(PUBLIC, "images/mobile/hall-expansion", `${slug}.jpg`);
  }
  return path.join(PUBLIC, "images/mobile", `${slug}.jpg`);
}

function railPath(collection: string, slug: string): string {
  if (collection === "hall-expansion") {
    return path.join(PUBLIC, "images/rails/hall-expansion", `${slug}.jpg`);
  }
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
    copyIfExists(thumbPath(spec.donor.collection, spec.donor.slug), thumbPath(spec.collection, spec.slug));
    copyIfExists(mobilePath(spec.donor.collection, spec.donor.slug), mobilePath(spec.collection, spec.slug));
    copyIfExists(railPath(spec.donor.collection, spec.donor.slug), railPath(spec.collection, spec.slug));
    console.log(`  ✓ ${spec.slug} ← ${spec.donor.slug}`);
    ok++;
  }
}

console.log(`[bootstrap-batch-b-images] ${ok}/${SPECS.length} heroes copied`);
process.exit(ok === SPECS.length ? 0 : 1);
