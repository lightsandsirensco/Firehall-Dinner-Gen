# Performance Priorities v2 — Business Impact

**Date:** June 22, 2026  
**Lens:** Staff engineer · product founder  
**Goal:** Maximize **firefighter adoption**, not Lighthouse scores  
**North Star:** A hall uses Firehall Meals on **every shift night for 4 consecutive weeks**

**Sources:** `performance-audit-v3.md`, `mobile-safari-audit-v3.md`, `dead-code-audit.md`, `product-audit-v3.md`, `stop-building.md`

---

## How we prioritize

Optimize **only** when the work clearly does one or more of:

| # | Criterion |
|---|-----------|
| 1 | Improves **first impression** (SEO landing → first meaningful action) |
| 2 | Improves **mobile Safari** on shift night (gloves, one hand, bad signal) |
| 3 | **Reduces abandonment** (user started a job and quit) |
| 4 | **Simplifies code** (fewer paths = fewer bugs blocking adoption) |
| 5 | Helps **support 100 halls** (authenticated scale, not theoretical) |

**We explicitly do not prioritize:**

- Lighthouse score chasing in isolation  
- Bundle size on admin-only or tree-shaken dead code  
- SQLite micro-optimizations at hall-scale row counts  
- Analytics pipeline elegance before 10 active halls  
- Image CDN / IndexedDB / worker queues before retention proof  

---

## Success metrics (adoption, not lab scores)

| Metric | Why it matters | Target |
|--------|----------------|--------|
| **Time to first meal pick** (cold visit → generator result or explore click) | First impression | **<15s** on 4G mobile |
| **Recipe → Cook Mode taps** | Stove abandonment | **1 tap** from recipe |
| **Explore scroll to first food click** | Browse abandonment | **First row visible** at load |
| **Join → hall value screen** (product; not ms) | Hall adoption | Land on `/hall`, not settings |
| **Hall week-1 return** | Retention | **60%** of joined members |
| **Explore grid API p95** (server) | Browse feels broken on cold deploy | **<200ms** (→50ms with cache) |

Lighthouse LCP/CLS are **diagnostic only** — fix them when they predict the metrics above.

---

## Priority legend

| Tier | Meaning | When to ship |
|------|---------|--------------|
| **P0** | **Blocking adoption** — user can't complete tonight's job or bounces on first visit | Now |
| **P1** | **High leverage** — clear payoff on impression, Safari, or abandonment | Next 2 sprints |
| **P2** | **Future scale** — matters at ~20–100 halls or 2× traffic | After ritual sprint |
| **P3** | **Ignore until 100 halls** — technically imperfect but user-invisible | Backlog / never |

**Effort:** XS (&lt;1 day) · S (1–2 days) · M (3–7 days) · L (2+ weeks)  
**Payoff:** Low · Medium · High · **Critical** (adoption-blocking)

---

# P0 — Blocking adoption

*Ship in **Sprint A — First impression & shift night** (weeks 1–2).*

---

### P0-01 · Monolithic first-load JS (eager Home + Generator + Admin)

| | |
|--|--|
| **Finding** | `index-*.js` = **1,270 KB** / **356 KB gzip**. `Home`, `Generator`, `AdminGolden100Page` are static imports in `App.tsx`. Every SEO visitor parses the generator graph before tapping anything. |
| **Criteria** | ① First impression |
| **User impact** | Cold homepage feels sluggish on station Wi‑Fi; **25–40% slower TTI** on mid-tier iPhone vs split chunks. User leaves before "Find a Meal." |
| **Effort** | **S** — lazy `Generator`; lazy `AdminGolden100` with Suspense retry |
| **Payoff** | **Critical** — estimated **−200–350 KB** off first paint path |
| **Sprint** | **A** |

---

### P0-02 · Server rebuilds full catalog on every Explore request

