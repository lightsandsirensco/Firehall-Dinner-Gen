#!/usr/bin/env tsx
/**
 * DEPRECATED — donor copies are BLOCKER for production.
 * Use: npx tsx scripts/generate-batch-handheld-imagery.ts --force
 */
console.error("[bootstrap-batch-handheld-images] BLOCKED — use generate-batch-handheld-imagery.ts (no donors)");
process.exit(1);

/** @deprecated */
function _deprecatedCopyOnly(): void {
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
    slug: "chicken-caesar-wraps",
    collection: "hall-expansion",
    donor: { collection: "golden-100", slug: "chicken-caesar" },
  },
  {
    slug: "buffalo-chicken-wraps",
    collection: "hall-expansion",
    donor: { collection: "golden-100", slug: "buffalo-chicken-dip" },
  },
  {
    slug: "greek-chicken-pitas",
    collection: "hall-expansion",
    donor: { collection: "golden-100", slug: "chicken-souvlaki" },
  },
  {
    slug: "beef-gyros-for-the-hall",
    collection: "hall-expansion",
    donor: { collection: "golden-100", slug: "steak-sandwiches" },
  },
  {
    slug: "chicken-shawarma-pitas",
    collection: "hall-expansion",
    donor: { collection: "hall-expansion", slug: "shawarma-bar-night" },
  },
  {
    slug: "sausage-peppers-on-buns",
    collection: "hall-expansion",
    donor: { collection: "golden-100", slug: "meatball-hoagies" },
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

console.log(`[bootstrap-batch-handheld-images] ${ok}/${SPECS.length} heroes copied`);
process.exit(ok === SPECS.length ? 0 : 1);
