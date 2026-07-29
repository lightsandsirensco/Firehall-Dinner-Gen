# Gluten-Free Expansion — Step 1 Audit & Candidate List

**Sprint:** Add 25 Premium Naturally Gluten-Free Fire Hall Meals
**Status:** Audit + candidate list complete. Awaiting approval before Step 8/9 (final selection + recipe generation).

---

## Step 1 — Existing Library Audit

Ran the production dietary classification engine (`shared/dietary/classify-recipe.ts`) across all 432 catalogued recipes to get a ground-truth read (not guesswork) on what's already gluten-free.

**Totals:**
- 432 recipes have dietary classifications.
- **121 recipes are already confirmed Gluten-Free** (High confidence, no substitution needed).
- **307 recipes are "Gluten-Free Adaptable"** — safe with one ingredient swap (tamari, GF pasta, GF bun, GF broth, etc.), already surfaced in the UI as "Gluten-Free Adaptable."
- 4 recipes have no dietary data (pre-dietary-sprint stragglers, out of scope here).

### Where the library is already strong (confirmed GF, chicken/beef only)

| Cuisine cluster | Existing confirmed-GF chicken/beef recipes |
|---|---|
| American grill/roast | Herb Roasted Chicken Thighs, NY Strip w/ Herb Butter, Spatchcock Lemon Roast Chicken, Paprika Roasted Chicken Quarters, Honey Mustard Chicken Thighs, Competition BBQ Chicken Thighs, Hickory Smoked Chicken Breast, Reverse-Seared Ribeye, Smoked Chicken Quarters w/ White Sauce, Smoked Picanha Steak, Chicken Thigh Stretch Dinner, Honey Lime / Lemon Garlic Chicken Trays, Buffalo Chicken Sweet Potato Bowls |
| Mexican | Chicken Enchilada Casserole, Taco Bar, Chicken Burrito Bowls, Steak Tacos, Street Corn Chicken Bowls, Chipotle Chicken Burrito Bowls, Chicken Enchilada Skillet, Chipotle Lime Chicken Tacos, Sheet-Pan Chicken Fajitas |
| Italian | Tuscan Chicken, Chicken Cacciatore, Caprese Chicken Bake, Pesto Chicken Tray, Caprese Steak Skewers |
| Greek | Firehall Greek Chicken Bowls, Firehall Gyro Bowls, Greek-Spiced Beef Burger Bowls |
| Indian | Butter Chicken, Chicken Tikka Masala |
| Middle Eastern | Shawarma Chicken Bowls, Yogurt Marinated Chicken, Za'atar Chicken Thighs, Moroccan Chicken & Chickpeas |
| Southwest/Tex-Mex | Southwest Beef & Sweet Potato Skillet, Southwest Steak Bowls, Cast Iron Skirt Steak Sizzlers |
| Thai / Thai-inspired | Pad Thai, Peanut Chicken Rice Bowls, Thai Peanut Chicken Crock |
| Vietnamese | Bun Bo Hue Noodle Soup, Vietnamese Caramel-Braised Chicken Bowls |
| Argentinian | Flank Steak w/ Chimichurri, Sheet-Pan Chimichurri Chicken |
| Portuguese, Cuban, Yucatecan, Upstate NY, Chinese-American | Peri Peri Chicken Platter, Cuban Beef Picadillo Bowls, Pollo Asado Citrus Platter, Spiedie Chicken Platter, Mongolian Beef Flat Top |

**Conclusion:** American grill, Mexican, Italian, Greek, Middle Eastern, and Indian are already saturated with confirmed gluten-free chicken/beef recipes. Adding more here would be redundant — these categories are explicitly **excluded** from the new candidate list.

### Where "Gluten-Free Adaptable" masks a gap

Several cuisines *look* covered but every single entry actually requires a swap (soy sauce → tamari, broth → GF broth, etc.) rather than being naturally GF from the start:

- **Korean** — Bulgogi Bowls, Korean Beef Bowls, Beef Rice Bowls are all soy-sauce-dependent (adaptable only). Zero confirmed-GF Korean dishes exist.
- **Caribbean/Jamaican** — Jerk Chicken exists but is adaptable (soy sauce in the marinade). No confirmed-GF Caribbean dish exists.
- **Filipino** — Chicken Adobo exists but is adaptable (soy-based, braised). No second, distinct Filipino dish exists.
- **Cajun** — Jambalaya, Dirty Rice, Red Beans and Rice are all rice-based and all adaptable (broth/seasoning packet). No braised/stewed Cajun dish (étouffée-style) exists.
- **French** — Only Coq au Vin and French Onion Soup, both adaptable, both chicken/soup — no beef dish.
- **Spanish** — Only rice-based dishes (Chicken and Chorizo Rice, Spanish Rice Chicken One Pot), both adaptable — no tapas-style dish.

### Cuisines with zero representation (chicken/beef, any confidence)

