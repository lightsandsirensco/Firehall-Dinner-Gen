# Crew scaling audit

Generated: 2026-09-24T23:53:29.737Z

## Summary

| Metric | Count |
| --- | ---: |
| Recipes audited | 432 |
| Successfully scaled (canonical base 8) | 393 |
| Failures | 39 |
| Edge-case recipes | 0 |
| Quantity formatting notes | 0 |

## Crew options

4, 6, 8, 10, 14

## Sample scaling (verified patterns)

| Crew | Ingredient | Base (8) | Scaled |
| ---: | --- | --- | --- |

## Failures

- **apple-cinnamon-baked-oatmeal**: scale_up_bug: ground cinnamon increased when scaling down to 4; scale_up_bug: ground cinnamon increased when scaling down to 6
- **bbq-breakfast-hash**: scale_up_bug: pulled pork or brisket increased when scaling down to 4; scale_up_bug: pulled pork or brisket increased when scaling down to 6
- **big-pot-savory-oats**: scale_up_bug: kosher salt increased when scaling down to 4; scale_up_bug: kosher salt increased when scaling down to 6
- **biscuit-french-toast-sliders**: scale_up_bug: whole milk increased when scaling down to 4; scale_up_bug: whole milk increased when scaling down to 6
- **breakfast-crunchwraps**: scale_up_bug: breakfast sausage increased when scaling down to 4; scale_up_bug: breakfast sausage increased when scaling down to 6
- **breakfast-enchiladas**: scale_up_bug: Mexican chorizo increased when scaling down to 4; scale_up_bug: Mexican chorizo increased when scaling down to 6
- **breakfast-nachos-supreme**: scale_up_bug: nacho cheese sauce increased when scaling down to 4; scale_up_bug: pico de gallo increased when scaling down to 4; scale_up_bug: nacho cheese sauce increased when scaling down to 6; scale_up_bug: pico de gallo increased when scaling down to 6
- **breakfast-poutine**: scale_up_bug: vegetable oil increased when scaling down to 4; scale_up_bug: cheese curds increased when scaling down to 4; scale_up_bug: vegetable oil increased when scaling down to 6; scale_up_bug: cheese curds increased when scaling down to 6
- **breakfast-stromboli-roll**: scale_up_bug: deli ham increased when scaling down to 4; scale_up_bug: deli ham increased when scaling down to 6
- **cast-iron-breakfast-skillet**: scale_up_bug: breakfast sausage or diced ham increased when scaling down to 4; scale_up_bug: breakfast sausage or diced ham increased when scaling down to 6
- **chorizo-breakfast-hash**: scale_up_bug: Mexican chorizo increased when scaling down to 4; scale_up_bug: Mexican chorizo increased when scaling down to 6
- **club-sandwich-breakfast-bake**: scale_up_bug: deli turkey increased when scaling down to 4; scale_up_bug: deli turkey increased when scaling down to 6
- **cowboy-breakfast-skillet**: scale_up_bug: shredded cheddar increased when scaling down to 4; scale_up_bug: shredded cheddar increased when scaling down to 6
- **crew-french-toast-bake**: scale_up_bug: cinnamon increased when scaling down to 4
- **firehall-breakfast-pizza**: scale_up_bug: olive oil increased when scaling down to 4
- **hall-breakfast-wraps**: scale_up_bug: lean turkey breakfast sausage increased when scaling down to 4; scale_up_bug: lean turkey breakfast sausage increased when scaling down to 6
- **hall-sausage-biscuits-gravy**: scale_up_bug: butter increased when scaling down to 4; scale_up_bug: black pepper increased when scaling down to 4
- **hash-brown-breakfast-casserole**: scale_up_bug: breakfast sausage or diced ham increased when scaling down to 4; scale_up_bug: breakfast sausage or diced ham increased when scaling down to 6
- **high-protein-parfaits**: scale_up_bug: vanilla extract increased when scaling down to 4; scale_up_bug: vanilla extract increased when scaling down to 6
- **maple-sausage-pinwheels**: scale_up_bug: breakfast sausage increased when scaling down to 4; scale_up_bug: shredded cheddar increased when scaling down to 4; scale_up_bug: maple syrup increased when scaling down to 4; scale_up_bug: maple syrup increased when scaling down to 4; scale_up_bug: breakfast sausage increased when scaling down to 6; scale_up_bug: shredded cheddar increased when scaling down to 6; scale_up_bug: maple syrup increased when scaling down to 6; scale_up_bug: maple syrup increased when scaling down to 6
- **overnight-french-toast-bake**: scale_up_bug: vanilla extract increased when scaling down to 4
- **protein-pancake-tray**: scale_up_bug: sugar increased when scaling down to 4
- **red-lead-skillet**: scale_up_bug: shredded pepper jack increased when scaling down to 4; scale_up_bug: shredded pepper jack increased when scaling down to 6
- **sausage-egg-cheese-sandwiches**: scale_up_bug: breakfast sausage patties or links increased when scaling down to 4; scale_up_bug: breakfast sausage patties or links increased when scaling down to 6
- **sheet-pan-breakfast-hash**: scale_up_bug: olive oil or bacon fat increased when scaling down to 4; scale_up_bug: olive oil or bacon fat increased when scaling down to 6
- **sheet-pan-eggs-sausage-crew**: scale_up_bug: olive oil increased when scaling down to 4; scale_up_bug: olive oil increased when scaling down to 6
- **smoked-salmon-benedit**: scale_up_bug: smoked salmon increased when scaling down to 4; scale_up_bug: smoked salmon increased when scaling down to 6
- **tater-tot-breakfast-casserole**: scale_up_bug: bacon increased when scaling down to 4; scale_up_bug: whole milk increased when scaling down to 4; scale_up_bug: bacon increased when scaling down to 6; scale_up_bug: whole milk increased when scaling down to 6
- **turkey-sausage-burritos**: scale_up_bug: shredded cheddar or pepper jack increased when scaling down to 4; scale_up_bug: breakfast sausage or chorizo increased when scaling down to 4; scale_up_bug: shredded cheddar or pepper jack increased when scaling down to 6; scale_up_bug: breakfast sausage or chorizo increased when scaling down to 6
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
