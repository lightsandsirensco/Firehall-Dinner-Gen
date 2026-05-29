#!/usr/bin/env tsx
/**
 * Ensure Golden-100 hero JPGs exist at:
 *   client/public/images/golden-100/<slug>.jpg
 *
 * Strategy:
 * - If manifest/classic has a Spoonacular ID, download the public Spoonacular image (no API key required).
 * - Otherwise, use Spoonacular search (requires SPOONACULAR_API_KEY) to resolve an ID, then download.
 *
 * Also writes corresponding thumbs under client/public/images/thumbs/<slug>.jpg.
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { searchRecipes } from "../server/spoonacular.js";
import { Agent } from "undici";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const allowInsecure = process.env.SPOONACULAR_INSECURE_TLS === "true";
  const dispatcher = allowInsecure ? new Agent({ connect: { rejectUnauthorized: false } }) : undefined;
  const res = await fetch(url, { method: "GET", ...(dispatcher ? ({ dispatcher } as any) : {}) } as any);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const arr = new Uint8Array(await res.arrayBuffer());
  return Buffer.from(arr);
}

function slugToHeroAbs(slug: string): string {
  return path.join(process.cwd(), "client", "public", "images", "golden-100", `${slug}.jpg`);
}
function slugToThumbAbs(slug: string): string {
  return path.join(process.cwd(), "client", "public", "images", "thumbs", `${slug}.jpg`);
}

async function resolveSpoonacularIdForSlug(slug: string): Promise<number | null> {
  // Use the on-disk public page JSON as the source of truth for a clean query.
  const pagePath = path.join(
    process.cwd(),
    "client",
    "public",
    "catalog",
    "golden-100",
    "pages",
    `${slug}.json`,
  );
  let title = slug.replace(/-/g, " ");
  let searchTerms: string[] = [];
  try {
    const raw = JSON.parse(fs.readFileSync(pagePath, "utf8")) as any;
    if (typeof raw?.title === "string") title = raw.title;
    if (Array.isArray(raw?.searchTerms)) searchTerms = raw.searchTerms.filter((x: any) => typeof x === "string");
  } catch {
    /* ignore */
  }

  // Keep queries short — long queries often return 0 results.
  const q = String(title || slug).trim();
  if (!process.env.SPOONACULAR_API_KEY) return null;
  const resultsA = await searchRecipes(q, { number: 5, offset: 0 });
  const firstA = resultsA?.results?.[0] as any;
  const idA = firstA?.id ? Number(firstA.id) : 0;
  if (idA > 0) return idA;

  // Try an even simpler query (first 2–3 words).
  const short = q.split(/\s+/).slice(0, 3).join(" ").trim();
  if (short && short !== q) {
    const resultsB = await searchRecipes(short, { number: 5, offset: 0 });
    const firstB = resultsB?.results?.[0] as any;
    const idB = firstB?.id ? Number(firstB.id) : 0;
    if (idB > 0) return idB;
  }
  return null;
}

async function main(): Promise<void> {
  const heroesDir = path.join(process.cwd(), "client", "public", "images", "golden-100");
  const thumbsDir = path.join(process.cwd(), "client", "public", "images", "thumbs");
  fs.mkdirSync(heroesDir, { recursive: true });
  fs.mkdirSync(thumbsDir, { recursive: true });

  const indexPath = path.join(process.cwd(), "client", "public", "catalog", "golden-100", "index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as any;
  const slugs: string[] = Array.isArray(index?.recipes) ? index.recipes.map((r: any) => String(r.slug)) : [];

  const missing: string[] = [];
  for (const slug of slugs) {
    const abs = slugToHeroAbs(slug);
    if (!fs.existsSync(abs)) missing.push(slug);
  }

  console.log(`[golden-hero-fill] missing_heroes=${missing.length}`);
  let ok = 0;
  let fail = 0;
  let skipped = 0;

  for (const slug of missing) {
    try {
      const id = await resolveSpoonacularIdForSlug(slug);
      if (!id) {
        skipped++;
        console.warn(`  ○ ${slug}: no spoonacular id (set SPOONACULAR_API_KEY for search)`);
        continue;
      }
      const url = `https://img.spoonacular.com/recipes/${id}-636x393.jpg`;
      const buf = await fetchBuffer(url);
      fs.writeFileSync(slugToHeroAbs(slug), buf);
      // Thumb: copy the hero for now (we keep exact bytes; UI will crop/contain as needed)
      if (!fs.existsSync(slugToThumbAbs(slug))) {
        fs.copyFileSync(slugToHeroAbs(slug), slugToThumbAbs(slug));
      }
      ok++;
      console.log(`  ✓ ${slug}: downloaded spoonacular:${id}`);
      await sleep(150);
    } catch (e: any) {
      fail++;
      console.warn(`  ✗ ${slug}: ${e?.message || String(e)}`);
    }
  }

  console.log(`[golden-hero-fill] done ok=${ok} fail=${fail} skipped=${skipped}`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

