# Firehall Meals — Recipe Writing Standard

Every new or corrected recipe follows this guide and must pass `scripts/recipe-quality/gate-checks.ts` before it can be Technically Validated. Only a cooked test (see `KITCHEN-TESTING-PLAN.md`) can make it Kitchen Tested.

## 1. Title and description

- Name the dish plainly: main protein + style or format. "Sheet-Pan Lemon Chicken", not "Firehouse Flavor Bomb".
- Never use a dietary word (vegetarian, veggie, vegan, high protein, low carb, gluten-free) unless the recipe meets it (section 7).
- Description: 2 sentences, under 300 characters — what it is, and why it works for a crew. No invented testing or popularity claims.

## 2. Servings, times, equipment

- `baseServings` = `crewSize` = the number the quantities feed. Default 8 adult firefighter portions.
- Prep and cook times are measured, not guessed: prep + cook must cover the longest path through the steps (including resting, preheating and rice). Note any marinate/overnight time separately.
- List every pan size and appliance ("two half-sheet pans", "9×13 baking dish", "6-qt Dutch oven").

## 3. Ingredients

- One line per ingredient, in the order used: quantity · unit · ingredient · prep note. Example: `2 lb | boneless chicken thighs | trimmed, 1-inch pieces`.
- US customary first; metric only where the app converts it.
- Quantities: whole numbers or kitchen fractions (¼, ⅓, ½, ⅔, ¾). Never decimals like 0.33 or 4.8 — write 4¾ lb.
- Whole items are whole: 3 rotisserie chickens, not 3.2. Half an onion is fine; 0.83 onion is not.
- Use the units a cook measures with: cup, tbsp, tsp, lb, oz, can (with size), clove, whole, bunch.
- Every ingredient the steps use is listed with a quantity — including what it's served with (rice, tortillas, buns). Optional items say "optional".
- Combine duplicates, or label them ("for the sauce", "for serving").
- Portions for 8: 5–8 oz raw boneless protein per person; up to 2 rolls/buns, 2 potatoes or 3–4 tortillas per person unless it's a deliberate bar.

## 4. Steps

- 4–10 steps, one main action each, under 60 words. Start with the verb. Title each step in 2–5 words.
- Every step names its heat ("medium-high"), time range ("6–8 minutes") and a doneness cue you can see, smell or measure.
- Oven steps always give °F and °C. Preheat in step 1.
- Every listed ingredient appears in a step.
- For 8+ servings, say how to batch ("sear in two batches so the pan stays hot") and use larger or extra pans instead of multiplying times.
- Banned without a cue: "until done", "cook through", "until ready", "season to taste" alone.

## 5. Food safety (non-negotiable)

| Food | Doneness | Wording |
|---|---|---|
| Chicken, turkey, duck (incl. ground) | 165°F / 74°C | "until it reads 165°F in the thickest piece" |
| Ground beef, pork, lamb, sausage | 160°F / 71°C | "until no pink remains and it reads 160°F" |
| Pork chops, tenderloin, roasts; fish | 145°F / 63°C, 3-min rest | fish: "opaque and flakes easily" |
| Shrimp | — | "pink, opaque and curled" |
| Reheated precooked / rotisserie meat | 165°F / 74°C | "until steaming hot throughout" |
| Hot holding | ≥ 140°F / 60°C | "hold in a 200°F oven" |

Thaw and marinate in the fridge. Burgers are cooked to 160°F. Raw-egg dressings use pasteurized eggs.

## 6. Nutrition

- Calculated per serving from the ingredient list and `baseServings` with the in-app engine. Never typed in by hand.
- Calories must reconcile with 4 × protein + 4 × carbs + 9 × fat within 15%.
- Label honestly: "Calculated from ingredients" (we have no lab-analyzed values). Hand estimates are not published as numbers.

## 7. Claims

- **High Protein:** verified calculated protein ≥ 35 g per serving that passes the integrity audit. Never from a tag or category.
- **Vegetarian:** no meat, fish, gelatin, or meat/fish broth, stock, anchovy or fish sauce.
- **Kitchen-tested / crew-tested:** only with a `review-log.json` entry.

## 8. Images

- One unique image per recipe that shows the dish as written: the same vessel, garnish and sides; believable portions; no text, logos or signage in the frame.
- 3:2 landscape, at least 1536 px wide, dish centered so square and mobile crops keep it whole.
- AI renders are placeholders until a real photo is taken at the kitchen test.

## 9. Before submitting

Run `npx tsx scripts/recipe-quality/full-audit.ts` and fix all S1/S2 findings. Heuristic findings still need a human to read the recipe.
