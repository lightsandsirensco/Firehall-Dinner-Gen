/** Explicit editorial prompt lines for Performance Meals that need tighter visual lock. */
export const PERFORMANCE_MEAL_IMAGERY_PROMPT_OVERRIDES: Record<string, string[]> = {
  "crock-barbacoa-chicken": [
    "Crock Barbacoa Chicken With Potato Wedges — slow-cooked shredded barbacoa chicken piled beside crispy roasted potato wedges",
    "Large crew-sized serving platter in a realistic Canadian firehall kitchen",
    "Visible: shredded chipotle barbacoa chicken, golden roasted potato wedges, lime wedges, fresh cilantro, smoky seasoning",
    "NO rice. NO corn. NO chicken bowl presentation",
    "Professional firehall food photography, warm lighting, visible steam, prepared for 8–10 firefighters",
    "Commercial kitchen background, 50mm lens, shallow depth of field",
  ],
  "boneless-chicken-thighs-sweet-potato-spinach": [
    "Firehall performance plate — seared boneless chicken thighs as the dominant protein with visible sear marks and thigh shape (not diced chunks, not breast)",
    "Roasted sweet potato wedges or cubes as a distinct carb side — NOT in a bowl, NOT swimming in sauce",
    "Fresh sautéed spinach as a separate bright green vegetable side — NOT mixed into curry, stew, or soup",
    "Plated crew meal on a light neutral plate — high-protein performance aesthetic, protein-forward composition",
    "NO curry, NO stew, NO one-pot bowl, NO coconut broth, NO mixed soup appearance",
  ],
};

/** Full canonical prompt for P0 title-locked regen (matches PERFORMANCE_MEAL_IMAGERY_PROMPT_OVERRIDES). */
export const CROCK_BARBACOA_CHICKEN_IMAGE_PROMPT = `Crock Barbacoa Chicken With Potato Wedges

Slow-cooked shredded barbacoa chicken piled beside crispy roasted potato wedges.

Large crew-sized serving platter in a realistic Canadian firehall kitchen.

Visible:
- shredded chipotle barbacoa chicken
- golden roasted potato wedges
- lime wedges
- fresh cilantro
- smoky seasoning

NO rice.
NO corn.
NO chicken bowl presentation.

Professional firehall food photography.
Warm lighting.
Visible steam.
Prepared for 8–10 firefighters.
Commercial kitchen background.
50mm lens.
Shallow depth of field.`;

export const TITLE_LOCKED_IMAGE_PROMPTS: Record<string, string> = {
  "crock-barbacoa-chicken": CROCK_BARBACOA_CHICKEN_IMAGE_PROMPT,
};

export const PERFORMANCE_MEAL_IMAGERY_NEGATIVE_OVERRIDES: Record<string, string[]> = {
  "crock-barbacoa-chicken": [
    "rice",
    "corn",
    "rice bowl",
    "chicken bowl",
    "burrito bowl",
    "taco bowl",
    "generic chicken bowl",
    "mixed one-pot bowl",
    "coconut rice",
    "elote",
  ],
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
