/**
 * Node-only recipe signature hashing (logs, dedupe keys) — never import from client.
 */
import { createHash } from "crypto";
import { normalizeRecipeSignature } from "../shared/recipe-signature.js";

/** Stable short SHA-256 fingerprint for server logs. */
export function recipeSignatureFingerprint(sig: string): string {
  const n = normalizeRecipeSignature(sig);
  if (!n) return "";
  return createHash("sha256").update(n).digest("hex").slice(0, 12);
}

/** Dedupe key for in-memory maps (normalized + hashed). */
export function recipeSignatureDedupeKey(sig: string): string {
  return recipeSignatureFingerprint(sig) || normalizeRecipeSignature(sig).toLowerCase();
}
