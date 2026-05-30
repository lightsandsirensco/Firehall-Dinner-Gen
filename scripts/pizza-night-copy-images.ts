#!/usr/bin/env tsx
/**
 * Copy editorial image variants for new Pizza Night slugs from closest visual matches.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** New slug → existing slug with matching hero assets */
const IMAGE_SOURCE_MAP: Record<string, string> = {
  "buffalo-chicken-pizza": "bbq-chicken-pizza",
  "firehall-supreme-pizza": "meat-lovers-sheet-pizza",
  "four-cheese-white-pizza": "white-garlic-chicken-pizza",
  "hawaiian-pizza": "margherita-pizza",
  "jalapeno-popper-pizza": "honey-soppressata-pizza",
  "nashville-hot-chicken-pizza": "honey-soppressata-pizza",
  "pesto-chicken-pizza": "margherita-pizza",
  "philly-cheesesteak-pizza": "meat-lovers-sheet-pizza",
  "sicilian-sheet-pizza": "detroit-style-pizza",
  "smoked-brisket-bbq-pizza": "bbq-chicken-pizza",
  "taco-pizza": "meat-lovers-sheet-pizza",
  "veggie-supreme-pizza": "margherita-pizza",
};

const ROLE_DIRS: Record<string, string> = {
  hero: "golden-100",
  mobile: "mobile",
  thumb: "thumbs",
  rail: "rails",
};

function copyIfExists(src: string, dest: string): boolean {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

let copied = 0;
let missing = 0;

for (const [destSlug, srcSlug] of Object.entries(IMAGE_SOURCE_MAP)) {
  for (const dir of Object.values(ROLE_DIRS)) {
    for (const ext of ["jpg", "webp"] as const) {
      const src = path.join(ROOT, "client", "public", "images", dir, `${srcSlug}.${ext}`);
      const dest = path.join(ROOT, "client", "public", "images", dir, `${destSlug}.${ext}`);
      if (copyIfExists(src, dest)) {
        copied++;
        console.log(`  ✓ ${dir}/${destSlug}.${ext} ← ${srcSlug}`);
      } else if (ext === "jpg") {
        missing++;
        console.warn(`  ✗ missing source ${dir}/${srcSlug}.jpg`);
      }
    }
  }
}

console.log(`\n[pizza-night:images] copied=${copied} missing_sources=${missing}`);
process.exit(missing > 0 ? 1 : 0);
