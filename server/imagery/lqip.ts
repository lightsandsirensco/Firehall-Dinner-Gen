/**
 * Low-quality image placeholder (LQIP) — tiny blurred JPEG data URL.
 */

import { loadSharp } from "./sharp-utils.js";

const LQIP_WIDTH = 24;
const LQIP_QUALITY = 42;

export async function generateLqipDataUrl(buffer: Buffer): Promise<string | null> {
  const sharp = await loadSharp();
  if (!sharp) return null;

  try {
    const tiny = await sharp(buffer)
      .resize(LQIP_WIDTH, LQIP_WIDTH, { fit: "cover", position: "centre" })
      .blur(4)
      .jpeg({ quality: LQIP_QUALITY })
      .toBuffer();
    return `data:image/jpeg;base64,${tiny.toString("base64")}`;
  } catch {
    return null;
  }
}
