# PRD: Hall Vote Funnel Optimization

**Product:** FirehallMeals  
**Status:** Draft  
**Owner:** Product  
**Goal:** Make Hall Vote the **default station dinner decision ritual** — not an optional feature after generation.

---

## 1. Problem & opportunity

### Current state (baseline)
- Hall Vote exists end-to-end: create vote → QR/link share → `/vote/:id` cast ballot → live results → creator closes → winner.
- Promo `HallVotePromoBanner` shows after first successful generation (`userGenCount >= 1`).
- Auto-scroll to banner ~700ms after first meal (can interrupt recipe reading).
- With one meal, modal injects synthetic option **"Try another direction"** to satisfy API `min(2)` options.
- **No Hall Vote analytics events** in `client/src/lib/analytics.ts`.
- Winner does not loop back to a “cook this” workflow on the generator.
- Vote page shows option title/description/time — not full recipe preview.

### Opportunity
Stations disagree about dinner every shift. Hall Vote is the product moat: **crew culture + viral QR loop**. The funnel should feel as natural as “Feed the hall,” not a buried upsell.

### Success definition
A cook with 2+ meal options starts a vote within 60 seconds, 3+ crew members vote, vote is closed, and the winner is opened for cooking — **without accounts or training**.

---

## 2. Goals & non-goals

### Goals
| # | Goal |
|---|------|
| G1 | Increase vote **creation rate** among sessions with ≥1 generated meal |
| G2 | Increase **ballots per vote** (crew participation) |
| G3 | Increase **winner → cook** completion |
| G4 | Establish Hall Vote as **co-primary** post-generation CTA when 2+ real meals exist |
| G5 | Instrument full funnel for data-driven iteration |

### Non-goals (this initiative)
- User accounts / cross-device sync
- Station leaderboards, department competitions
- Push notifications
- Community recipe submissions
- Replacing meal generation with vote-only mode
- Explore/Pizza meals in vote options (generator session only, v1)

---

## 3. User flows

### 3.1 Primary — “Two meals, let the hall decide” (happy path)

| Step | Actor | Action | System |
|------|-------|--------|--------|
| 1 | Cook | Generates meal #1 | Recipe card + trust line |
| 2 | Cook | Taps **Different Meal** | Meal #2 in session history |
| 3 | System | Promo: “2 meals on the board” | `option_count=2`, ritual copy |
| 4 | Cook | **Start Hall Vote** | Modal confirm step |
| 5 | Cook | Confirms options | `POST /api/hall-vote` → share step |
| 6 | Cook | Displays QR on counter | Copy link + native share if available |
| 7 | Crew | Scans QR | `/vote/:voteId` |
| 8 | Crew | Taps one option | `POST .../vote` — one ballot per fingerprint |
| 9 | Cook | **Open live results** | Poll ~3s |
| 10 | Cook | **Close voting** | Winner declared |
| 11 | Cook | **Cook this winner** | Load `recipe_payload` on generator |

### 3.2 Single-meal path — “Vote or add another”

| Step | Action |
|------|--------|
| 1 | Cook has 1 real meal |
| 2 | Promo: “Can’t agree? Vote — or add another option.” |
| 3 | Modal: Option A = current meal; Option B = **“Different direction”** (meta-option, dashed card) |
| 4 | Optional: **Different Meal** in modal adds real option #2 |
| 5 | If meta-option wins → prompt cook to generate replacement |

### 3.3 Returning cook

| Step | Action |
|------|--------|
| 1 | `hall_vote_used_before` in localStorage → shorter promo |
| 2 | Sticky bar: **Hall Vote** visible after any gen when `userGenCount >= 1` |
| 3 | `mealHistory.length >= 2` → vote CTA becomes **primary** in banner |

### 3.4 Voter-only (QR)

| Step | Action |
|------|--------|
| 1 | Open `/vote/:id` — minimal chrome |
| 2 | One-tap ballot |
| 3 | Live results after vote |
| 4 | No login |

---

## 4. Mobile UX

### 4.1 Generator (post-meal)

| Requirement | Spec |
|-------------|------|
| Banner placement | Below recipe card actions; visible without scrolling past entire recipe on iPhone SE |
| Auto-scroll | **Remove** 700ms forced scroll to banner; optional subtle highlight on first gen only |
| Sticky bar | After gen 1: `[Different Meal]` + `[Hall Vote]` — min **48px** touch targets |
| QR modal | QR min **72vw**, high contrast, kitchen lighting |
| Share | `navigator.share({ title, url })` when supported; fallback copy URL |
| Safe area | Respect `env(safe-area-inset-bottom)` on sticky bar |

### 4.2 Vote page

| Requirement | Spec |
|-------------|------|
| Header | Compact — no full marketing hero on voter path |
| Option cards | Full width, min 72px tap height, title + time + protein badge |
| Results | Live bars after vote; no full page reload |
| Creator close | Only when `can_close === true` |
| Winner | Trophy card + **Cook this meal** (primary) |
| Errors | Plain language: “Station Wi‑Fi hiccup — try again” |

