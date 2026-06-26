# Personal-First Product — Firehall Meals

**Date:** June 25, 2026  
**Role:** Chief Product Officer  
**Status:** Strategic refactor plan (not yet implemented)

---

## Executive Summary

Firehall Meals was built as a **hall operating system** with personal features bolted on. The product works for solo firefighters today (generator, wheel, cook mode, local saves) but **talks, navigates, and onboards like a hall product**.

**New philosophy:**

```
Personal Account
       ↓
Optional Hall Membership (collaboration layer)
```

Every firefighter should get value **before** joining a hall. A hall is not the product — it is how crews **sync** what individuals already do: pick dinner, cook it, save favorites, build a grocery list.

| Dimension | Hall-first (today) | Personal-first (target) |
|-----------|-------------------|---------------------------|
| Default identity | "Join your hall" | "Your meals, your shift" |
| Sign-in reason | Sync hall + join crew | Sync saves + meal history |
| Primary tab mental model | Hall dashboard | Tonight (my shift) |
| Onboarding funnel | Join → Welcome → Tonight | Sign in → Pick meal → (optional) Join hall |
| Empty states | "Join hall to use this" | "Works solo — invite crew when ready" |
| History & favorites | "Hall history" / "Hall classics" | "My meals" / "My favorites" |
| Pro upsell | Hall Pro for crew tools | Personal free; Hall Pro = collaboration upgrade |

**What we are NOT doing:** Removing hall functionality. Votes, shared shopping lists, canteen, protein deals, invites, and captain tools remain — they move behind an explicit **collaboration layer** instead of blocking the personal experience.

---

## Product Hierarchy (Target State)

```
┌─────────────────────────────────────────────────────────┐
│  GUEST (no account)                                     │
│  Generator · Wheel · Browse · Cook Mode · Local saves   │
└───────────────────────────┬─────────────────────────────┘
                            │ Sign in
                            ▼
┌─────────────────────────────────────────────────────────┐
│  PERSONAL ACCOUNT                                       │
│  Synced saves · Meal history · Grocery lists ·        │
│  Shift reminders · Tonight hub (solo) · Export          │
└───────────────────────────┬─────────────────────────────┘
                            │ Join or create hall (optional)
                            ▼
┌─────────────────────────────────────────────────────────┐
│  HALL MEMBERSHIP (collaboration layer)                  │
│  Shared vote · Shared shopping list · Canteen ·       │
│  Protein deals · Member roles · Invites · Hall Pro      │
└─────────────────────────────────────────────────────────┘
```

**Billing alignment:**

| Tier | Scope | Features |
|------|-------|----------|
| **Guest** | Device | Generator, wheel, browse, local-only |
| **Personal** (free) | User | Cross-device sync, personal meal history, personal grocery list, shift reminders |
| **Hall Pro** (per hall) | Crew | Shared shopping, cloud hall history, canteen management, protein deals |

---

## Screen-by-Screen Audit

For every surface: **"Does this still provide value if the firefighter is NOT connected to a hall?"**

Legend: ✅ Personal value today · ⚠️ Partial · ❌ Hall-only · 🔧 Refactor required

---

### App shell & navigation

| Surface | File | Hall required? | Verdict | Refactor |
|---------|------|----------------|---------|----------|
| Bottom tab: Discover | `app-nav.ts` | No | ✅ | Minor copy: de-emphasize "hall ideas" as primary |
| Bottom tab: Tonight | `app-nav.ts` | No | ⚠️ | 🔧 Solo Tonight must work without join CTAs dominating |
| Bottom tab: Hall | `app-nav.ts` | Implicit | ❌ | 🔧 Rename tab **"Crew"** or **"Hall"** with solo empty state → personal dashboard preview + "Invite crew" |
| Bottom tab: Me | `app-nav.ts` | No | ⚠️ | 🔧 Settings tile routes to `/hall/join` without hall — should be `/me/settings` |
| App top bar logo | `app-top-bar.tsx` | No | ✅ | Default post-login landing: `/tonight` (keep) |
| Site header (marketing) | `site-header.tsx` | No | ⚠️ | 🔧 "My Hall" heart icon → "Saved" or "Me"; hall link demoted |
| Hall sub-nav | `hall-sub-nav.tsx` | Yes | ❌ | Keep inside Hall/Crew tab only; never surface to solo users in Tonight |

**Navigation refactor (P0):**

