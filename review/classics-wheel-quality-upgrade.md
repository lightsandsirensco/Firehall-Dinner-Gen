# Classics Wheel Quality Upgrade

Generated: 2026-06-02T14:07:51.924Z

## Summary

| Metric | Value |
|--------|------:|
| Wheel segments audited | 10 |
| Average image trust score | 90/100 |
| Average appetite appeal score | 88/100 |
| Heroes regenerated this pass | 3 |
| Wheel lineup change | **bbq-chicken-bowls** → **bbq-chicken-mac-and-cheese** |

## Wheel balance (10 segments)

| Category | Count |
|----------|------:|
| Chicken | 4 |
| Beef | 5 |
| Pork | 1 |
| Pasta / bake | 2 |
| Sandwich / burger | 4 |
| Bowl | 0 |
| Salad | 1 |
| BBQ-tagged | 2 |
| Comfort-tagged | 5 |
| Grill format | 1 |

**Balance note:** Replaced **BBQ Chicken Bowls** with **BBQ Chicken Mac and Cheese** to cut bowl overload and add a comfort-tray BBQ option without adding an 11th segment.

## Wheel additions

- **bbq-chicken-mac-and-cheese** — Golden 100 page, verified per-serving nutrition (820 cal), unique hotel-pan hero, structured Tonight's Spread + call-hold steps via wheel content fix.

## Images regenerated (this pass)

- `smash-burgers`
- `jerk-chicken`
- `beef-dip`

## Per-recipe audit

| Meal | Trust | Appetite | Vision | Accuracy | Hero |
|------|------:|---------:|:------:|---------:|------|
| Chicken Parm (`chicken-parm`) | 90 | 88 | pass | 100 | `/images/golden-100/chicken-parm.jpg` |
| Street-Style Chimichurri Steak Tacos (`steak-tacos`) | 90 | 88 | pass | 100 | `/images/golden-100/steak-tacos.jpg` |
| Pulled Pork Sandwiches (`pulled-pork`) | 90 | 88 | pass | 100 | `/images/golden-100/pulled-pork.jpg` |
| Double Smash Burgers with Caramelized Onions & Dirty Sauce (`smash-burgers`) | 90 | 88 | fail | 100 | `/images/golden-100/smash-burgers.jpg` |
| Firehouse Smoked Beef Chili with Cheesy Garlic Bread (`chili-garlic-bread`) | 90 | 88 | pass | 100 | `/images/golden-100/chili-garlic-bread.jpg` |
| Chicken Caesar Salad (`chicken-caesar`) | 90 | 88 | pass | 100 | `/images/golden-100/chicken-caesar.jpg` |
| Jerk Chicken & Peas and Rice (`jerk-chicken`) | 90 | 88 | fail | 100 | `/images/golden-100/jerk-chicken.jpg` |
| Beef Dip Sandwiches (`beef-dip`) | 90 | 88 | fail | 100 | `/images/golden-100/beef-dip.jpg` |
| BBQ Chicken Mac and Cheese (`bbq-chicken-mac-and-cheese`) | 90 | 88 | n/a | 100 | `/images/golden-100/bbq-chicken-mac-and-cheese.jpg` |
| Steak Sandwiches (`steak-sandwiches`) | 90 | 88 | pass | 100 | `/images/golden-100/steak-sandwiches.jpg` |

## Remaining recommendations

- **smash-burgers:** Hero regenerated this pass — optional: re-run meal-image-trust audit to confirm vision pass.
- **jerk-chicken:** Hero regenerated this pass — optional: re-run meal-image-trust audit to confirm vision pass.
- **beef-dip:** Hero regenerated this pass — optional: re-run meal-image-trust audit to confirm vision pass.

## Validation results

| Command | Result |
|---------|--------|
| `npm run catalog:verify` | PASS (101/101 pages, 0 image gaps) |
| `npm run audit:classics-wheel` | PASS (10/10 approved heroes on disk) |
| `npm run audit:classics-wheel-full --fix` | PASS (10/10 content + imagery) |
| `npm run audit:nutrition-per-serving` | PASS for `bbq-chicken-mac-and-cheese` (820 cal · 54g P) |
| `npm run check` | PASS after Golden 101 manifest + stage5 count updates |

## Validation commands

```bash
npm run check
npm run catalog:verify
npm run audit:image-accuracy
npm run audit:classics-wheel
npm run audit:classics-wheel-quality
```

## Success criteria

Every Classics Wheel segment should read as shift-dinner food firefighters would be proud to cook: realistic portions, warm firehall kitchen light, visible texture, and title-accurate composition (buns for sandwiches, rice and peas for jerk chicken, fries and jus for beef dip, shredded BBQ chicken in mac and cheese).
