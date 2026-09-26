# Crew scaling audit

Generated: 2026-09-26T19:29:30.912Z

## Summary

| Metric | Count |
| --- | ---: |
| Recipes audited | 467 |
| Successfully scaled (canonical base 8) | 421 |
| Failures | 46 |
| Edge-case recipes | 0 |
| Quantity formatting notes | 0 |

## Crew options

4, 6, 8, 10, 14

## Sample scaling (verified patterns)

| Crew | Ingredient | Base (8) | Scaled |
| ---: | --- | --- | --- |

## Failures

- **apple-cinnamon-baked-oatmeal**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **bagel-lox-breakfast-board**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **bagel-sandwich-line**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **big-pot-savory-oats**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **breakfast-crunchwraps**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **breakfast-enchiladas**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **breakfast-nachos-supreme**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **breakfast-poutine**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **breakfast-sandwich-trays**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **breakfast-sliders**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **chilaquiles-verde-bake**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **club-sandwich-breakfast-bake**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **crew-french-toast-bake**: non_canonical_base: stored at 12, expected 8; metadata: baseServings=12 crewSize=12 (expected 8)
- **denver-breakfast-casserole**: non_canonical_base: stored at 12, expected 8; metadata: baseServings=12 crewSize=12 (expected 8)
- **farmers-breakfast-casserole**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **fire-captain-omelette-bar**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **firehall-breakfast-pizza**: non_canonical_base: stored at 12, expected 8; metadata: baseServings=12 crewSize=12 (expected 8)
- **green-chile-breakfast-burritos**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **hall-breakfast-burritos**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **hall-breakfast-wraps**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **hall-sausage-biscuits-gravy**: non_canonical_base: stored at 12, expected 8; metadata: baseServings=12 crewSize=12 (expected 8)
- **hash-brown-breakfast-casserole**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **high-protein-parfaits**: non_canonical_base: stored at 6, expected 8; metadata: baseServings=6 crewSize=6 (expected 8)
- **maple-sausage-pinwheels**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **monte-cristo-sandwiches**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **overnight-french-toast-bake**: non_canonical_base: stored at 12, expected 8; metadata: baseServings=12 crewSize=12 (expected 8)
- **overnight-oat-bar-crew**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **overnight-sausage-strata**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **protein-pancake-tray**: non_canonical_base: stored at 12, expected 8; metadata: baseServings=12 crewSize=12 (expected 8)
- **quick-egg-tacos**: non_canonical_base: stored at 6, expected 8; metadata: baseServings=6 crewSize=6 (expected 8)
- **sheet-pan-breakfast-hash**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **sheet-pan-breakfast-sandwiches**: non_canonical_base: stored at 12, expected 8; metadata: baseServings=12 crewSize=12 (expected 8)
- **sheet-pan-eggs-sausage-crew**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **sheet-pan-full-english**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **southwest-egg-bake**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **tater-tot-breakfast-casserole**: non_canonical_base: stored at 10, expected 8; metadata: baseServings=10 crewSize=10 (expected 8)
- **blueberry-almond**: metadata: baseServings=missing crewSize=missing (expected 8)
- **chocolate-banana-recovery**: metadata: baseServings=missing crewSize=missing (expected 8)
- **citrus-ginger**: metadata: baseServings=missing crewSize=missing (expected 8)
- **green-pineapple**: metadata: baseServings=missing crewSize=missing (expected 8)
- **mixed-berry-protein**: metadata: baseServings=missing crewSize=missing (expected 8)
- **mocha-protein**: metadata: baseServings=missing crewSize=missing (expected 8)
- **peanut-butter-banana-recovery**: metadata: baseServings=missing crewSize=missing (expected 8)
- **strawberry-oat-breakfast**: metadata: baseServings=missing crewSize=missing (expected 8)
- **strawberry-spinach**: metadata: baseServings=missing crewSize=missing (expected 8)
- **tropical-mango-greek**: metadata: baseServings=missing crewSize=missing (expected 8)

## Edge cases

_None_