1. **Me → Settings** always goes to personal settings (`/me/profile`), not hall join.
2. **Hall tab** shows personal stats + collaboration upsell when no cloud hall; full crew dashboard when joined.
3. **Site header** primary account link → `/me`, not hall.

---

### Onboarding & activation

| Surface | File | Hall required? | Verdict | Refactor |
|---------|------|----------------|---------|----------|
| `HallActivationGate` | `hall-activation-gate.tsx` | **Yes** | ❌ | 🔧 **Replace** with `PersonalActivationGate`: Sign in → `/tonight?welcome=1` → optional hall prompt |
| Hall join page | `hall-join-page.tsx` | No (entry) | ✅ | Keep; demote from default post-sign-in path |
| Hall welcome | `hall-welcome-page.tsx` | Yes | ❌ | Keep for hall joiners only; not global onboarding |
| Onboarding steps UI | `hall-onboarding-steps.tsx` | Hall | ❌ | 🔧 New steps: **Account → First meal → (Optional) Crew** |
| Account guest card | `account-page.tsx` | No | ✅ | Good copy already mentions guest mode |
| Post-sign-in redirect | `auth/context.tsx` | — | ⚠️ | 🔧 Land on `/tonight`, never force `/hall/join` |

**Activation refactor (P0):**

```typescript
// Today: Join → Welcome → Tonight (hall-required step 1)
// Target: Tonight → (banner) "Cooking solo? You're set. Invite crew anytime."

onboardingStep():
  1 → /tonight?welcome=1        // First value: pick or spin
  2 → /me/saved                 // Optional: save a meal
  3 → /hall/join                // Optional: only if user taps "Add crew"
```

- `markActivationSkipped` becomes the **default** for new sign-ins (not an escape hatch).
- Hall join funnel triggers only from: invite link, QR, explicit "Join hall" CTA, or captain create flow.

---

### Homepage & marketing

| Surface | File | Hall required? | Verdict | Refactor |
|---------|------|----------------|---------|----------|
| Homepage hero | `home-hero.tsx` | No | ⚠️ | 🔧 Guest CTA "Join your hall" → **"Pick tonight's meal"**; hall join tertiary |
| Homepage hero (signed in) | `home-hero.tsx` | No | ✅ | Tonight CTA is correct |
| Homepage SEO blocks | `home.tsx` | No | ✅ | Recipe-focused; add personal CTA |
| About / FAQ | `about.tsx`, `faq.tsx` | No | ⚠️ | 🔧 Lead with individual value; hall as optional upgrade |
| SEO landing pages (×7) | `seo-landing-page.tsx` | No | ✅ | Recipe SEO works solo; add "Save to my meals" CTA |
| Red Lead page | `firefighter-red-lead-recipe-page.tsx` | No | ✅ | Lead magnet; email → personal onboarding sequence |

**Homepage CTA hierarchy (target):**

1. **Pick tonight's meal** → `/generator`
2. **Spin the wheel** → `/wheel`
3. Sign in to sync saves
4. *Join your crew's hall* (secondary, not hero)

---

### Discover tab

| Surface | File | Hall required? | Verdict | Refactor |
|---------|------|----------------|---------|----------|
| Discover hub | `discover-page.tsx` | No | ✅ | 🔧 Subtitle: "Browse meals, spin the wheel" — remove "hall ideas" from lead |
| Generator | `generator.tsx` | No | ✅ | Uses local `hall-profile` for crew size — rename UX to **"Crew size"** not "hall" |
| Wheel | `classics-wheel.tsx` | No | ✅ | Streak is personal; rename "Hall streak" → **"Cook streak"** |
| Explore / recipes | `explore.tsx`, catalog pages | No | ✅ | Full value solo |
| Guides | `guides-*` | No | ✅ | Content works solo |
| Pizza, smoothies, breakfast | various | No | ✅ | No change |

---

### Tonight tab (shift command center)

| Surface | File | Hall required? | Verdict | Refactor |
|---------|------|----------------|---------|----------|
| Pick meal | `tonight-page.tsx` | No | ✅ | Keep |
| Spin wheel | `tonight-page.tsx` | No | ✅ | Keep |
| Continue session | `use-tonight-hub.ts` | No | ✅ | Uses local history — works solo |
| **Hall Vote** | `tonight-page.tsx` | Partial | ⚠️ | 🔧 Solo: "Vote with friends" — create vote works without cloud hall (local vote exists); label **"Crew vote"** with upsell to sync |
| **Shopping list** | `tonight-page.tsx` | **Yes** | ❌ | 🔧 **Personal grocery list** for solo users; shared list when in hall |
| Assign runner | `tonight-page.tsx` | Yes | ❌ | Hide for solo; show when hall + Pro |
| Cook / open recipe | `tonight-page.tsx` | No | ✅ | Keep |
| **Need Anything (canteen)** | `tonight-page.tsx` | **Yes** | ❌ | 🔧 Solo: hide or show **"Personal pantry"** stub; canteen only with hall |

