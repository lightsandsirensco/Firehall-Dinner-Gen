# Firehall Meals — Master Catalog Audit

**Generated:** 2026-06-04  
**Scope:** All published catalog JSON (391 recipes), approved Explore browse (301), curated store (679), generator/wheel/trending surfaces  
**Method:** Fresh runs of `audit:catalog-duplicates`, `audit:master-recipes --scope=approved`, `audit:meal-image-trust`, `audit:title-dish-identity`, `audit:recipe-nutrition`, `audit-curated-image-governance`, `audit:indexing`, `audit:classics-wheel-full`, `audit-explore-mobile`, plus index aggregation  
**Code changes:** None (report only)

---

## Executive scorecard

| Layer | Verdict | Summary |
|-------|---------|---------|
| **Catalog inventory** | **PASS** | 391 indexed recipes across 7 collections; distribution documented below |
| **Duplicates** | **BLOCKER** | 38 exact + 29 near dupes; 152 same-meal/different-name; smoker/taco/pasta clusters saturated |
| **Titles** | **FIX** | Title↔dish identity gate passes (335/335), but blog-style “for the Crew/Hall”, “Loaded”, and long wheel titles remain |
| **Images** | **BLOCKER** | 48/339 browse heroes fail trust heuristics; 211 duplicate hero paths in curated store |
| **Recipe logic** | **FIX** | 87% Grade A on approved set, but 117 ingredient-alignment failures and 5 Grade D recipes |
| **Nutrition** | **FIX** | 0 missing; 141 suspicious divergences; several post-ingredient-calc under 250 cal |
| **Firehall authenticity** | **FIX** | Strong generator + scaling infra; wheel classics and BBQ cluster weaken “station-real” trust |
| **SEO** | **FIX** | Sitemap OK; 19 orphan URLs; meta/canonical uniqueness needs work |
| **Mobile UX** | **PASS** | Explore grid 301 recipes OK at 390px; homepage/wheel still cluttered (see trust audit) |

### Overall catalog trust: **FIX** (not BLOCKER — site is usable; library trust not yet “best online”)

**P0 before growth:** duplicate heroes, exact duplicate recipes, Grade D + image-fail overlap, classics wheel content, pulled-pork/breakfast-hash clusters.  
**P1:** ingredient-step alignment, nutrition recalibration, title humanization sweep, SEO orphans.  
**P2:** Vision QA on heroes, explore draft imagery, analytics/search.

---

## Phase 1 — Catalog inventory

### Totals

| Corpus | Count | Notes |
|--------|------:|-------|
| **Catalog page JSON** (all collections) | **391** | Source of truth for `/recipes`, breakfast, BBQ, hall pages |
| **Approved Explore / Recipes browse** | **301** | `audit-approved-recipe-data-routes` |
| **Master recipe audit (approved scope)** | **343** | Superset of browse + linked performance/breakfast routes |
| **Curated store (incl. drafts)** | **679** | `audit-curated-image-governance` — includes unpublished Explore rows |
| **Sitemap recipe URLs** | **331** | `audit:indexing` |
| **Explore production eligible** | **312** | `review/explore-production-audit.md` |

### By collection

| Collection | Recipes |
|------------|--------:|
| Golden 100 | 111 |
| Hall expansion | 83 |
| Breakfast | 65–70 |
| BBQ | 55 |
| Performance meals | 50 |
| Pizza night | 12–20 |
| Smoothies | 10 |

### By protein (indexed catalog)

| Protein | ~Count |
|---------|-------:|
| Chicken | 102 |
| Beef | 81 |
| Unknown / untagged | 65 |
| Pork | 61 |
| Vegetarian | 24 |
| Turkey | 14 |
| Seafood / fish / shrimp | ~20 |

### By cuisine (top)

| Cuisine | ~Count |
|---------|-------:|
| American | 132+ |
| Italian | 36+ |
| Mexican | 21+ |
| Mediterranean / Cajun / Japanese | 5–7 each |

