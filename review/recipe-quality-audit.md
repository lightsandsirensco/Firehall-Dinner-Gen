# Firehall Meals Recipe Quality Audit

Generated: 2026-06-04T20:46:07.815Z
Scope: **approved** (335 recipes)

## Summary

| Metric | Count |
| --- | ---: |
| Pass | 10 |
| Fail | 325 |

## Issues by category

| Category | Count |
| --- | ---: |
| completeness | 791 |
| ingredient unused | 236 |
| internal temp missing | 151 |
| vague step | 55 |
| authenticity | 25 |
| spelling grammar | 18 |
| temperature missing | 12 |
| cook time unrealistic | 1 |

## Failures (sample)

- **30-minute-pasta-e-fagioli-for-the-hall** — title_pasta_no_pasta; only 5 steps (min 8 for this meal); thin instructions (196 words, min 400)
- **chili-lime-grilled-tilapia** — Heat grill: missing time, heat, or doneness cue; rewrite needed: Rest briefly; Hold at 140°F: missing time, heat, or doneness cue
- **andouille-po-boy-rolls-crew** — unused: mayonnaise; step 2 (Split andouille) needs safe internal temp cue; rewrite needed: Hold sausage
- **applewood-pork-shoulder-steaks** — only 5 steps (min 8 for this meal); thin instructions (140 words, min 400)
- **bagel-lox-breakfast-board** — unused: smoked salmon lox; unused: whipped butter; rewrite needed: Set the line
- **mediterranean-baked-fish-tray** — only 5 steps (min 8 for this meal); thin instructions (102 words, min 280)
- **mac-and-cheese-bake** — unused: Sharp cheddar, shredded; only 6 steps (min 8 for this meal); thin instructions (169 words, min 400)
- **mostaccioli-sausage-bake** — step 2 (Brown the sausage) needs safe internal temp cue; step 4 (Assemble and bake) needs safe internal temp cue; only 5 steps (min 8 for this meal)
- **loaded-baked-potato-bar** — only 4 steps (min 10 for this meal); thin instructions (144 words, min 400)
- **herb-baked-salmon-tray** — step 4 (Bake until just opaque) needs safe internal temp cue; only 5 steps (min 8 for this meal); thin instructions (106 words, min 280)
- **baked-turkey-meatball-marinara** — only 5 steps (min 8 for this meal); thin instructions (113 words, min 400)
- **baked-ziti** — unused: Yellow onion, diced; unused: Fresh basil, chopped; step 1 (Brown beef and build sauce) needs safe internal temp cue
- **crock-barbacoa-chicken** — unused: limes; step 6 (Reduce juices if needed) needs safe internal temp cue; only 7 steps (min 10 for this meal)
- **batch-lasagna** — unused: Yellow onion, diced; step 1 (Brown meat sauce) needs safe internal temp cue; only 6 steps (min 10 for this meal)
- **bbq-breakfast-hash** — hot cooking steps lack oven/grill/surface temperature; Serve with extra sauce: missing time, heat, or doneness cue; no oven/grill/internal temperature cues in steps
- **bbq-brisket-burnt-ends** — unused: Chuck or brisket point, cubed; only 4 steps (min 10 for this meal); thin instructions (85 words, min 400)
- **bbq-chicken-bowls** — only 4 steps (min 8 for this meal); thin instructions (108 words, min 400)
- **bbq-chicken-mac-and-cheese** — step 1 (Season the chicken) needs safe internal temp cue; step 3 (Shred and sauce the chicken) needs safe internal temp cue
- **bbq-chicken-pizza** — only 6 steps (min 10 for this meal); thin instructions (219 words, min 400)
- **bbq-chicken-sliders** — unused: Ground beef; unused: Yellow onion; unused: Garlic cloves
- **bbq-meatball-skewers** — only 5 steps (min 8 for this meal); thin instructions (130 words, min 400)
- **big-chili** — ai_wording: no heat; step 5 (Simmer the chili (low, 35–40 min)) needs safe internal temp cue
- **beef-broccoli** — step 2 (Stir-fry beef in batches) needs safe internal temp cue; step 3 (Char broccoli) needs safe internal temp cue; only 4 steps (min 8 for this meal)
- **beef-barley-soup** — unused: Carrots, diced; unused: Celery, diced; fewer than 4 instruction steps for crew cooking
- **beef-dip** — title promises a sauce but ingredients or steps lack sauce detail; only 4 steps (min 8 for this meal); thin instructions (115 words, min 400)
- **enchilada-beef-skillet** — robotic_title; title_taco_no_tortilla; only 5 steps (min 8 for this meal); thin instructions (99 words, min 400)
- **beef-gyros-for-the-hall** — step 1 (Season the beef) needs safe internal temp cue; only 5 steps (min 8 for this meal); thin instructions (134 words, min 280)
- **korean-beef-rice-bowls** — unused: green onions; step 5 (Glaze and build bowls) needs safe internal temp cue; only 5 steps (min 8 for this meal)
- **beef-stroganoff** — unused: Cremini mushrooms, sliced; unused: Yellow onion, sliced; unused: Fresh parsley, chopped
- **beer-can-chicken** — only 4 steps (min 10 for this meal); thin instructions (108 words, min 400)
- **belgian-waffle-platter** — only 5 steps (min 8 for this meal); thin instructions (148 words, min 400); missing tonightSpread
- **best-tuna-melt-for-the-hall** — only 5 steps (min 8 for this meal); thin instructions (182 words, min 280)
- **spiedie-chicken-platter-crew** — rewrite needed: Heat grill; Warm rolls briefly: missing time, heat, or doneness cue; step 3 is generic or too short
- **biscuit-french-toast-sliders** — only 5 steps (min 8 for this meal); thin instructions (131 words, min 280); missing tonightSpread
- **turkey-burgers** — unused: Dill pickles; only 4 steps (min 8 for this meal); thin instructions (85 words, min 400)
- **cajun-grilled-cod-crew** — unused: mayonnaise; thin instructions (106 words, min 280)
- **blackened-cod-taco-night** — unused: cod fillets; title_taco_no_tortilla; only 5 steps (min 8 for this meal)
- **loaded-ranch-potato-salad-crew** — unused: crumbled blue cheese; unused: fresh chives; unused: watermelon radish
- **breakfast-crunchwraps** — unused: sour cream; only 5 steps (min 8 for this meal); thin instructions (151 words, min 280)
- **breakfast-enchiladas** — unused: cilantro; title_taco_no_tortilla; only 5 steps (min 8 for this meal)
- **breakfast-fried-rice-crew** — ai_wording: perfect for; hot cooking steps lack oven/grill/surface temperature; step 3 (Stir-fry vegetables) needs safe internal temp cue
- **breakfast-nachos-supreme** — step 3 (First melt) needs safe internal temp cue; title_taco_no_tortilla; only 5 steps (min 8 for this meal)
- **breakfast-poutine** — step 2 (Make sausage gravy) needs safe internal temp cue; only 5 steps (min 8 for this meal); thin instructions (126 words, min 280)
- **breakfast-quesadillas** — unused: shredded pepper jack; title_taco_no_tortilla; only 5 steps (min 8 for this meal)
- **breakfast-sandwich-trays** — only 4 steps (min 8 for this meal); thin instructions (77 words, min 280); missing tonightSpread
- **breakfast-sausage-pizza** — unused: Shredded cheddar-mozzarella blend; step 2 (Make country gravy) needs safe internal temp cue; only 6 steps (min 8 for this meal)
- **breakfast-sliders** — ai_wording: until done; banned_phrase: \buntil done\b; unused: everything bagel seasoning
- **breakfast-stromboli-roll** — unused: deli ham; only 5 steps (min 8 for this meal); thin instructions (138 words, min 400)
- **brisket-style-beef-sandwiches-au-jus** — Leftovers: missing time, heat, or doneness cue; only 7 steps (min 10 for this meal); thin instructions (109 words, min 400)
- **buffalo-chicken-dip** — only 4 steps (min 8 for this meal); thin instructions (87 words, min 400)
