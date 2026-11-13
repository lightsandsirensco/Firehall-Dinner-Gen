#!/usr/bin/env tsx
/** Read-only: how flagged decimal quantities actually render (US) and how far display rounding drifts from the data. */
import fs from "node:fs";
import { formatRecipeIngredientRow } from "../../shared/measurements/ingredient-display.js";
import { parseQuantityString } from "../../shared/measurements/convert.js";

const report = JSON.parse(fs.readFileSync("review/recipe-quality/baseline.json", "utf8")) as {
  recipes: Array<{ slug: string; details: Record<string, string[]> }>;
};
const FRAC: Record<string, number> = { "⅛": 1 / 8, "¼": 1 / 4, "⅓": 1 / 3, "⅜": 3 / 8, "½": 1 / 2, "⅝": 5 / 8, "⅔": 2 / 3, "¾": 3 / 4, "⅞": 7 / 8 };
const shown = (qty: string) => {
  const m = qty.match(/^(\d+)?([⅛¼⅓⅜½⅝⅔¾⅞])?(?:\.(\d+))?/);
  if (!m) return null;
  if (qty.match(/^\d+\.\d+/)) return parseFloat(qty);
  return (m[1] ? Number(m[1]) : 0) + (m[2] ? FRAC[m[2]]! : 0);
};

let total = 0;
let drift10 = 0;
const rows: string[] = [];
for (const r of report.recipes) {
  for (const line of r.details.awkward_quantities ?? []) {
    const [qty, unit, ...rest] = line.split(" ");
    const data = parseQuantityString(qty);
    const out = formatRecipeIngredientRow(qty, unit, rest.join(" "), "us");
    const disp = shown(out.qty);
    total++;
    if (data && disp != null) {
      const d = Math.abs(disp - data) / data;
      if (d >= 0.1) {
        drift10++;
        rows.push(`${r.slug}: data "${line}" → shown "${out.line}" (${Math.round(d * 100)}% off)`);
      }
    }
  }
}
console.log(`flagged lines=${total}, display drift >=10%: ${drift10}`);
console.log(rows.join("\n"));
