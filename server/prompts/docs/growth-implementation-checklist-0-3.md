# Growth Implementation Checklist — Steps 0–3

**Scope:** Foundation libs + Hall Vote funnel (no Share Cards).  
**Source:** Growth architecture (Steps 0–3).  
**Goal:** Smallest safe commits, fast verification, easy rollback.

---

## Overview

| Step | Theme | Commits (suggested) | Total difficulty |
|------|--------|---------------------|------------------|
| **0** | Foundation libs + baseline analytics | 4 | S–M |
| **1** | CTA hierarchy + sticky + no auto-scroll | 3–4 | M |
| **2** | Modal analytics + native URL share + copy | 3 | M |
| **3** | Winner → home handoff | 2–3 | M |

**Prerequisite:** `npm run dev` works locally (sql.js, not better-sqlite3).

---

## Step 0 — Foundation (`product-analytics`, `native-share`, `post-meal-ritual`)

### Purpose
Shared utilities with **zero UX change** (except optional passive `hall_vote_page_viewed` on vote route). Establishes GA baseline before funnel edits.

### Dependencies
- None (only existing `client/src/lib/analytics.ts` → `trackEvent` / gtag).

### Order of operations

| Order | Commit | What |
|-------|--------|------|
| 0.1 | `feat(growth): add product-analytics helpers` | New file only |
| 0.2 | `feat(growth): add native-share helpers` | New file only |
| 0.3 | `feat(growth): add post-meal-ritual state helpers` | New file only |
| 0.4 | `chore(growth): wire vote page view analytics` | One line in `vote.tsx` |

Do **not** wire Hall Vote UI events in Step 0 — avoids noise while Step 1 changes layout.

---

### Commit 0.1 — `product-analytics.ts`

**Create**
| File | Action |
|------|--------|
| `client/src/lib/product-analytics.ts` | Create |

**Modify**
| File | Action |
|------|--------|
| None | — |

**Contents (contract only, no code here)**
- Re-export or wrap `trackEvent` from `analytics.ts`.
- `hashId(id: string): string` — truncate/hash for GA params.
- `trackHallVote(event, params)` — all 16 Hall Vote event names from PRD.
- `trackShareCard(event, params)` — stub implementations OK (no callers yet); prevents duplicate file later.

**Difficulty:** S  
**Verify:** `npm run check` passes; import in a temp line removed before commit OR wire only `vote.tsx` in 0.4.

**Test**
- [ ] TypeScript compiles.
- [ ] In browser console (dev): call one `trackHallVote` from a temporary `useEffect` on `/` → confirm gtag event in GA DebugView (optional).

**Rollback:** Delete one file; zero behavior change if unwired.

---

### Commit 0.2 — `native-share.ts`

**Create**
| File | Action |
|------|--------|
| `client/src/lib/native-share.ts` | Create |

**Modify**
| File | Action |
|------|--------|
| None | — |

**Contents (contract)**
- `canShareFiles(): boolean`
- `shareTextAndUrl({ title, text, url })` → `'shared' | 'aborted' | 'unsupported'`
- `sharePngFile(file, meta)` → same (for Share Cards later; implement now)
- `downloadBlob(blob, filename)`
- `AbortError` → `'aborted'`, no throw to caller

**Difficulty:** S  
**Verify:** `npm run check`; manual test in browser console optional.

**Test**
- [ ] Unit-testable pure branches mocked; or manual invoke from dev-only button (remove before merge).

**Rollback:** Delete file; no imports yet.

---

### Commit 0.3 — `post-meal-ritual.ts`

**Create**
| File | Action |
|------|--------|
| `client/src/lib/post-meal-ritual.ts` | Create |

**Modify**
| File | Action |
|------|--------|
| None | — |

**Contents (contract)**
- `RitualMode`: `'hidden' | 'single_meal' | 'vote_primary'`
- `countRealMeals(recipes, mealHistory)` — exclude `_id === 'hall-vote-try-another'`
- `getRitualMode({ userGenCount, realMealCount, hasRecipe })`
- `STORAGE_KEYS`: `hall_vote_used_before`
- `markHallVoteUsed()`, `hasUsedHallVoteBefore()`

**Difficulty:** S  
**Verify:** `npm run check`.

