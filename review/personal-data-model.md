# Personal-First Data Model — Firehall Meals

**Date:** June 25, 2026  
**Role:** Chief Product Officer  
**Status:** Refactor in progress (identity types + sync keys shipped; full rename ongoing)

---

## Executive summary

**Old mindset:** Users belong to halls.  
**New mindset:** Users own accounts. Hall membership is optional (zero or more halls).

The codebase already had **two parallel models** mixed under `hall-*` naming:

| Concept | What it actually is |
|---------|---------------------|
| `HallProfile.hallId` | **Device `client_id`** — local snapshot identity |
| `fh_active_hall_id` | **Membership `hall_id`** — server crew entity |
| `hall-history-store` | **Personal meal log** — user/device scoped |
| `hall_favorites` sync key | **Personal pinned recipes** — user scoped |
| `hall_subscriptions` | **Crew billing** — hall scoped |

This document defines the target model, audits every feature by persona, and tracks the migration.

**Source of truth for personas:** `shared/identity/model.ts`  
**Source of truth for sync keys:** `shared/sync/types.ts`

---

## Identity hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  GUEST                                                      │
│  No session · device-local data only                        │
└───────────────────────────┬─────────────────────────────────┘
                            │ Sign in (magic link / OAuth)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  USER ACCOUNT (users.user_id)                               │
