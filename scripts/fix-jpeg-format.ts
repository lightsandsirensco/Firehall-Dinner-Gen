#!/usr/bin/env tsx
/**
 * Re-encode .jpg files that contain PNG/WebP bytes as real JPEG, in place.
 *
 * Same path, same pixels, same dimensions — no regeneration and no API calls. Cached
 * vision verdicts (scripts/output/recipe-image-audit-cache.json) are keyed by image
 * bytes, so entries for re-encoded live heroes are carried over to the new key.
 *
 *   npm run images:fix-jpeg-format              # dry run: report what would change
 *   npm run images:fix-jpeg-format -- --apply
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { encodeJpeg, isJpegBuffer } from "../server/imagery/sharp-utils.js";
import { qaCacheKey, type QaRecipe } from "../server/imagery/recipe-image-qa.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const IMAGES = path.join(PUBLIC, "images");
const CACHE_PATH = path.join(ROOT, "scripts", "output", "recipe-image-audit-cache.json");
const APPLY = process.argv.includes("--apply");

/** Mirrors how audit-recipe-image-catalog builds the recipe it hashes into the cache key. */
function liveHeroRecipes(): Map<string, QaRecipe[]> {
  const byHero = new Map<string, QaRecipe[]>();
  const catalog = path.join(PUBLIC, "catalog");
  for (const col of fs.readdirSync(catalog)) {
    const indexPath = path.join(catalog, col, "index.json");
    if (!fs.existsSync(indexPath)) continue;
    const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as { recipes?: Array<{ slug: string; title?: string; heroImage?: string }> };
    for (const entry of index.recipes ?? []) {
      const pagePath = path.join(catalog, col, "pages", `${entry.slug}.json`);
      const page = fs.existsSync(pagePath)
        ? (JSON.parse(fs.readFileSync(pagePath, "utf8")) as QaRecipe & { heroImage?: string })
        : null;
      const hero = page?.heroImage || entry.heroImage;
      if (!hero) continue;
      const recipe: QaRecipe = { ...(page ?? { slug: entry.slug }), slug: entry.slug, title: page?.title || entry.title };
      byHero.set(hero, [...(byHero.get(hero) ?? []), recipe]);
    }
  }
  return byHero;
}

/** Plain truncating writes fail on OneDrive cloud placeholders; replace the file instead. */
function replaceFile(abs: string, data: Buffer | string): void {
  const tmp = `${abs}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, abs);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.jpe?g$/i.test(e.name)) out.push(p);
  }
  return out;
}

async function main(): Promise<void> {
  const heroRecipes = liveHeroRecipes();
  const cache = fs.existsSync(CACHE_PATH) ? (JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) as Record<string, unknown>) : {};

  let converted = 0;
  let before = 0;
  let after = 0;
  let cacheMoved = 0;
  const skipped: string[] = [];
  const pending: Array<{ abs: string; jpeg: Buffer }> = [];

  for (const abs of walk(IMAGES)) {
    const buf = fs.readFileSync(abs);
    if (isJpegBuffer(buf)) continue;
    const rel = `/${path.relative(PUBLIC, abs).split(path.sep).join("/")}`;

    const meta = await sharp(buf).metadata();
    if (meta.hasAlpha) {
      const { channels } = await sharp(buf).stats();
      if ((channels[3]?.min ?? 255) < 255) {
        skipped.push(`${rel}: has real transparency — JPEG would flatten it`);
        continue;
      }
    }

    const jpeg = await encodeJpeg(buf);
    const out = await sharp(jpeg).metadata();
    if (out.width !== meta.width || out.height !== meta.height) {
      skipped.push(`${rel}: dimension mismatch after encode (${meta.width}x${meta.height} → ${out.width}x${out.height})`);
      continue;
    }

    converted++;
    before += buf.length;
    after += jpeg.length;

    for (const recipe of heroRecipes.get(rel) ?? []) {
      const verdict = cache[qaCacheKey(buf, recipe)];
      if (verdict) {
        cache[qaCacheKey(jpeg, recipe)] = verdict;
        cacheMoved++;
      }
    }

    pending.push({ abs, jpeg });
  }

  // Cache first: if an image write fails, a re-run still finds the original bytes.
  if (APPLY && cacheMoved) replaceFile(CACHE_PATH, JSON.stringify(cache));
  if (APPLY) for (const { abs, jpeg } of pending) replaceFile(abs, jpeg);

  const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
  console.log(
    `[fix-jpeg-format] ${APPLY ? "re-encoded" : "would re-encode"} ${converted} file(s): ` +
      `${mb(before)} MB → ${mb(after)} MB (saved ${mb(before - after)} MB, ` +
      `avg ${converted ? Math.round((before - after) / converted / 1024) : 0} KB/file); ` +
      `vision cache entries carried over: ${cacheMoved}`,
  );
  for (const s of skipped) console.warn(`  skipped ${s}`);
  if (!APPLY && converted) console.log("[fix-jpeg-format] dry run — pass --apply to write");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
