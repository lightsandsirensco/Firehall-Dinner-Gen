/** Explicit editorial prompt lines for Performance Meals that need tighter visual lock. */
export const PERFORMANCE_MEAL_IMAGERY_PROMPT_OVERRIDES: Record<string, string[]> = {
  "boneless-chicken-thighs-sweet-potato-spinach": [
    "Firehall performance plate — seared boneless chicken thighs as the dominant protein with visible sear marks and thigh shape (not diced chunks, not breast)",
    "Roasted sweet potato wedges or cubes as a distinct carb side — NOT in a bowl, NOT swimming in sauce",
    "Fresh sautéed spinach as a separate bright green vegetable side — NOT mixed into curry, stew, or soup",
    "Plated crew meal on a light neutral plate — high-protein performance aesthetic, protein-forward composition",
    "NO curry, NO stew, NO one-pot bowl, NO coconut broth, NO mixed soup appearance",
  ],
};

export const PERFORMANCE_MEAL_IMAGERY_NEGATIVE_OVERRIDES: Record<string, string[]> = {
  "boneless-chicken-thighs-sweet-potato-spinach": [
    "curry",
    "stew",
    "coconut milk broth",
    "soup bowl",
    "mixed one-pot",
    "chicken chunks in sauce",
    "chicken breast cutlets",
  ],
};