| | |
|--|--|
| **Finding** | `buildApprovedCatalog()` reads disk + maps ~337 recipes **per request** — no in-memory cache. Explore grid (~150–220 KB JSON) waits on CPU. |
| **Criteria** | ① ② ③ — Explore is top browse path; mobile Safari on cold server feels "broken" |
| **User impact** | **2–5s blank/skeleton** on first Explore visit after deploy or cache miss. User assumes app is down; returns to Facebook. |
| **Effort** | **XS** — module cache keyed on `assetRevision` / mtime |
| **Payoff** | **Critical** — p95 **−50–200ms** server; perceived instant repeat visits |
| **Sprint** | **A** |

---

### P0-03 · Recipe page: Cook Mode below the fold (mobile Safari)

| | |
|--|--|
| **Finding** | Recipe pages are long scrolls; `Start Cooking` not in thumb zone. Cook Mode itself is excellent (A−); discovery is D+. |
| **Criteria** | ② ③ — stove is the moment of truth |
| **User impact** | **2–4 taps + scroll** to cook. Cook abandons recipe for Notes app or printed sheet. |
| **Effort** | **S** — sticky bottom bar: Start Cooking · List · Share |
| **Payoff** | **Critical** — aligns with product audit P0-7 |
| **Sprint** | **A** (week 2) |

---

### P0-04 · Mobile touch targets under 44px on operational UI

| | |
|--|--|
| **Finding** | Default `Button` = `min-h-9` (36px). Canteen, shopping, header CTAs fail Apple HIG. |
| **Criteria** | ② ③ — gloves, hurry, truck cab |
| **User impact** | Mis-taps, rage taps, "this app wasn't made for us." |
| **Effort** | **XS** — raise floor to `min-h-11` on primary/secondary for `<lg`; ban `sm` on ops actions |
| **Payoff** | **High** |
| **Sprint** | **A** (week 1) |

---

### P0-05 · Generator bottom chrome collision (sticky bar + Hall Feedback FAB)

| | |
|--|--|
| **Finding** | Up to **four fixed layers** on Generator; FAB at `bottom: 5.75rem` overlaps Generate sticky bar. |
| **Criteria** | ② ③ |
| **User impact** | Can't tap Generate or feedback; last recipe actions hidden. **Direct generation abandonment.** |
| **Effort** | **XS** — hide FAB on pages with `mobile-sticky-bar` OR raise FAB offset |
| **Payoff** | **Critical** |
| **Sprint** | **A** (week 1) |

---

### P0-06 · Explore: food below filters/chrome (~96px before first thumb)

| | |
|--|--|
| **Finding** | Sticky toolbar + site header; filters dominate mobile Explore. |
| **Criteria** | ① ② ③ |
| **User impact** | User scrolls past chrome hunting food; **paralysis** (5 browse paths already). Bounce to generator or leave. |
| **Effort** | **M** — compress toolbar; **6 cards above fold**; filters in sheet (pattern exists) |
| **Payoff** | **High** |
| **Sprint** | **B** (week 3–4) |

---

### P0-07 · Join → settings page (product + perf compound)

| | |
|--|--|
| **Finding** | Post-join lands on `/halls/:id` (heavy settings + paywalls), not `/hall`. Triggers **duplicate `fetchHallDetail`** (context + page). |
| **Criteria** | ③ — hall adoption blocker (product P0-2); perf makes it worse |
| **User impact** | New member sees admin wall + slow load; never discovers vote/generator. **Hall ritual never starts.** |
| **Effort** | **S** — redirect to `/hall`; dedupe fetch (read context) |
| **Payoff** | **Critical** (adoption &gt; ms) |
| **Sprint** | **A** — ship with product ritual sprint |

---

### P0-08 · Double cloud sync on sign-in

| | |
|--|--|
| **Finding** | `AuthProvider.afterSignIn` and `CloudSyncProvider` both call `runCloudSync("sign_in")`. |
| **Criteria** | ③ ⑤ — new member's first seconds feel hung |
| **User impact** | **1–3s** extra main-thread + network work right after join/login; spinner fatigue. |
| **Effort** | **XS** — single sync owner |
| **Payoff** | **Medium** (high on join moment) |
| **Sprint** | **A** |

---

# P1 — High leverage

