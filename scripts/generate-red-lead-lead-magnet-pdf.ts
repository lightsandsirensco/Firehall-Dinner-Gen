#!/usr/bin/env tsx
/**
 * Generate Red Lead lead magnet PDF + preview from print-ready HTML.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { RED_LEAD_PDF_ASSETS } from "../shared/seo/firefighter-red-lead-sauce-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "client/public");
const HTML = path.join(PUBLIC, "downloads/the-official-firehall-red-lead-recipe.html");
const PDF = path.join(PUBLIC, "downloads/the-official-firehall-red-lead-recipe.pdf");
const PREVIEW = path.join(PUBLIC, "downloads/the-official-firehall-red-lead-recipe-preview.jpg");
const HERO = path.join(PUBLIC, RED_LEAD_PDF_ASSETS.heroImage.replace(/^\//, ""));

function browserCandidates(): string[] {
  if (process.platform === "win32") {
    return [
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ];
  }
  return ["google-chrome", "chromium", "chromium-browser", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
}

function buildHtml() {
  const r = spawnSync("npx", ["tsx", "scripts/build-red-lead-lead-magnet-html.ts"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
}

function generatePdf() {
  if (!fs.existsSync(HTML)) {
    console.error(`[lead-magnet:red-lead-pdf] Missing HTML: ${HTML}`);
    process.exit(1);
  }

  const fileUrl = `file:///${HTML.replace(/\\/g, "/")}`;
  const browser = browserCandidates().find(
    (bin) => fs.existsSync(bin) || spawnSync("where", [bin], { shell: true }).status === 0,
  );

  if (!browser) {
    console.error("[lead-magnet:red-lead-pdf] No headless browser found.");
    process.exit(1);
  }

  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${PDF}`,
    fileUrl,
  ];

  const result = spawnSync(browser, args, { encoding: "utf8" });
  if (result.status !== 0 || !fs.existsSync(PDF)) {
    console.error("[lead-magnet:red-lead-pdf] PDF generation failed.");
    if (result.stderr) console.error(result.stderr);
    process.exit(1);
  }

  const sizeKb = Math.round(fs.statSync(PDF).size / 1024);
  console.log(`[lead-magnet:red-lead-pdf] Wrote ${PDF} (${sizeKb} KB)`);
}

async function generatePreview() {
  if (!fs.existsSync(HERO)) {
    console.error(`[lead-magnet:red-lead-pdf] Missing hero for preview: ${HERO}`);
    process.exit(1);
  }

  await sharp(HERO)
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(PREVIEW);

  const sizeKb = Math.round(fs.statSync(PREVIEW).size / 1024);
  console.log(`[lead-magnet:red-lead-pdf] Wrote ${PREVIEW} (${sizeKb} KB)`);
}

async function main() {
  buildHtml();
  generatePdf();
  await generatePreview();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
