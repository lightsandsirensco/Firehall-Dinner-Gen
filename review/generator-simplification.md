# Generator Simplification — Product & Engineering Report

**Date:** June 22, 2026  
**Goal:** One question — *"What should we cook tonight?"* — answered in under 30 seconds with trustworthy results.

---

## Step 1 — Filter Audit

| Former filter | Decision | Rationale |
|---------------|----------|-----------|
| **Crew size** (raw 4/6/8/10+) | **Keep → simplified buckets** | Maps to scaling + crew-fit ranking (`2–4`, `5–8`, `9–12`, `12+`). Hard exclusion removed; influences portions and score. |
| **Protein** | **Keep (hard)** | Firefighters must never get the wrong protein. Never relaxed in pipeline. |
| **Appliances** | **Keep (hard when selected)** | Empty selection = all common appliances. When selected, recipes requiring unavailable equipment are excluded pre-pick. |
| **Healthiness** (lean / balanced / comfort) | **Keep (soft)** | Tag-based scoring via `nutritionCategory` + comfort/healthy scores. Only preference relaxed when no match. |
| **Allergies** | **Keep (hard)** | Pre-filter on catalog + post-hydrate ingredient scan. Never substituted into results at pick time. |
| **Meal category / Firehall category** | **Remove from UI** | Caused category-broadening drift (game day → comfort, etc.). Can be inferred later from recipe tags. |
| **Tonight vibes** | **Remove** | Duplicated healthiness + category + format in opaque ways. |
| **Time available** | **Remove from UI** | Default `45–60` min backend. Busy-level inferred. Time was causing false negatives. |
| **Cuisine style** | **Remove** | Low confidence filter; defaulted to `any`. |
| **Meal format** | **Remove** | Default `random`. Format forcing caused mismatched titles. |
| **Budget level** | **Remove** | Not reliably tagged in catalog; defaulted to `standard`. |
| **Cooking skill / difficulty** | **Remove** | Not surfaced in old UI consistently; poor metadata coverage. |
| **Popularity / trending** | **Remove** | Editorial only — used in quality score, not user filter. |
| **Season / occasion / meal vibe** | **Remove** | Subjective; caused broadening chain to wander. |
| **Use what we have / pantry** | **Remove** | Out of scope for v1 simplified generator; high false-positive rate. |
| **Vegetarian swap flag** | **Make automatic** | Set when protein = vegetarian. |

---

## Step 2 — Final Filter Architecture (5 inputs)

```
┌─────────────────────────────────────────────────────────┐
│  1. Crew Size      2–4 │ 5–8 │ 9–12 │ 12+              │
│  2. Protein        Chicken … Vegetarian │ Surprise Me   │
│  3. Appliances     Multi-select (optional = all common) │
│  4. Healthiness    🍔 Comfort │ ⚖️ Balanced │ 🥗 Healthy │
│  5. Allergies      Dairy, Gluten, Nuts, Shellfish, Eggs │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              Summary → Find Tonight's Meal
```

**Implementation files**

| Layer | File |
|-------|------|
| Shared types + API mapping | `shared/generator-simplified.ts` |
| Hard/soft matching | `server/generation/generator-match.ts` |
| Pick + hydrate guards | `server/generation/pick-local-recipes.ts` |
| Healthiness-only broadening | `server/generation/local-first-pipeline.ts` |
| One-screen UI | `client/src/components/generator/simplified-generator-form.tsx` |
| Page wiring | `client/src/pages/generator.tsx` |

---

## Ranking Algorithm

Priority order (highest first):

1. **Allergies** — hard exclusion (catalog scan + hydrated ingredient scan)
2. **Protein** — hard requirement
3. **Appliances** — hard when user selects specific equipment
4. **Crew size** — score boost/penalty via `metadata.crewSize`
5. **Healthiness** — score boost via `nutritionCategory` + comfort/healthy scores
6. **Catalog quality** — existing quality score + Golden/Performance bias

**Relaxation policy**

- Only **healthiness** may relax (try `lean` → `balanced` → `comfort` or permutations).
- Never relax protein, allergies, or appliances.
- Client shows `_relaxation_note` when healthiness was softened, e.g.  
  *"We couldn't find a healthy version, so here are the best balanced chicken meals."*

---

## Removed Pipeline Behavior

The old `local-first-pipeline.ts` had 24 broadening attempts relaxing protein, time, category, cuisine, and meal format. That caused the primary trust failures (wrong protein, category drift, "surprise" meals that ignored filters).

New pipeline: **≤ 3 healthiness attempts**, same hard constraints throughout.

---

## QA Results

**Suite:** `npm run test:generator-simplified-qa`  
**Report:** `review/generator-simplification-qa.json`

| Metric | Result |
|--------|--------|
| Combinations tested | **120** |
| Hard-filter pass rate | **100%** (120/120) |
| Protein always correct | ✅ |
| Allergies never violated | ✅ (after hydrated scan fix) |
| Appliance constraints respected | ✅ |
| Healthiness exact match | **4.2%** (soft — by design) |
| Healthiness relaxed | **0** in this run (first attempt always hit) |
| Crew metadata exact fit (2–4 bucket) | **0%** — catalog targets 6–8 servings |

### Edge cases found

1. **Chicken Parmesan + dairy/gluten** — passed catalog pre-filter but failed hydrated scan (cheese in scaled payload). Fixed with post-hydrate allergen rejection in `hydratePick`.
2. **Small crew bucket (2–4)** — most catalog recipes declare `minCrew: 6`. Portions still scale down; metadata should be expanded for small-station recipes over time.
3. **Comfort vs Performance catalog** — Performance 50 skews lean; comfort preference often returns balanced/high-protein meals. Healthiness relaxation messaging will appear when all three healthiness attempts fail exact preference.

---

## Recipes Requiring Metadata Fixes

**Current catalog audit:** `metadataGaps: []` for Golden 100 slugs — equipment, nutritionCategory, crewSize, and protein are populated for approved catalog entries.

**Recommended follow-ups (quality, not blockers):**

- Tag more recipes with `nutritionCategory: comfort` for comfort-slider accuracy
- Add `crewSize` ranges that include `2–4` stations for small halls
- Ensure grill-only recipes declare `equipment: ["grill"]` (currently well-covered)

---

## Validation Results

| Command | Status |
|---------|--------|
| `npx tsc` | ✅ Pass |
| `npm run build` | ✅ Pass |
| `npm run test:generator-simplified-qa` | ✅ 120/120 pass |
| `npm run dev` | ✅ Server starts |

---

## Success Metric

> A firefighter selecting **Chicken + BBQ + Dairy-Free** always receives a chicken recipe cookable on a BBQ with no dairy in the ingredient list.

Verified across QA matrix including `bbq`-only appliance + `dairy` allergen combinations.

---

## UX Notes

- Generator form fits one mobile viewport — compact grid, large touch targets
- Summary block shows all five inputs before generate
- Primary CTA: **Find Tonight's Meal**
- Relaxation note appears above recipe card when healthiness was softened
- Legacy `firehall_filters` localStorage migrates to `firehall_generator_v2`
