# Firehall Meals — Library Overhaul Ledger

Full editorial overhaul of the recipe library. Standard: `review/library-overhaul-playbook.md`.
Worklist (regenerate any time): `npx tsx scripts/build-overhaul-worklist.ts` → `review/library-overhaul-worklist.json`.
Per-recipe verification: `npx tsx scripts/audit-one-recipe.ts <slug> [--scale]`.

## Baseline (2026-07-23)

- 371 approved recipes audited; 11 passed, 360 failed.
- Failure mix: 830 completeness (thin steps/missing sections), 240 unused ingredients,
  185 missing internal temps, 97 vague steps, 24 authenticity, 19 spelling/copy.
- 81 pages stored at non-canonical base servings → fixed via
  `npx tsx scripts/normalize-canonical-servings.ts` (all now base 8).
- The automated rewrite engine (`apply-recipe-quality-fixes`) was evaluated and
  REJECTED for this overhaul: it prepends banned boilerplate steps ("Gather
  ingredients and equipment") and only lifts scores to ~52. All rewrites are
  authored per the playbook instead.

## Infrastructure added

- `scripts/audit-one-recipe.ts` — schema + quality audit + crew-scale spot check
  for any slug (validates breakfast schema for breakfast pages).
- `scripts/build-overhaul-worklist.ts` — regenerates the prioritized worklist.
- `review/library-overhaul-playbook.md` — the authoring standard.
- Breakfast schema + UI extended with optional `equipment` and `tonightSpread`
  ("Morning spread") sections so breakfast pages can meet the full standard.

## Status by tranche

### Done — hall classics (page + shared fixer layers synced): 10/10 PASS 100
big-chili (prior session), beef-dip, steak-tacos, pulled-pork, smash-burgers,
steak-sandwiches, bbq-chicken-mac-and-cheese, chicken-parm, jerk-chicken,
chicken-caesar.
Shared layers touched: `shared/golden-100/recipe-quality/classics-wheel-fixes.ts`,
`shared/golden-100/recipe-quality/golden-p0-classic-packs.ts`.

### In flight — Wave 1 (33 worst recipes, scores 0–52)
BBQ worst 8; grill/handheld 8; golden-100 8; hall-expansion 9.

### In flight — Wave 2 (36 recipes, scores 52–60)
BBQ+performance 9; golden-100 9; hall-expansion 10; classics/performance 8.

### In flight — Breakfast wave (58 pages)
Three batches: 20 + 19 + 19. All breakfast pages also gain equipment +
morning-spread sections.

### Remaining backlog (~224 recipes, scores 60–92)
Mostly firehall_catalog, hall_expansion, performance_meal, bbq_catalog with
lighter issue lists (missing temps, unused ingredients, thin sections).
Next waves proceed worst-first from the regenerated worklist.

## Rules of engagement (for future sessions)

- Classics-wheel slugs (see FIXERS in classics-wheel-fixes.ts) must be edited in
  BOTH the page JSON and the fixer/pack layers.
- Never run `apply-recipe-quality-fixes` in write mode — template output.
- Regenerate the worklist after each wave; spot-check subagent output for voice
  (no boilerplate, no invented source URLs) before launching the next wave.
