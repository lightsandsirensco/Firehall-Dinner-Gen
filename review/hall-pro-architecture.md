# Hall Pro — Collaboration Architecture

**Date:** June 22, 2026  
**Status:** Architecture + billing model (no payments)  
**Companion:** [`firefighter-plus-architecture.md`](./firefighter-plus-architecture.md)

---

## Principle

**Hall Pro benefits the crew. Firefighter Plus benefits the individual.**

Hall membership stays **free**. Hall Pro is a **per-hall** subscription that unlocks **crew collaboration tools only** — nothing personal.

| Do include (Hall Pro) | Do NOT include (→ Firefighter Plus) |
|------------------------|-------------------------------------|
| Shared Shopping List | Meal planning |
| Hall Meal History | Saved meals |
| Hall Staples | Profiles |
| Advanced Hall Vote | Personal protein deals |
| Hall grocery planning | Nutrition, offline, AI subs |

---

## Three layers

```
Guest ──sign in──► Personal (free) ──optional──► Firefighter Plus (individual $)
                         │
                         └── Connect to Hall (free) ──captain──► Hall Pro (crew $)
```

---

## Hall Pro feature flags

Defined in `shared/billing/types.ts` → `HALL_PRO_FEATURES`:

| Key | Product name | Scope |
|-----|--------------|-------|
| `shared_shopping_lists` | Shared Shopping List | Hall |
| `hall_history` | Hall Meal History | Hall |
| `canteen_management` | Hall Staples | Hall |
| `advanced_hall_vote` | Advanced Hall Vote | Hall |
| `hall_grocery_planning` | Hall grocery planning | Hall |

All checks use `useHallFeature(feature, hallId)` / `userHasFeature(userId, feature, { hall_id })`.

**Retired from Hall Pro:** `protein_deals` → use `hall_grocery_planning` (crew) or `personal_protein_deals` (Plus).

---

## Free vs Pro collaboration

| Capability | Free hall link | Hall Pro |
|------------|:--------------:|:--------:|
| Connect / join hall | ✅ | ✅ |
| Basic Hall Vote (Tonight) | ✅ | ✅ |
| Shared Shopping List (cloud) | — | ✅ |
| Hall Meal History (cloud) | — | ✅ |
| Hall Staples (manage) | — | ✅ |
| Advanced Hall Vote | — | ✅ |
| Hall grocery planning | — | ✅ |

---

## Pricing comparison

| | Personal | Firefighter Plus | Hall membership | Hall Pro |
|---|:---:|:---:|:---:|:---:|
| **Price** | Free | $7.99/mo · $79/yr | Free | $29/mo hall ($19 founding) |
| **Billed to** | — | Individual | — | Hall |
| **Audience** | Every firefighter | Power-user cook | Crew link | Canteen / captain |

See [`firefighter-plus-architecture.md`](./firefighter-plus-architecture.md) for the full matrix.

---

## Implementation map

| Area | Files |
|------|-------|
| Types & flags | `shared/billing/types.ts`, `shared/billing/hall-pro.ts` |
| Resolution | `server/billing/store.ts` |
| Gates (UI) | `client/src/components/billing/paywall-gate.tsx` |
| Plans UI | `client/src/components/billing/plan-card.tsx`, `plans-page.tsx` |
| Captain admin | `client/src/components/billing/hall-pro-admin-panel.tsx` |
| Copy | `client/src/lib/brand-copy.ts` (`HALL_PRO`, `HALL_FEATURES`) |
| Grocery / deals | `server/grocery-deals/routes.ts` → `hall_grocery_planning` |
| Migration | `server/db/migrations/033_hall_pro_collaboration.sql` |
| Identity model | `shared/identity/model.ts` |

---

## Copy rules

- Hall Pro: **crew**, **linked hall**, **shift night**, **canteen**
- Never promise personal saves, meal planning, or profiles on Hall Pro
- Paywall CTA: captain enables in linked hall settings — not “upgrade your account”

---

## Payments

`payments_enabled` remains **off**. Hall Pro trials and admin grants work via `hall_subscriptions` as today. Stripe is out of scope until launch.