### By meal format / type (tag-derived)

| Format | ~Count |
|--------|-------:|
| Grill / BBQ / smoker | 47+ |
| Pizza | 28 |
| Bowl | 25 |
| Pasta | 21 |
| Sheet pan | 18 |
| Skillet | 16 |
| Sandwich / handheld | 29+ |
| Bar / line spreads | 14+ |
| Soup / chili / stew | 17+ |
| One-pot | 5+ (under-tagged; many skillets are de facto one-pot) |

### By difficulty

| Difficulty | ~Count |
|------------|-------:|
| Medium | 191 |
| Easy | 95 |
| Hard | 33 |
| Unknown | 75 |

### By cook time

| Bucket | ~Count |
|--------|-------:|
| Under 30 min | 162 |
| 30–60 min | 123 |
| Over 60 min | 109 |

### Overrepresented (saturation)

From `review/duplicate-report.json`:

1. **Smoker-forward meals — 90** (entire BBQ catalog + overlapping golden/hall smoke)
2. **Taco / burrito / enchilada — 27**
3. **Soup / chili / stew — 26**
4. **Sandwich / hoagie — 25**
5. **Pasta red sauce — 20**
6. **Creamy chicken pasta — 19**
7. **Breakfast hash / skillet — 19**
8. **BBQ chicken variants — 18**

**Reject new variants until consolidated:** +10 chicken rice bowls, +19 creamy chicken pasta, +27 tacos, +4 sheet-pan chicken, +7 burger topping variants.

### Underrepresented / gaps

| Gap | Status |
|-----|--------|
| **Rookie-friendly** (target 3 in Golden) | Only **3** tagged — need 5–8 real “first shift” meals with extra hand-holding |
| **One-pot / Dutch oven** | Few explicit tags; hall has chili/goulash but not “station stew” depth |
| **Handheld / wraps / pitas** | Recently improved (6 hall wraps); still thin vs 25+ sandwich archetype count |
| **Performance meals** | 50 exist but overlap golden bowls/skillets |
| **Canadian station classics** | Donair, poutine breakfast exist; missing **peameal bacon**, **tourtière**, **split pea soup**, **butter tarts** (if brand fits) |
| **Fish & chips / Friday fish** | Weak vs chicken/pork volume |
| **Sloppy joes / hot dogs / chili dogs** | Missing obvious hall feeders |
| **Proper chicken noodle** | Dumplings fixed; thin noodle soup lane still open |

---

## Phase 2 — Duplicate audit

### Summary (`review/duplicate-report.json`)

| Tier | Recipes affected | Pairs |
|------|-----------------:|------:|
| **P0 — EXACT_DUPLICATE** | **38** | Same meal, should merge or unpublish one |
| **P1 — NEAR_DUPLICATE** | **29** | Sauce/regional variant only |
| **P2 — SAME_MEAL_DIFFERENT_NAME** | **152** | Same user outcome, different title |
| **UNIQUE** | **172** | — |

### P0 examples (consolidate)

| Slug A | Slug B | Issue |
|--------|--------|-------|
| `alabama-white-sauce-pulled-pork` | `memphis-dry-rub-pulled-pork` | Regional pulled pork ×4+ in BBQ alone |
| `bacon-egg-hash` | `bacon-egg-hash-skillet` | Same breakfast hash |
| `beef-broccoli` | `lean-beef-broccoli-rice` | Bowl vs stir-fry duplicate |
| `big-chili` | `sunday-chili-batch` | Chili batch twins |
| `biscuits-gravy` | `hall-sausage-biscuits-gravy` | Biscuit gravy overlap |
| `chicken-caesar` | `chicken-caesar-wraps` | Salad vs wrap (acceptable **if** images/instructions diverge — currently hero donors overlap) |
| `italian-sausage-veg-sheet-pan` | `sheet-pan-sausage-peppers` | Same sausage/peppers outcome |
| `garlic-butter-shrimp` | `garlic-butter-shrimp-skewers` | Shrimp duplicate |

