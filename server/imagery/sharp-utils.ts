/**
 * Optional sharp loader — avoids hard dependency at compile time.
 */

type ResizeOpts = { fit: string; position: string };

type JpegOpts = { quality: number; mozjpeg?: boolean };
type JpegOut = { toBuffer: () => Promise<Buffer> };
type WebpOut = { toBuffer: () => Promise<Buffer> };

type AfterResize = {
  jpeg: (opts: JpegOpts) => JpegOut;
  webp: (opts: { quality: number }) => WebpOut;
  blur: (sigma: number) => { jpeg: (opts: { quality: number }) => JpegOut };
};

export type SharpPipeline = (input: Buffer) => {
  resize: (w: number, h: number, opts: ResizeOpts) => AfterResize;
  jpeg: (opts: JpegOpts) => JpegOut;
};

/** Encoder settings for every published .jpg (hero, mobile, thumb, rail). */
export const JPEG_OUTPUT: JpegOpts = { quality: 82, mozjpeg: true };

let sharpAvailable: boolean | null = null;

export async function loadSharp(): Promise<SharpPipeline | null> {
  if (sharpAvailable === false) return null;
  try {
    const mod = (await new Function('return import("sharp")')()) as {
      default: SharpPipeline;
    };
    sharpAvailable = true;
    return mod.default;
  } catch {
    sharpAvailable = false;
    return null;
  }
}

/** Image writers must not silently fall back to raw (PNG) bytes when sharp is missing. */
export async function requireSharp(): Promise<SharpPipeline> {
  const sharp = await loadSharp();
  if (!sharp) throw new Error("sharp is required to encode recipe images (npm install sharp)");
  return sharp;
}

export function isJpegBuffer(buf: Buffer): boolean {
  return buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

/** Throws when bytes headed for a .jpg path are not JPEG data. */
export function assertJpegBuffer(buf: Buffer, target: string): void {
  if (!isJpegBuffer(buf)) throw new Error(`refusing to write non-JPEG bytes to ${target}`);
}

/**
 * JPEG bytes for a .jpg path at the source dimensions. The Images API returns PNG, so
 * generator output is always re-encoded; data that is already JPEG passes through untouched.
 */
export async function encodeJpeg(buf: Buffer): Promise<Buffer> {
  if (isJpegBuffer(buf)) return buf;
  const sharp = await requireSharp();
  return sharp(buf).jpeg(JPEG_OUTPUT).toBuffer();
}
