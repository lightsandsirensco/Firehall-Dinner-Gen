# Firehall Meals Recipe Quality Audit

Generated: 2026-07-25T13:04:49.154Z
Scope: **approved** (371 recipes)

## Summary

| Metric | Count |
| --- | ---: |
| Pass | 50 |
| Fail | 321 |

## Issues by category

| Category | Count |
| --- | ---: |
| completeness | 746 |
| ingredient unused | 147 |
| internal temp missing | 143 |
| vague step | 74 |
| authenticity | 21 |
| spelling grammar | 18 |
| temperature missing | 8 |
| cook time unrealistic | 1 |

## Failures (sample)

- **30-minute-pasta-e-fagioli-for-the-hall** — title_pasta_no_pasta; only 5 steps (min 8 for this meal); thin instructions (196 words, min 400)
- **applewood-pork-shoulder-steaks** — only 5 steps (min 8 for this meal); thin instructions (140 words, min 400)
- **bagel-sandwich-line** — only 6 steps (min 8 for this meal); thin instructions (199 words, min 280); missing tonightSpread
- **mediterranean-baked-fish-tray** — only 5 steps (min 8 for this meal); thin instructions (102 words, min 280)
- **mac-and-cheese-bake** — unused: Sharp Cheddar, Shredded; only 6 steps (min 8 for this meal); thin instructions (169 words, min 400)
- **mostaccioli-sausage-bake** — step 2 (Brown the sausage) needs safe internal temp cue; step 4 (Assemble and bake) needs safe internal temp cue; only 5 steps (min 8 for this meal)
- **baked-oatmeal-mixed-berries** — only 4 steps (min 8 for this meal); thin instructions (148 words, min 400); missing tonightSpread
- **loaded-baked-potato-bar** — only 4 steps (min 10 for this meal); thin instructions (144 words, min 400)
- **herb-baked-salmon-tray** — step 4 (Bake until just opaque) needs safe internal temp cue; only 5 steps (min 8 for this meal); thin instructions (106 words, min 280)
- **baked-turkey-meatball-marinara** — only 5 steps (min 8 for this meal); thin instructions (113 words, min 400)
- **baked-ziti** — unused: Yellow Onion, Diced; unused: Fresh Basil, Chopped; step 1 (Brown beef and build sauce) needs safe internal temp cue
- **crock-barbacoa-chicken** — unused: Limes; step 6 (Reduce juices if needed) needs safe internal temp cue; only 7 steps (min 10 for this meal)
- **batch-lasagna** — unused: Yellow Onion, Diced; step 1 (Brown meat sauce) needs safe internal temp cue; only 6 steps (min 10 for this meal)
- **bbq-breakfast-hash** — hot cooking steps lack oven/grill/surface temperature; Serve with extra sauce: missing time, heat, or doneness cue; no oven/grill/internal temperature cues in steps
- **bbq-brisket-burnt-ends** — unused: Chuck Or Brisket Point, Cubed; only 4 steps (min 10 for this meal); thin instructions (85 words, min 400)
- **bbq-chicken-bowls** — only 4 steps (min 8 for this meal); thin instructions (108 words, min 400)
- **bbq-chicken-pizza** — only 6 steps (min 10 for this meal); thin instructions (219 words, min 400)
- **bbq-meatball-skewers** — only 5 steps (min 8 for this meal); thin instructions (130 words, min 400)
- **bbq-pulled-pork-bowls** — step 1 (Season the pork and set up the braise) needs safe internal temp cue; step 7 (Hold the pork hot and moist) needs safe internal temp cue
- **beef-broccoli** — step 2 (Stir-fry beef in batches) needs safe internal temp cue; step 3 (Char broccoli) needs safe internal temp cue; only 4 steps (min 8 for this meal)
- **beef-barley-soup** — unused: Carrots, Diced; unused: Celery, Diced; fewer than 4 instruction steps for crew cooking
- **enchilada-beef-skillet** — robotic_title; title_taco_no_tortilla; only 5 steps (min 8 for this meal); thin instructions (99 words, min 400)
- **beef-gyros-for-the-hall** — step 1 (Season the beef) needs safe internal temp cue; only 5 steps (min 8 for this meal); thin instructions (134 words, min 280)
- **korean-beef-rice-bowls** — unused: Green Onions; step 5 (Glaze and build bowls) needs safe internal temp cue; only 5 steps (min 8 for this meal)
- **beer-can-chicken** — only 4 steps (min 10 for this meal); thin instructions (108 words, min 400)
- **belgian-waffle-platter** — only 5 steps (min 8 for this meal); thin instructions (148 words, min 400); missing tonightSpread
- **best-tuna-melt-for-the-hall** — only 5 steps (min 8 for this meal); thin instructions (182 words, min 280)
- **spiedie-chicken-platter-crew** — rewrite needed: Heat grill; Warm rolls briefly: missing time, heat, or doneness cue; step 3 is generic or too short
- **biscuit-french-toast-sliders** — only 5 steps (min 8 for this meal); thin instructions (131 words, min 280); missing tonightSpread
- **turkey-burgers** — unused: Dill Pickles; only 4 steps (min 8 for this meal); thin instructions (85 words, min 400)
- **cajun-grilled-cod-crew** — unused: Mayonnaise; thin instructions (106 words, min 280)
- **blackened-cod-taco-night** — unused: Cod Fillets; title_taco_no_tortilla; only 5 steps (min 8 for this meal)
- **loaded-ranch-potato-salad-crew** — unused: Crumbled Blue Cheese; unused: Fresh Chives; unused: Watermelon Radish
- **breakfast-crunchwraps** — unused: sour cream; only 5 steps (min 8 for this meal); thin instructions (151 words, min 280)
- **breakfast-enchiladas** — unused: cilantro; title_taco_no_tortilla; only 5 steps (min 8 for this meal)
- **breakfast-fried-rice-crew** — ai_wording: perfect for; hot cooking steps lack oven/grill/surface temperature; step 3 (Stir-fry vegetables) needs safe internal temp cue
- **breakfast-nachos-supreme** — step 3 (First melt) needs safe internal temp cue; title_taco_no_tortilla; only 5 steps (min 8 for this meal)
- **breakfast-poutine** — step 2 (Make sausage gravy) needs safe internal temp cue; only 5 steps (min 8 for this meal); thin instructions (126 words, min 280)
- **breakfast-quesadillas** — unused: shredded pepper jack; title_taco_no_tortilla; only 5 steps (min 8 for this meal)
- **breakfast-sandwich-trays** — only 4 steps (min 8 for this meal); thin instructions (77 words, min 280); missing tonightSpread
- **breakfast-sausage-pizza** — unused: Shredded Cheddar-Mozzarella Blend; step 2 (Make country gravy) needs safe internal temp cue; only 6 steps (min 8 for this meal)
- **breakfast-stromboli-roll** — unused: deli ham; only 5 steps (min 8 for this meal); thin instructions (138 words, min 400)
- **brisket-style-beef-sandwiches-au-jus** — Leftovers: missing time, heat, or doneness cue; only 7 steps (min 10 for this meal); thin instructions (109 words, min 400)
- **buffalo-chicken-dip** — only 4 steps (min 8 for this meal); thin instructions (87 words, min 400)
- **buffalo-chicken-sweet-potato-bowls** — step 1 (Cube and stage the bowl ingredients) needs safe internal temp cue; step 3 (Season the chicken) needs safe internal temp cue; step 7 (Hold hot and cold components correctly) needs safe internal temp cue
- **buffalo-chicken-wraps** — step 2 (Make buffalo sauce) needs safe internal temp cue; only 5 steps (min 8 for this meal); thin instructions (172 words, min 400)
- **build-your-own-pho-bar** — only 5 steps (min 10 for this meal); thin instructions (141 words, min 400)
- **bulgogi-bowls** — step 3 (Sear bulgogi in batches) needs safe internal temp cue; step 4 (Build bulgogi bowls) needs safe internal temp cue; only 4 steps (min 8 for this meal)
- **burnt-ends-chili-crew** — Smoke uncovered: missing time, heat, or doneness cue; Simmer covered: missing time, heat, or doneness cue; Hold chili: missing time, heat, or doneness cue
- **burrito-bowl-bar-night** — ai_phrase: elevated: AI phrase: elevated; ai_wording: elevate; title_taco_no_tortilla