**Test**
- [ ] Quick node/tsx scratch or component test: `getRitualMode` returns expected modes for (0,0), (1,1), (1,2) inputs.

**Rollback:** Delete file.

---

### Commit 0.4 — Baseline vote page analytics

**Create**
| File | Action |
|------|--------|
| None | — |

**Modify**
| File | Action |
|------|--------|
| `client/src/pages/vote.tsx` | Import `trackHallVote`; fire `hall_vote_page_viewed` once on mount when `voteId` known |

**Difficulty:** S  
**Verify**
- [ ] Open `/vote/{validId}` → single GA event (not double on poll refresh).
- [ ] `npm run dev` unchanged otherwise.

**Rollback:** Revert `vote.tsx` hunk only.

---

## Step 1 — Hall Vote CTA hierarchy (no auto-scroll, sticky, primary when 2+ meals)

### Purpose
Product-visible funnel changes without modal/API changes.

### Dependencies
- **Step 0.3** complete (`post-meal-ritual.ts`).
- **Step 0.1** optional for this step (analytics wired in Step 2).

### Order of operations

| Order | Commit | What |
|-------|--------|------|
| 1.1 | `fix(hall-vote): remove post-generation auto-scroll` | `home.tsx` only |
| 1.2 | `feat(hall-vote): ritual mode wiring on home` | `home.tsx` computes mode + realMealCount |
| 1.3 | `feat(hall-vote): promo banner primary variant` | `hall-vote-promo-banner.tsx` |
| 1.4 | `feat(hall-vote): sticky Hall Vote on mobile bar` | `filter-panel.tsx` + `home.tsx` props |

Commits 1.1 and 1.2 can be one commit if preferred; **keep 1.1 separate** for easiest debug (“scroll bug” vs “CTA bug”).

---

### Commit 1.1 — Remove auto-scroll

**Modify**
| File | Action |
|------|--------|
| `client/src/pages/home.tsx` | Remove block `totalGens === 1` → `hallVoteBannerRef.scrollIntoView` (~lines 384–388) |
| `client/src/pages/home.tsx` | Optional: remove `hallVoteScrollDoneRef` if unused |

**Do not modify yet**
- Banner, GenerateButtons, modal.

**Difficulty:** S  
**Verify**
- [ ] Generate first meal → page scrolls to **recipe**, not banner.
- [ ] Hall Vote banner still visible below recipe when scrolling.

**Test**
- [ ] Mobile width 390px: first generation scroll target = recipe card.
- [ ] Second generation: no unexpected scroll.

**Rollback:** Low risk — restore scroll block.

---

### Commit 1.2 — Ritual mode on home

**Modify**
| File | Action |
|------|--------|
| `client/src/pages/home.tsx` | Import `getRitualMode`, `countRealMeals` |
| `client/src/pages/home.tsx` | Compute `realMealCount` from `mealHistoryRef` + filter try-another |
| `client/src/pages/home.tsx` | `ritualMode = getRitualMode({ userGenCount, realMealCount, hasRecipe: !!recipe })` |
| `client/src/pages/home.tsx` | Pass `ritualMode` to `ResultsPanel` / `FilterPanel` / mobile bar (add props) |

**Difficulty:** M  
**Verify**
- [ ] `userGenCount === 0` → no banner (`showHallVotePrompt` unchanged logic OK).
- [ ] After 1st gen, 1 meal → mode `single_meal` (log in dev only until UI uses it).

**Test**
- [ ] Dev-only: `console.log(ritualMode, realMealCount)` after 1 and 2 generations — remove before merge or guard with `import.meta.env.DEV`.

**Rollback:** Revert props; home behaves as before 1.2.

---

### Commit 1.3 — Promo banner variant

**Modify**
| File | Action |
|------|--------|
| `client/src/components/hall-vote-promo-banner.tsx` | Add prop `variant?: 'default' | 'primary'` (or `ritualMode`) |
| `client/src/components/hall-vote-promo-banner.tsx` | When primary: `btn-generate` on Start button; stronger border/shadow |
| `client/src/components/hall-vote-promo-banner.tsx` | Subline uses `optionCount >= 2` copy from PRD |
| `client/src/pages/home.tsx` | Pass variant from `ritualMode === 'vote_primary'` |

