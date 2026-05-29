#!/usr/bin/env tsx
/**
 * Run Lighthouse SEO category against local or deployed URLs.
 *
 *   npx tsx scripts/audit-lighthouse-seo.ts
 *   BASE_URL=http://127.0.0.1:5000 npx tsx scripts/audit-lighthouse-seo.ts
 *
 * Requires Chrome/Chromium. Installs lighthouse on first run via npx.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = (process.env.BASE_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");
const outDir = path.join(process.cwd(), "review", "lighthouse-seo");

const PATHS = [
  { name: "home", path: "/" },
  { name: "generator", path: "/generator" },
  { name: "faq", path: "/faq" },
  { name: "explore", path: "/explore" },
  { name: "recipes", path: "/recipes" },
  { name: "about", path: "/about" },
  { name: "recipe-chicken-parm", path: "/recipes/chicken-parm" },
  { name: "sitemap", path: "/sitemap.xml" },
];

function runLighthouse(name: string, url: string): { seo: number; perf: number; a11y: number } | null {
  const outFile = path.join(outDir, `${name}.json`);
  try {
    execSync(
      `npx --yes lighthouse "${url}" --only-categories=seo,performance,accessibility --output=json --output-path="${outFile}" --chrome-flags="--headless --no-sandbox" --quiet`,
      { stdio: "pipe", timeout: 120_000 },
    );
  } catch (e) {
    console.warn(`[lighthouse-seo] skip ${name} — ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }

  const report = JSON.parse(fs.readFileSync(outFile, "utf8")) as {
    categories: Record<string, { score: number }>;
  };
  return {
    seo: Math.round((report.categories.seo?.score ?? 0) * 100),
    perf: Math.round((report.categories.performance?.score ?? 0) * 100),
    a11y: Math.round((report.categories.accessibility?.score ?? 0) * 100),
  };
}

function chromeAvailable(): boolean {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return true;
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  return candidates.some((p) => fs.existsSync(p));
}

function main(): void {
  fs.mkdirSync(outDir, { recursive: true });

  if (!chromeAvailable() && !process.env.CHROME_PATH) {
    console.warn(
      "[lighthouse-seo] SKIP — Chrome not found. Install Chrome or set CHROME_PATH, then re-run:\n" +
        "  $env:CHROME_PATH=\"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\"\n" +
        "  npm run seo:lighthouse",
    );
    process.exit(0);
  }

  console.log(`[lighthouse-seo] auditing ${BASE} → ${outDir}\n`);

  const rows: Array<{ name: string; url: string; seo: number; perf: number; a11y: number }> = [];
  let fail = 0;

  for (const { name, path: p } of PATHS) {
    const url = `${BASE}${p}`;
    const scores = runLighthouse(name, url);
    if (!scores) {
      fail++;
      continue;
    }
    rows.push({ name, url, ...scores });
    const ok = scores.seo >= 90;
    console.log(
      `  ${ok ? "✓" : "✗"} ${name.padEnd(22)} SEO=${scores.seo} Perf=${scores.perf} A11y=${scores.a11y}  ${url}`,
    );
    if (!ok) fail++;
  }

  const summaryPath = path.join(outDir, "summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify({ base: BASE, rows, at: new Date().toISOString() }, null, 2));
  console.log(`\n[lighthouse-seo] wrote ${summaryPath}`);
  console.log(fail === 0 ? "[lighthouse-seo] PASS (SEO ≥ 90 on all pages)" : `[lighthouse-seo] ${fail} page(s) below SEO 90`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
