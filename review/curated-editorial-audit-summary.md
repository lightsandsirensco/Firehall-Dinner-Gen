# Curated Firehall Meals — full editorial audit summary

**Date:** 2026-05-29  
**Scope:** 150 on-disk catalog recipes (Golden 100 + Performance Meals 50). No new recipes added. Smoothies and breakfast catalogs were out of scope.

## Outcome

| Check | Result |
|-------|--------|
| Total recipes audited | 150 |
| Content quality (`auditGoldenRecipeContent`) | **150 / 150 pass** |
| Critical editorial blockers | **0** |
| Manual review queue | **0** |
| Duplicate titles | **0** |
| Auto-generated “Watch color…” filler in steps | **0** (removed) |
| Generic `Step 1` step titles | **0** (removed) |

## What was fixed

### On-disk recipe pages (150 JSON files)

- Regenerated all Golden 100 and Performance Meals pages from editorial builders.
- **~150 recipe files** updated (spacing, descriptions, ingredients, and/or steps).
- Expanded thin one-line descriptions (e.g. BBQ Chicken Bowls, Beef Dip) with crew-sizing context.
- Replaced weak curated steps (generic titles, filler sentences) with **hall package** or **blueprint** instructions where quality bar failed.
- **Chimichurri Steak Tacos** restored full chimichurri, tortillas, pickled onions, and street-line steps from the `steak-tacos` hall package (was incorrectly downgraded to a generic steak blueprint).

### Builder / quality pipeline (lasting fixes)

- **Curated vs package priority:** If curated SQLite steps fail quality, fall back to `classicSlug` hall package ingredients + steps instead of generic class blueprints.
- **Slug packs:** Only explicit slug instruction packs override package content (no longer every recipe gets a legacy class blueprint).
- **Quality bar:** Steps with `Step N` titles or “Watch color and texture…” filler now fail quality and trigger replacement.
- **Copy:** Short curated summaries expand to publication-length descriptions; cold/serve steps get sensible padding instead of pan-watching filler.

### Tooling added

| Script | Purpose |
|--------|---------|
| `npm run audit:full-editorial` | Full audit (copy, content, ingredient/step gaps, duplicates) → `review/full-editorial-audit.md` |
| `npm run fix:full-editorial` | Safe copy fixes + optional weak-step rebuild from manifest |

## Issues found (by category)

| Category | Notes |
|----------|--------|
| Spelling / grammar / punctuation | Addressed via `normalizeRecipeSpacing` on publish; no systemic misspellings in catalog copy |
| Thin marketing intros | **9+** golden recipes had sub-50-character hooks; expanded on regenerate |
| Weak / generic steps | **4** recipes had curated filler (`beef-dip`, `pulled-pork`, `chicken-parm`, `bbq-chicken-bowls`); rebuilt |
| Instruction mismatch | **1** critical: `steak-tacos` (title promised chimichurri/tacos, body was generic steak) — **fixed** |
| Duplicate recipes | None by title across 150 |
| Suspicious AI titles | No `title_metadata` blockers; optional `title_quality_gate` info flags remain on some human titles (e.g. “Quick Beef and Broccoli”) — acceptable |
| Low quality / manual review | **None** remaining at error severity |

## Remaining non-blocking notes

The full audit still reports **~189 info/warning-level** items, mostly:

- `ingredient_step_gap` — heuristic false positives (e.g. “Kosher salt” not named in prose when “salt heavily” is used).
- `title_robotic` / `title_quality_gate` — optional title polish suggestions, not publish blockers.
- `intro_generic_ai_wording` — occasional marketing adjectives in hooks.

These do not block publication. Re-run `npm run audit:full-editorial` after future content edits.

## Reports

- `review/full-editorial-audit.md` — per-recipe findings (latest run)
- `review/full-editorial-audit.json` — machine-readable
- `review/editorial-audit-150.md` — copy/style pass (spacing, vague ingredient heuristics)
- `review/recipe-content-audit.md` — manifest build quality (100/100 pass)

## Commands used

```bash
npm run catalog:generate-pages
npm run performance:generate-pages
npm run fix:editorial-150
npm run fix:full-editorial
npm run audit:full-editorial
npm run audit:recipe-content
```