### 4.3 Accessibility
- QR `alt` text present
- Vote targets are native `<button>`
- Modal focus trap; Esc closes
- Respect `prefers-reduced-motion` for banner animation

---

## 5. CTA hierarchy

### Hidden
- Before first successful generation: **no Hall Vote UI**

### After 1 meal (1 real option)

| Priority | CTA | Treatment |
|----------|-----|-----------|
| 1 | Different Meal | Primary (sticky) |
| 2 | Start Hall Vote | Secondary (banner + sticky outline) |
| 3 | Save / list / print | Tertiary (recipe card) |

### After 2+ meals (ritual mode)

| Priority | CTA | Treatment |
|----------|-----|-----------|
| 1 | **Start Hall Vote** | Primary (banner + sticky) |
| 2 | Different Meal | Secondary |
| 3 | Recipe utilities | Tertiary |

### Copy standards
| Element | Copy |
|---------|------|
| Primary CTA | **Start Hall Vote** |
| Headline | **Can’t agree? Let the crew vote.** |
| Subline (2+ options) | **{n} meals on the board — scan and pick tonight’s dinner.** |
| Share step | **Prop the phone on the counter — crew scans and taps.** |
| Meta-option B | **Different direction** (not “Try another direction”) |
| Winner CTA | **Cook this winner** |

---

## 6. Analytics events

Implement in `client/src/lib/hall-vote-analytics.ts` (or extend `analytics.ts`).

| Event | Trigger | Params |
|-------|---------|--------|
| `hall_vote_prompt_viewed` | Banner in viewport | `option_count`, `session_gen_count`, `has_two_real_options` |
| `hall_vote_prompt_clicked` | Start from banner/sticky/card | `source: banner \| sticky \| recipe_card` |
| `hall_vote_modal_opened` | Modal open | `option_count`, `using_meta_option` |
| `hall_vote_create_started` | Confirm → API | `option_count` |
| `hall_vote_created` | API 200 | `vote_id_hash`, `option_count` |
| `hall_vote_create_failed` | API error | `error_type: csrf \| rate_limit \| network \| validation \| other` |
| `hall_vote_qr_viewed` | Share step | `vote_id_hash` |
| `hall_vote_link_copied` | Copy tap | — |
| `hall_vote_link_shared` | Web Share OK | `method: native \| copy` |
| `hall_vote_live_results_opened` | Open results button | — |
| `hall_vote_page_viewed` | `/vote/:id` load | `vote_id_hash`, `referrer: qr \| link \| direct` |
| `hall_vote_cast` | Ballot success | `vote_id_hash`, `option_index` |
| `hall_vote_cast_failed` | 4xx/5xx | `reason` |
| `hall_vote_closed` | Creator closes | `vote_id_hash`, `total_votes` |
| `hall_vote_winner_viewed` | Winner shown | `winner_title` |
| `hall_vote_winner_cook_clicked` | Cook this winner | `vote_id_hash` |

**Funnel conversions (GA explorations):**
1. `prompt_viewed → created`
2. `created → first_cast` (time)
3. `created → closed` where `total_votes >= 3`
4. `closed → winner_cook_clicked`

---

## 7. Edge cases

| Case | Behavior |
|------|----------|
| 0 meals | Hide all Hall Vote UI |
| 1 real meal | Meta-option B + prominent Different Meal in modal |
| CSRF missing on create | “Refresh the page and try again” |
| Create rate limit (2/min/IP) | Friendly wait message |
| Duplicate ballot (409) | “You already voted” → show results |
| Shared station IP | One vote per fingerprint (IP+UA); document limitation |
| Vote expired (24h) | Auto-close; show final tally |
| Tie on close | Show top options with equal %; creator picks verbally (v1) |
| Close with 0 votes | Allow close; CTA “Generate a new meal” |
| QR render fails | Prominent copyable URL |
| Modal closed mid-flow | Reset state on reopen |
| New meal while vote open | Do not auto-add to open vote (v1); offer “Start new vote?” |
| Meta-option wins | “Crew wants a different direction” → Different Meal |
| `can_close` false | “Only the cook who started the vote can close it” |
| Large `recipe_payload` | Store as today; cook view loads payload, not full vote JSON on homepage |

---

## 8. Acceptance criteria

### Epic A — CTA & hierarchy
- [ ] **AC-A1:** With `mealHistory.length >= 2`, Start Hall Vote is visually primary in promo banner.
- [ ] **AC-A2:** Sticky mobile bar includes Hall Vote after `userGenCount >= 1` (`data-testid="button-sticky-hall-vote"`).
- [ ] **AC-A3:** Forced auto-scroll to banner on first gen removed or gated (`prefers-reduced-motion`, user scrolled recipe).
- [ ] **AC-A4:** No Hall Vote UI before first successful generation.