### P1 examples

- Kansas City vs Memphis vs Carolina **pulled pork** network (6+ slugs)
- **Hall breakfast burritos** vs chorizo/bacon hash burritos
- **Chicken fajitas** sheet-pan vs lite vs hall cast-iron

### P2 clusters (consolidation recommendations)

1. **Pulled pork network** → 1 “Pulled Pork Sandwiches” + 1 optional “Regional BBQ Pork (choose sauce)” bar page  
2. **Breakfast hash/skillet** → 3 max: meat hash, veggie hash, cast-iron full English  
3. **Chicken rice bowls** → cap at 4 (Cajun, Greek, BBQ, one Asian)  
4. **Creamy chicken pasta** → cap at 5 (Alfredo, parm, Tuscan, BBQ mac, one baked)  
5. **Taco/burrito bar** → 1 taco bar + 1 burrito bar; demote redundant enchilada skillets  
6. **Smoked “for the Crew” BBQ pages** → merge into BBQ catalog with single hero per protein  

---

## Phase 3 — Title audit

### Automated gates

| Gate | Result |
|------|--------|
| `audit:title-dish-identity` | **335/335 PASS** |
| Template language scan | **0 hits** on 324 recipes |
| Human realism rewrites (prior) | **66** titles already simplified (`review/recipe-title-human-realism-report.md`) |

### Remaining title issues (manual / heuristic)

| Pattern | Risk | Examples |
|---------|------|----------|
| **“for the Crew” / “for the Hall”** | Blog SEO, not hall speech | 40+ BBQ/hall/breakfast titles |
| **“Loaded”** | Food-blog filler | Loaded nacho bar, loaded potato skins (hall index) |
| **Long wheel titles** | Not scannable on mobile | “Double Smash Burgers with Caramelized Onions & Dirty Sauce” (fixed in data to shorter display in places; wheel audit still sees old structure) |
| **“Giant Batch”** | Unrealistic station naming | `Giant Batch Lasagna` in hall index |
| **Competition / Performance** | Not how crews name meals | `Competition BBQ Chicken Thighs` |
| **9+ word titles** | Card truncation | Several breakfast “for the Crew” variants |

### Good vs bad (catalog samples)

| GOOD (keep) | BAD (rewrite) |
|-------------|----------------|
| Chicken Parmesan | Giant Batch Lasagna |
| Taco Bar | Loaded Game Day Nachos (→ Game Day Nachos) |
| Beef Dip Sandwiches | Alabama White Sauce Pulled Pork (→ Pulled Pork, Alabama White Sauce) |
| Firehall Chili | Tonkotsu Ramen for the Crew (→ Tonkotsu Ramen) |
| Chicken and Dumplings | High-Protein Turkey Chili (→ Turkey Chili) |

---

## Phase 4 — Image trust audit

### Browse heroes (`review/meal-image-trust-audit.json`)

| Metric | Value |
|--------|------:|
| Audited | 339 |
| **PASS** | **291 (86%)** |
| **FAIL** | **48 (14%)** |
| Vision QA | Disabled (heuristic only) |

### Curated store (`review/curated-image-governance-report.md`)

| Metric | Value |
|--------|------:|
| Recipes | 679 |
| Governance failures | 71 |
| **Duplicate hero paths** | **211** |
| Build blockers (score ≥72) | 0 |

### Severity model

| Tier | Meaning | Examples |
|------|---------|----------|
| **P0** | Wrong meal | Curry without rice for tikka/butter chicken; Caesar whole breast not chopped salad |
| **P1** | Right category, wrong dish | Donor heroes: wrap uses salad image; shawarma uses bar-night spread |
| **P2** | Generic / duplicate | Same `baked-ziti.jpg` across 3+ slugs; beef-broccoli hero shared with sheet-pan steak |

