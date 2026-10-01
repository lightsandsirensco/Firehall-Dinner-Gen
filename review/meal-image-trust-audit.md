# Meal Image Trust Audit

- Audited: **408**
- Passed: **403**
- Failed: **5**
- Title ingredient mismatches: **2**
- Missing side dishes: **2**
- Protein-only heroes: **0**
- Vision enabled: **false**

## Failed recipes

| Recipe | Reason failed | Replacement | QA |
| --- | --- | --- | --- |
| Chicken Caesar Salad (`chicken-caesar`) | Chicken Caesar Salad — hero must show cut-up grilled chicken pieces mixed through the salad, not a whole breast on top | no | — |
| Pancake Short Stack (`pancake-short-stack`) | plating accuracy: breakfast_fail: eggs on pancakes | no | — |
| Beef Birria with Consommé for Dipping (`beef-birria-with-consomme`) | Title component not represented in hero path/slug: "consomm for dipping"; Complete meal required — hero metadata shows too few title components (1/3) | no | — |
| Best Tuna Melt for the Hall (Diner Style) (`best-tuna-melt-for-the-hall`) | Complete meal required — hero metadata shows too few title components (1/2) | no | — |
| Lumberjack Breakfast Platter (`lumberjack-breakfast-platter`) | plating accuracy: breakfast_fail: eggs on pancakes | no | — |