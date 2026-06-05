/**
 * Unified recipe ingredient display — conversion + Title Case names.
 */

import type { MeasurementSystem } from "./convert.js";
import {
  convertIngredientLine,
  formatClientIngredientQty,
  formatIngredientAmount,
} from "./convert.js";
import { formatIngredientDisplayName } from "./ingredient-names.js";

export { formatIngredientDisplayName, isTitleCaseIngredientName } from "./ingredient-names.js";

export function formatRecipeIngredientQty(
  quantity: string | undefined,
  unit: string | undefined,
  system: MeasurementSystem,
): string {
  return formatIngredientAmount(quantity, unit, system);
}

export function formatRecipeIngredientName(name: string): string {
  return formatIngredientDisplayName(name);
}

/** Full ingredient row: qty + Title Case name. */
export function formatRecipeIngredientRow(
  quantity: string | undefined,
  unit: string | undefined,
  name: string,
  system: MeasurementSystem,
): { qty: string; name: string; line: string } {
  const qty = formatRecipeIngredientQty(quantity, unit, system);
  const displayName = formatRecipeIngredientName(name);
  const line = qty ? `${qty} ${displayName}` : displayName;
  return { qty, name: displayName, line };
}

/** Numeric generator ingredient (qty + unit + name). */
export function formatClientIngredientRow(
  qty: number,
  unit: string,
  name: string,
  system: MeasurementSystem,
): { qty: string; name: string; line: string } {
  const qtyStr = formatClientIngredientQty(qty, unit, system);
  const displayName = formatRecipeIngredientName(name);
  const line = qtyStr ? `${qtyStr} ${displayName}` : displayName;
  return { qty: qtyStr, name: displayName, line };
}

/** Free-text line ("2 lb ground beef") with conversion + name casing on remainder. */
export function formatIngredientTextLine(line: string, system: MeasurementSystem): string {
  if (system === "us" || !line.trim()) {
    const parsed = line.trim();
    if (!parsed) return parsed;
    const converted = convertIngredientLine(parsed, "us");
    const parts = parseLineForName(converted);
    if (parts) return `${parts.qty} ${formatIngredientDisplayName(parts.name)}`.trim();
    return formatIngredientDisplayName(parsed);
  }

  const metricLine = convertIngredientLine(line, "metric");
  const parts = parseLineForName(metricLine);
  if (parts) {
    return `${parts.qty} ${formatIngredientDisplayName(parts.name)}`.trim();
  }
  return metricLine;
}

function parseLineForName(line: string): { qty: string; name: string } | null {
  const trimmed = line.trim();
  const match = trimmed.match(/^([\d./¼½¾][\d./¼½¾\s]*(?:g|kg|ml|l|lb|oz|cup|cups|tbsp|tsp)?)\s+(.+)$/i);
  if (!match) return null;
  return { qty: match[1].trim(), name: match[2].trim() };
}
