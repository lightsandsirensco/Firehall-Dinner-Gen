# Meal Image Trust Fix — Final Report

Generated: 2026-05-31

## Audit system

New pipeline compares **recipe title**, **ingredients**, **tonight spread sides**, and **hero image contents** (vision):

| Command | Purpose |
| --- | --- |
| `npm run audit:meal-image-trust` | Heuristic audit (321 canonical recipes) |
| `npm run audit:meal-image-trust -- --vision` | Adds GPT-4o-mini vision QA on hero pixels |
| `npm run regen:meal-image-trust -- --apply --limit=N` | Regenerates failed heroes with complete-meal prompts |
| `npm run fix:meal-image-trust` | Audit → regen loop → final report |

Reports: `review/meal-image-trust-audit.json`, `review/meal-image-trust-regen-report.json`

---

## Summary

| Metric | Heuristic (all 321) | Vision (Performance 50) | Vision (Golden + Performance 150) |
| --- | --- | --- | --- |
| Audited | 321 | 50 | 150 |
| Passed | **321** | **32** | **28** |
| Failed | **0** | **18** | **122** |
| Title ingredient mismatches | 0 | 18 | — |
| Missing sides / incomplete meal | 0 | 16 | — |
| Protein-only heroes | 0 | 4 | 32 |

**Heuristic gate:** 0 path/title conflicts across all curated catalogs (Golden 100, Performance, Hall Expansion, Breakfast, Pizza Night, Smoothies).

**Vision gate (user-trust):** Performance Meals improved **25 → 18** failures after regen batch. Golden 100 + classics still need vision regen (≈94 remaining in that cohort).

---

## Replacements generated

| Recipe | Reason failed | Replacement | QA |
| --- | --- | --- | --- |
| Boneless Chicken Thighs with Sweet Potato & Fresh Spinach | Vision: zucchini/tomatoes instead of sweet potato & spinach | **yes** | **pass** |
| Herb-Crusted Baked Salmon Tray | Missing complete tray meal context | yes | pass |
| Lean Turkey and Bean Chili | Incomplete meal / missing sides | yes | pass |
| Baked Turkey Meatball Marinara | Protein-only hero | yes | pass |
| Cottage Cheese Protein Pasta Bake | Title ingredients not visible | yes | pass |
| Smoky Lentil and Kale Soup | Incomplete meal context | yes | **fail** |
| Crock Barbacoa Chicken With Potato Wedges | Corn/rice instead of wedges | yes | pass |
| Honey Lime Chicken Tray | Missing sides / wrong chicken cut | yes | **fail** |
| Turkey Sweet Potato Chili | Missing sides | yes | pass |
| Mediterranean Baked Fish Tray | Missing complete meal | yes | pass |
| Greek Lemon Chicken and Potatoes | Incomplete meal framing | yes | pass |

---

## Performance Meals still failing vision (18)

| Recipe | Reason failed | Replacement | QA |
| --- | --- | --- | --- |
| Smoky Lentil and Kale Soup | Incomplete meal context | yes | fail |
| Honey Lime Chicken Tray | Missing cilantro-lime rice & black beans | yes | fail |
| Moroccan Chicken Chickpea Tray | Protein-only hero | no | — |
| Hummus Chicken Platter | Missing platter components | no | — |
| White Bean and Kale Soup | Missing bread/parmesan (optional spread) | no | — |
| Lean Beef and Broccoli Rice | Broccoli rice not visible | no | — |
| Caprese Chicken Bake | Wrong side (rice not in recipe) | no | — |
| Pesto Tomato Chicken Tray | Missing polenta / salad | no | — |
| Spanish Chicken and Chorizo Rice | Missing complete meal | no | — |
| Yogurt Marinated Grill Chicken | Protein-only hero | no | — |
| Light Chicken Enchilada Skillet | Missing sides/toppings | no | — |
| Italian Sausage and Veg Sheet Pan | Incomplete meal | no | — |
| Cajun Chicken Rice Bowl | Missing collard greens / cornbread | no | — |
| Chipotle Lime Chicken Tacos | Missing black beans | no | — |
| Veggie Egg Casserole Tray | Wrong vegetables visible | no | — |
| Maple Mustard Salmon Tray | Missing rice pilaf / salad | no | — |
| Turkey Shepherd's with Sweet Potato Top | Missing sides | no | — |
| Baked Falafel Hall Bowls | Missing rice / bowl components | no | — |

---

## Golden 100 / Hall Classics — vision failures (sample)

Vision audit flagged **~72** Golden/Hall classics for missing sides, protein-only heroes, or wrong meal identity. Examples:

- Chimichurri Steak Tacos — missing tortillas / pickled onions
- Double Smash Burgers — no fries / pickles
- Firehall Chili — missing garlic bread / topping bar
- Jerk Chicken & Peas and Rice — rice/peas not visible
- BBQ Chicken Bowls — missing rice, corn, slaw
- Chicken Caesar — diced chicken rule (fixed in prior session; re-verify with `--vision`)

---

## Continue until 0 failures

```bash
# 1. Vision audit (Performance first — highest trust impact)
npx tsx scripts/audit-meal-image-trust.ts --vision --collection=performance_meals

# 2. Regenerate failures (batch)
npx tsx scripts/regen-meal-image-trust.ts --apply --limit=20 --force --skip-qa-fail

# 3. Re-audit until failed=0
npx tsx scripts/audit-meal-image-trust.ts --vision --collection=performance_meals

# 4. Golden 100 + Hall classics
npx tsx scripts/audit-meal-image-trust.ts --vision --collection=golden_100
npx tsx scripts/regen-meal-image-trust.ts --apply --limit=30 --force --skip-qa-fail

# 5. Full loop
npm run fix:meal-image-trust
```

**Ship target:** 0 vision failures on Performance, Golden 100, Breakfast, Pizza Night (per `docs/image-remediation-strategy.md`).
