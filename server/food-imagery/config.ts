import path from "node:path";
import { hasOpenAIKey } from "../openai-client.js";
import { resolvePublicAppUrl } from "../../shared/replit-public-url.js";
import {
  GPT_IMAGE_SIZE_SQUARE,
  normalizeGptImageSize,
  type GptImageApiSize,
} from "../lib/image-sizes.js";

function defaultStorageDir(): string {
  const custom = process.env.FOOD_IMAGERY_STORAGE_DIR?.trim();
  if (custom) return custom;
  // Always write under client/public (Vite source); mirrored to dist/public in production.
  return path.join(process.cwd(), "client", "public", "images", "generated");
}

export interface FoodImageryConfig {
  enabled: boolean;
  model: string;
  size: GptImageApiSize;
  maxConcurrent: number;
  maxRetries: number;
  visionValidate: boolean;
  minBytes: number;
  storageDir: string;
  publicBaseUrl: string;
  /** Replace Spoonacular heroes for curated/hall meals */
  replaceAggregatorHeroes: boolean;
  /** Keep real publisher photos */
  preservePublisherHeroes: boolean;
}

export function getFoodImageryConfig(): FoodImageryConfig {
  const publicBase = resolvePublicAppUrl();
  const rawSize = process.env.FOOD_IMAGERY_SIZE?.trim();
  const size = normalizeGptImageSize(rawSize, GPT_IMAGE_SIZE_SQUARE);

  return {
    enabled: process.env.FOOD_IMAGERY_ENABLED === "true" && hasOpenAIKey(),
    model: process.env.FOOD_IMAGERY_MODEL?.trim() || "gpt-image-1",
    size,
    maxConcurrent: Math.max(1, parseInt(process.env.FOOD_IMAGERY_MAX_CONCURRENT || "2", 10)),
    maxRetries: Math.max(0, parseInt(process.env.FOOD_IMAGERY_MAX_RETRIES || "2", 10)),
    visionValidate: process.env.FOOD_IMAGERY_VISION_VALIDATE === "true",
    minBytes: Math.max(10_000, parseInt(process.env.FOOD_IMAGERY_MIN_BYTES || "40000", 10)),
    storageDir: defaultStorageDir(),
    publicBaseUrl: publicBase,
    replaceAggregatorHeroes: process.env.FOOD_IMAGERY_REPLACE_SPOONACULAR !== "false",
    preservePublisherHeroes: process.env.FOOD_IMAGERY_PRESERVE_PUBLISHER !== "false",
  };
}

export function toPublicImageUrl(relativePath: string): string {
  const cfg = getFoodImageryConfig();
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${cfg.publicBaseUrl}${path}`;
}