### P0 / P1 fails (sample)

- `chicken-caesar` — hero must show chopped grilled chicken in salad  
- `butter-chicken`, `chicken-tikka-masala` — rice not visible (curry_fail)  
- `jerk-chicken` — rice and peas not in hero metadata  
- `cajun-chicken-rice-bowl` — generic bowl path  
- `pasta-e-ceci-for-the-hall` — title component mismatch in path  

### Surface coverage

| Surface | Status |
|---------|--------|
| Hero | 48 fails + 211 duplicate paths |
| Card / thumb | Tied to hero duplicates |
| Explore grid | OK layout; inherits wrong hero |
| Generator | Uses generation pipeline — separate from catalog heroes |
| Recently Added | Same catalog entries |
| Wheel | **0/10 pass** detail standard (`review/classics-wheel-audit.md`) — images OK, copy structure fail |

### Missing images

- Explore: **61 draft rows** still need imagery (non-blocking if unpublished)  
- Approved browse: **0 missing heroes** per `stage5-validate-platform`

---

## Phase 5 — Recipe logic audit

### Master recipe audit — approved 343 (`review/master-recipe-audit.md`)

| Grade | Count | % |
|-------|------:|--:|
| **A** | 298 | 87% |
| **B** | 40 | 12% |
| **C** | 0 | 0% |
| **D** | 5 | 1% |

### Phase failure counts

| Phase | Failures |
|-------|--------:|
| Ingredient alignment (P3) | **117** |
| Step detail (P5) | **105** |
| Recipe completeness (P8) | **51** |
| Core content quality (P9) | **15** |
| Beginner-proof (P4) | **12** |
| Spelling / AI wording (P1) | **24** |
| Image metadata (P7) | **5** |
| Title accuracy (P2) | **0** |
| Protein realism (P6) | **0** |

### Grade D — rewrite before trust marketing

| Slug | Title | Blocking issues |
|------|-------|-----------------|
| `butter-chicken` | Butter Chicken | Missing serve step detail; rice not in hero |
| `cajun-chicken-rice-bowl` | Cajun Chicken and Rice | Vague bowl step; generic hero |
| `chicken-caesar` | Chicken Caesar Salad | Unused bacon/oil; AI “no heat”; wrong hero spec |
| `chicken-tikka-masala` | Chicken Tikka Masala | Vague masala step; rice hero fail |
| `jerk-chicken` | Jerk Chicken & Rice and Peas | Unused slaw; missing grill detail; sides not in hero |

### Firehall scaling

- Canonical crew sizes **4 / 6 / 8 / 10 / 14** enforced in policy  
- `audit-recipe-portion-scaling` — 334 pages scanned, fixes applied in prior sprints  
- **Crew scaling audit** — see `review/crew-scaling-audit.md` for edge cases  

### Verdict

| Tier | Count estimate |
|------|----------------|
| **P0 — cannot cook as written** | **≤5** (Grade D + historic soup mislabels — dumplings **fixed** 2026-06-04) |
| **P1 — missing steps / unused ingredients** | **~120** |
| **P2 — could improve** | **~180** |

---

## Phase 6 — Nutrition audit

Source: `review/recipe-nutrition-audit-report.md` (379 scanned)

| Check | Result |
|-------|--------|
| Missing nutrition | **0** |
| Zero calorie | **0** |
| **Suspicious / divergent** | **141** |
| Clean | **359** |

### Issue types

1. **Under 250 cal/serving** for full meals (ribs, wings, French onion, hall BBQ after ingredient recalc)  
2. **Large before/after swing** when recalculated from ingredients (e.g. `chicken-wing-bar-night` 490→216)  
3. **Implausible protein** — fewer than 10 flagged >80g; watch performance “protein pasta”  

### P0 nutrition

