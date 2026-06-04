#!/usr/bin/env tsx
/** Mobile screenshots for Batch B — requires dev server on :5000 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:5000";
const OUT = path.join(process.cwd(), "review/batch-b-mobile-screenshots");

const RECIPES = [
  { slug: "classic-patty-melt-for-the-crew", cardPath: "/explore", pagePath: "/recipes/classic-patty-melt-for-the-crew" },
  { slug: "best-tuna-melt-for-the-hall", cardPath: "/explore", pagePath: "/recipes/best-tuna-melt-for-the-hall" },
  { slug: "hall-blt-sandwich-feed", cardPath: "/explore", pagePath: "/recipes/hall-blt-sandwich-feed" },
  { slug: "30-minute-pasta-e-fagioli-for-the-hall", cardPath: "/recipes", pagePath: "/recipes/30-minute-pasta-e-fagioli-for-the-hall" },
  { slug: "red-beans-and-rice-for-the-hall", cardPath: "/recipes", pagePath: "/recipes/red-beans-and-rice-for-the-hall" },
  { slug: "french-onion-soup-for-the-hall", cardPath: "/recipes", pagePath: "/recipes/french-onion-soup-for-the-hall" },
  { slug: "chicken-tortilla-soup-for-the-hall", cardPath: "/recipes", pagePath: "/recipes/chicken-tortilla-soup-for-the-hall" },
  { slug: "pasta-e-ceci-for-the-hall", cardPath: "/recipes", pagePath: "/recipes/pasta-e-ceci-for-the-hall" },
] as const;

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let ok = 0;
  for (const r of RECIPES) {
    try {
      await page.goto(`${BASE}${r.cardPath}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const link = page.locator(`a[href*="${r.slug}"]`).first();
      if (await link.count()) {
        await link.scrollIntoViewIfNeeded();
        await link.screenshot({ path: path.join(OUT, `${r.slug}-card.png`) });
      }
      await page.goto(`${BASE}${r.pagePath}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT, `${r.slug}-page.png`), fullPage: true });
      console.log(`  ✓ ${r.slug}`);
      ok++;
    } catch (e) {
      console.warn(`  ✗ ${r.slug}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  await browser.close();
  console.log(`[capture-batch-b-mobile] ${ok}/${RECIPES.length} → ${OUT}`);
  process.exit(ok === RECIPES.length ? 0 : 1);
}

main();