*Ship in **Sprint B — Stove & browse** (weeks 3–4) and **Sprint C — Hall session** (weeks 5–6).*

---

### P1-01 · Framer Motion loaded on Generator path (vote modals)

| | |
|--|--|
| **Finding** | `HallVoteModal` / `HallVotePromoBanner` pull `vendor-motion` (113 KB / 37 KB gzip) on generator load. |
| **Criteria** | ① ④ |
| **User impact** | Faster generator route when prefetched; less jank on first generate. |
| **Effort** | **S** — `React.lazy` modals on open |
| **Payoff** | **Medium** |
| **Sprint** | **B** |

---

### P1-02 · Generator filter wall on first visit

| | |
|--|--|
| **Finding** | Full `FilterPanel` intimidates; `localStorage` write every filter change. |
| **Criteria** | ① ③ |
| **User impact** | **−10–20s** to first generation; less typing jank. |
| **Effort** | **M** — collapsed first-run + debounce LS 300ms |
| **Payoff** | **High** |
| **Sprint** | **B** |

---

### P1-03 · `mealFocusMode` layout flip after first generation

| | |
|--|--|
| **Finding** | CLS when empty state swaps to recipe card. |
| **Criteria** | ② ③ |
| **User impact** | User loses scroll position; feels "janky" right when excitement peaks. |
| **Effort** | **S** — in-place replace, no animation |
| **Payoff** | **Medium** |
| **Sprint** | **B** |

---

### P1-04 · Explore downloads full grid; client-side filter on 337 rows

| | |
|--|--|
| **Finding** | One JSON fetch OK with cache; **filter keystrokes** re-sort full array on main thread. |
| **Criteria** | ② ③ |
| **User impact** | Typing lag on older iPhones; feels cheap during search. |
| **Effort** | **S** — debounce filter URL; **M** for virtualization (→ P2 if S insufficient) |
| **Payoff** | **Medium** (High on iPhone 12 class) |
| **Sprint** | **B** (debounce); **C** (virtualize if needed) |

---

### P1-05 · Duplicate fetches on hall dashboard

| | |
|--|--|
| **Finding** | `use-hall-activity-feed` + `use-hall-leaderboard` each call `GET /activity-feed`. Protein deals card vs page separate fetch. |
| **Criteria** | ② ⑤ |
| **User impact** | `/hall` feels sluggish on LTE; **2–3 extra round-trips** before interactive. |
| **Effort** | **S** — shared React Query keys |
| **Payoff** | **Medium** |
| **Sprint** | **C** |

---

### P1-06 · Golden catalog duplicate query keys

| | |
|--|--|
| **Finding** | Home uses `["golden-catalog-home"]`; same payload re-fetched on navigate. |
| **Criteria** | ① |
| **User impact** | Redundant network on homepage → generator path. |
| **Effort** | **XS** |
| **Payoff** | **Low–Medium** |
| **Sprint** | **B** |

---

### P1-07 · `getSavedCount()` parses full localStorage on Explore render

| | |
|--|--|
| **Finding** | Sync JSON parse in render path for header badge. |
| **Criteria** | ② ④ |
| **User impact** | Minor jank on Explore open for users with many saves. |
| **Effort** | **XS** — event-driven counter cache |
| **Payoff** | **Low** |
| **Sprint** | **B** |

---

### P1-08 · Hall providers on every route (global `fetchHallDetail`)

| | |
|--|--|
| **Finding** | Authenticated guest on `/generator` still pays hall detail fetch. |
| **Criteria** | ① ⑤ |
| **User impact** | SEO users who signed in once get slower non-hall pages. |
| **Effort** | **M** — scope `HallMembershipProvider` to `/hall/*` layout |
| **Payoff** | **Medium** |
| **Sprint** | **C** |

---

### P1-09 · Homepage mobile scroll marathon

| | |
|--|--|
| **Finding** | ~8 sections before footer; email capture before value. |
| **Criteria** | ① ③ |
| **User impact** | SEO visitor never reaches generator CTA. |
| **Effort** | **M** — hero + 2 CTAs + 3-step + one rail |
| **Payoff** | **High** |
| **Sprint** | **C** (pairs product P1) |

