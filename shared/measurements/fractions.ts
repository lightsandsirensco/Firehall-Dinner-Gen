const KITCHEN_FRACTIONS: Array<[number, string]> = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [7 / 8, "⅞"],
];
const FRACTION_TOLERANCE = 0.03;

function decimalLabel(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/** "1¼", "⅔", "3" — kitchen fractions for US/count amounts; tiny amounts stay decimal. */
export function formatKitchenFraction(value: number): string {
  const whole = Math.floor(value + FRACTION_TOLERANCE);
  const frac = value - whole;
  if (Math.abs(frac) < FRACTION_TOLERANCE) return String(whole);
  const match = KITCHEN_FRACTIONS.find(([f]) => Math.abs(frac - f) < FRACTION_TOLERANCE);
  if (match) return whole > 0 ? `${whole}${match[1]}` : match[1];
  if (value < 1 / 8) return decimalLabel(value);
  // Not near a common fraction (e.g. 3.05 Tbsp from a scaled recipe) — the nearest eighth reads cleanly.
  return formatKitchenFraction(Math.round(value * 8) / 8);
}
