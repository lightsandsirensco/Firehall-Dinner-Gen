import { normalizeTitleKey } from "../../ingestion/dedupe.js";

export function titleKey(title: string): string {
  return normalizeTitleKey(title);
}

/** Jaccard similarity on word tokens */
export function tokenJaccard(a: string, b: string): number {
  const ta = new Set(
    a
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
  const tb = new Set(
    b
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter++;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function normalizeIngredientKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(fresh|dried|chopped|minced|sliced|diced|large|small|medium)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 0–1 similarity for ingredient names */
export function ingredientSimilarity(a: string, b: string): number {
  const ka = normalizeIngredientKey(a);
  const kb = normalizeIngredientKey(b);
  if (!ka || !kb) return 0;
  if (ka === kb) return 1;
  if (ka.includes(kb) || kb.includes(ka)) return 0.92;
  return tokenJaccard(ka, kb);
}

export function structureKey(input: {
  stepCount: number;
  ingredientCount: number;
  headings: string[];
  mealFormat?: string;
}): string {
  const heads = input.headings
    .map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12))
    .filter(Boolean)
    .join("|");
  const fmt = (input.mealFormat || "").toLowerCase().slice(0, 16);
  return `s${input.stepCount}:i${input.ingredientCount}:${fmt}:${heads}`;
}

export function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  if (m === 0 || n === 0) return 0;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const dist = dp[m][n];
  return 1 - dist / Math.max(m, n);
}