---

### P1-10 · Shopping list in settings hash (scroll jail)

| | |
|--|--|
| **Finding** | `/halls/:id#hall-shared-shopping-list` — not a route. |
| **Criteria** | ② ③ ⑤ |
| **User impact** | Grocery runner can't find list; abandons hall ops. |
| **Effort** | **M** — `/hall/shopping-list` route |
| **Payoff** | **High** |
| **Sprint** | **C** |

---

### P1-11 · Shopping email dialog keyboard cover (iOS)

| | |
|--|--|
| **Finding** | Centered dialog; keyboard hides email field. |
| **Criteria** | ② ③ |
| **User impact** | Email export abandonment mid-shop. |
| **Effort** | **M** — bottom sheet pattern |
| **Payoff** | **Medium** |
| **Sprint** | **C** |

---

### P1-12 · Open Cook Mode from tonight flows (`?cook=1`)

| | |
|--|--|
| **Finding** | Generator/wheel/deal land on recipe scroll, not cook. |
| **Criteria** | ③ |
| **User impact** | **−1 tap** on hot path. |
| **Effort** | **S** |
| **Payoff** | **Medium** |
| **Sprint** | **B** |

---

### P1-13 · Explore card CLS (images without stable dimensions)

| | |
|--|--|
| **Finding** | Lazy thumbs shift grid on load. |
| **Criteria** | ② — trust/"cheap" feel, not Lighthouse trophy |
| **User impact** | Mis-taps on wrong recipe during load. |
| **Effort** | **S** — aspect ratio + skeleton |
| **Payoff** | **Medium** |
| **Sprint** | **B** |

---

### P1-14 · Delete dead code Phase 1 + consolidate recipe routes

| | |
|--|--|
| **Finding** | ~4,600 lines dead; parallel `/explore/recipe/:id` stack (719 lines). |
| **Criteria** | ④ — fewer paths, fewer bugs |
| **User impact** | Indirect — faster shipping of fixes; **−25–45 KB** gzip when legacy route removed |
| **Effort** | **M** — 2 PRs per `dead-code-audit.md` |
| **Payoff** | **Medium** (engineering velocity) |
| **Sprint** | **B–C** |

---

### P1-15 · Lazy-load Admin Golden 100 (if not in P0-01)

| | |
|--|--|
| **Finding** | Admin eager for direct URL reliability. |
| **Criteria** | ① |
| **User impact** | **−30–50 KB** gzip for 100% of consumers. |
| **Effort** | **S** |
| **Payoff** | **Medium** |
| **Sprint** | **A** |

---

### P1-16 · Hall dashboard: activity/leaderboard above quick actions

| | |
|--|--|
| **Finding** | Social teasers before vote/generate/list. |
| **Criteria** | ② ③ |
| **User impact** | Captain/cook can't find tonight actions. |
| **Effort** | **S** — reorder v2 layout |
| **Payoff** | **Medium** |
| **Sprint** | **C** |

---

### P1-17 · Recipe hero `fetchPriority="high"`; defer related thumbs

| | |
|--|--|
| **Finding** | Full-res heroes on recipe LCP. |
| **Criteria** | ② |
| **User impact** | Faster "I see the food" on recipe from vote link. |
| **Effort** | **XS** |
| **Payoff** | **Low–Medium** |
| **Sprint** | **B** |

---

### P1-18 · Reduce Explore initial `visibleCount` on mobile (6 → 4)

| | |
|--|--|
| **Finding** | Fewer parallel image requests on first paint. |
| **Criteria** | ② |
| **User impact** | Faster first thumb paint on slow networks. |
| **Effort** | **XS** |
| **Payoff** | **Low** |
| **Sprint** | **B** |

---

# P2 — Future scale

*After **10 hall pilots** or when metrics show authenticated/session pain.*

---

### P2-01 · Prebuilt `approved-catalog.json` at build time

