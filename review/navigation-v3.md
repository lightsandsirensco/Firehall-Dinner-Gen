# Navigation v3 — Discover · Tonight · Hall · Me

**Date:** June 22, 2026  
**Role:** Senior product designer  
**Inputs:** `screen-map-v3.md`, `firefighter-user-journeys.md`, `product-audit-v3.md`  
**Goal:** One app mental model for shift night — not a recipe website with hall features bolted on.

---

## Executive summary

Today the product navigates like a **content site**: Home, Browse, Wheel, Pizza, Ideas, Account, Hall — plus hidden ops URLs (`/halls/:uuid`, hash shopping lists, orphan activity pages). Crews think in **four questions**:

1. **What's out there?** → Discover  
2. **What are we cooking tonight?** → Tonight  
3. **What does the hall need?** → Hall  
4. **What's my setup?** → Me  

v3 replaces the 7-item header with a **persistent bottom tab bar** (mobile-first) and a **collapsed top bar** (logo + context). Marketing homepage stays at `/` for SEO and cold traffic; **returning users skip it**.

---

## Design principles

| Principle | Rule |
|-----------|------|
| **One home per job** | Each tab has exactly one scroll home. No parallel dashboards. |
| **Settings ≠ home** | Crew lands on Hall tab, not billing/settings. |
| **Cook is default** | Opening a recipe from Tonight or Hall opens Cook Mode first. |
| **SEO outside shell** | Guides, SEO landings, about — no tab bar; "Open in app" CTA. |
| **One label per action** | Kill synonym CTAs (see copy table). |
| **Deep links resolve inward** | `/vote/:id`, `/hall/join?token=` open inside correct tab. |

---

## Information architecture

```
┌─────────────────────────────────────────────────────────────┐
│  [Hall name · B Shift ▾]              [🔔] [Avatar]        │  ← context bar (optional)
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     TAB CONTENT                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Discover  │  Tonight  │  Hall  │  Me                        │  ← bottom tabs
└─────────────────────────────────────────────────────────────┘
```

### Tab definitions

| Tab | User question | Primary actions | Auth |
|-----|---------------|-----------------|------|
| **Discover** | "What can we cook?" | Search, filters, collections, guides, save to hall | Guest OK |
| **Tonight** | "What are we making *now*?" | Generate, wheel, active vote, cook mode, personal list | Guest OK |
| **Hall** | "What does the crew need?" | Dashboard, vote, shopping, canteen, shift, deals, favorites | Join for shared |
| **Me** | "My account & prefs" | Profile, halls list, plans, history, sign in | Guest = sign-in CTA |

---

## Tab 1 — Discover

**Replaces:** Header "Browse Recipes", `/explore`, `/recipes`, homepage meal rails, most collection index pages.

### Home screen (`/discover`)

```
┌──────────────────────────────┐
│ 🔍 Search meals…              │
├──────────────────────────────┤
│ [All][Classics][Quick][BBQ]…  │  ← horizontal chips (not 280px filters)
├──────────────────────────────┤
│ Editorial rail: Hall Ideas    │  → 1 guide, not /guides index
├──────────────────────────────┤
│ Recipe grid (food first)      │
└──────────────────────────────┘
```

### Sub-routes (stack navigation)

| Route | Screen |
|-------|--------|
| `/discover` | Grid + chips + search |
| `/discover/collections/:id` | top-rated, hall-of-fame, breakfast, smoothies, pizza |
| `/discover/guides` | Guides index (moved from header) |
| `/discover/guides/:slug` | Article |
| `/recipes/:slug` | Recipe detail → **Tonight cook sheet** when opened from Discover |

### Demoted / redirected

| Old | New |
|-----|-----|
| `/explore` | `/discover` (301) |
| `/recipes` | `/discover` |
| `/top-rated-recipes` | `/discover/collections/top-rated` |
| `/hall-of-fame` | `/discover/collections/hall-of-fame` |
| `/breakfast`, `/smoothies`, `/pizza` | `/discover/collections/...` |
| Homepage featured rails | Removed — Discover is the catalog |

### Header in Discover

No site header links. Top: search only. Bottom tab highlights Discover.

---

## Tab 2 — Tonight

**Replaces:** `/generator` as primary nav item, header "Find a Meal" CTA, scattered vote entry points.

### Home screen (`/tonight`)

Tonight is a **state machine**, not a link farm:

```
┌──────────────────────────────┐
│ Tonight · 8 crew              │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │  [ Generate ]  [ Wheel ]  │ │  ← two big actions
│ └──────────────────────────┘ │
│                              │
│ ACTIVE VOTE (if any)         │  ← inline card, not buried
│ ┌──────────────────────────┐ │
│ │ Chili vs Tacos · 4 votes  │ │
│ │ [Open vote] [Share]       │ │
│ └──────────────────────────┘ │
│                              │
│ TONIGHT'S PICK (if set)      │
│ Recipe card → Cook Mode CTA  │
└──────────────────────────────┘
```

