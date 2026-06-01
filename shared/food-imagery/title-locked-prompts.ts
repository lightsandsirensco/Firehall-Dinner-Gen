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

export const SHEPHERDS_PIE_GREEK_SALAD_IMAGE_PROMPT = `Shepherd's Pie with Greek Salad

CRITICAL COMPOSITION — image FAILS without both dishes visible in the same wide frame:
1) Large deep casserole of shepherd's pie with visibly browned mashed potato topping — fork ridges, golden peaks, bubbling edges, serving spoon on the dish.
2) Separate wide bowl of Greek salad in the foreground beside the casserole — lettuce, cucumber, cherry tomatoes, red onion, feta cubes, and black olives clearly readable as salad.

Wide firehall kitchen table shot for 6–8 firefighters — show the FULL spread, not a tight macro of pie only.
Salad bowl must occupy at least one quarter of the frame and sit on the same table as the casserole.

Visible:
- large crew-sized shepherd's pie casserole (9x13 or hotel pan scale)
- browned mashed potato cap with crispy peaks
- Greek salad in a separate bowl — mandatory, not optional garnish
- serving spoon resting on the casserole
- family-style portions for 6–8 firefighters

NO quinoa.
NO rice bowl.
NO single-serving close-up.
NO pie-only image without the salad bowl.

Professional firehall food photography.
Warm lighting.
Wider angle — show full spread, not macro crop.
Commercial kitchen / hall dining table background.
50mm lens.`;

export const SMASH_BURGERS_IMAGE_PROMPT = `Smash Burgers with Caramelized Onions & Dirty Sauce

Wide firehall prep table — full crew spread, not tight burger macro.

Visible on the same platter or tray:
- multiple smashed beef patties with crispy browned edges on toasted buns
- glossy caramelized onions piled on the burgers
- dirty sauce drizzled or served in a small ramekin beside the burgers
- optional pickle chips at edge

NO single lonely burger without onions and sauce.
NO restaurant macro close-up.
Family-style portions for 8 firefighters.`;

export const MAC_AND_CHEESE_BAKE_IMAGE_PROMPT = `Mac and Cheese Bake with Garlic Bread

Wide casserole shot on firehall prep table showing BOTH components:
1) Large deep hotel pan of baked mac and cheese — golden browned cheese crust, creamy pasta visible at edges
2) Separate tray or basket of sliced garlic bread / toast beside the casserole

NO mac-only image without garlic bread visible in frame.
NO tight macro of cheese pull only.
Crew-sized family-style spread.`;

export const SAUSAGE_PEPPERS_ONIONS_IMAGE_PROMPT = `Italian Sausage with Peppers & Onions

Wide skillet or sheet pan on firehall stove — complete meal visible:
- browned Italian sausage links or sliced sausage
- sautéed bell peppers (red/green) clearly visible
- caramelized onions mixed through
- optional hoagie rolls or pasta at edge of frame

NO sausage-only close-up without peppers and onions.
NO unrelated stir-fry without Italian sausage links.`;

export const BISCUITS_GRAVY_IMAGE_PROMPT = `Biscuits and Gravy

Wide firehall platter showing complete breakfast spread:
- split flaky buttermilk biscuits on a large tray
- thick creamy sausage gravy ladled over AND beside the biscuits — gravy must be clearly visible
- optional pepper garnish

NO dry biscuits without visible gravy.
NO tight macro of a single biscuit.
Crew-sized hotel pan or wide serving platter.`;

export const PEPPER_STEAK_ONIONS_IMAGE_PROMPT = `Pepper Steak with Onions

Wide firehall serving platter:
- sliced sirloin or flank steak with visible sear
- sautéed bell peppers and sliced onions piled with the steak — onions mandatory and readable
- optional rice or noodles at edge

NO steak-only image without peppers and onions.
NO generic stir-fry that hides the steak slices.`;

export const TITLE_LOCKED_IMAGE_PROMPTS: Record<string, string> = {
  "crock-barbacoa-chicken": CROCK_BARBACOA_CHICKEN_IMAGE_PROMPT,
  "chicken-caesar": CHICKEN_CAESAR_IMAGE_PROMPT,
  "boneless-chicken-thighs-sweet-potato-spinach": BONELESS_CHICKEN_THIGHS_SWEET_POTATO_SPINACH_IMAGE_PROMPT,
  "breakfast-enchiladas": BREAKFAST_ENCHILADAS_IMAGE_PROMPT,
  "shepherds-pie": SHEPHERDS_PIE_GREEK_SALAD_IMAGE_PROMPT,
  "smash-burgers": SMASH_BURGERS_IMAGE_PROMPT,
  "mac-and-cheese-bake": MAC_AND_CHEESE_BAKE_IMAGE_PROMPT,
  "sausage-peppers-onions": SAUSAGE_PEPPERS_ONIONS_IMAGE_PROMPT,
  "biscuits-gravy": BISCUITS_GRAVY_IMAGE_PROMPT,
  "pepper-steak-onions": PEPPER_STEAK_ONIONS_IMAGE_PROMPT,
};
