# Instruction / ingredient mismatch — review batch 1 (10 of 25)

Status: DRAFT — not applied to any production recipe page or source definition.

Each item quotes the step text that uses an ingredient the list does not contain. Proposed
quantities are culinary estimates for the recipe's stored 8-serving base, not sourced values —
please accept, edit, or reject each one. Nutrition must be recalculated for any recipe whose
ingredient list changes.

| # | Recipe | Step evidence | Proposed change |
|---|--------|---------------|-----------------|
| 1 | Turkey Chili (`turkey-chili`) | S5 "Set a topping bar: shredded cheese, diced onion, jalapeños, sour cream." S1 "Line a sheet pan if you're making garlic bread on the side." | Add a **Toppings** group: shredded cheddar 2 cups, sour cream 1 1/2 cups, jalapeños 2 (sliced), red onion 1 small (diced). Delete the garlic-bread sentence from S1 (no bread is listed). |
| 2 | Garlic Butter Shrimp (`garlic-butter-shrimp`) | S4 "Serve over rice, pasta, or with crusty bread…" — no starch listed, so the dinner has no base. | Add crusty baguettes 2 loaves (to mop the garlic butter) and reword S4 to "Serve with warm crusty bread…". Alternative: add long-grain rice 3 cups uncooked plus a rice step. **Decision needed.** |
| 3 | Lebanese Chicken Shish Platter (`lebanese-chicken-shish-platter`) | S3 tabbouleh: "toss with parsley, diced tomato, cucumber, mint, lemon, and olive oil." ("mayonnaise" in S2 is a texture comparison — no change.) | Add Roma tomatoes 4 (diced), English cucumber 1 (diced), fresh mint 1/2 cup (chopped). |
| 4 | Korean Beef Bowls (`firehall-korean-beef-bowls`) | S1 "whisk gochujang, soy, sugar, garlic, and sesame oil"; S9 "scatter sesame and green onions". | Add garlic 6 cloves (minced), toasted sesame oil 2 tbsp, green onions 1 bunch (sliced). Stored "cucumbers 1.6 each" → 2. |
| 5 | Mediterranean Beef Bowls (`mediterranean-beef-bowls`) | S1/S4 "cumin, coriander, paprika, garlic, and a splash of broth"; S2 "lemon zest, lemon juice, chopped parsley, and a drizzle of olive oil"; S5 optional roasted chickpeas. | Add ground coriander 2 tsp, smoked paprika 1 tbsp, garlic 6 cloves (minced), chicken broth 1/2 cup, lemons 2, fresh parsley 1 cup (chopped), olive oil 3 tbsp. Either add chickpeas 2 cans (optional) or delete S5. **Decision needed.** Stored decimals (cucumbers 1.6, tomatoes 4.8) → 2 and 5. |
| 6 | Salmon Rice Bowls for the Crew (`salmon-rice-bowls-crew`) | S4 "Brush salmon with soy, honey, and ginger glaze"; S6 "toss with rice vinegar and a pinch of salt". | Add honey 1/4 cup, fresh ginger 2 tbsp (grated), rice vinegar 1/3 cup. Stored "avocados 4.8", "cucumbers 3.2" → 5 and 3. |
| 7 | Korean Turkey Rice Bowls (`korean-turkey-rice-bowls`) | S2 "Whisk gochujang, soy sauce, brown sugar, garlic, and water"; S3 "Toss sliced cucumber with vinegar, sugar, and salt". | Add soy sauce 1/2 cup, brown sugar 1/4 cup, garlic 6 cloves (minced), rice vinegar 1/3 cup, sugar 1 tbsp. |
| 8 | White Chicken Chili Crock (`white-chicken-chili-crock`) | S1 "…broth, cumin, and onion"; S8/S10 "add salt or lime", "cheese, cilantro, chips, and lime". | Add yellow onions 2 (diced), ground cumin 1 tbsp; Toppings group: shredded Monterey Jack 2 cups, fresh cilantro 1 bunch, limes 3, tortilla chips 1 bag (13 oz). |
| 9 | Italian Beef Slow Cooker Sandwiches (`italian-beef-slow-cooker`) | S1 "broth, Italian seasoning, garlic, and pepper"; S3/S4 "Slice bell peppers and onions… Sauté peppers and onions". | Add garlic 8 cloves (smashed), black pepper 2 tsp, bell peppers 3 (sliced), yellow onions 2 (sliced), olive oil 2 tbsp (for the sauté). Stored "hoagie rolls 9.6" → 10. |
| 10 | Smoker Nachos for the Crew (`smoker-nachos-crew`) | S8 "Add salsa, jalapeños, onion, and cilantro". (The "BBQ sauce" flag has no step text — false positive.) | Add red onion 1 (diced), fresh cilantro 1 bunch (chopped). Stored "jalapeños 3/4 jar" → 1 jar (16 oz). |

## Stored-data decimals seen in this batch

Several pages store counts such as "9.6 hoagie rolls" or "4.8 avocados" (left by an earlier bulk
rescale). Display now rounds counts and bottles/jars/loaves to whole units, but the stored values
should be corrected so nutrition and display agree. Two outside this batch also need it:
`hungarian-goulash-crew` (rye bread 3/4 loaf) and `smoker-nachos-crew` (jalapeños 3/4 jar).

## Remaining 15 (batch 2)

`pasta-e-fagioli-hall`, `spanish-rice-chicken-one-pot`, `gochujang-beef-skewers-crew`,
`tandoori-lamb-chop-platter`, `loaded-ranch-potato-salad-crew`, `firehall-antipasto-pasta-salad`
(steps use unlisted ingredients), and `grilled-pork-chops`, `teriyaki-salmon-grill`,
`herb-roasted-thighs`, `pancake-short-stack`, `philly-egg-rolls`, `smoked-corned-beef`,
`hall-burger-bar`, `griddle-smash-sausage-peppers`, `firehall-street-elote-cups`
(listed ingredients never used in steps).