### Sub-routes

| Route | Screen |
|-------|--------|
| `/tonight` | Hub (above) |
| `/tonight/generate` | Full generator (current `/generator` UI, simplified filters) |
| `/tonight/wheel` | Classics wheel |
| `/tonight/vote/:voteId` | Vote participate (chrome: Tonight tab + hall name) |
| `/tonight/recipe/:slug` | Cook Mode **default**; swipe for full recipe |
| `/tonight/list` | Personal shopping list (modal → full screen on small phones) |

### Redirects

| Old | New |
|-----|-----|
| `/generator` | `/tonight/generate` |
| `/wheel` | `/tonight/wheel` |
| `/vote/:id` | `/tonight/vote/:id` |

### Kill duplicate CTAs

| Retire | Keep |
|--------|------|
| "Find a Meal" (header) | — |
| "Pick Tonight's Meal" | **"Generate"** on Tonight tab |
| "Hall Match" | **"Generate"** |
| "Crew Meal Picker" | **"Generate"** |
| "Spin the Wheel" / "Classics Wheel" | **"Wheel"** |

---

## Tab 3 — Hall

**Replaces:** `/hall` + scattered `/hall/*` orphans + `/halls/:id` as accidental landing.

### Home screen (`/hall`)

Keep `HallDashboardV2` content but **restructure as rows** (not maze of teasers + full pages):

| Row | Tap → | Notes |
|-----|-------|-------|
| **Tonight on shift** | Shift dashboard | Header shift pill |
| **Quick actions** | Generate, Wheel, Vote, Shopping | Keep 2×2 grid |
| **Active vote** | Vote sheet | Promote from highlight card |
| **Shopping list** | `/hall/shopping` | **New route** — not hash |
| **Supplies & canteen** | `/hall/supplies` | Merge canteen + shortages |
| **Protein deals** | `/hall/deals` | Rename from protein-deals in UI |
| **Activity** | Inline expand or `/hall/activity` | Stop orphan teaser → dead end |
| **Leaderboard** | Inline expand or `/hall/leaderboard` | Same |
| **Hall favorites** | `/hall/favorites` | Was `/favorites` |
| **Settings** | `/hall/settings` | Captain only emphasis |

### Sub-routes

| Route | Screen | Was |
|-------|--------|-----|
| `/hall` | Dashboard | `/hall` |
| `/hall/join` | Join/create sheet | `/hall/join` |
| `/hall/shift/:shiftId` | Shift ops | `/hall/:hallId/shift/:shiftId` |
| `/hall/shopping` | Shared grocery list | `#hall-shared-shopping-list` on settings |
| `/hall/supplies` | Canteen + hall supplies | `/hall/canteen` + settings panel |
| `/hall/deals` | Protein deals | `/hall/protein-deals` |
| `/hall/deals/setup` | Store setup | unchanged |
| `/hall/favorites` | Crew classics | `/favorites` |
| `/hall/activity` | Full feed | `/hall/activity` |
| `/hall/leaderboard` | Full board | `/hall/leaderboard` |
| `/hall/settings` | Members, invites, billing, analytics | `/halls/:hallId` |
| `/hall/settings/members` | Member management | section |
| `/hall/settings/billing` | Hall Pro | `HallProAdminPanel` |

### Critical redirect

```
POST /join  →  /hall          (NOT /halls/:id)
POST /create →  /hall/onboarding or /hall
```

### Guest / no-hall state

Hall tab never shows dashed "locked" cards. Instead:

```
┌──────────────────────────────┐
│ Join your crew's hall         │
│ [Scan QR]  [Enter code]       │
│                               │
│ Tonight still works →         │  link to Tonight tab
└──────────────────────────────┘
```

---

## Tab 4 — Me

**Replaces:** `/account` as destination; absorbs local history.

### Home screen (`/me`)

| Section | Content |
|---------|---------|
| Profile | Name, shift prefs, appliances, reminders |
| My halls | List → tap opens **Hall tab** (not settings) |
| History | Local meals, wheel, votes (`/hall-history` merged here) |
| Plans | Personal tier only |
| Help | FAQ, feedback, about |
| Sign out | |

### Sub-routes

| Route | Screen |
|-------|--------|
| `/me` | Profile home |
| `/me/halls` | Hall switcher |
| `/me/plans` | Personal plans |
| `/me/history` | Device history |
| `/me/help` | FAQ |

### Redirects

| Old | New |
|-----|-----|
| `/account` | `/me` |
| `/hall-history` | `/me/history` |
| `/plans` | `/me/plans` |
| `/faq` | `/me/help` (in-app); `/faq` remains for SEO |

