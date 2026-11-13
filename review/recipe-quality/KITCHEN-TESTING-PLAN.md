# Firehall Meals — Real-World Kitchen Testing Plan

Automated checks can only make a recipe Technically Validated. A recipe becomes **Kitchen Tested** only when a named person has cooked it as written and logged the result in `review-log.json`.

## Order

1. **First 23:** the top-50 first-impression recipes that are already technically validated (Firehall Chili, Chicken Parmesan, BBQ Chicken Bowls, Chicken Caesar, Jerk Chicken, and the rest marked `technically_validated` with `first_impression=true` in `audit-records.csv`).
2. **Next 27:** the remaining top-50 recipes, after their batch corrections are approved.
3. **Then:** the other technically validated recipes, ordered by real usage (views, picks, saves).
4. **Retire rather than test:** any recipe that fails twice, or that nobody would cook again.

At about 5 tests per week, the top 50 take roughly 10 weeks.

## Protocol (per recipe)

- Cook exactly as written for the stated servings (normally 8) in a firehall or home kitchen, using ordinary grocery-store ingredients.
- Do one test at a different scale (4 or 12) for every 5th recipe, and for any recipe whose steps change with batch size.
- Measure: active prep minutes, total minutes, internal temperatures with a probe thermometer, final yield (portions actually served), and leftovers.
- Note every deviation, unclear step, missing ingredient, wrong pan size or time.
- Photograph the finished dish in good light, plated the way the recipe describes. This becomes the hero image.
- At least 4 people eat it and score 1–5 for taste, portion and "would cook again".

## Pass criteria

- All safety temperatures reached as written. Times within ±20% of the stated times. Yield within ±1 portion.
- Average taste ≥ 4.0 and "would cook again" ≥ 75%.
- No ingredient was missing and no step needed guessing.
- Fail → correct the draft and retest once. A second failure → retire (301-redirect to the closest good recipe).

## Logging

Add to `review/recipe-quality/review-log.json`:

```json
{ "slug": "big-chili", "status": "kitchen_tested", "by": "Capt. J. Smith, Station 4", "date": "2026-11-20",
  "notes": "Cooked for 8. Prep 25 / total 95 min (stated 20/90). Beef 160°F. Taste 4.4 (5 eaters), 5/5 would cook again. Changed: none. Photo: IMG_2231." }
```

After a final editorial read, a second entry with `"status": "approved_for_publishing"` moves the recipe to the top published tier. The audit drops it back to Needs Review automatically if a later edit breaks a blocking check.