| | |
|--|--|
| **Finding** | Server still maps catalog even with memory cache. |
| **Criteria** | ⑤ |
| **User impact** | Invisible until traffic spikes; stable Explore under load. |
| **Effort** | **M** |
| **Payoff** | **Medium** at scale |
| **Sprint** | **D** |

---

### P2-02 · Virtualized Explore grid

| | |
|--|--|
| **Finding** | 337 DOM rows when scrolling deep. |
| **Criteria** | ⑤ — catalog may grow past 500 |
| **User impact** | Scroll jank only on long sessions today. |
| **Effort** | **M** |
| **Payoff** | **Low** now · **High** at 500+ recipes |
| **Sprint** | **D** |

---

### P2-03 · Dirty-domain cloud sync

| | |
|--|--|
| **Finding** | Full snapshot push every 5 min + on every history event. |
| **User impact** | Battery + LTE on always-on station iPad. |
| **Effort** | **M** |
| **Payoff** | **Medium** at 100 halls |
| **Sprint** | **D** |

---

### P2-04 · Hall detail via React Query (`staleTime: 60s`)

| | |
|--|--|
| **Finding** | Context refetch pattern; shift page re-fetches. |
| **User impact** | Smoother hall navigation when multiple members active. |
| **Effort** | **M** |
| **Payoff** | **Medium** at hall density |
| **Sprint** | **D** |

---

### P2-05 · `useHallHistory` in-memory snapshot (reduce LS reads)

| | |
|--|--|
| **Finding** | Full re-parse on every history write. |
| **User impact** | Jank when logging cooks in busy shift. |
| **Effort** | **S** |
| **Payoff** | **Low** until heavy history users |
| **Sprint** | **D** |

---

### P2-06 · WebP thumb buckets (240/480)

| | |
|--|--|
| **Finding** | JPEG thumbs; editorial helpers exist. |
| **User impact** | **−30–50%** image bytes on Explore scroll. |
| **Effort** | **M** (pipeline) |
| **Payoff** | **Medium** on slow LTE |
| **Sprint** | **D** |

---

### P2-07 · Navigation v3 tab shell + scoped prefetch

| | |
|--|--|
| **Finding** | Prefetch 5 routes on every page; 7-item header. |
| **User impact** | App-like speed; less wrong prefetch on LTE. |
| **Effort** | **L** |
| **Payoff** | **High** long-term · **Low** until IA ships |
| **Sprint** | **E** (IA sprint) |

---

### P2-08 · Bottom tab bar (Discover · Tonight · Hall · Me)

| | |
|--|--|
| **Finding** | Hamburger hides core jobs. |
| **User impact** | Faster hall return; PWA feel. |
| **Effort** | **L** |
| **Payoff** | **High** with navigation v3 |
| **Sprint** | **E** |

---

### P2-09 · `visualViewport` / bottom sheet dialogs

| | |
|--|--|
| **Finding** | Account + shopping keyboard overlap. |
| **User impact** | Form completion on iOS. |
| **Effort** | **M** |
| **Payoff** | **Medium** |
| **Sprint** | **D** |

---

### P2-10 · `100svh` / fixed bottom bar re-anchor (Safari URL bar)

| | |
|--|--|
| **Finding** | `100dvh` jump on first scroll. |
| **User impact** | Sticky bar overlap momentarily. |
| **Effort** | **M** |
| **Payoff** | **Low–Medium** |
| **Sprint** | **D** |

---

### P2-11 · Catalog count endpoint without full build

| | |
|--|--|
| **Finding** | `/api/catalog/approved/count` calls full `buildApprovedCatalog()`. |
| **User impact** | Minor SEO count delay. |
| **Effort** | **XS** (after P0-02 cache) |
| **Payoff** | **Low** |
| **Sprint** | **D** |

---

### P2-12 · Analytics flush debounce 2–3s

| | |
|--|--|
| **Finding** | Event batch every 1.2s on active browsing. |
| **User impact** | Imperceptible today. |
| **Effort** | **XS** |
| **Payoff** | **Low** |
| **Sprint** | **D** |

---