**Tonight refactor (P0):**

Reorganize sections by dependency:

```
ALWAYS (personal)
├── What's for dinner?     → Generator, Wheel, Continue
├── Cook                   → Continue cooking, Open recipe
└── My list                → Personal grocery list (NEW surface)

WHEN IN HALL (collaboration)
├── Crew vote              → Start/view vote
├── Shared shopping        → Hall list + runner
└── Station staples        → Canteen
```

`use-tonight-hub.ts`: when `!hallId`, `shoppingHref` → `/me/list` (personal), not `/hall/join`.

---

### Hall / Crew tab

| Surface | File | Hall required? | Verdict | Refactor |
|---------|------|----------------|---------|----------|
| Hall dashboard | `hall-page.tsx` | Partial | ⚠️ | 🔧 **Dual mode:** Solo = personal stats dashboard; Joined = crew dashboard |
| Hall dashboard v2 | `hall-dashboard-v2.tsx` | Partial | ⚠️ | 🔧 Split: `PersonalDashboard` + `CrewDashboard` sections |
| Hall permission gate | `hall-permission-gate.tsx` | Partial | ✅ | `allowGuest` already enables local mode — reframe as personal |
| Hall platform banner | `hall-platform-banner.tsx` | No | ⚠️ | 🔧 "No hall yet" → **"Cooking solo"** + soft "Add your crew" (not blocking) |
| Hall sub-pages | history, canteen, deals | Yes | ❌ | Keep as crew collaboration; accessible only when hall joined |
| Hall settings | `hall-detail-page.tsx` | Yes | ❌ | Keep; link from Crew tab when member |
| Shift dashboard | `hall-shift-page.tsx` | Partial | ⚠️ | Crew feature; optional for solo |

**Hall tab refactor (P1):**

When `halls.length === 0` and authenticated:

- Show **personal** stats: meals cooked, wheel spins, saved count, cook streak.
- Show **"Add your crew"** card (create/join) — not an empty error state.
- Show preview of crew features (vote, shared list) with "Unlock with a hall" labels.

When guest: keep current local dashboard (already works).

---

### Me tab

| Surface | File | Hall required? | Verdict | Refactor |
|---------|------|----------------|---------|----------|
| Me hub | `me-page.tsx` | No | ⚠️ | 🔧 Settings → personal settings; add **"My grocery list"** tile |
| Profile | `account-page.tsx` | No | ⚠️ | 🔧 "Your halls" section moves below personal profile; not above fold |
| Saved meals | `favorites.tsx` | No | ⚠️ | 🔧 Rename **"My Saved Meals"**; hall classics → **"Crew favorites"** (section, only if hall) |
| Subscription | `plans-page.tsx` | No | ⚠️ | 🔧 Lead with Personal (free); Hall Pro = "For your crew" |
| Settings tile | `me-page.tsx` | **Routes to hall** | ❌ | 🔧 → `/me/profile` or new `/me/settings` |

---

### Recipe & cook flows

| Surface | File | Hall required? | Verdict | Refactor |
|---------|------|----------------|---------|----------|
| Recipe detail | `golden-recipe-page.tsx`, etc. | No | ✅ | Full value |
| Cook Mode | `cook-mode.tsx` | No | ✅ | Logs to local history — personal |
| Start cooking button | `start-cooking-button.tsx` | No | ✅ | Keep |
| Shopping list modal | `shopping-list-modal.tsx` | Partial | ⚠️ | 🔧 Personal list always; "Add to crew list" only with hall |
| Save / favorite button | recipe cards | No | ✅ | Personal save works |
| Hall favorite button | `hall-favorite-button.tsx` | Partial | ⚠️ | 🔧 Label **"Save for crew"** when in hall; hide when solo |
| Hall vote flow on saves | `favorites.tsx` | Partial | ⚠️ | 🔧 **"Share vote with crew"** — only if hall exists |

---

### Hall collaboration (keep, don't demote features)