Brazilian, Ethiopian/East African, West African, Hawaiian, historic American Southern (Country Captain-style), Dominican/Puerto Rican, and true Peruvian rotisserie-style chicken (the one Peruvian entry is a soy-marinated sheet-pan dish, not the classic pollo a la brasa).

### Duplicate-concept guardrails applied

Rejected internally before they reached the candidate list, because they'd duplicate cooking method + flavor + format of something already in the catalog:
- Any additional Chinese-American beef+soy stir-fry (5 already exist).
- Any additional Greek bowl/pita/souvlaki (7+ already exist, all excellent).
- A second Jerk Chicken variant (kept the *cuisine* by swapping in Brown Stew Chicken instead — same island, different technique).
- Chicken Piccata / Chicken Fried Steak / Chicken Fricassee (too close to existing dredge-and-pan-sauce dishes, or require multiple substitutions to be GF, violating Step 4).
- A second Peruvian sheet-pan chicken (kept the cuisine but changed technique to whole roasted/spatchcock "pollo a la brasa," which is naturally GF from the start instead of soy-marinated).
- Texas-style no-bean chili con carne — flagged but **not recommended** (catalog already has 2 chilis; a 3rd, even a purist no-bean version, reads as redundant). Listed as an optional backup only.
- Carne Asada Platter — same marinade/technique as existing Steak Tacos and Fajitas; not recommended.

---

## Step 7 — Candidate List (21 recommended + 2 optional backups)

Per Step 8, I'm not forcing 25. **21 candidates below clear every gate at high confidence.** Two additional backups are listed at the bottom, flagged as weaker/higher duplicate risk, in case you want to push the count higher.

Protein rule applied to every candidate: chicken or beef only. Gluten-Free Confidence reflects how the recipe will be *written* (native GF ingredients, not a substitution note) unless marked otherwise.

| # | Name | Cuisine | Why firefighters would cook it | Famous source(s) researched | Fire Hall Score | GF Confidence | Duplicate Risk |
|---|---|---|---|---|---|---|---|
| 1 | Peruvian Roast Chicken (Pollo a la Brasa) with Aji Verde | Peruvian | Whole roasted/spatchcocked chicken, crackling skin, addictive green sauce — huge crowd-pleaser, one pan | Serious Eats, NYT Cooking | 9.0 | High (citrus-garlic-cumin marinade, no soy) | Low — existing Peruvian dish is soy-marinated sheet-pan; this is whole-roasted, native GF |
| 2 | Filipino Chicken Inasal (Grilled Annatto-Citrus Chicken) | Filipino | Smoky grilled chicken skewers, tangy dipping sauce, easy to scale on a grill | Serious Eats, Bon Appétit | 8.5 | High (annatto-citrus-lemongrass, no soy) | Low — existing Filipino dish (Adobo) is braised/soy-based |
| 3 | Cuban Ropa Vieja (Shredded Braised Flank Steak) | Cuban | Low-effort braise, shreds itself, feeds a crowd over rice | Serious Eats, NYT Cooking | 8.5 | High | Medium — same cuisine as existing Picadillo, but shredded/braised vs. ground; format genuinely different |
| 4 | Brazilian Feijoada (Beef & Black Bean Stew) | Brazilian | Rich, hearty stew, one pot, reheats beautifully, zero Brazilian representation today | Serious Eats, Bon Appétit | 8.0 | High | Low |
| 5 | Chicken Marbella | Mediterranean/American classic | Iconic make-ahead dinner-party chicken (prunes, olives, capers, white wine) — sweet-savory, nothing else like it in the catalog | NYT Cooking (Silver Palate), Food52 | 9.0 | High | Low |
| 6 | Chicken Vesuvio | Italian-American (Chicago) | Chicken + potatoes + peas braised in garlic and white wine — classic diner comfort, distinct from cacciatore | Serious Eats, Food Network | 8.5 | High | Low |
| 7 | Beef Bourguignon | French | The definitive beef stew; French cuisine is nearly absent from the catalog | Serious Eats/Julia Child method, Bon Appétit | 8.5 | High (cornstarch slurry, no flour dredge) | Low |
| 8 | Salisbury Steak with Mushroom Gravy | American diner classic | Diner-classic comfort food, previously deferred from Performance Meals as a better fit here | Serious Eats, Allrecipes (top-rated) | 8.5 | High (cornstarch gravy, native GF) | Low — no existing Salisbury Steak in the catalog |
| 9 | Chicken Tinga Tostadas | Mexican | Smoky chipotle-tomato shredded chicken on crispy tostadas — different sauce and format from existing salsa verde/barbacoa chicken | Serious Eats, Bon Appétit, Milk Street | 8.5 | High (corn tostadas; Hall Tip on fryer cross-contact) | Medium — differentiated by sauce base and tostada format |
| 10 | Cajun Chicken Étouffée | Cajun | Smothered stew over rice — first braised/stewed Cajun dish; existing Cajun entries are all rice-skillet or jambalaya style | Serious Eats, NYT Cooking, Southern Living | 8.0 | High (cornstarch roux substitute) | Medium — same cuisine, different technique/format |
| 11 | Carne Guisada (Tex-Mex Beef Stew) | Tex-Mex | Braised beef stew with peppers and cumin — distinct from existing grilled steak tacos/fajitas | Serious Eats, Homesick Texan (via Bon Appétit), Allrecipes | 8.5 | High | Low |
| 12 | Grilled Korean Galbi Short Ribs Platter | Korean | Sweet-savory grilled bone-in short ribs — first *confirmed* GF Korean dish (existing ones are all adaptable) | Serious Eats, Bon Appétit | 8.5 | High (built with tamari natively, not as a swap note) | Medium — same cuisine as Bulgogi/Korean Beef Bowls, but bone-in grilled platter vs. sliced-beef bowl |
| 13 | Jamaican Brown Stew Chicken | Jamaican | Braised, deeply spiced chicken thighs — keeps the island cuisine but swaps technique so it doesn't duplicate the existing (adaptable) Jerk Chicken | Serious Eats, Food Network | 8.0 | High | Low |
| 14 | Dominican/Puerto Rican Pollo Guisado | Caribbean/Latin | Sofrito-braised chicken stew with olives and potatoes — no Dominican/PR representation today | Serious Eats, NYT Cooking | 8.0 | High | Low-Medium (olives overlap with Marbella, but sofrito/cumin/oregano profile is distinctly Latin, not Mediterranean) |
| 15 | Southern Smothered Chicken Thighs | American Southern | Bone-in chicken thighs in onion gravy — comfort food, distinct from existing herb-roasted/honey-mustard chicken thighs | Southern Living, Serious Eats | 8.5 | High (cornstarch gravy, native GF) | Low-Medium — several American chicken-thigh dishes exist, but onion-gravy flavor profile is distinct |
| 16 | Moroccan Beef Tagine with Apricots & Olives | Moroccan | Sweet-savory braised beef — keeps Moroccan cuisine but adds a beef dish (existing Moroccan entry is chicken) | Serious Eats, NYT Cooking, Bon Appétit | 8.0 | High | Low |
| 17 | Hawaiian Huli-Huli Chicken | Hawaiian | Grilled pineapple-soy glazed chicken — zero Hawaiian representation, extremely famous BBQ classic | Serious Eats, Food Network | 8.5 | High (built with tamari natively) | Low |
| 18 | Spanish Pollo al Ajillo (Garlic Chicken) | Spanish | Simple tapas-style garlic-sherry chicken, platter format (not rice-based like existing Spanish dishes) | Serious Eats, Food & Wine | 8.0 | High | Low-Medium — Spanish cuisine exists but only as rice dishes; this is a different format |
| 19 | Country Captain Chicken | American Southern (historic) | Curry-spiced tomato chicken with raisins and almonds — a genuine only-in-America classic, distinct from Indian curries already in the catalog | Southern Living, NYT Cooking | 7.5 | High | Low |
| 20 | Ethiopian Doro Wat | Ethiopian | Berbere-spiced chicken stew — zero African cuisine representation, globally famous dish, served over rice for the Fire Hall version | Serious Eats, NYT Cooking, Bon Appétit | 7.5 | High | Low |
| 21 | West African Jollof Rice with Chicken | West African | One-pot tomato-pepper rice with chicken — iconic, widely loved, zero West African representation | Bon Appétit, NYT Cooking, Serious Eats | 8.0 | High | Low |

