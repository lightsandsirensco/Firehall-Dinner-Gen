#!/usr/bin/env tsx
/**
 * Capture Explore mobile viewport screenshots (390×844) for post-deploy verification.
 * Usage: npx tsx scripts/capture-explore-mobile-screenshots.ts [baseUrl]
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { approvedCatalogRecipePath } from "../shared/approved-catalog.js";

const BASE = (process.argv[2] || process.env.EXPLORE_SCREENSHOT_BASE || "http://127.0.0.1:5000").replace(
  /\/$/,
  "",
);
const OUT = path.join(process.cwd(), "review", "explore-mobile-screenshots");
const P0_SLUGS = [
  "flank-chimichurri",
  "bagel-lox-breakfast-board",
  "country-fried-steak-eggs",
  "shrimp-and-grits-breakfast",
];

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const exploreUrl = `${BASE}/explore?cachebust=${Date.now()}`;
  await page.goto(exploreUrl, { waitUntil: "networkidle", timeout: 60_000 });
  await page.screenshot({ path: path.join(OUT, "explore-grid-top.png"), fullPage: false });

  for (const slug of P0_SLUGS) {
    const url = `${BASE}${approvedCatalogRecipePath(slug)}?cachebust=${Date.now()}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.screenshot({ path: path.join(OUT, `${slug}-page.png`), fullPage: false });
    console.log(`  ✓ ${slug}`);
  }

  await browser.close();
  console.log(`[capture-explore-mobile] ${P0_SLUGS.length + 1} shots → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
