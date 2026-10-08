/**
 * Smart Shopping — quantity parsing.
 *
 * Handles the shapes recipe data actually arrives in:
 * - unit in its own field:            { quantity: "2", unit: "Lb" }
 * - unit embedded in the quantity:    { quantity: "3.5 lb" }
 * - ranges:                           "1-2", "1–2", "1 — 2", "1 to 2 cups", "1/2-1 cup"
 * - fractions:                        "1 1/2", "3/4", "1½", "¾"
 * - range split across fields by upstream parsers: { quantity: "1", unit: "-2 tbsp" }
 *
 * Ranges keep both bounds; `value` is the upper bound so purchase math never
 * under-buys.
 */

import { normalizeUnit } from "./units";

export interface ParsedShoppingQuantity {
  /** Purchase quantity — the upper bound for ranges. */
  value: number;
  /** Lower bound, present only for ranges. */
  min?: number;
  /** Canonical unit ("" when the quantity is a bare number). */
  unit: string;
}

const UNICODE_FRACTIONS: Record<string, string> = {
  "¼": "1/4", "½": "1/2", "¾": "3/4",
  "⅓": "1/3", "⅔": "2/3",
  "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
};

const NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+)`;
const RANGE_SEP = String.raw`(?:\s*[-–—]\s*|\s+to\s+)`;
const QUANTITY_RE = new RegExp(String.raw`^(${NUM})(?:${RANGE_SEP}(${NUM}))?\s*(.*)$`, "i");
const RANGE_CONTINUATION_RE = new RegExp(String.raw`^(?:[-–—]|to\s)\s*${NUM}`, "i");

function expandUnicodeFractions(text: string): string {
  return text
    .replace(/(\d)([¼½¾⅓⅔⅛⅜⅝⅞])/g, (_, d: string, f: string) => `${d} ${UNICODE_FRACTIONS[f]}`)
    .replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, (f) => UNICODE_FRACTIONS[f]);
}

function parseNumberToken(token: string): number {
  const t = token.trim();
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const den = parseInt(mixed[3], 10);
    return den ? parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / den : 0;
  }
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const den = parseInt(frac[2], 10);
    return den ? parseInt(frac[1], 10) / den : 0;
  }
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Upstream parsers (e.g. the /api/generate client format) split "1-2 tbsp"
 * into { quantity: "1", unit: "-2 tbsp" }. Rejoin those before parsing.
 */
export function joinSplitRange(quantity: string | undefined, unit: string | undefined): {
  quantity: string;
  unit: string;
} {
  const q = (quantity ?? "").trim();
  const u = (unit ?? "").trim();
  if (q && u && RANGE_CONTINUATION_RE.test(u)) return { quantity: `${q} ${u}`, unit: "" };
  return { quantity: q, unit: u };
}

interface QuantityTokens {
  first: number;
  second?: number;
  trailing: string;
}

function tokenize(quantityText: string): QuantityTokens | null {
  const text = expandUnicodeFractions(quantityText).replace(/\s+/g, " ").trim();
  const m = text.match(QUANTITY_RE);
  if (!m) return null;
  return {
    first: parseNumberToken(m[1]),
    second: m[2] !== undefined ? parseNumberToken(m[2]) : undefined,
    trailing: m[3].trim(),
  };
}

/**
 * Parse a recipe quantity + unit pair. Returns null when there's no usable
 * number ("to taste", "", "a handful").
 */
export function parseShoppingQuantity(
  rawQuantity: string | undefined,
  rawUnit?: string,
): ParsedShoppingQuantity | null {
  const { quantity, unit: explicitUnit } = joinSplitRange(rawQuantity, rawUnit);
  if (!quantity) return null;
  const tokens = tokenize(quantity);
  if (!tokens) return null;

  const unit = normalizeUnit(explicitUnit || tokens.trailing);
  const { first, second } = tokens;
  if (second !== undefined && second > 0) {
    const lo = Math.min(first, second);
    const hi = Math.max(first, second);
    if (hi <= 0) return null;
    return lo === hi ? { value: hi, unit } : { value: hi, min: lo, unit };
  }
  if (first <= 0) return null;
  return { value: first, unit };
}

function formatPlain(n: number): string {
  return String(Math.round(n * 10000) / 10000);
}

/**
 * Rewrite a quantity into the shape the crew scaler parses reliably — plain
 * decimals, "a–b" ranges — while leaving everything else (including embedded
 * units like "3.5 lb") exactly as written so shopping scales identically to
 * the recipe page.
 */
export function canonicalizeQuantityForScaling(
  rawQuantity: string | undefined,
  rawUnit: string | undefined,
): { quantity: string | undefined; unit: string | undefined } {
  const joined = joinSplitRange(rawQuantity, rawUnit);
  const tokens = joined.quantity ? tokenize(joined.quantity) : null;
  const needsRewrite =
    joined.unit !== (rawUnit ?? "").trim() ||
    /[¼½¾⅓⅔⅛⅜⅝⅞—]|\sto\s/i.test(joined.quantity) ||
    (tokens?.second !== undefined && /\//.test(joined.quantity));
  if (!tokens || !needsRewrite) return { quantity: rawQuantity, unit: rawUnit };

  const lead =
    tokens.second !== undefined
      ? `${formatPlain(tokens.first)}\u2013${formatPlain(tokens.second)}`
      : formatPlain(tokens.first);
  const quantity = tokens.trailing ? `${lead} ${tokens.trailing}` : lead;
  return { quantity, unit: joined.unit || undefined };
}