**Difficulty:** M  
**Verify**
- [ ] 1 meal: banner secondary styling.
- [ ] 2+ meals (two Different Meal clicks): Start Hall Vote looks primary.

**Test**
- [ ] `data-testid="button-start-hall-vote"` visible and clickable.
- [ ] Visual check desktop + mobile.

**Rollback:** Banner reverts to single style.

---

### Commit 1.4 — Sticky Hall Vote button

**Modify**
| File | Action |
|------|--------|
| `client/src/components/filter-panel.tsx` | Extend `GenerateButtons` props: `ritualMode`, `onHallVoteClick`, `showHallVote` |
| `client/src/components/filter-panel.tsx` | When `hasRecipe && showHallVote`: render second button `data-testid="button-sticky-hall-vote"` |
| `client/src/components/filter-panel.tsx` | Button order: if `vote_primary` → Hall Vote first (primary), Different Meal outline; else inverse |
| `client/src/pages/home.tsx` | Pass `onHallVoteClick`, `ritualMode`, `showHallVote={showHallVotePrompt}` to `FilterPanel` and fixed mobile `GenerateButtons` (~line 750) |

**Difficulty:** M  
**Verify**
- [ ] Mobile: sticky bar shows Hall Vote after first successful gen.
- [ ] Tapping opens existing `HallVoteModal` (no modal changes yet).
- [ ] Desktop: `GenerateButtons` in sidebar (`hidden lg:flex`) gets same props if desired — match PRD (mobile sticky is P0).

**Test**
- [ ] `userGenCount >= 1` + recipe visible → sticky Hall Vote present.
- [ ] Loading state disables both buttons.
- [ ] No duplicate Hall Vote buttons broken on desktop (document: sidebar may only show Different Meal until desktop parity — acceptable shortcut).

**Rollback:** Remove props + second button; single Different Meal only.

**Rollback risk (medium):** Sticky bar height changes — verify recipe not hidden behind bar (`pb-28` on main already).

---

## Step 2 — Modal analytics + native URL share + meta-option copy

### Purpose
Instrument funnel; improve share step; clarify single-meal path.

### Dependencies
- **Step 0.1** (`product-analytics.ts`)
- **Step 0.2** (`native-share.ts`)
- **Step 1** complete (CTA entry points exist)

### Order of operations

| Order | Commit | What |
|-------|--------|------|
| 2.1 | `feat(hall-vote): meta-option copy and styling` | Modal UI only |
| 2.2 | `feat(hall-vote): native share for vote URL` | Modal + native-share |
| 2.3 | `feat(hall-vote): funnel analytics events` | Banner, modal, home |

---

### Commit 2.1 — Meta-option copy

**Modify**
| File | Action |
|------|--------|
| `client/src/components/hall-vote-modal.tsx` | Rename label `TRY_ANOTHER_LABEL` → **"Different direction"** |
| `client/src/components/hall-vote-modal.tsx` | Update `TRY_ANOTHER_DESC` — meta-option helper text |
| `client/src/components/hall-vote-modal.tsx` | Badge text: **"Crew picks a new draw"** or similar (not "Regenerate path") |

**Difficulty:** S  
**Verify**
- [ ] 1 meal → open modal → option B clearly meta, not a fake dinner title.

**Test**
- [ ] Create vote still works with 1 real + meta option.

**Rollback:** Copy-only revert.

---

### Commit 2.2 — Native share vote URL

**Modify**
| File | Action |
|------|--------|
| `client/src/components/hall-vote-modal.tsx` | Import `shareTextAndUrl`, `downloadBlob` N/A |
| `client/src/components/hall-vote-modal.tsx` | On share step: add **"Share link"** button calling `shareTextAndUrl` when supported |
| `client/src/components/hall-vote-modal.tsx` | Keep copy + QR; track intent before call |

**Difficulty:** M  
**Verify**
- [ ] iOS/Android: native sheet opens with URL.
- [ ] Desktop: fallback remains copy input + copy button.
- [ ] Cancel share → no error toast.

**Test**
- [ ] Full flow: create vote → share step → share link.
- [ ] QR still renders.

**Rollback:** Remove Share link button; copy/QR unchanged.

---

