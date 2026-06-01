# Firehall Meals Master Recipe Audit — Final Report

Generated: 2026-05-31

## Executive Summary

**228 approved catalog recipes** were audited across all 9 phases. All **critical blockers are cleared**:

| Target | Status |
| --- | --- |
| 0 spelling / grammar errors | **0** (Phase 1) |
| 0 AI-style wording | **0** (Phase 1) |
| 0 title / side mismatches | **0** (Phase 2) |
| 0 forbidden proteins | **0** (Phase 6) |
| 0 image metadata failures | **0** (Phase 7) |
| 0 Grade D recipes | **0** |

**137 recipes (60%)** are Grade **A** — publish ready. **91 recipes (40%)** are Grade **B** — shippable with optional polish on step detail and garnish mentions in instructions.

Full catalog (376 recipes): **265 A**, **111 B**, **0 C**, **0 D**.

## Pipeline Added

| Command | Purpose |
| --- | --- |
| `npm run audit:master-recipes` | 9-phase audit across all catalog pages |
| `npm run audit:master-recipes -- --scope=approved` | Approved Explore catalog only (~228 recipes) |
| `npm run apply:master-recipe-copy-fixes` | Strip AI/template phrasing from page JSON |

Reports: `review/master-recipe-audit.json`, `review/master-recipe-audit.md`

## Phase Coverage

| Phase | Check |
| ---: | --- |
| 1 | Spelling, grammar, AI phrases, banned instruction filler |
| 2 | Title ↔ side pairing accuracy |
| 3 | Ingredient ↔ step alignment |
| 4 | Beginner-proof steps (no vague "sear meat", "bloom spices") |
| 5 | Step detail (time, heat, doneness cues) |
| 6 | Firehall protein realism (grocery-store staples) |
| 7 | Image accuracy (hero path/alt heuristics) |
| 8 | Recipe completeness (intro, times, servings, tips, leftovers) |
| 9 | Core Golden content quality score |

Grades: **A** publish ready · **B** minor fixes · **C** major rewrite · **D** replace/critical

---

## Changes Applied This Session

### Phase 1 — Copy fixes (39 catalog pages)

Automated scrub removed or replaced:

- `tonight's board` → serving line
- `perfect for` / `ideal for` → works for
- `plate and serve` → portion and serve
- `until done` → until fully cooked
- `elevated`, `culinary`, `restaurant-quality`, `to perfection`
- Banned instruction filler via `stripBannedInstructionPhrases`

Full file list: `review/master-recipe-copy-fixes.json`

### Phase 2 & 7 — Title / image accuracy

| Recipe | Fix |
| --- | --- |
| `shepherds-pie` | Renamed to **Shepherd's Pie with Greek Salad**; hero regen with casserole + salad |
| `chicken-caesar` | Added `heroImageAlt` with sliced chicken pieces (not whole breast) |
| `crock-barbacoa-chicken` | Added wedge-aware `heroImageAlt`; hero regen v7 (QA pass) |

### Phase 6 — Protein realism (prior pass, verified 0 failures)

| Removed | Replaced with |
| --- | --- |
| `cajun-grilled-catfish-crew` | `cajun-grilled-cod-crew` |
| `grilled-halibut-lemon-packets` | `grilled-cod-lemon-packets` |
| `garlic-butter-scallop-skewers` | `garlic-butter-shrimp-skewers` |
| `mediterranean-baked-fish-tray` (halibut option) | **Mediterranean Baked Cod Tray** (cod only) |

Old slugs redirect via `phase5-redirects.ts`.

---

## Post-Fix Audit Results (Approved Catalog)

| Metric | Count |
| --- | ---: |
| Recipes | 228 |
| Grade A | 137 |
| Grade B | 91 |
| Grade C | 0 |
| Grade D | 0 |

| Phase | Failures remaining |
| --- | ---: |
| 1 Spelling & grammar | 0 |
| 2 Title accuracy | 0 |
| 6 Protein realism | 0 |
| 7 Image metadata | 0 |

### Remaining B-grade work (optional polish)

These phases use **content heuristics** — many flags are garnish/pantry items listed but not named in step text (e.g. parsley, green onions), or steps that could add explicit minutes without changing recipe length.

| Phase | Failures | Typical issue |
| --- | ---: | --- |
| 3 Ingredient alignment | 94 | Garnish/sauce in list but not named in a step |
| 4 Beginner steps | 23 | Vague step title ("Cook chicken") |
| 5 Step detail | 107 | Action step missing time or doneness cue |
| 8 Completeness | 51 | Breakfast/smoothie schema vs hall-dinner sections |
| 9 Core quality | 22 | Golden content audit edge cases |

Fixing all B-grade flags would touch ~91 recipes. Recommend batch fixes by collection rather than one-off edits.

---

## Golden 100 Collection

| Category | Target | Actual |
| --- | ---: | ---: |
| firehall_classics | 15 | 15 |
| bbq_grill_nights | 15 | 15 |
| comfort_food | 12 | 12 |
| healthy_performance | 12 | 12 |
| quick_shift_meals | 10 | 10 |
| pizza_night | 8 | 8 |
| big_crew_feeders | 8 | 8 |
| breakfast_brunch | 6 | 6 |
| global_flavors | 6 | 6 |
| game_day_watch_party | 4 | 4 |
| meal_prep_leftovers | 2 | 2 |
| rookie_friendly | 2 | 2 |
| **Total** | **100** | **100** |

No forbidden proteins in Golden 100. No critical title/image mismatches after fixes.

---

## New Hero Images Needed (optional polish)

These slugs were renamed during protein realism — regenerate heroes when convenient:

- `cajun-grilled-cod-crew`
- `grilled-cod-lemon-packets`
- `garlic-butter-shrimp-skewers`

Title-locked prompts exist in `shared/food-imagery/title-locked-prompts.ts` for barbacoa and shepherd's pie; add prompts for the three new BBQ slugs if running batch regen.

---

## How to Re-Run

```bash
npm run apply:master-recipe-copy-fixes
npm run audit:master-recipes -- --scope=approved
npm run audit:protein-realism
npm run audit:title-side-accuracy
npm run audit:meal-image-trust
```
