#!/usr/bin/env tsx
/** Mobile screenshots for handheld batch — requires dev server on :5000 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:5000";
const OUT = path.join(process.cwd(), "review/batch-handheld-mobile-screenshots");

const RECIPES = [
  { slug: "chicken-caesar-wraps", cardPath: "/explore", pagePath: "/recipes/chicken-caesar-wraps" },
  { slug: "buffalo-chicken-wraps", cardPath: "/explore", pagePath: "/recipes/buffalo-chicken-wraps" },
  { slug: "greek-chicken-pitas", cardPath: "/explore", pagePath: "/recipes/greek-chicken-pitas" },
  { slug: "beef-gyros-for-the-hall", cardPath: "/explore", pagePath: "/recipes/beef-gyros-for-the-hall" },
  { slug: "chicken-shawarma-pitas", cardPath: "/explore", pagePath: "/recipes/chicken-shawarma-pitas" },
  { slug: "sausage-peppers-on-buns", cardPath: "/explore", pagePath: "/recipes/sausage-peppers-on-buns" },
  { slug: "chicken-dumpling-soup", cardPath: "/recipes", pagePath: "/recipes/chicken-dumpling-soup" },
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
  console.log(`[capture-batch-handheld-mobile] ${ok}/${RECIPES.length} → ${OUT}`);
  process.exit(ok === RECIPES.length ? 0 : 1);
}

main();