### P2-13 · PWA install after first cook (not homepage)

| | |
|--|--|
| **Finding** | Install prompt timing. |
| **User impact** | Higher quality installs. |
| **Effort** | **S** |
| **Payoff** | **Medium** retention |
| **Sprint** | **D** |

---

# P3 — Ignore until 100 halls

*Technically imperfect. **Do not schedule** unless a paying hall or pilot blocks you.*

| ID | Finding | Why P3 |
|----|---------|--------|
| P3-01 | Further `vendor` chunk splits (wouter, zod) | No user-visible path; main chunk is the problem |
| P3-02 | `CLASSIC_HALL_MEALS` in main graph | Small; fixed by P0-01 |
| P3-03 | Save-Data prefetch policy | Edge case; tiny audience |
| P3-04 | Admin Recharts bundle (248 KB) | Already lazy; admin-only |
| P3-05 | PWA precache 2.9 MB | Repeat visit asset; not blocking first impression |
| P3-06 | Growth dashboard SQL / `getAnalyticsDashboard` unions | Internal; 0 paying customers |
| P3-07 | Analytics dual-write GA + SQLite refactor | Works; refactor is hygiene |
| P3-08 | `analytics_events` retention / rollup tables | No row pain yet |
| P3-09 | Analytics worker / off-request pipeline | Premature |
| P3-10 | Separate SQLite file for analytics | 100-hall ops concern |
| P3-11 | IndexedDB for saves/recipe cache | localStorage fine at current scale |
| P3-12 | Image CDN / on-the-fly resize | Heroes adequate; 45 KB home hero OK |
| P3-13 | Server-side catalog filter API | 337 rows client-side OK |
| P3-14 | shadcn UI prune (~3k lines) | Tree-shaken; maintenance only |
| P3-15 | `PageTransition` remount per route | Scroll reset is feature; cost acceptable |
| P3-16 | `hall_activity` `SELECT *` | Hall-scale rows tiny |
| P3-17 | Protein deals DELETE+reINSERT on sync | Invisible to user |
| P3-18 | Shopping list SQL chatty refreshes | Correctness &gt; ms at 20 items |
| P3-19 | Explore `explore_filter` analytics sampling | Noise reduction, not adoption |
| P3-20 | Voice advance in Cook Mode | P2 product feature, not perf |
| P3-21 | Offline recipe precache | Station Wi‑Fi usually OK |
| P3-22 | `useMealHeroPoll` repeated polling | Edge case after generate |
| P3-23 | Wheel Framer animations optimize | Wheel grade B−; good enough |
| P3-24 | `npm run check` 61 → 15 scripts | CI time, not firefighter UX |
| P3-25 | Lighthouse CLS &lt;0.1 as goal | Use mis-tap rate instead |
| P3-26 | Static catalog CDN / edge | P2-01 sufficient until national traffic |
| P3-27 | Zustand/Jotai for hall state | Provider scope (P1-08) enough first |

---

# Rejected optimizations (do not schedule)

| Proposal | Why rejected |
|----------|--------------|
| "Get Lighthouse mobile to 90+" | Metric gaming; recipe scroll and chrome stack aren't scored honestly |
| Delete orphan components for bundle | **0 KB** payoff — already tree-shaken (`dead-code-audit.md`) |
| Micro-optimize `mergeActivityFeed` dedup | No user path feels this |
| Replace SQLite with Postgres | 100-hall problem, not adoption |
| SSR / Next.js migration | L-year rewrite; lazy chunks fix impression |
| Prefetch every recipe on Explore hover | LTE waste; harms abandonment on data caps |

---

# Recommended sprint plan

Aligned with `product-audit-v3.md` **Path to 90+**.