### Epic B — Modal & create
- [ ] **AC-B1:** Create succeeds with 2–5 options; inline error on failure.
- [ ] **AC-B2:** Single-meal path: meta-option visually distinct (dashed border, helper text).
- [ ] **AC-B3:** Share step: QR ≥280px, copy link, native share when `navigator.share` exists.
- [ ] **AC-B4:** All modal CTAs ≥48px height on mobile.

### Epic C — Vote page & winner loop
- [ ] **AC-C1:** Voter casts ballot in one tap without login.
- [ ] **AC-C2:** Live results update without full reload (existing 3s poll).
- [ ] **AC-C3:** Creator sees Close when `can_close === true`.
- [ ] **AC-C4:** Closed vote shows winner + **Cook this winner**.
- [ ] **AC-C5:** Cook this winner hydrates full recipe (ingredients + steps) from `recipe_payload`.

### Epic D — Analytics
- [ ] **AC-D1:** All §6 events fire in happy path (gtag debug verifiable).
- [ ] **AC-D2:** Funnel doc with 4 conversion rates for week-1 baseline.

### Epic E — Regression
- [ ] **AC-E1:** Meal generation unaffected.
- [ ] **AC-E2:** CSRF on create/close; cast without CSRF.
- [ ] **AC-E3:** Existing `data-testid` hooks preserved.

---

## 9. Technical considerations

### Existing stack
| Layer | Files |
|-------|--------|
| API | `POST /api/hall-vote`, `GET /api/hall-vote/:id`, `POST .../vote`, `POST .../close` in `server/routes.ts` |
| Store | `server/hall-vote-store.ts` (shared `data/cache.db` via `server/sqlite.ts`) |
| UI | `hall-vote-promo-banner.tsx`, `hall-vote-modal.tsx`, `pages/vote.tsx` |
| Session meals | `mealHistoryRef` + `recentRecipes` in `home.tsx` |

### Proposed changes

**`home.tsx`**
- `showHallVotePrompt` when `userGenCount >= 1 && recipe`
- Pass `voteOptionCount` from `mealHistoryRef.current.length` or `recentRecipes`
- Sticky `HallVote` button in mobile generate bar
- Remove/gate `hallVoteScrollDoneRef` auto-scroll
- `localStorage.hall_vote_used_before`

**`hall-vote-modal.tsx`**
- Meta-option copy/styling
- Analytics hooks per step
- `navigator.share` on share step

**`vote.tsx`**
- Compact header variant
- Winner → `sessionStorage` key `hall_vote_winner` + navigate `/` or expand inline recipe
- Track page/cast/close events

**`lib/hall-vote-analytics.ts`**
- Typed event helpers; hash `voteId` before logging

**Server (optional v1.1)**
- Server log lines already: `[hallvote] created|closed`
- No schema change required for v1

### Security (unchanged)
- Create/close: CSRF + session cookie
- Cast: fingerprint dedup (`hashVoterFingerprint`)
- Rate limits: 2 creates/min/IP; 10 casts/min/IP

---

## 10. Success metrics

Establish baseline in **Week 1** (analytics-only deploy).

| Metric | 30-day target |
|--------|----------------|
| Sessions with meal → vote created | **≥ 12%** |
| Sessions with 2+ meals → vote created | **≥ 25%** |
| Votes created with ≥1 cast | **≥ 70%** |
| Median time create → first cast | **< 3 min** |
| Votes closed with ≥3 ballots | **≥ 40%** of closed |
| Closed → Cook this winner clicked | **≥ 50%** |
| 7-day repeat vote (same device) | **≥ 15%** of creators |

**Qualitative:** “We use Hall Vote most nights at the hall.”

---

## 11. Rollout plan

| Phase | Week | Scope |
|-------|------|--------|
| **0 — Measure** | 1 | Ship analytics only; baseline funnel |
| **1 — Hierarchy** | 2 | Sticky CTA, remove auto-scroll, 2+ meals = primary vote, meta-option copy |
| **2 — Participate** | 3 | Web Share, vote page polish, winner → cook loop |
| **3 — Ritual** | 4 | Returning-user copy, review metrics, copy tweaks |

**Feature flag:** `localStorage.hall_vote_funnel_v1` or env `HALL_VOTE_FUNNEL_V1` for QA rollback.

**Rollback:** Disable sticky + primary swap; keep analytics.

---

## 12. Open questions

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Winner on homepage vs `/cook/:voteId`? | Homepage via `sessionStorage` winner payload |
| 2 | Tie-breaking? | v1 manual; v2 runoff between top 2 |
| 3 | Show Hall Vote after first meal? | Yes, secondary until 2 real meals |
| 4 | Include saved favorites in vote options? | v2 |

---

## 13. Implementation order

1. `hall-vote-analytics.ts` + event wiring  
2. CTA hierarchy (sticky + primary when 2+ options)  
3. Remove auto-scroll interrupt  
4. Meta-option UX + copy  
5. Web Share on share step  
6. Winner → cook loop on vote page + generator  

**Estimated effort:** ~3–5 dev days across 4 weeks with phased rollout.