None at 0 cal. **P1:** any browse meal under 200 cal with protein <15g. **P2:** align displayed macros with `calculateNutritionFromIngredients` for 141 slugs.

---

## Phase 7 — Firehall authenticity audit

Scoring model (1–10): composite of grade, image pass, duplicate tier, call-interruption language, crew scale, and title humanism.

| Band | Score | ~Recipes | Characteristics |
|------|------:|----------|-----------------|
| Station-ready | **8–10** | ~90–120 | Grade A, image pass, hand packs, hold steps (recent hall/golden batches) |
| Credible | **6–7** | ~180 | Grade A/B, minor dupes or thin steps |
| Weak | **4–5** | ~80 | Near dupes, donor images, “for the Crew” titles |
| Trust risk | **1–3** | ~15 | Grade D, exact dupes, wrong hero |

### Wheel classics (brand anchor) — authenticity **4/10**

All **10/10 wheel segments fail** detail standard: &lt;10 steps, unstructured `tonightSpread`, missing call-interruption step, banned phrases on pulled pork.

### Questions (sample)

| Question | Answer |
|----------|--------|
| Would firefighters cook this? | **Yes** for ~70% of golden/hall core; **maybe** for niche ramen/pho bars |
| Appear at a station? | **Yes** for chili, burgers, tacos, BBQ; **less** for “Competition BBQ” naming |
| Feed 4–14? | **Yes** — scaling infra is a strength |
| Rookie suggest? | **Only** 3 rookie-tagged meals — gap |
| Survive interrupted calls? | **Inconsistent** — new packs good; wheel/breakfast weak |

---

## Phase 8 — SEO audit

Source: `review/indexing-audit.md`

| Check | Status |
|-------|--------|
| Sitemap / robots | PASS |
| Recipes in sitemap | 331 PASS |
| **Unique title + meta + canonical** | **NEEDS WORK** |
| **Internal discoverability** | **NEEDS WORK** |
| Orphan URLs | **19** |
| Guide URLs | 58 indexed, 62 in sitemap |

### Cannibalization risks

- **Pulled pork** ×6+ slugs targeting “pulled pork sandwiches”  
- **Chicken fajitas** ×4  
- **Chili** ×5+ (big chili, turkey chili, hall chili, BBQ chili variants)  
- **Breakfast hash** ×5+  

### Keyword gaps

- Firefighter **meal prep** / **shift dinner** long-tail under-served vs “BBQ” volume  
- **Canadian** station terms (peameal, donair done; poutine partial)  
- **Rookie** / **probationary cook** intent barely covered  

---

## Phase 9 — Mobile experience audit

| Surface | Verdict | Notes |
|---------|---------|-------|
| Explore grid | **PASS** | 301 recipes, 390×844 OK (`audit-explore-mobile`) |
| Recipe pages | **PASS** layout / **FIX** content | Long titles on breakfast; nutrition edge cases |
| Generator | **PASS** | Documented in `review/firehall-trust-audit.md` |
| Wheel | **FIX** | 0/10 content standard; `/wheel` vs `/classics-wheel` confusion |
| Breakfast / performance | **FIX** | “for the Crew” truncation; crowded cards |
| Blog / guides | **PASS** | 58 guides; SEO orphans need linking |

### Homepage trust (`review/firehall-trust-audit.md`)

- Too many duplicate CTAs before food  
- Multiple rails repeat Explore  
- Hero vs nav wheel path mismatch  

---

## Phase 10 — Final scorecard & actions

### Catalog-wide

| Area | PASS | FIX | BLOCKER |
|------|:----:|:---:|:-------:|
| Inventory & routing | ✓ | | |
| Duplicates | | ✓ | ✓ |
| Titles | | ✓ | |
| Images | | ✓ | ✓ |
| Recipe logic | | ✓ | |
| Nutrition | | ✓ | |
| Authenticity (wheel) | | ✓ | |
| SEO | | ✓ | |
| Mobile layout | ✓ | ✓ | |

