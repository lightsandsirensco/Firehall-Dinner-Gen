/**
 * Optional sharp loader — avoids hard dependency at compile time.
 */

type ResizeOpts = { fit: string; position: string };

type JpegOut = { toBuffer: () => Promise<Buffer> };
type WebpOut = { toBuffer: () => Promise<Buffer> };

type AfterResize = {
  jpeg: (opts: { quality: number; mozjpeg?: boolean }) => JpegOut;
  webp: (opts: { quality: number }) => WebpOut;
  blur: (sigma: number) => { jpeg: (opts: { quality: number }) => JpegOut };
};

export type SharpPipeline = (input: Buffer) => {
  resize: (w: number, h: number, opts: ResizeOpts) => AfterResize;
};

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
