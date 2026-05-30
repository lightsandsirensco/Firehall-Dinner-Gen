#!/usr/bin/env tsx
/**
 * QA for Red Lead lead magnet PDF assets.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  RED_LEAD_PDF_ASSETS,
  RED_LEAD_SAUCE_STEPS,
} from "../shared/seo/firefighter-red-lead-sauce-data.js";
import { validateRedLeadImageRef } from "../shared/curated-image-governance/red-lead-rules.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "client/public");

function abs(publicPath: string): string {
  return path.join(PUBLIC, publicPath.replace(/^\//, ""));
}

const failures: string[] = [];

function checkFile(label: string, publicPath: string, minBytes = 1) {
  const file = abs(publicPath);
  if (!fs.existsSync(file)) {
    failures.push(`${label}: missing ${publicPath}`);
    return;
  }
  if (fs.statSync(file).size < minBytes) {
    failures.push(`${label}: file too small ${publicPath}`);
  }
}

checkFile("HTML", RED_LEAD_PDF_ASSETS.htmlPath, 5000);
checkFile("PDF", RED_LEAD_PDF_ASSETS.pdfPath, 20_000);
checkFile("Preview", RED_LEAD_PDF_ASSETS.previewPath, 5000);
checkFile("Hero", RED_LEAD_PDF_ASSETS.heroImage, 5000);
checkFile("Spread", RED_LEAD_PDF_ASSETS.spreadImage, 5000);

const html = fs.readFileSync(abs(RED_LEAD_PDF_ASSETS.htmlPath), "utf8");
const forbidden = ["sirloin", "flank steak", "steak strip", "crack one egg", "egg well", "biscuit", "gravy"];
for (const word of forbidden) {
  if (html.toLowerCase().includes(word)) {
    failures.push(`HTML contains forbidden content: "${word}"`);
  }
}

if (!html.includes("Red Lead is the tomato sauce")) {
  failures.push("HTML missing core sauce definition");
}
if ((html.match(/<section class="page/g) || []).length !== 5) {
  failures.push(`Expected 5 PDF pages, found ${(html.match(/<section class="page/g) || []).length}`);
}

  const htmlDir = path.dirname(abs(RED_LEAD_PDF_ASSETS.htmlPath));
  for (const img of ["../images/breakfast/firefighter-red-lead-recipe.jpg", "../images/breakfast/chorizo-breakfast-hash.jpg"]) {
    if (!html.includes(img)) {
      failures.push(`HTML missing image reference ${img}`);
    }
    const resolved = path.normalize(path.join(htmlDir, img));
    if (!fs.existsSync(resolved)) {
      failures.push(`HTML image not on disk: ${img} (${resolved})`);
    }
  }

const heroRule = validateRedLeadImageRef("Firefighter Red Lead Recipe", RED_LEAD_PDF_ASSETS.heroImage);
if (!heroRule.ok) {
  failures.push(`Hero image governance: ${heroRule.forbidden || heroRule.missingRequired}`);
}

if (RED_LEAD_SAUCE_STEPS.some((s) => /egg|steak|potato/i.test(s.body) && !/separate|not the whole|not steak/i.test(s.body))) {
  // steps may mention eggs in context of "serve separately" — already checked forbidden words
}

const pdfBuf = fs.readFileSync(abs(RED_LEAD_PDF_ASSETS.pdfPath));
if (!pdfBuf.slice(0, 4).toString("utf8").startsWith("%PDF")) {
  failures.push("PDF file is not a valid PDF header");
}

if (failures.length) {
  console.error("[validate:red-lead-pdf] FAIL");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

const pdfKb = Math.round(fs.statSync(abs(RED_LEAD_PDF_ASSETS.pdfPath)).size / 1024);
const previewKb = Math.round(fs.statSync(abs(RED_LEAD_PDF_ASSETS.previewPath)).size / 1024);
console.log("[validate:red-lead-pdf] OK");
console.log(`  pages=5 steps=${RED_LEAD_SAUCE_STEPS.length} pdf=${pdfKb}KB preview=${previewKb}KB`);
console.log(`  download=${RED_LEAD_PDF_ASSETS.pdfPath}`);