```
┌─────────────────────────────────────────────────────────────────┐
│ SPRINT A — First impression & shift night (weeks 1–2)           │
│ Goal: Cold visit feels fast; shift night taps work              │
├─────────────────────────────────────────────────────────────────┤
│ P0-01  Lazy Generator + Admin                                   │
│ P0-02  Catalog memory cache                                     │
│ P0-04  44px touch floor                                         │
│ P0-05  Generator FAB vs sticky bar                              │
│ P0-07  Join → /hall (+ dedupe hall fetch)                       │
│ P0-08  Single sign-in sync                                      │
│ P1-06  Unify golden catalog query key                           │
│ P1-07  Cached saved meal count                                  │
├─────────────────────────────────────────────────────────────────┤
│ Exit: Homepage TTI down; generator tappable; join lands on hall│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SPRINT B — Stove & browse (weeks 3–4)                           │
│ Goal: Recipe → cook in 1 tap; Explore shows food first          │
├─────────────────────────────────────────────────────────────────┤
│ P0-03  Sticky mobile cook bar                                    │
│ P0-06  Explore food above fold                                  │
│ P1-01  Defer Framer vote modals                                 │
│ P1-02  Generator collapsed first-run + LS debounce              │
│ P1-03  mealFocusMode no layout flip                             │
│ P1-04  Explore filter debounce                                  │
│ P1-12  ?cook=1 deep link                                        │
│ P1-13  Explore CLS skeletons                                    │
│ P1-17  Recipe hero priority                                     │
│ P1-18  Explore visibleCount 4 mobile                            │
│ P1-14  Dead code PR1 + recipe route consolidate (start)         │
├─────────────────────────────────────────────────────────────────┤
│ Exit: Recipe→Cook 1 tap; Explore first row visible; gen <15s    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SPRINT C — Hall session (weeks 5–6)                             │
│ Goal: Hall ops fast; authenticated path lean                    │
├─────────────────────────────────────────────────────────────────┤
│ P1-05  Shared React Query (activity, deals)                      │
│ P1-08  Scope hall providers to /hall/*                          │
│ P1-09  Homepage mobile diet                                     │
│ P1-10  /hall/shopping-list route                                │
│ P1-11  Shopping bottom sheet                                    │
│ P1-14  Dead code + legacy explore recipe redirect (finish)      │
│ P1-16  Hall dashboard action order                              │
├─────────────────────────────────────────────────────────────────┤
│ Exit: Hall dashboard ≤3 API calls; shopping findable              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SPRINT D — Scale prep (after 10 hall pilots, not before)        │
├─────────────────────────────────────────────────────────────────┤
│ P2-01 … P2-13 as metrics warrant                                │
│ Re-evaluate P3 list only with production profiling data         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SPRINT E — Navigation v3 (IA project, not perf-only)            │
├─────────────────────────────────────────────────────────────────┤
│ P2-07  Tab shell + scoped prefetch                              │
│ P2-08  Bottom tab bar                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

# Impact summary

| Tier | Issues | Est. adoption impact | Eng weeks |
|------|--------|----------------------|-----------|
| **P0** | 8 | **Unblocks hall join + first meal + cook** | **2–3** |
| **P1** | 18 | **−30–50% abandonment on key paths** | **4–6** |
| **P2** | 13 | **Ready for 20–100 halls** | **6–10** |
| **P3** | 27 | **None if shipped early** | **Wasted** |

**If you only ship one week:** Sprint A entirely.  
**If you ship two:** A + B (cook bar + Explore food-first).  
**Do not** start Sprint D until **10 halls** hit week-1 activity.

---

# Decision checklist (use in PR review)

Before merging a performance PR, require **yes** to at least one:

- [ ] Shaves **≥10%** off time-to-first-meal on 4G mobile (measure or reason)  
- [ ] Fixes a **P0/P1 mobile Safari** issue from this doc  
- [ ] Removes a **duplicate fetch** on a path with **&gt;30%** session share (`/`, `/generator`, `/explore`, `/hall`, `/recipes/*`)  
- [ ] **Deletes** dead/duplicate code on a hot path (criterion 4)  
- [ ] Unblocks **hall join → first vote/cook** funnel  

If none apply → **P3 — close the PR.**

---

*Priorities v2 supersede technical-severity labels in `performance-audit-v3.md`. Revisit when 10 halls complete 4-week North Star or first Stripe conversion.*