---

### 1. Top 25 strongest recipes

*Grade A, zero audit issues, image trust pass — station-ready anchors.*

1. `batch-lasagna` — Batch Lasagna  
2. `bbq-brisket-burnt-ends` — BBQ Brisket Burnt Ends  
3. `best-tuna-melt-for-the-hall` — Best Tuna Melt for the Hall  
4. `chicken-tortilla-soup-for-the-hall` — Chicken Tortilla Soup for the Hall  
5. `chicken-shawarma-pitas` — Chicken Shawarma Pitas  
6. `french-onion-soup-for-the-hall` — French Onion Soup for the Hall  
7. `five-ingredient-pasta` — Five-Ingredient Pasta  
8. `firehall-donair-platter` — Firehall Donair Platter  
9. `game-day-pizza-sliders` — Game Day Pizza Sliders  
10. `hall-blt-sandwich-feed` — Hall BLT Sandwich Feed  
11. `mac-and-cheese-bake` — Baked Mac and Cheese *(image metadata FIX, recipe strong)*  
12. `meatball-hoagies` — Meatball Hoagies  
13. `memphis-dry-rub-ribs` — Memphis Dry Rub Ribs  
14. `philly-cheesesteak-skillet` — Philly Cheesesteak Skillet  
15. `pork-carnitas-tacos` — Pork Carnitas Tacos  
16. `red-beans-and-rice-for-the-hall` — Red Beans and Rice for the Hall  
17. `sausage-peppers-on-buns` — Sausage & Peppers on Buns  
18. `smash-burgers` — Double Smash Burgers *(content B, brand anchor)*  
19. `spaghetti-aglio-e-olio-for-the-hall` — Spaghetti Aglio e Olio for the Hall  
20. `steak-tacos` — Steak Tacos  
21. `chicken-pot-pie` — Chicken Pot Pie  
22. `chicken-dumpling-soup` — Chicken and Dumplings *(rewritten 2026-06-04)*  
23. `buffalo-chicken-dip` — Buffalo Chicken Dip  
24. `cedar-plank-salmon` — Cedar Plank Salmon  
25. `jambalaya` — Jambalaya  

---

### 2. Top 25 weakest recipes

*Grade D, high issue count, image fail, or exact duplicate.*

1. `chicken-caesar` — salad/hero/ingredient misalignment  
2. `jerk-chicken` — sides + slaw + hero  
3. `butter-chicken` — steps + rice hero  
4. `chicken-tikka-masala` — steps + rice hero  
5. `cajun-chicken-rice-bowl` — generic bowl + vague steps  
6. `alabama-white-sauce-pulled-pork` — exact dup cluster  
7. `memphis-dry-rub-pulled-pork` — exact dup cluster  
8. `bacon-egg-hash` / `bacon-egg-hash-skillet` — breakfast dup pair  
9. `beef-broccoli` / `lean-beef-broccoli-rice` — dup pair  
10. `big-chili` / `sunday-chili-batch` — dup pair  
11. `tonkotsu-ramen-crew` — 5 issues, niche for hall  
12. `bagel-lox-breakfast-board` — unused ingredients  
13. `bun-bo-hue-noodle-soup` — complexity vs station realism  
14. `hall-burger-bar` — overlaps slider/smash cluster  
15. `competition-bbq-chicken-thighs` — title + overlap  
16. `garlic-butter-shrimp` / `garlic-butter-shrimp-skewers` — dup  
17. `italian-sausage-veg-sheet-pan` — dup with sausage-peppers  
18. `chicken-caesar-wraps` — near dupe of caesar + donor image  
19. `buffalo-chicken-wraps` — donor dip image  
20. `kielbasa-cabbage-potato-skillet` — nutrition collapse on recalc  
21. `molasses-bourbon-pork-ribs` — nutrition suspicious  
22. `pork-belly-burnt-ends` — nutrition suspicious  
23. `french-onion-soup-for-the-hall` — low cal display  
24. `smoked-wings-white-sauce` — low cal display  
25. `beef-barley-soup` — prior mislabel risk; verify post-sprint (still Grade B issues)  