| Surface | Hall required? | Verdict | Notes |
|---------|----------------|---------|-------|
| Hall join / invite | Yes | ✅ | Entry via invite only — correct |
| Hall vote modal | Partial | ✅ | Works locally; cloud sync is collaboration bonus |
| Shared shopping list | Yes + Pro | ✅ | Crew feature — correct gate |
| Canteen | Yes + Pro | ✅ | Station feature |
| Protein deals | Yes + Pro | ✅ | Station feature |
| Member roles | Yes | ✅ | Captain / canteen / member |
| Hall Pro billing | Yes | ✅ | Per-hall subscription — correct |
| Invite panel (QR, code) | Yes | ✅ | Captain tool |

---

### Admin (unchanged)

Admin surfaces are internal — no personal-first refactor needed.

---

## Feature Audit Matrix

| Feature | Solo value? | Current UX | Target UX | Priority |
|---------|-------------|------------|-----------|----------|
| Generator | ✅ Yes | "Hall Match" | "Match my crew size" | P1 copy |
| Wheel | ✅ Yes | "Hall streak" | "Cook streak" | P1 copy |
| Cook Mode | ✅ Yes | Neutral | "Log to my meals" | P2 |
| Personal saves | ✅ Yes | Mixed with hall classics | **My Saved Meals** first | P0 |
| Meal history | ✅ Yes (local) | "Hall history" | **My meal history** | P0 |
| Grocery list (recipe) | ✅ Yes | Modal export | **My grocery list** (persistent) | P0 |
| Grocery list (shared) | ❌ No | Blocks Tonight | Crew section only | P0 |
| Hall vote | ⚠️ Partial | Assumes hall | Works solo; **sync with crew** upsell | P1 |
| Canteen | ❌ No | Blocks Tonight | Crew tab only | P0 |
| Protein deals | ❌ No | Hall page | Crew tab only | — |
| Shift reminders | ✅ Yes | Profile form | Personal settings | P2 |
| Cross-device sync | ✅ Yes | Tied to sign-in | Sign-in value prop #1 | P0 |
| Hall invite QR | ❌ No | Captain tool | Unchanged | — |
| Hall Pro | ❌ No | Upsell in Tonight | Upsell in Crew tab + plans | P1 |

---

## Naming & Copy Refactor

Internal code can keep `hall-*` prefixes where they mean cloud crew entity. **User-facing copy** must change:

| Today | Target |
|-------|--------|
| Join your hall | **Join your crew** (optional) |
| Hall Match | **Crew Match** or **Match my crew** |
| Hall history | **My meals** (personal) / **Crew meal log** (hall Pro) |
| Hall favorites / Hall classics | **My favorites** / **Crew favorites** |
| Hall streak | **Cook streak** |
| No hall yet | **Cooking on your own** |
| Join hall to use this | **Add your crew to share this** |
| Hall Pro | **Crew Pro** (optional rebrand) or keep Hall Pro with subtitle "for your station" |
| My Hall (nav) | **Crew** or **Station** |
| Hall Vote | **Crew vote** |
| Hall ideas (Discover) | **Shift guides** |

**Files to update:** `client/src/lib/brand-copy.ts` (primary), then grep for hardcoded "hall" strings in user-visible components.

---

## New Personal Surfaces (build list)

These are **adoption-critical** refactors — not new product features, but making existing behavior first-class:

### P0 — Unblock solo value

| # | Surface | Description | Based on |
|---|---------|-------------|----------|
| 1 | **Personal grocery list** | Persistent list at `/me/list`; add from recipe modal; replaces `/hall/join` dead-end in Tonight | Extend `shopping-list-modal.tsx` + localStorage |
| 2 | **Remove hall activation gate** | Replace `HallActivationGate` with optional welcome on Tonight | `hall-activation-gate.tsx` |
| 3 | **Me → Settings fix** | Settings tile → `/me/profile`, not `/hall/join` | `me-page.tsx` |
| 4 | **Tonight solo layout** | Personal sections first; crew sections collapsed with "Add crew" | `tonight-page.tsx` |
| 5 | **Saved meals rename** | Page title, nav, analytics events | `favorites.tsx`, `brand-copy.ts` |
| 6 | **Homepage guest CTA** | Primary = generator, not join hall | `home-hero.tsx` |

### P1 — Clarify hierarchy

