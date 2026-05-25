import path from "node:path";
import { hasOpenAIKey } from "../openai-client.js";
import { resolvePublicAppUrl } from "../../shared/replit-public-url.js";

function defaultStorageDir(): string {
  const custom = process.env.FOOD_IMAGERY_STORAGE_DIR?.trim();
  if (custom) return custom;
  if (process.env.NODE_ENV === "production") {
    return path.join(process.cwd(), "dist", "public", "images", "generated");
  }
  return path.join(process.cwd(), "client", "public", "images", "generated");
}

export interface FoodImageryConfig {
  enabled: boolean;
  model: string;
  size: "1024x1024" | "512x512" | "256x256";
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
  return {
    enabled: process.env.FOOD_IMAGERY_ENABLED === "true" && hasOpenAIKey(),
    model: process.env.FOOD_IMAGERY_MODEL?.trim() || "gpt-image-1",
    size: (process.env.FOOD_IMAGERY_SIZE as FoodImageryConfig["size"]) || "1024x1024",
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
