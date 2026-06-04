#!/usr/bin/env tsx
/**
 * Mobile screenshots for Batch A recipe cards + pages.
 * Requires dev server: npm run dev (default http://127.0.0.1:5000)
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright-core";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:5000";
const OUT = path.join(process.cwd(), "review/batch-a-mobile-screenshots");

const RECIPES: Array<{ slug: string; cardPath: string; pagePath: string }> = [
  { slug: "shakshuka-for-the-hall", cardPath: "/breakfast", pagePath: "/breakfast/shakshuka-for-the-hall" },
  { slug: "menemen-for-the-crew", cardPath: "/breakfast", pagePath: "/breakfast/menemen-for-the-crew" },
  { slug: "baked-oatmeal-mixed-berries", cardPath: "/breakfast", pagePath: "/breakfast/baked-oatmeal-mixed-berries" },
  {
    slug: "sheet-pan-parmesan-dijon-chicken-thigh-dinner",
    cardPath: "/recipes",
    pagePath: "/recipes/sheet-pan-parmesan-dijon-chicken-thigh-dinner",
  },
  { slug: "four-step-chicken-piccata", cardPath: "/recipes", pagePath: "/recipes/four-step-chicken-piccata" },
  {
    slug: "tomato-soup-grilled-cheese-croutons",
    cardPath: "/recipes",
    pagePath: "/recipes/tomato-soup-grilled-cheese-croutons",
  },
  {
    slug: "spaghetti-aglio-e-olio-for-the-hall",
    cardPath: "/recipes",
    pagePath: "/recipes/spaghetti-aglio-e-olio-for-the-hall",
  },
  {
    slug: "spicy-tomato-bisque-grilled-brie-toast",
    cardPath: "/recipes",
    pagePath: "/recipes/spicy-tomato-bisque-grilled-brie-toast",
  },
];

async function waitForRecipe(page: Page, slug: string): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.locator(`a[href*="${slug}"], [data-slug="${slug}"]`).first().waitFor({ timeout: 20_000 }).catch(() => {});
}

async function screenshotCard(page: Page, slug: string, cardPath: string, dest: string): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}${cardPath}`, { waitUntil: "domcontentloaded" });
  await waitForRecipe(page, slug);
  const link = page.locator(`a[href*="${slug}"]`).first();
  if (await link.count()) {
    await link.scrollIntoViewIfNeeded();
    await link.screenshot({ path: dest });
    return;
  }
  await page.screenshot({ path: dest, fullPage: true });
}

async function screenshotPage(page: Page, pagePath: string, dest: string): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}${pagePath}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: dest, fullPage: true });
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge",
  });
  const context = await browser.newContext({ isMobile: true, hasTouch: true });
  const page = await context.newPage();

  let ok = 0;
  for (const r of RECIPES) {
    const cardFile = path.join(OUT, `${r.slug}-card.png`);
    const pageFile = path.join(OUT, `${r.slug}-page.png`);
    try {
      await screenshotCard(page, r.slug, r.cardPath, cardFile);
      await screenshotPage(page, r.pagePath, pageFile);
      console.log(`  ✓ ${r.slug}`);
      ok++;
    } catch (err) {
      console.warn(`  ✗ ${r.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await browser.close();
  console.log(`[capture-batch-a-mobile] ${ok}/${RECIPES.length} → ${OUT}`);
  process.exit(ok === RECIPES.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
