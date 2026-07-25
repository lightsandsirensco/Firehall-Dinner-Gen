import fs from "node:fs";
import path from "node:path";
import { HALL_EXPANSION_IMAGE_DONOR_OVERRIDES } from "../shared/hall-expansion/image-donor-overrides.js";
import { BATCH_WAVE1_EXPANSION_RECIPES } from "../shared/hall-expansion/adapted/batch-wave1-expansion.js";

const PUBLIC = path.join(process.cwd(), "client/public");
const waveSlugs = new Set(BATCH_WAVE1_EXPANSION_RECIPES.map((r) => r.slug));

let ok = 0;
let fail = 0;

for (const slug of waveSlugs) {
  const dest = path.join(PUBLIC, "images/hall-expansion", `${slug}.jpg`);
  if (fs.existsSync(dest)) {
    console.log("skip exists", slug);
    continue;
  }
  const donor = HALL_EXPANSION_IMAGE_DONOR_OVERRIDES[slug];
  if (!donor) {
    console.log("NO OVERRIDE", slug);
    fail++;
    continue;
  }
  const candidates = [
    path.join(PUBLIC, "images/golden-100", `${donor}.jpg`),
    path.join(PUBLIC, "images/golden-100", `${donor}.webp`),
    path.join(PUBLIC, "images/hall-expansion", `${donor}.jpg`),
    path.join(PUBLIC, "images/performance-fuel", `${donor}.jpg`),
    path.join(PUBLIC, "images/performance", `${donor}.jpg`),
  ];
  const src = candidates.find((p) => fs.existsSync(p));
  if (!src) {
    console.log("NO DONOR FILE", slug, "<-", donor);
    fail++;
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  const thumbDest = path.join(PUBLIC, "images/thumbs/hall-expansion", `${slug}.jpg`);
  const thumbSrc = [
    path.join(PUBLIC, "images/thumbs/golden-100", `${donor}.jpg`),
    path.join(PUBLIC, "images/thumbs/hall-expansion", `${donor}.jpg`),
    src,
  ].find((p) => fs.existsSync(p));
  if (thumbSrc) {
    fs.mkdirSync(path.dirname(thumbDest), { recursive: true });
    fs.copyFileSync(thumbSrc, thumbDest);
  }
  console.log("OK", slug, "<-", path.relative(PUBLIC, src));
  ok++;
}

console.log(JSON.stringify({ ok, fail }));
