/** Full canonical prompts for P0 title-locked hero regeneration. */

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

export const CHICKEN_CAESAR_IMAGE_PROMPT = `Chicken Caesar Salad

Large crew Caesar salad in a wide bowl on a firehall prep table.

Visible:
- chopped romaine lettuce tossed in creamy Caesar dressing
- grilled chicken cut into sliced strips and bite-sized diced pieces mixed through the salad
- shaved parmesan and golden croutons scattered on top
- optional crisp bacon bits

Chicken must appear as cut-up pieces throughout the salad — NOT a whole breast, NOT one intact fillet resting on top.

NO whole chicken breast on top of greens.
NO chicken-less salad.
NO burger, taco, or rice bowl presentation.

Professional firehall food photography.
Warm lighting.
Prepared for 8–10 firefighters.
Commercial kitchen background.
50mm lens.
Shallow depth of field.`;

export const BONELESS_CHICKEN_THIGHS_SWEET_POTATO_SPINACH_IMAGE_PROMPT = `Boneless Chicken Thighs with Sweet Potato & Fresh Spinach

Complete performance plate on a wide firehall serving platter — wider angle, not tight macro crop.

Visible:
- seared boneless chicken thighs with golden sear marks (sliced or whole pieces, not stew chunks)
- roasted sweet potato wedges or cubes as a distinct orange carb side
- fresh sautéed spinach as a bright green vegetable side
- lemon wedges optional at edge

NO tomatoes. NO zucchini. NO curry. NO stew bowl. NO coconut broth. NO one-pot mixed appearance.

Professional firehall food photography. Crew-sized family-style portion.`;

export const BREAKFAST_ENCHILADAS_IMAGE_PROMPT = `Large firehall-style breakfast enchiladas baked in a casserole dish. Flour tortillas stuffed with scrambled eggs, chorizo, onions and peppers, covered in green chile enchilada sauce and melted cheese. Slightly browned cheese from baking. Multiple enchiladas visible. Filling clearly shows eggs and chorizo. Hearty family-style portions for a firefighter crew. Rustic fire station kitchen environment. Authentic realistic food photography. Natural textures. No fried eggs on top. No bacon strips. No decorative styling. Looks like a meal prepared for an entire shift.

Required visible:
- rolled flour tortilla enchiladas in a deep 9x13 casserole or hotel pan
- green chile enchilada sauce smothering the rolls
- melted Monterey Jack or cheddar with lightly browned baked cheese
- filling cross-section showing scrambled eggs and crumbled chorizo

FORBIDDEN:
- fried eggs or sunny-side-up eggs on top
- bacon strips on top
- single-serving brunch plate
- restaurant macro close-up
- empty plate space
- ingredients not in recipe (no bell peppers unless subtle in filling)`;

export const BREAKFAST_ENCHILADAS_IMAGE_NEGATIVES = [
  "fried egg on top",
  "sunny-side-up egg",
  "bacon strips",
  "bacon on top",
  "single small plate",
  "restaurant fine dining",
  "brunch influencer",
  "food magazine cover",
  "tiny portion",
  "decorative garnish overload",
];

export const TITLE_LOCKED_IMAGE_PROMPTS: Record<string, string> = {
  "crock-barbacoa-chicken": CROCK_BARBACOA_CHICKEN_IMAGE_PROMPT,
  "chicken-caesar": CHICKEN_CAESAR_IMAGE_PROMPT,
  "boneless-chicken-thighs-sweet-potato-spinach": BONELESS_CHICKEN_THIGHS_SWEET_POTATO_SPINACH_IMAGE_PROMPT,
  "breakfast-enchiladas": BREAKFAST_ENCHILADAS_IMAGE_PROMPT,
};