| # | Surface | Description |
|---|---------|-------------|
| 7 | **Hall tab dual mode** | Personal dashboard when no cloud hall | `hall-page.tsx`, `hall-dashboard-v2.tsx` |
| 8 | **Personal meal history page** | `/me/history` — reframe `hall-history-page` local view | New route or split page |
| 9 | **Plans page hierarchy** | Personal free featured; Hall Pro as crew upgrade | `plans-page.tsx` |
| 10 | **Shopping modal split** | "Save to my list" vs "Add to crew list" | `shopping-list-modal.tsx` |
| 11 | **Copy pass** | brand-copy.ts + top 20 user-visible strings | `brand-copy.ts` |

### P2 — Polish

| # | Surface | Description |
|---|---------|-------------|
| 12 | **Personal activation funnel** | Account → first meal → optional crew | New `personal-activation/` |
| 13 | **Site header** | Demote hall heart; promote Me/saved | `site-header.tsx` |
| 14 | **Discover subtitle** | Remove hall-first framing | `discover-page.tsx` |
| 15 | **Rename analytics events** | `hall_*` → `personal_*` / `crew_*` where user-facing | `lib/analytics` |

---

## Tonight Page — Target Wireframe

```
┌──────────────────────────────────────┐
│  Tonight                             │
│  What's for dinner on your shift?    │
├──────────────────────────────────────┤
│  PICK DINNER                         │
│  ▸ Crew Match                        │
│  ▸ Spin the wheel                    │
│  ▸ Continue last session             │
├──────────────────────────────────────┤
│  COOK                                │
│  ▸ Continue cooking                  │
│  ▸ Open tonight's recipe             │
├──────────────────────────────────────┤
│  MY LIST                             │
│  ▸ View grocery list (3 items)       │
│  ▸ Add from last recipe              │
├──────────────────────────────────────┤
│  ┌─ CREW (optional) ─────────────┐  │
│  │  Cooking solo? Invite your     │  │
│  │  crew to vote and shop together│  │
│  │  [ Add crew ]                  │  │
│  └────────────────────────────────┘  │
│                                      │
│  — OR when hall joined —             │
│  CREW                                │
│  ▸ Start crew vote                   │
│  ▸ Shared shopping list              │
│  ▸ Station staples                   │
└──────────────────────────────────────┘
```

---

## Hall Tab — Target Wireframe (no cloud hall)

```
┌──────────────────────────────────────┐
│  Crew                                │
├──────────────────────────────────────┤
│  YOUR SHIFT STATS                    │
│  12 meals cooked · 8 wheel spins     │
│  5 saved · 3-day cook streak         │
├──────────────────────────────────────┤
│  ┌─ ADD YOUR CREW ────────────────┐  │
│  │  Vote on dinner, share grocery  │  │
│  │  lists, and track station       │  │
│  │  staples together.              │  │
│  │  [ Create crew ] [ Join code ]  │  │
│  └─────────────────────────────────┘  │
├──────────────────────────────────────┤
│  RECENT MEALS (personal)             │
│  [Recently cooked strip]             │
└──────────────────────────────────────┘
```

---

## Data Model Notes (no breaking changes)

Today much "hall" data is already **device-local personal data** mislabeled:

| Store | Actual scope | Personal-first label |
|-------|--------------|---------------------|
| `hall-profile-store.ts` | Device crew-size prefs | **User cooking prefs** |
| `hall-history-store.ts` | Device meal log | **Personal meal history** |
| `hall-favorites-store.ts` | Device favorites keyed by local hallId | **Personal favorites** (solo) / sync to crew when joined |
| `saved-meals.ts` | Personal saves | **My saved meals** (already correct) |
| Cloud `/api/halls/*` | Crew collaboration | Unchanged |

**Migration strategy:** Rename user-facing strings first. Internal store keys can migrate in P2 with sync compatibility layer (`local-snapshots.ts` already handles merge).

---

## Onboarding Flows (comparison)

### Today — Hall-first

```
Sign in → FORCED /hall/join → /hall/welcome → /tonight?onboarding=1
                ↑
         Blocks entire app
```

### Target — Personal-first

```
Guest → Generator/Wheel (instant value)
         ↓ optional
Sign in → /tonight?welcome=1 ("Pick dinner — saves sync across devices")
         ↓ optional banner
      "Cooking with a crew? Join or create"
         ↓ only on explicit tap
      /hall/join → /hall/welcome → back to /tonight (crew sections unlocked)
```

### Invite flow (unchanged entry, better exit)

```
Scan QR / invite link → /hall/join → join → /hall/welcome → /tonight
                                              (crew sections visible)
```

Invite joiners still get crew context — but they could use the app solo first if they discover it elsewhere.

---

## Plans & Monetization (personal-first framing)