### Remove from Me

- **Create hall** / **Join hall** full forms → single entry on Hall tab join sheet  
- Hall Pro enable → Hall → Settings → Billing only  

---

## Global chrome

### Bottom tab bar (mobile + tablet)

| Tab | Icon | Badge |
|-----|------|-------|
| Discover | Grid/search | — |
| Tonight | Flame/chef hat | Dot if active vote |
| Hall | Shield/house | Count if shopping items pending |
| Me | User | — |

- Visible on all **app shell** routes  
- Hidden on: vote fullscreen (optional), cook mode, marketing `/`, admin, SEO landings  
- `pb-safe` + `pb-safe-nav` on all tab roots  

### Top bar (app shell)

| Left | Center | Right |
|------|--------|-------|
| — | Hall name + shift (if member) | Notifications (future), avatar → Me |

**Remove from top:** 7-link nav, duplicate generator CTA, L&S badge (move to Me → About).

### Desktop (≥1024px)

- Same 4 tabs as **left sidebar** or bottom bar — do not reintroduce 7-link top nav  
- Content max-width per tab (Hall: `max-w-lg` kept)  

---

## Marketing shell (no tabs)

| Route | Treatment |
|-------|-----------|
| `/` | Guest marketing homepage; authed users → redirect `/tonight` or `/hall` |
| `/hall-program` | Marketing; CTA → join sheet with intent preserved |
| `/about`, SEO landings, `/guides/*` (from Google) | Full width, sticky **"Open Tonight"** FAB → app shell |
| `/faq` | Public SEO; duplicate content slimmed on homepage |

---

## Copy standardization (v3)

| Action | v3 label | Retire |
|--------|----------|--------|
| Open Tonight hub | — | "Home" as app home |
| Run generator | **Generate** | Find a Meal, Pick Tonight's Meal, Hall Match |
| Spin wheel | **Wheel** | Classics Wheel, Spin the Wheel |
| Browse catalog | **Discover** | Browse Recipes, All recipes, Explore Meals |
| Shared hall list | **Shopping list** | Shared grocery list |
| Canteen + stock | **Supplies** | Canteen, Hall supplies (user-facing) |
| Enable paid features | **Hall Pro** | View plans (on paywalls) |
| Crew ballot | **Vote** | Hall Vote, Let the crew vote |
| Admin page | **Hall settings** | Manage hall, `/halls/...` |

---

## Paywall & permission placement

| Gate | v3 surface | CTA |
|------|------------|-----|
| Hall Pro — shopping | `/hall/shopping` inline lock | "Ask captain" / "Enable Hall Pro" → settings/billing |
| Hall Pro — supplies | `/hall/supplies` | Same |
| Hall Pro — deals | `/hall/deals` | Same |
| Sign in — shared features | Hall tab join card | Sign in sheet |
| Captain — billing | `/hall/settings/billing` | Only place to start trial |

**Remove:** `PaywallGate` → `/plans` for Hall features.

---

## Migration phases

### Phase 0 — Quick fixes (no tab bar yet)

1. Join/create → `/hall`  
2. Add `/hall/shopping` route (move panel from settings)  
3. Cook Mode default from hall/generator links  
4. Hide duplicate join form on `/hall/join` when token present  

### Phase 1 — Tab bar + redirects

1. Ship `AppTabShell` with 4 tabs  
2. 301: `/generator` → `/tonight/generate`, `/explore` → `/discover`  
3. `/halls/:id` → `/hall/settings` (alias)  
4. Authed `/` → `/tonight`  

### Phase 2 — Consolidation

1. Merge canteen + supplies  
2. Move `/favorites`, `/hall-history` under Hall/Me  
3. Collapse collection pages into `/discover/collections/*`  
4. Delete dead page files  

### Phase 3 — Polish

1. Tonight hub state machine (active vote, tonight's pick)  
2. Inline activity/leaderboard on Hall home  
3. Desktop sidebar parity  
4. Analytics: tab + funnel events  

---

## Success metrics

| Metric | Current problem | v3 target |
|--------|-----------------|-----------|
| Time to first recipe (new user) | Homepage scroll | <10s via Tonight tab |
| Join → dashboard rate | Lands on settings | >90% land `/hall` |
| Shopping list opens / week | Hash hunt | Dashboard row → dedicated route |
| Tab distribution | 80% generator via SEO header | Balanced Tonight + Hall |
| Return visit D7 | Single-player generator | Hall tab engagement |

---

## What we are not doing

- Renaming brand or killing SEO URLs  
- Merging admin routes  
- Removing guest access to Tonight/Discover  
- Putting Pizza Night in top-level nav  

---

*See `screen-map-v3.md` for full route inventory and `user-flows-v3.md` for journey diagrams.*
