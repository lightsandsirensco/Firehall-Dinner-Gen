/**
 * Recipe diversity signatures — browser-safe (no Node crypto).
 * Server-only hashing lives in server/recipe-signature-hash.ts.
 */

export const RECIPE_SIGNATURE_MAX_LEN = 256;
export const RECIPE_SIGNATURE_MAX_COUNT = 12;
export const RECIPE_MEAL_STYLE_MAX_LEN = 40;

const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/** Trim, collapse whitespace, cap length (used before Zod and in persistence). */
export function normalizeRecipeSignature(raw: unknown): string {
  if (raw == null) return "";
  let s = String(raw).replace(CONTROL_CHARS, "").trim().replace(/\s+/g, " ");
  if (s.length > RECIPE_SIGNATURE_MAX_LEN) {
    s = s.slice(0, RECIPE_SIGNATURE_MAX_LEN);
  }
  return s;
}

/** Deterministic short label for logs/UI — not cryptographic (browser-safe). */
export function recipeSignatureLogLabel(sig: string): string {
  const n = normalizeRecipeSignature(sig);
  if (!n) return "";
  if (n.length <= 24) return n;
  return `${n.slice(0, 20)}…(${n.length})`;
}

/**
 * Dedupe, drop empty/invalid, cap count, normalize each entry.
 */
export function sanitizeRecipeSignatureList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    if (out.length >= RECIPE_SIGNATURE_MAX_COUNT) break;
    const s = normalizeRecipeSignature(raw);
    if (s.length < 2) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function sanitizeRecipeMealStyleList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    if (out.length >= 10) break;
    const s = normalizeRecipeSignature(raw).slice(0, RECIPE_MEAL_STYLE_MAX_LEN);
    if (s.length < 1) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