### Commit 2.3 — Funnel analytics

**Modify**
| File | Action |
|------|--------|
| `client/src/components/hall-vote-promo-banner.tsx` | `trackHallVote('prompt_clicked')` on Start; optional `useInViewOnce` → `prompt_viewed` |
| `client/src/components/hall-vote-modal.tsx` | Events: `modal_opened`, `create_started`, `created`, `create_failed`, `qr_viewed`, `link_copied`, `link_shared` |
| `client/src/pages/home.tsx` | `prompt_clicked` source `sticky` vs `banner` passed as param |
| `client/src/pages/vote.tsx` | `cast`, `cast_failed`, `closed`, `winner_viewed` |

**Optional create**
| File | Action |
|------|--------|
| `client/src/hooks/use-in-view-once.ts` | Create if banner `prompt_viewed` used |

**Difficulty:** M  
**Verify**
- [ ] GA DebugView: full happy path events in order.
- [ ] No duplicate `prompt_viewed` on every scroll.

**Test**
- [ ] Create vote fail (airplane mode) → `create_failed` with `error_type`.
- [ ] Cast duplicate → `cast_failed` reason.

**Rollback:** Remove track calls only; UX from 2.1–2.2 remains.

---

## Step 3 — Winner → home handoff

### Purpose
Close loop: closed vote → cook winner on generator with full recipe.

### Dependencies
- **Step 0** (optional `product-analytics` for `winner_cook_clicked`)
- Existing `recipe_payload` on vote options (already stored server-side)
- **Step 1–2** not strictly required but realistic test needs working vote flow

### Order of operations

| Order | Commit | What |
|-------|--------|------|
| 3.1 | `feat(hall-vote): winner recipe session handoff lib` | New small lib |
| 3.2 | `feat(hall-vote): cook winner on vote page` | `vote.tsx` |
| 3.3 | `feat(hall-vote): hydrate winner on home` | `home.tsx` |

3.1+3.2 can merge; **keep 3.3 separate** to isolate “home broke” vs “vote page broke”.

---

### Commit 3.1 — Winner handoff lib

**Create**
| File | Action |
|------|--------|
| `client/src/lib/winner-recipe-handoff.ts` | Create (or add to `post-meal-ritual.ts` if prefer fewer files — **separate file recommended** for clarity) |

**Contents (contract)**
- `SESSION_KEY = 'firehall_winner_recipe'`
- `setWinnerRecipe(recipe: ClientRecipeResponse): void`
- `consumeWinnerRecipe(): ClientRecipeResponse | null` — read + remove
- Strip `_debug` / large fields if any before stringify

**Difficulty:** S  
**Verify:** `npm run check`

**Rollback:** Delete file.

---

### Commit 3.2 — Vote page “Cook this winner”

**Modify**
| File | Action |
|------|--------|
| `client/src/pages/vote.tsx` | When `isClosed && winnerId !== undefined`: add primary button **Cook this winner** |
| `client/src/pages/vote.tsx` | Resolve `recipe_payload` from winning option (`vote.options[winnerId].recipe_payload`) |
| `client/src/pages/vote.tsx` | `setWinnerRecipe(payload)` → `window.location.href = '/'` |
| `client/src/pages/vote.tsx` | `trackHallVote('winner_cook_clicked')` |
| `client/src/pages/vote.tsx` | Optional: compact header — replace full `HeroHeader` with minimal sticky bar (PRD; can be separate commit 3.2b) |

**Edge handling**
- Meta-option winner (`hall-vote-try-another`) — no payload: hide Cook or show “Generate a new meal” → link `/` only.

**Difficulty:** M  
**Verify**
- [ ] Close vote with winner → button visible.
- [ ] Tap → lands on `/` with winner recipe loaded.

**Test**
- [ ] Winner has ingredients + steps on recipe card.
- [ ] sessionStorage cleared after consume (no reload loop).

**Rollback:** Remove button; vote page read-only results again.

---

### Commit 3.3 — Home hydrate winner

