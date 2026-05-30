/**
 * Generate the Red Lead lead magnet PDF from print-ready HTML.
 * Uses Microsoft Edge headless on Windows, Chrome/Chromium elsewhere when available.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HTML = path.join(ROOT, "client/public/downloads/the-official-firehall-red-lead-recipe.html");
const PDF = path.join(ROOT, "client/public/downloads/the-official-firehall-red-lead-recipe.pdf");

function browserCandidates(): string[] {
  const win = process.platform === "win32";
  if (win) {
    return [
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ];
  }
  return ["google-chrome", "chromium", "chromium-browser", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
}

function main() {
  if (!fs.existsSync(HTML)) {
    console.error(`[lead-magnet:red-lead-pdf] Missing HTML: ${HTML}`);
    process.exit(1);
  }

  const fileUrl = `file:///${HTML.replace(/\\/g, "/")}`;
  const browser = browserCandidates().find((bin) => fs.existsSync(bin) || spawnSync("where", [bin], { shell: true }).status === 0);

  if (!browser) {
    console.error("[lead-magnet:red-lead-pdf] No headless browser found.");
    console.error("Open the HTML in a browser and choose Print → Save as PDF:");
    console.error(HTML);
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

main();