│  Profile · preferences · saved meals · personal sync        │
│  Plan: guest (runtime) | personal (default when signed in)  │
└───────────────────────────┬─────────────────────────────────┘
                            │ 0..N optional
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  HALL MEMBERSHIP (hall_memberships)                         │
│  Role: member | canteen_manager | captain                   │
│  Collaboration: shared list · canteen · deals · invites     │
│  Plan: hall_pro per hall (hall_subscriptions)               │
└─────────────────────────────────────────────────────────────┘
```

### Personas (product layer)

| Persona | Condition | Primary value |
|---------|-----------|---------------|
| **Guest** | No valid session | Generator, wheel, browse, cook mode, local saves/history |
| **Signed-in individual** | Authenticated, `halls.length === 0` | Cross-device sync, meal history, profile |
| **Hall member** | Member of ≥1 hall | Above + crew vote links, shared shopping (Pro), canteen view |
| **Hall admin** | Captain or canteen manager | Member tools + invites, settings, billing, list runner |

Resolved at runtime via `resolveProductPersona()` in `shared/identity/model.ts`.

---

## Storage scopes

### User-scoped (keyed by `user_id`)

| Table / API | Data |
|-------------|------|
| `users`, `user_profiles`, `user_preferences` | Account identity |
| `user_saved_recipes` | Saved meals (`/api/auth/saves`) |
| `user_subscriptions` | Personal plan (`guest` \| `personal`) |
| `user_data_snapshots` | Personal sync blobs (see sync keys below) |
| `auth_sessions` | Sessions |

### Hall-scoped (keyed by `hall_id`)

| Table / API | Data |
|-------------|------|
| `halls` | Crew entity, join code, settings |
| `hall_memberships` | User ↔ hall + role |
| `hall_subscriptions` | Hall Pro billing |
| `hall_invites` | QR / codes |
| `hall_shopping_lists` | Shared grocery runs |
| `hall_canteen_*` | Station staples |
| `hall_grocery_*`, `protein_deals` | Deals by postal code |
| `hall_shifts`, `hall_activity_events` | Crew ops / analytics |

### Device-scoped (localStorage, no auth)

| Key | Data |
|-----|------|
| `firehall_saved_meals` | Saved meals (guest) |
| `firehall_hall_history_v1` | Personal meal timeline |
| `firehall_hall_favorites_v1` | Pinned classics |
| `firehall_hall_profile_v1` | Crew size, labels (`client_id` inside) |
| `firehall_wheel_streak_v1` | Wheel streak |
| `fh_active_hall_id` | UI selection of membership hall |

### Ephemeral / session (no user or hall)

| Store | Data |
|-------|------|
| `hall_votes`, `hall_vote_ballots` | Link votes (session + fingerprint) |

---

## Cloud sync key migration

### Canonical keys (personal-first)

| Canonical key | Legacy key | Local storage | Content |
|---------------|------------|---------------|---------|
| `personal_favorites` | `hall_favorites` | `firehall_hall_favorites_v1` | Pinned recipe slugs |
| `personal_meal_history` | `hall_history` | `firehall_hall_history_v1` | Cook / generate / wheel / vote events |
| `cooking_preferences` | `hall_profile` | `firehall_hall_profile_v1` | Crew size, shift label |
| `wheel_streak` | — | `firehall_wheel_streak_v1` | Spin streak |

**Migration behavior (shipped):**

- Pull: `normalizeSyncSnapshots()` prefers canonical keys, falls back to legacy
- Push: `expandSyncSnapshotsForPush()` dual-writes legacy keys for older clients
- Server list: normalizes on read

**Still TODO (non-breaking):**

- Rename localStorage keys (`firehall_personal_history_v1`, etc.)
- Rename client modules (`meal-history-store.ts`, etc.)
- UI copy: “Hall history” → “Meal history” for personal surfaces

---

## Feature audit by domain

Legend: **full** = complete feature · **local** = device-only · **none** = hidden or blocked · **pro** = needs Hall Pro

### Authentication

| Persona | Behavior |
|---------|----------|
| Guest | Generator, wheel, browse; sign-in sheet available |
| Signed-in individual | Magic link / Google / Apple → `users` row, default `personal` plan |
| Hall member / admin | Same account; halls loaded via `/api/halls/mine` |

**Server:** `requireAuth` on account and hall mutation routes.  
**No hall required.**

---

### Permissions

Two layers — do not conflate:

1. **Account capabilities** (`AuthCapabilities` in `shared/auth/types.ts`)
   - `sync_saves`, `sync_personal_data`, `personal_meal_history`, `join_halls`, `create_halls`, `hall_pro`, `shift_reminders`

2. **Hall role permissions** (`shared/hall-membership/types.ts`)
   - Only apply when `hall_memberships` row exists
   - Captain: settings, members, billing
   - Canteen manager: supplies, shopping list admin flags
   - Member: dashboard, favorites, vote label

| Persona | Account caps | Hall roles |
|---------|--------------|------------|
| Guest | All false | N/A |
| Signed-in individual | sync + join/create | N/A |
| Hall member | + `hall_pro` if any hall has Pro | `member` (or higher) |
| Hall admin | Same | `captain` / `canteen_manager` |

---

### Saved meals

| Persona | Behavior |
|---------|----------|
| Guest | **local** — `firehall_saved_meals` |
| Signed-in individual | **full** — sync via `user_saved_recipes` |
| Hall member / admin | **full** — same user scope (not shared crew favorites) |

**No hall required.**

---

### Meal history

| Persona | Behavior |
|---------|----------|
| Guest | **local** — append on cook / generate / wheel |
| Signed-in individual | **full** — sync `personal_meal_history` |
| Hall member / admin | **full** personal log + same local entries |

**Billing:**

- `personal_meal_history` — personal tier (free with account)
- `hall_history` — Hall Pro — **future crew-wide cloud log** (not the local timeline)

**Fix shipped:** Removed `PaywallGate feature="hall_history"` from personal timeline surfaces (`/me/history`, hall dashboard cooked list, `/hall/history` local view).

---

### Favorites (pinned classics)

| Persona | Behavior |
|---------|----------|
| Guest | **local** |
| Signed-in individual | **full** sync (`personal_favorites`) |
| Hall member / admin | **full** — still personal/user scoped |

Distinct from **saved meals** (full recipe objects). Migration bridge: `migrateCatalogSavedMealsToHallFavorites()`.

**No hall required.**

---

### Shopping

#### Personal (per-recipe modal)

| Persona | Behavior |
|---------|----------|
| Guest | **full** — copy, print, email |
| Signed-in individual | **full** |
| Hall member / admin | **full** |

**No hall required.**

#### Shared hall list

| Persona | Behavior |
|---------|----------|
| Guest | **none** |
| Signed-in individual | **none** — no membership |
| Hall member | **pro** — view/add if Hall Pro; runner/complete if role allows |
| Hall admin | **pro** — full list management |

**Fix shipped:** `shopping-list-modal` checks `shared_shopping_lists` before “Add to hall list”.

---

### Votes

| Persona | Behavior |
|---------|----------|
| Guest | **full** — create, vote, close (session owner) |
| Signed-in individual | **full** — same |
| Hall member / admin | **full** — optional crew ritual; not linked to `hall_id` in DB yet |

**No hall required.** `participate_votes` permission is cosmetic today.

**Future:** Optional `hall_id` on vote for crew dashboard aggregation (collaboration enhancement, not requirement).

---

### Profiles

| Persona | Behavior |
|---------|----------|
| Guest | **local** cooking prefs (`cooking_preferences` / legacy `hall_profile`) |
| Signed-in individual | **full** — `user_profiles` + `user_preferences` + synced cooking prefs |
| Hall member / admin | **full** — user profile + hall settings on `/halls/:id` |

User profile fields (`department`, `shift_label`, `crew_size`) are **user-scoped**, not hall-scoped.

---

### Subscriptions

#### Personal (`user_subscriptions`)

| Plan | Features |
|------|----------|
| `guest` | generator, wheel, browse |
| `personal` | + sync, personal_meal_history, grocery_exports, shift_reminders, vote_history, view_canteen (teaser flags) |

Default for new sign-ins: **personal** (free).

#### Hall Pro (`hall_subscriptions`)

Per **hall**, not per user:

- `shared_shopping_lists`
- `hall_history` (crew cloud — future)
- `canteen_management`
- `protein_deals`

`hall_pro_hall_ids` = halls where user is a member AND hall has active/trialing Pro.

| Persona | Personal plan | Hall Pro |
|---------|---------------|----------|
| Guest | guest | — |
| Signed-in individual | personal | — |
| Hall member | personal | if hall has Pro |
| Hall admin | personal | manage via `manage_billing` |

---

## Persona × feature matrix (quick reference)

| Feature | Guest | Individual | Member | Admin |
|---------|-------|------------|--------|-------|
| Generator / wheel / browse | full | full | full | full |
| Cook mode | full | full | full | full |
| Saved meals | local | full sync | full sync | full sync |
| Meal history | local | full sync | full sync | full sync |
| Favorites / classics | local | full sync | full sync | full sync |
| Personal shopping list | full | full | full | full |
| Profile & prefs | local | full | full | full |
| Shift reminders | — | full | full | full |
| Create / join hall | — | full | full | full |
| Hall dashboard (crew) | — | — | full | full |
| Shared shopping list | — | — | pro | pro |
| Canteen manage | — | — | pro* | pro |
| Protein deals (full) | teaser | teaser | pro | pro |
| Invites / billing | — | — | — | full |

\*Member can contribute to list; canteen manage needs role + Pro.

---

## Rules for engineers

1. **Never require `activeHallId` for personal features.**  
   If a screen shows “Join hall” for generator, history, or saves — that’s a bug.

2. **Use `client_id` mentally when reading `HallProfile.hallId`.**  
   It is not `halls.hall_id`.

3. **Gate collaboration with membership + Pro, not sign-in alone.**  
   Shared shopping = `hall_id` + `shared_shopping_lists` + membership.

4. **`personal_meal_history` ≠ `hall_history`.**  
   Personal timeline is free; Hall Pro `hall_history` is for future crew-wide cloud log.

5. **Votes are personal/session until explicitly linked to a hall.**

6. **Prefer canonical sync keys** in new code: `personal_meal_history`, `personal_favorites`, `cooking_preferences`.

---

## Implementation status

### Shipped (this refactor)

| Change | Files |
|--------|-------|
| Identity model + feature ownership | `shared/identity/model.ts` |
| Canonical sync keys + normalize/expand | `shared/sync/types.ts`, `coordinator.ts`, `local-snapshots.ts`, `server/sync/store.ts` |
| Extended `AuthCapabilities` | `shared/auth/types.ts` |
| `client_id` documentation | `shared/hall-profile/types.ts` |
| Personal history without Hall Pro paywall | `hall-history-page.tsx`, `hall-last-meals-section.tsx`, `/me/history` |
| Shared list button gated on Pro | `shopping-list-modal.tsx` |
| Sync key tests | `scripts/test-sync-keys.ts` |
| Hall billing feature comment | `shared/billing/types.ts` |

### Next (recommended phases)

| Phase | Work |
|-------|------|
| **P1** | Rename user-facing copy; `hall-history-store` → `meal-history-store` (re-export alias) |
| **P1** | Tonight hub: personal grocery list route (no `/hall/join` dead ends) |
| **P2** | Optional `hall_id` on votes for crew aggregation |
| **P2** | Server `crew_meal_history` table for true Hall Pro `hall_history` |
| **P3** | Rename localStorage keys with one-time migration on read |
| **P3** | Split `UserProfile.hall_name` — user label vs hall entity name |

---

## Database ER (simplified)

```
users ──┬── user_profiles
        ├── user_preferences
        ├── user_subscriptions (personal)
        ├── user_saved_recipes
        ├── user_data_snapshots (personal sync)
        └── hall_memberships ── halls ──┬── hall_subscriptions (pro)
                                        ├── hall_shopping_lists
                                        ├── hall_canteen_items
                                        └── protein_deals

hall_votes (ephemeral, no FK to users or halls today)
```

---

## CPO sign-off

The **account is the root entity**. Halls are **optional collaboration containers**. Personal data was already user-scoped in sync — it was mislabeled and over-gated. Canonical sync keys and paywall fixes align the product with the personal-first navigation shipped in the prior sprint.

**North star check:** A firefighter can sign in, pick dinner, cook, save, and review history **without ever creating a hall**. Halls unlock crew coordination — not basic utility.
