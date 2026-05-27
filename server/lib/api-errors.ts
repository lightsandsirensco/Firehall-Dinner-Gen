/**
 * Customer-safe API error messages — no stack traces or Zod dumps in production.
 */

import { isProductionEnv } from "../logger.js";

export function sanitizeApiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!isProductionEnv()) {
    return err instanceof Error ? err.message : String(err);
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/zod|validation|expected|stringify|stack|ECONNREFUSED|ENOENT/i.test(msg)) {
    return fallback;
  }
  if (msg.length > 200) return fallback;
  return msg || fallback;
}

export function exploreApiErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("SPOONACULAR_API_KEY is not configured")) {
    return "Recipe search is not configured.";
  }
  return sanitizeApiErrorMessage(err, "Failed to load meals. Please try again.");
}
