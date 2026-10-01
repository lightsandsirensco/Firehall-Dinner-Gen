#!/usr/bin/env tsx
/**
 * Generate PWA PNG icons from client/public/pwa/icon.svg
 *
 *   npx tsx scripts/generate-pwa-icons.ts
 */
import fs from "node:fs";
import path from "node:path";
import { writeFileAtomicSync } from "../server/lib/write-file-atomic.js";

const ROOT = process.cwd();
const SVG_PATH = path.join(ROOT, "client", "public", "pwa", "icon.svg");
const OUT_DIR = path.join(ROOT, "client", "public", "pwa");

const DARK = { r: 20, g: 20, b: 20, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** Maskable and Apple icons get cropped/filled by the OS, so they need a solid background. */
const SIZES: Array<{ name: string; size: number; padding?: number; background: typeof DARK }> = [
  { name: "icon-192.png", size: 192, background: TRANSPARENT },
  { name: "icon-512.png", size: 512, background: TRANSPARENT },
  { name: "icon-maskable-512.png", size: 512, padding: 0.12, background: DARK },
  { name: "apple-touch-icon.png", size: 180, padding: 0.04, background: DARK },
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

  for (const { name, size, padding = 0, background } of SIZES) {
    const inset = Math.round(size * padding);
    const inner = size - inset * 2;
    const outPath = path.join(OUT_DIR, name);
    const mark = await sharp(svg, { density: 144 })
      .resize(inner, inner, { fit: "contain", background: TRANSPARENT })
      .png()
      .toBuffer();
    const icon = await sharp({ create: { width: size, height: size, channels: 4, background } })
      .composite([{ input: mark, top: inset, left: inset }])
      .png()
      .toBuffer();
    writeFileAtomicSync(outPath, icon);
    console.log(`[generate-pwa-icons] wrote ${path.relative(ROOT, outPath)}`);
  }

  // The logo is a circle: keep the favicon transparent so it doesn't sit in a dark square on light tabs.
  const faviconPngPath = path.join(ROOT, "client", "public", "favicon.png");
  writeFileAtomicSync(faviconPngPath, await sharp(svg).resize(32, 32).png().toBuffer());
  console.log(`[generate-pwa-icons] wrote ${path.relative(ROOT, faviconPngPath)} (run generate-favicon-ico for favicon.ico)`);
}

main().catch((err) => {
  console.error("[generate-pwa-icons] FAILED", err);
  process.exit(1);
});