| Plan | Message |
|------|---------|
| **Personal** | "Free forever. Your meals, saves, and grocery lists — synced across devices." |
| **Hall Pro** | "For your crew. Shared shopping, station staples, meal log, and protein deals." |

**Rule:** Never paywall generator, wheel, cook mode, or personal saves.  
**Rule:** Hall Pro upsell appears in **Crew sections**, not blocking Tonight personal workflows.

---

## Implementation Roadmap

### Phase 1 — Stop blocking solo users (1 week)

- [ ] Disable or replace `HallActivationGate` default redirect to `/hall/join`
- [ ] Fix `me-page.tsx` Settings href
- [ ] Refactor `tonight-page.tsx` section order + solo grocery list path
- [ ] Update `home-hero.tsx` guest primary CTA
- [ ] `brand-copy.ts` pass: TONIGHT_HUB.hints.noHall, HALL_FAVORITES titles

### Phase 2 — Personal surfaces (1–2 weeks)

- [ ] Personal grocery list (`/me/list` + localStorage + sync hook)
- [ ] Split `shopping-list-modal.tsx` actions
- [ ] Hall tab dual-mode dashboard
- [ ] Rename Saved Meals page copy + hall classics conditional section

### Phase 3 — Copy & plans (1 week)

- [ ] Full brand-copy refactor
- [ ] Plans page hierarchy
- [ ] Site header demote hall
- [ ] Discover page subtitle

### Phase 4 — Activation & analytics (1 week)

- [ ] `PersonalActivationGate` (optional welcome, no force)
- [ ] Analytics event rename
- [ ] `/me/history` route (personal meal log)

---

## Success Metrics (personal-first)

| Metric | Hall-first (today) | Personal-first (target) |
|--------|-------------------|-------------------------|
| TTFV (new user) | ~2 min if joining vote; blocked if no hall | **< 60 sec** to generator/wheel |
| Sign-in conversion | "Join hall" pressure | "Sync my saves" motivation |
| % users with 0 halls at day 7 | Unknown (likely churn) | **> 40%** still active |
| Hall join rate | Forced funnel | **Opt-in** from engaged personal users |
| 4-week retention (any user) | N/A | **> 25%** personal OR hall |
| 4-week retention (hall) | North star | Unchanged north star for crew tier |

---

## What stays hall-first (intentionally)

These surfaces **should** require hall membership — they are the collaboration layer:

- Shared shopping list + grocery runner
- Station canteen management
- Protein deals by postal code
- Member management, invites, roles
- Hall Pro billing and admin
- Cloud-synced crew meal history (Pro)
- Captain settings and analytics

---

## CPO Sign-off

**Verdict:** The product **already works** for individual firefighters at the data layer. The refactor is **UX, navigation, and onboarding** — not a rewrite.

**Highest-leverage change:** Kill the forced hall join funnel. It trains users that Firehall Meals is "another hall app" instead of "my shift dinner tool that gets better with crew."

**Second-highest:** Personal grocery list in Tonight. A firefighter shopping for themselves gets daily value; crew list becomes the upgrade.

**Do not:** Remove Hall tab, votes, invites, or Pro features. **Reframe** them as collaboration on top of a personal account that already works alone.

---

## Appendix: Full Route Checklist

| Route | Solo OK? | Action |
|-------|----------|--------|
| `/` | ✅ | Fix guest CTA |
| `/discover` | ✅ | Copy tweak |
| `/tonight` | ⚠️ | Refactor sections |
| `/hall` | ⚠️ | Dual-mode dashboard |
| `/me` | ⚠️ | Fix settings link |
| `/me/profile` | ✅ | Reorder sections |
| `/me/saved` | ✅ | Rename + conditional crew section |
| `/me/subscription` | ✅ | Reframe plans |
| `/me/list` | 🆕 | Build personal grocery list |
| `/generator` | ✅ | Copy tweak |
| `/wheel` | ✅ | Streak rename |
| `/explore`, `/recipes/*` | ✅ | — |
| `/guides/*` | ✅ | — |
| `/vote/:id` | ✅ | — |
| `/hall/join` | ✅ | Opt-in entry only |
| `/hall/welcome` | Hall | Post-join only |
| `/hall/settings`, `/halls/:id` | Hall | — |
| `/hall/history` | Partial | Personal local OK; Pro for cloud |
| `/hall/canteen` | Hall | — |
| `/hall/protein-deals` | Hall | — |
| SEO pages | ✅ | Add save CTA |
| Admin | — | — |