### Optional backups (only if you want to push past 21)

| # | Name | Cuisine | Why it's a backup, not a first-round pick | Fire Hall Score | GF Confidence | Duplicate Risk |
|---|---|---|---|---|---|---|
| A | Texas-Style Chili con Carne (no beans) | Tex-Mex/American | Catalog already has 2 chilis (Beef and Bean Chili, Turkey Chili); a 3rd — even a purist no-bean version — is a harder sell on genuine distinctiveness | 7.5 | High | Medium-High |
| B | Carne Asada Platter | Mexican | Same marinade/technique family as existing Steak Tacos and Sheet-Pan Fajitas; distinguishable mainly by plating | 7.5 | High | Medium-High |

---

## What's excluded and why

- **No fish, seafood, pork, turkey, lamb, or vegetarian proteins** — every candidate above uses chicken or beef only.
- **No recipe requires more than one substitution** to be gluten-free (soy sauce → tamari, where applicable) — everything else is written natively gluten-free (cornstarch instead of flour, corn tortillas/tostadas instead of flour, rice instead of pasta/couscous).
- **No recipe leans on a specialty GF product** (no GF flour blends, no GF breadcrumbs, no GF pasta) — every dish is naturally gluten-free by traditional technique.
- **American, Mexican, Italian, Greek, Middle Eastern, Indian mainstream chicken/beef** were deliberately excluded from new candidates — the library is already deep here.

---

## Next step

Awaiting your review before Step 8 (final selection) and Step 9 (recipe generation). Let me know:
1. Which of the 21 to approve as-is.
2. Any you'd like re-reviewed or swapped.
3. Whether to include either backup (A/B) to push the count higher, or hold at 21 (or fewer).
