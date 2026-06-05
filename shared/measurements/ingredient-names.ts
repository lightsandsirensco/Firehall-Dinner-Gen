/**
 * Title Case ingredient names with brand/style exceptions.
 */

const WORD_EXCEPTIONS: Record<string, string> = {
  bbq: "BBQ",
  dijon: "Dijon",
  parmesan: "Parmesan",
  worcestershire: "Worcestershire",
  sriracha: "Sriracha",
  ph: "pH",
};

function capitalizeWord(word: string): string {
  const lower = word.toLowerCase();
  if (WORD_EXCEPTIONS[lower]) return WORD_EXCEPTIONS[lower];
  if (/^[A-Z]{2,}$/.test(word)) return word;
  if (!/[a-zA-Z]/.test(word)) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Title Case for ingredient display — preserves BBQ, Dijon, Parmesan, etc. */
export function formatIngredientDisplayName(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return trimmed;

  return trimmed
    .split(/(\s+|-)/)
    .map((part) => {
      if (/^\s+$/.test(part) || part === "-") return part;
      return capitalizeWord(part);
    })
    .join("");
}

/** True when name is already kitchen Title Case (no all-lowercase words except exceptions). */
export function isTitleCaseIngredientName(name: string): boolean {
  const trimmed = (name || "").trim();
  if (!trimmed) return true;
  const words = trimmed.split(/\s+/).filter(Boolean);
  for (const word of words) {
    const bare = word.replace(/[^a-zA-Z]/g, "");
    if (!bare) continue;
    const lower = bare.toLowerCase();
    if (WORD_EXCEPTIONS[lower]) continue;
    if (bare === lower && bare.length > 2) return false;
  }
  return true;
}
