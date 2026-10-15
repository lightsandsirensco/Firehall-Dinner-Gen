# Hero image validation

Generated: 2026-10-15T02:13:09.032Z

## Summary

- Published recipes audited: **408** (approved catalog: 427, explore-eligible: 382)
- Pass: **408** · Hard failures: **0**
  - File failures (missing, empty, malformed path, not an image): 0 (missing: 0)
  - Metadata failures (empty/placeholder alt, alt contradicts title): 0
  - Conflicting duplicate hero bytes: 0
  - Vision-confirmed wrong dish: 0
- Metadata warnings: **1** recipes
- Semantic warnings (title/alt wording heuristics, not failures): **5** recipes
- Semantic status — verified pass: **0**, verified fail: **0**, not verified: **408**
- Recipes requiring new images: **0**
- Vision mode: **off — semantic correctness not verified**

## Hard failures

_None._

## Recipes requiring new images

_Missing or invalid hero file, bytes that conflict with another recipe, or a vision-confirmed wrong dish._

_None._

## Semantic status not verified

- 408 recipe(s): vision check not run (pass --vision to verify the picture)

## Semantic warnings (wording heuristics)

_Title/alt/path wording suggests a possible mismatch. These never fail the audit; confirm visually or run `--vision`._

| Slug | Title | Hero | Reasons |
| --- | --- | --- | --- |
| `chicken-caesar` | Chicken Caesar Salad | `/images/golden-100/chicken-caesar.jpg` | Chicken Caesar Salad — hero must show cut-up grilled chicken pieces mixed through the salad, not a whole breast on top |
| `pancake-short-stack` | Pancake Short Stack | `/images/golden-100/pancake-short-stack.jpg` | plating accuracy: breakfast_fail: eggs on pancakes |
| `beef-birria-with-consomme` | Beef Birria with Consommé for Dipping | `/images/golden-100/beef-birria-with-consomme.jpg` | Title component not represented in hero path/slug: "consomm for dipping"; Complete meal required — hero metadata shows too few title components (1/3) |
| `best-tuna-melt-for-the-hall` | Best Tuna Melt for the Hall (Diner Style) | `/images/hall-expansion/best-tuna-melt-for-the-hall.jpg` | Complete meal required — hero metadata shows too few title components (1/2) |
| `lumberjack-breakfast-platter` | Lumberjack Breakfast Platter | `/images/breakfast/lumberjack-breakfast-platter.jpg` | plating accuracy: breakfast_fail: eggs on pancakes |

## Metadata warnings

- `mixed-berry-protein`: no heroImageAlt configured — alt falls back to the recipe title

## Validation commands

```bash
npm run test:hero-image-validation
npm run audit:hero-images
npx tsx scripts/audit-hero-images.ts --vision
```