---

### 3. Recipes to remove (unpublish or merge)

**Do not delete slugs blindly — merge or 301 redirect.**

| Action | Slugs |
|--------|-------|
| Merge into one pulled pork | `alabama-white-sauce-pulled-pork`, `carolina-vinegar-pulled-pork`, `kansas-city-pulled-pork-sandwiches`, keep `pulled-pork` + 1 regional optional |
| Merge breakfast hash | `bacon-egg-hash` OR `bacon-egg-hash-skillet` (keep one) |
| Merge shrimp | `garlic-butter-shrimp` OR `garlic-butter-shrimp-skewers` |
| Merge biscuits | `biscuits-gravy` vs `hall-sausage-biscuits-gravy` (different protein — keep both but **different heroes**) |
| Demote from browse | Niche bar meals with fail audits: `tonkotsu-ramen-crew`, `miso-ramen-bar`, `build-your-own-pho-bar` until rewritten |

---

### 4. Recipes to rewrite (priority)

1. All **Grade D** (5)  
2. All **classics wheel** segments (10)  
3. **P0 image fail** list (48) — instructions + regenerate heroes  
4. **Breakfast “for the Crew”** batch — shorten titles, align steps  
5. **Pulled pork BBQ catalog** — one base recipe, regional modifiers as notes not new pages  

---

### 5. Images to replace (priority)

1. Grade D + image fail overlap (caesar, tikka, butter chicken, jerk, cajun bowl)  
2. All **211 duplicate hero** secondaries — unique hero per slug  
3. Handheld batch donors (wraps, gyros, buffalo wrap)  
4. Complete meals needing **platter-wide** metadata (mac and cheese, meatloaf, sausage-peppers, dumplings)  
5. Enable **vision QA** pass on top 100 traffic slugs  

---

### 6. Duplicate recipes to merge

See Phase 2 — prioritize **pulled pork**, **breakfast hash**, **chili**, **chicken fajitas**, **garlic shrimp**, **beef-broccoli**, **caesar salad/wrap** (keep both only with distinct heroes and formats).

---

### 7. Missing recipe categories

- Sloppy joes / chili dogs  
- Fish and chips / beer-battered fish night  
- Peameal bacon on a bun (Canadian)  
- Chicken noodle soup (brothy, distinct from dumplings)  
- Baked spaghetti / million-dollar spaghetti  
- Stromboli / calzone night  
- More **true** rookie meals (scrambled eggs bulk, grilled cheese batch, pasta with jar sauce done right)  
- **Intervention/hold** language standardized on all A-list meals  

---

### 8. Best next 25 recipes to add

*Opposite of saturation; high station recognition.*

1. Sloppy Joe Feed  
2. Fish and Chips for the Hall  
3. Peameal on a Kaiser  
4. Chicken Noodle Soup (clear broth)  
5. Hot Dog Bar  
6. Chili Cheese Dogs  
7. Baked Spaghetti for the Crew  
8. French Dip (single canonical; fix `beef-dip` title drift)  
9. Monte Cristo (breakfast-for-dinner)  
10. Reuben Sandwiches  
11. Chicken Fried Steak  
12. Pot Roast (one-pot)  
13. Split Pea Soup + Ham  
14. Tourtière (December hall tradition)  
15. Breakfast Burrito **one** canonical (merge existing)  
16. Egg and Cheese Sandwich Tray  
17. Grilled Cheese + Tomato Soup (merge with existing tomato soup)  
18. Pork Tenderloin Sandwiches  
19. Italian Beef (Chicago-style)  
20. White Chicken Chili (distinct from beef chili)  
21. Cornbread + Chili night (combo page)  
22. Rookie: One-Pot Butter Noodles  
23. Rookie: Oven Bacon Sheet  
24. Rookie: “First Shift” Spaghetti and Meatballs  
25. Post-call **Grilled Cheese Night** (minimal ingredients)  

