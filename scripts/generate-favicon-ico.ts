#!/usr/bin/env tsx
/**
 * Regenerates `client/public/favicon.ico` as a genuine multi-resolution ICO
 * container (16x16, 32x32, 48x48), embedding PNG-compressed frames — the
 * modern ICO format every major browser/OS has supported since Vista/IE9.
 *
 * The prior `favicon.ico` was a raw 32x32 PNG renamed with a `.ico`
 * extension (no ICONDIR header at all), which some strict ICO parsers
 * reject or mishandle. Source: highest-res PWA icon already in the repo.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve(process.cwd());
const SOURCE = path.join(ROOT, "client", "public", "pwa", "icon-512.png");
const OUT_ICO = path.join(ROOT, "client", "public", "favicon.ico");
const SIZES = [16, 32, 48];

async function buildIco(): Promise<void> {
  const frames = await Promise.all(
    SIZES.map((size) => sharp(SOURCE).resize(size, size, { fit: "cover" }).png().toBuffer()),
  );

  const ICONDIR_SIZE = 6;
  const ICONDIRENTRY_SIZE = 16;
  const headerSize = ICONDIR_SIZE + ICONDIRENTRY_SIZE * frames.length;

  const header = Buffer.alloc(ICONDIR_SIZE);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(frames.length, 4); // image count

  let offset = headerSize;
  const entries: Buffer[] = [];
  for (let i = 0; i < frames.length; i++) {
    const size = SIZES[i];
    const frame = frames[i];
    const entry = Buffer.alloc(ICONDIRENTRY_SIZE);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height (0 = 256)
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(frame.length, 8); // frame byte size
    entry.writeUInt32LE(offset, 12); // frame byte offset
    entries.push(entry);
    offset += frame.length;
  }

  const ico = Buffer.concat([header, ...entries, ...frames]);
  fs.writeFileSync(OUT_ICO, ico);
  console.log(`Wrote ${OUT_ICO} (${ico.length} bytes, ${SIZES.join("x, ")}x frames embedded)`);
}

buildIco().catch((err) => {
  console.error(err);
  process.exit(1);
});
