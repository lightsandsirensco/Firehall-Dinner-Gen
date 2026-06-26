#!/usr/bin/env tsx
/**
 * Generate PWA PNG icons from client/public/pwa/icon.svg
 *
 *   npx tsx scripts/generate-pwa-icons.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SVG_PATH = path.join(ROOT, "client", "public", "pwa", "icon.svg");
const OUT_DIR = path.join(ROOT, "client", "public", "pwa");

const SIZES: Array<{ name: string; size: number; padding?: number }> = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable-512.png", size: 512, padding: 0.18 },
  { name: "apple-touch-icon.png", size: 180 },
];

async function main(): Promise<void> {
  if (!fs.existsSync(SVG_PATH)) {
    throw new Error(`Missing source icon: ${SVG_PATH}`);
  }

  let sharp: typeof import("sharp");
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("[generate-pwa-icons] sharp not available — install optionalDependencies or run npm install sharp");
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const svg = fs.readFileSync(SVG_PATH);

  for (const { name, size, padding = 0 } of SIZES) {
    const inset = Math.round(size * padding);
    const inner = size - inset * 2;
    const outPath = path.join(OUT_DIR, name);
    await sharp(svg)
      .resize(inner, inner, { fit: "contain", background: { r: 20, g: 20, b: 20, alpha: 1 } })
      .extend({
        top: inset,
        bottom: inset,
        left: inset,
        right: inset,
        background: { r: 20, g: 20, b: 20, alpha: 1 },
      })
      .png()
      .toFile(outPath);
    console.log(`[generate-pwa-icons] wrote ${path.relative(ROOT, outPath)}`);
  }

  const faviconPath = path.join(ROOT, "client", "public", "favicon.ico");
  await sharp(svg).resize(32, 32).png().toFile(faviconPath.replace(/\.ico$/, ".png"));
  await sharp(svg).resize(32, 32).toFile(faviconPath);
  console.log(`[generate-pwa-icons] wrote ${path.relative(ROOT, faviconPath)}`);
}

main().catch((err) => {
  console.error("[generate-pwa-icons] FAILED", err);
  process.exit(1);
});