---

### 9. Homepage trust issues

- Reduce duplicate “Find a Meal” CTAs to **one primary**  
- Show **food first** (hero recipe cards with real heroes, not icons)  
- Unify wheel entry: `/classics-wheel` vs `/wheel`  
- Surface **trust badges** (crew scaling, interruption hold, Canadian groceries) above fold  
- Link **top 10 PASS** meals directly — not only rails that repeat Explore  

---

### 10. Mobile trust issues

- Truncate long titles on cards (breakfast “for the Crew”)  
- Fix nutrition **0** display guard on all catalog pages (per prior sprint — verify)  
- Add **Save** on catalog recipe pages (still missing per trust audit)  
- Wheel: pass full recipe detail standard or label “Quick pick” vs “Full recipe”  
- Explore: reduce filter chip crowding on 390px  

---

## FIREHALL MEALS 2.0 ROADMAP

### P0 — Must fix before growth

| # | Initiative | Impact |
|---|------------|--------|
| 1 | **Duplicate hero eradication** — 211 paths → 1:1 slug:hero | Instant visual trust |
| 2 | **Merge 38 exact duplicate recipes** | SEO + browse clarity |
| 3 | **Fix Grade D + 48 image fails** | Stop misleading first impressions |
| 4 | **Classics wheel rewrite** (10/10) — steps, hold, tonightSpread | Brand anchor trust |
| 5 | **Pulled pork + breakfast hash consolidation** | Biggest P2 cluster removal |
| 6 | **Nutrition recalc for 141 suspicious** | Macro credibility |
| 7 | **Catalog save button + nutrition zero guard** | Workflow trust |

### P1 — High value

| # | Initiative | Impact |
|---|------------|--------|
| 8 | Title humanization sweep (“for the Crew”, “Loaded”) | Sounds like a hall |
| 9 | Ingredient-step alignment (117 failures) | Cookability |
| 10 | Vision QA on top 100 slugs | Image P0/P1 detection |
| 11 | SEO orphan fix + canonical uniqueness | Indexing |
| 12 | Rookie-friendly expansion (5–8 meals) | Onboarding |
| 13 | Handheld hero regeneration (wraps, pitas, gyros) | Meal ID in 2 sec |
| 14 | Saturation caps — no new taco/pasta/bowl without sunset | Catalog discipline |
| 15 | Add **next 25** gap list (sloppy joe, fish chips, etc.) | Coverage |

### P2 — Future enhancements

| # | Initiative | Impact |
|---|------------|--------|
| 16 | Global search + analytics | Discoverability ops |
| 17 | Hall Vote analytics | Product learning |
| 18 | Explore draft imagery (61 rows) | Full 679 publish |
| 19 | Authenticity score on card (1–10) | Transparency |
| 20 | User-reported “wrong photo” on recipe page | Trust loop |

---

## Source reports (regenerated 2026-06-04)

| Report | Path |
|--------|------|
| Duplicate audit | `review/duplicate-report.json` |
| Master recipe audit | `review/master-recipe-audit.json`, `.md` |
| Meal image trust | `review/meal-image-trust-audit.json` |
| Image governance | `review/curated-image-governance-report.md` |
| Nutrition | `review/recipe-nutrition-audit-report.md` |
| Title identity | `review/title-dish-identity-audit.json` |
| SEO indexing | `review/indexing-audit.md` |
| Classics wheel | `review/classics-wheel-audit.md` |
| Explore mobile | `review/mobile-explore-verification.md` |
| Site trust (UX) | `review/firehall-trust-audit.md` |
| Title humanism | `review/recipe-title-human-realism-report.md` |

---

*End of master catalog audit — no repository recipe/catalog files were modified.*
