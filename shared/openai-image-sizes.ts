/**
 * GPT Image API (gpt-image-1) supported output sizes — OpenAI SDK v6+.
 * @see https://platform.openai.com/docs/guides/image-generation
 */

export const GPT_IMAGE_API_SIZES = [
  "1024x1024",
  "1024x1536",
  "1536x1024",
  "auto",
] as const;

export type GptImageApiSize = (typeof GPT_IMAGE_API_SIZES)[number];

export const GPT_IMAGE_SIZE_SQUARE = "1024x1024" as const satisfies GptImageApiSize;
export const GPT_IMAGE_SIZE_PORTRAIT = "1024x1536" as const satisfies GptImageApiSize;
export const GPT_IMAGE_SIZE_LANDSCAPE = "1536x1024" as const satisfies GptImageApiSize;
export const GPT_IMAGE_SIZE_AUTO = "auto" as const satisfies GptImageApiSize;

/** @deprecated Removed from API — map to square */
const LEGACY_SIZES = new Set(["512x512", "256x256", "1792x1024", "1024x1792"]);

export function isGptImageApiSize(value: string): value is GptImageApiSize {
  return (GPT_IMAGE_API_SIZES as readonly string[]).includes(value);
}

export function normalizeGptImageSize(
  value: string | undefined,
  fallback: GptImageApiSize = GPT_IMAGE_SIZE_SQUARE,
): GptImageApiSize {
  const v = (value || "").trim();
  if (isGptImageApiSize(v)) return v;
  if (LEGACY_SIZES.has(v)) return GPT_IMAGE_SIZE_SQUARE;
  return fallback;
}

export function parseGptImageDimensions(
  size: Exclude<GptImageApiSize, "auto">,
): { width: number; height: number } {
  const [w, h] = size.split("x").map(Number);
  return { width: w || 1024, height: h || 1024 };
}
