/**
 * Cuisine Guard — ingredient-level cross-cuisine contamination check.
 *
 * Scores a Spoonacular recipe 0–10 based on how many ingredient names from
 * clearly conflicting cuisines are detected. Mirrors the self-check logic from
 * the user-designed cuisine-enforcement prompt template:
 *
 *   "Are there ZERO ingredients from conflicting cuisines?"
 *   "cuisineMatchScore must be 8 or higher."
 *
 * How scoring works:
 *   - Starts at 10.
 *   - Each DISTINCT blocklist ingredient found → −2 points.
 *   - Violations are counted per unique ingredient name (not per regex match),
 *     so a recipe with "soy sauce" once only loses 2 points total.
 *   - Score is clamped to [0, 10].
 *   - cuisine_style = "any"   → always returns 10 (no enforcement needed).
 *   - cuisine_style with no   → always returns 10 (unknown cuisine, skip check).
 *     defined blocklist
 *
 * Threshold: < 6 → reject ("two or more clear cross-cuisine violations").
 * Scores 6–7 are logged as warnings but pass; 8–10 are clean passes.
 */

import { log } from "./index";

// ─── Per-cuisine ingredient blocklists ────────────────────────────────────────
//
// Each entry is an array of lowercase keyword strings. A violation is detected
// when any keyword appears as a SUBSTRING of a lowercased ingredient name.
// Only include ingredients that would NEVER appear in a genuine recipe of that
// cuisine — err on the side of caution; don't block shared-use ingredients.

const CUISINE_BLOCKLIST: Record<string, string[]> = {
  cajun: [
    "soy sauce", "teriyaki", "sesame oil", "sesame seed",
    "hoisin", "miso", "coconut milk",
    "fish sauce", "mirin", "sake",
    "lemongrass", "kaffir lime", "galangal",
    "tahini", "hummus", "tzatziki",
    "garam masala", "gochujang", "kimchi",
    "sriracha", "naan", "pita bread",
  ],
  mexican: [
    "soy sauce", "teriyaki", "sesame oil",
    "hoisin", "miso", "coconut milk",
    "fish sauce", "mirin", "sake",
    "lemongrass", "kaffir lime", "galangal",
    "tahini", "hummus", "tzatziki", "naan",
    "garam masala", "gochujang", "kimchi",
  ],
  italian: [
    "soy sauce", "teriyaki", "sesame oil",
    "hoisin", "miso", "coconut milk",
    "fish sauce", "mirin", "sake",
    "lemongrass", "gochujang", "kimchi",
    "garam masala", "tahini", "tzatziki",
    "taco seasoning", "chipotle", "jalapeño",
  ],
  asian: [
    "cajun seasoning", "creole seasoning", "andouille",
    "garam masala", "naan", "tzatziki", "hummus",
    "taco seasoning", "ranch dressing",
    "worcestershire", "pesto", "marinara",
  ],
  korean: [
    "cajun seasoning", "creole seasoning", "andouille",
    "garam masala", "naan", "tzatziki", "hummus",
    "taco seasoning", "ranch dressing",
    "pesto", "marinara",
  ],
  thai: [
    "cajun seasoning", "creole seasoning", "andouille",
    "garam masala", "naan", "tzatziki", "hummus",
    "gochujang", "kimchi", "miso paste",
    "taco seasoning", "ranch dressing",
    "pesto", "marinara",
  ],
  indian: [
    "teriyaki sauce", "hoisin", "mirin", "sake",
    "cajun seasoning", "creole seasoning", "andouille",
    "taco seasoning", "salsa", "chipotle",
    "gochujang", "kimchi", "tzatziki",
    "ranch dressing", "pesto",
  ],
  middle_eastern: [
    "soy sauce", "teriyaki", "hoisin", "mirin", "sake",
    "cajun seasoning", "creole seasoning", "andouille",
    "taco seasoning", "salsa", "chipotle",
    "gochujang", "kimchi", "coconut milk",
    "lemongrass", "ranch dressing", "pesto",
  ],
  bbq: [
    "fish sauce", "mirin", "sake",
    "naan", "tahini", "hummus", "tzatziki",
    "gochujang", "kimchi",
    "coconut milk", "lemongrass",
    "garam masala", "pesto", "marinara",
  ],
  canadian: [
    // Canadian is broad/multicultural — only block the most egregious mismatches
    "gochujang", "kimchi",
    "mirin", "sake", "naan",
    "tahini", "lemongrass", "galangal",
  ],
};

// ─── Scorer ───────────────────────────────────────────────────────────────────

/**
 * Score a recipe's cuisine authenticity against the selected cuisine.
 *
 * @param ingredientNames  lowercased ingredient name strings from Spoonacular
 * @param title            recipe title (also scanned)
 * @param cuisine          selected cuisine_style (e.g. "cajun", "italian")
 * @returns score 0–10 (10 = perfectly authentic, < 6 = clear violations)
 */
export function scoreCuisineMatch(
  ingredientNames: string[],
  title: string,
  cuisine: string,
): number {
  if (!cuisine || cuisine === "any") return 10;

  const blocklist = CUISINE_BLOCKLIST[cuisine];
  if (!blocklist || blocklist.length === 0) return 10;

  const corpus = [
    ...ingredientNames.map((n) => n.toLowerCase()),
    title.toLowerCase(),
  ].join(" || ");

  const uniqueViolations = new Set<string>();

  for (const blocked of blocklist) {
    if (corpus.includes(blocked.toLowerCase())) {
      uniqueViolations.add(blocked);
    }
  }

  const score = Math.max(0, 10 - uniqueViolations.size * 2);

  if (uniqueViolations.size > 0) {
    log(
      `[cuisine-guard] cuisine=${cuisine} violations=[${Array.from(uniqueViolations).join(", ")}] score=${score}`,
      "v2",
    );
  }

  return score;
}
