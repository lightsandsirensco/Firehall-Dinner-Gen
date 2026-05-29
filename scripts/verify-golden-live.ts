#!/usr/bin/env tsx
/**
 * Smoke-test Golden 100 routes on a running server (dev or production).
 *
 *   npx tsx scripts/verify-golden-live.ts
 *   BASE_URL=https://your-app.replit.app npx tsx scripts/verify-golden-live.ts
 */
import fs from "node:fs";
import path from "node:path";

const BASE = (process.env.BASE_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");
const SAMPLE_SIZE = parseInt(process.env.SAMPLE_SIZE || "12", 10);

type IndexEntry = { slug: string; title?: string };

async function fetchOk(url: string): Promise<{ ok: boolean; status: number; contentType?: string }> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    const ct = res.headers.get("content-type") ?? "";
    return { ok: res.ok, status: res.status, contentType: ct };
  } catch (e) {
    return { ok: false, status: 0, contentType: e instanceof Error ? e.message : "fetch failed" };
  }
}

function loadSlugs(): IndexEntry[] {
  const indexPath = path.join(process.cwd(), "client", "public", "catalog", "golden-100", "index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as { recipes: IndexEntry[] };
  return index.recipes ?? [];
}

async function main(): Promise<void> {
  const recipes = loadSlugs();
  if (recipes.length !== 100) {
    console.error(`[verify-live] expected 100 recipes, got ${recipes.length}`);
    process.exit(1);
  }

  let fail = 0;

  const sitemap = await fetchOk(`${BASE}/sitemap.xml`);
  if (!sitemap.ok || !sitemap.contentType?.includes("xml")) {
    fail++;
    console.error(`[verify-live] FAIL sitemap.xml status=${sitemap.status} ct=${sitemap.contentType}`);
  } else {
    console.log(`[verify-live] OK sitemap.xml`);
  }

  const robots = await fetchOk(`${BASE}/robots.txt`);
  if (!robots.ok) {
    fail++;
    console.error(`[verify-live] FAIL robots.txt status=${robots.status}`);
  } else {
    console.log(`[verify-live] OK robots.txt`);
  }

  const catalog = await fetchOk(`${BASE}/api/catalog/golden-100`);
  if (!catalog.ok) {
    fail++;
    console.error(`[verify-live] FAIL catalog index status=${catalog.status}`);
  } else {
    console.log(`[verify-live] OK /api/catalog/golden-100`);
  }

  const sample = [
    ...recipes.slice(0, Math.ceil(SAMPLE_SIZE / 2)),
    ...recipes.slice(-Math.floor(SAMPLE_SIZE / 2)),
  ];
  const seen = new Set<string>();

  for (const { slug } of sample) {
    if (seen.has(slug)) continue;
    seen.add(slug);

    const api = await fetchOk(`${BASE}/api/catalog/golden-100/${slug}`);
    const page = await fetchOk(`${BASE}/recipes/${slug}`);
    const heroPath = `/images/golden-100/${slug}.webp`;
    const hero = await fetchOk(`${BASE}${heroPath}`);

    if (!api.ok) {
      fail++;
      console.error(`[verify-live] FAIL API ${slug} status=${api.status}`);
    }
    if (!page.ok) {
      fail++;
      console.error(`[verify-live] FAIL page ${slug} status=${page.status}`);
    }
    if (!hero.ok) {
      const heroJpg = await fetchOk(`${BASE}/images/golden-100/${slug}.jpg`);
      if (!heroJpg.ok) {
        fail++;
        console.error(`[verify-live] FAIL hero ${slug} webp=${hero.status} jpg=${heroJpg.status}`);
      }
    }
  }

  console.log(`[verify-live] sampled ${seen.size} recipes — ${fail === 0 ? "PASS" : `${fail} failures`}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
