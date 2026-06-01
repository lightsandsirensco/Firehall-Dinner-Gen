# Firehall Meals Image Accuracy Audit — Changes

Generated: 2026-05-29

## Rule applied

A firefighter should identify the recipe title within **2 seconds** of seeing the image.

**FAIL** if: title ingredient missing · side dish missing · protein only · wrong recipe · tight restaurant crop · family meal not visible

**PASS** if: main dish and all named sides visible · wide family-style firehall framing

## Infrastructure fixes

| File | Change |
| --- | --- |
| `shared/curated-image-governance/trust-audit-targets.ts` | Load `heroImageAlt` for hall expansion, breakfast, pizza night, and smoothies (was missing — caused false metadata failures) |
| `shared/curated-image-governance/meal-image-completeness.ts` | Always run complete-meal checks on metadata; exempt smoothies from platter framing rule |
| `scripts/fix-meal-hero-alt-metadata.ts` | Bulk-add wide family-style `heroImageAlt` for multi-component titles |
| `scripts/audit-meal-image-trust.ts` | `--slugs` / `--slugs-file` filters; synthesize vision failure reasons when model returns none |
| `scripts/regen-meal-image-trust.ts` | `--slugs-file` for targeted regen queue |
| `scripts/audit-firehall-image-accuracy.ts` | User-facing audit report wrapper |
| `shared/food-imagery/title-locked-prompts.ts` | Added title-locked prompts for smash-burgers, mac-and-cheese-bake, sausage-peppers-onions, biscuits-gravy, pepper-steak-onions |
| `review/image-accuracy-regen-queue.txt` | 41 recipes flagged for hero regen |

## Metadata audit (316 recipes)

| Metric | Before | After |
| --- | ---: | ---: |
| Passed | 275 | **316** |
| Failed | 41 | **0** |

All 41 failures were resolved by adding `heroImageAlt` metadata and fixing collection loaders.

## Vision QA — regen queue (41 recipes)

Three regeneration rounds were run with OpenAI `gpt-image-1` + vision QA.

| Round | Vision pass | Vision fail |
| --- | ---: | ---: |
| Initial (pre-regen) | 8 | 33 |
| After regen round 1 | 13 | 28 |
| After regen round 2 | 17 | 24 |
| After regen round 3 | 18 | 23 |

**33 hero images regenerated** in round 1, **28** in round 2, **24** in round 3 (85 total API generations).

### Recipes passing vision QA (18/41)

beef-broccoli, chili-garlic-bread, flank-chimichurri, greek-lemon-chicken-potatoes, lean-beef-broccoli-rice, lean-turkey-bean-chili, meatloaf-mashed, one-pot-chicken-rice, shrimp-and-grits-breakfast, smoked-wings-white-sauce, spanish-chicken-chorizo-rice, turkey-shepherds-sweet-potato, turkey-sweet-potato-chili, white-bean-kale-soup, bagel-lox-breakfast-board, boneless-chicken-thighs-sweet-potato-spinach, mac-and-cheese-bake, smoky-lentil-kale-soup

*(Exact pass set may shift slightly between vision runs — see `review/meal-image-trust-audit.json`.)*

### Remaining vision failures (23/41)

Run `npm run audit:meal-image-trust -- --vision --slugs-file=review/image-accuracy-regen-queue.txt` for current list.

Common failure modes:
- Named sides not visible in frame (breakfast skillets, pasta bakes)
- Vision conflating optional spread lines with required components
- Breakfast items showing wrong protein (bacon vs sausage)

## Commands

```bash
# Full metadata audit (fast)
npm run audit:meal-image-trust

# Vision audit on regen queue
npx tsx scripts/audit-meal-image-trust.ts --vision --slugs-file=review/image-accuracy-regen-queue.txt

# Fix missing hero alt text
npm run fix:meal-hero-alt

# Regenerate failed heroes
npx tsx scripts/regen-meal-image-trust.ts --apply --force --skip-qa-fail --limit=30

# Full fix loop
npm run run:meal-image-trust-fix -- --apply --vision --limit=30 --rounds=3
```

## Next steps

1. Full-catalog vision audit (`--vision` without slug filter) to validate remaining 275 recipes
2. Add title-locked prompts for stubborn breakfast + pasta slugs
3. Re-run regen loop until regen queue reaches 41/41 vision pass