**Modify**
| File | Action |
|------|--------|
| `client/src/pages/home.tsx` | On mount (or after filters init): `consumeWinnerRecipe()` |
| `client/src/pages/home.tsx` | If present: call existing `applyRecipe` with synthetic seq OR dedicated path that sets recipe + history without incrementing gen count incorrectly |
| `client/src/pages/home.tsx` | Scroll recipe into view once |
| `client/src/pages/home.tsx` | `trackHallVote('winner_viewed')` optional on hydrate |

**Implementation note**
- Prefer **dedicated hydrate function** that mirrors `applyRecipe` but skips `recordSuccessfulGeneration` / email capture triggers — avoid counting winner load as new generation.

**Difficulty:** M–L (highest risk in 0–3)  
**Verify**
- [ ] End-to-end: vote → close → cook winner → home shows correct title/ings/steps.
- [ ] Normal generate still works after hydrate.
- [ ] Refresh `/` does not resurrect old winner (storage consumed).

**Test**
- [ ] Large recipe payload (<1MB sessionStorage).
- [ ] Invalid JSON in storage → graceful ignore.

**Rollback:** Remove consume block on home only; vote button harmless if left.

**Rollback risk (higher):** Double-generation side effects if hydrate reuses `applyRecipe` wrongly — test gen count and email modal.

---

## Cross-step verification matrix

After **each commit**, run:

| Check | Command / action |
|-------|------------------|
| Compile | `npm run check` (or `npx tsc --noEmit`) |
| Dev server | `npm run dev` |
| Core path | Generate one meal → still works |
| Hall Vote | Create vote with 2 meals → QR + `/vote/id` loads |

After **Step 3** full E2E:

| # | Flow |
|---|------|
| 1 | Gen meal A → Different Meal → meal B → Start Hall Vote → share URL |
| 2 | Second device/browser cast votes → results update |
| 3 | Creator close → Cook this winner → home shows meal B (or winner) |
| 4 | GA: prompt_viewed → created → cast → winner_cook_clicked |

---

## Files touched summary (Steps 0–3)

| File | Steps |
|------|-------|
| `client/src/lib/product-analytics.ts` | **Create** 0 |
| `client/src/lib/native-share.ts` | **Create** 0 |
| `client/src/lib/post-meal-ritual.ts` | **Create** 0 |
| `client/src/lib/winner-recipe-handoff.ts` | **Create** 3 |
| `client/src/hooks/use-in-view-once.ts` | **Create** 2 (optional) |
| `client/src/lib/analytics.ts` | — (unchanged; wrapped by product-analytics) |
| `client/src/pages/vote.tsx` | 0, 2, 3 |
| `client/src/pages/home.tsx` | 1, 3 |
| `client/src/components/hall-vote-promo-banner.tsx` | 1, 2 |
| `client/src/components/hall-vote-modal.tsx` | 2 |
| `client/src/components/filter-panel.tsx` | 1 |

**Not touched in 0–3:** `server/*`, Share Cards, `recipe-card.tsx`, explore/pizza.

---

## Risk register (Steps 0–3)

| Risk | Step | Mitigation |
|------|------|------------|
| Hydrate triggers gen count / email | 3 | Separate `hydrateWinnerRecipe()`; code review |
| sessionStorage quota | 3 | Strip payload; try/catch |
| Sticky bar overlap | 1 | Check `pb-28`, safe-area |
| Analytics double-fire | 0, 2 | `useInViewOnce`, mount guards |
| CSRF fail on create | 2 | Map to `create_failed`; existing message |
| Desktop missing sticky vote | 1 | Accept shortcut; document |
| Real meal count wrong | 1 | Unit test `countRealMeals` |

---

## Feature flag (optional)

| Key | Use |
|-----|-----|
| `localStorage.firehall_growth_v1 === '1'` | Gate Steps 1–3 UI; Step 0 analytics always on |

Enables instant rollback without revert. **Shortcut:** skip flag if team is solo dev — revert via git.

---

## Estimated effort

| Step | Dev time |
|------|----------|
| 0 | 0.5–1 day |
| 1 | 1 day |
| 2 | 0.5–1 day |
| 3 | 0.5–1 day |
| **Total** | **2.5–4 days** |

---

## Out of scope (Step 4+)

- Share Cards (`html-to-image`, `ShareCardTemplate`)
- Pizza/explore share parity
- Vote page compact header (can ship as 3.2b if time)
- Server changes
- Hall Vote image share card
