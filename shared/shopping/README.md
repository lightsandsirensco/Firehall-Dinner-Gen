# Smart Shopping Engine — Sprint 2.1 + 2.2 Foundation

**Status:** Implemented (foundation) · Sprint 2.1 (shopping engine) + Sprint 2.2 (pantry intelligence)
**Not:** A retailer/affiliate integration, an ordering system, or Hall Ops purchasing intelligence.
**Related:** `review/smart-shopping-engine.md` describes a separate, later, Hall-Ops "purchasing brain" (inventory, recurring purchases, retailers) that this module is deliberately decoupled from — see "Relationship to other shopping features" below.

## One-line definition

Turn any recipe (or several) into one deduplicated, department-grouped, crew-scaled shopping list — automatically, with no manual list-building.

## Where the code lives

```
shared/shopping/
  types.ts                 Core entity types (ShoppingSession, ShoppingList, ShoppingListItem, PantryProfile, StockLevel, ShoppingHistory, ShoppingMode, Department)
  departments.ts            Canonical department taxonomy + classifyDepartment()
  ingredient-normalizer.ts  IngredientNormalizer — canonical keys, unit parsing/merging
  common-staples.ts         Default staple seed list (salt, pepper, oil, butter, coffee, flour, rice, common spices)
  pantry-profile.ts         Pantry helpers — 3-tier stock levels, shared by Personal and Hall Pantry
  shopping-service.ts       ShoppingService — all session mutations, pure functions, pantry precedence resolution
  id.ts                     Cross-env id generator
  index.ts                  Public barrel export

client/src/lib/shopping/shopping-store.ts   Device-local session/history/Personal Pantry persistence (localStorage), mirrors hall-favorites pattern
client/src/lib/shopping/hall-pantry-store.ts Device-local Hall Pantry persistence, scoped by the existing client-side hallId (mirrors hall-favorites-store)
client/src/hooks/use-shopping-session.ts    React hook wiring store + service together
client/src/pages/me-shopping-list-page.tsx  /me/shopping-list UI (active list + collapsible "already have" panel)
client/src/pages/me-pantry-page.tsx         /me/pantry UI — edit Personal + Hall Pantry, add/remove/reset

scripts/test-shopping-engine.ts             Domain-layer tests (wired into `npm run check`)
```

Everything in `shared/shopping/` is pure TypeScript with no DOM or Node APIs, so it runs identically in the browser, in `tsx` test scripts, and — if a server-persisted version is built later — on the server.

## Core entities

| Entity | Purpose |
|---|---|
| `ShoppingSession` | One shopping trip: the recipes feeding it, the merged list, and its `ShoppingMode`. |
| `ShoppingMode` | `"planning"` (still adding) → `"shopping"` (checking off in-aisle) → `"completed"` (archived). |
| `ShoppingList` / `ShoppingListItem` | The merged, department-grouped result. Each item tracks `contributions[]` back to the recipe(s) that produced it. |
| `IngredientNormalizer` | Canonicalizes ingredient names ("Chicken Thighs, boneless skinless" → `chicken thigh`) and parses/merges quantities so duplicates combine correctly. |
| `ShoppingService` | Stateless functions that transform a session: add/remove a recipe, rescale a recipe's crew size, add/remove/check items, undo, archive to history, resolve pantry precedence. |
| `PantryProfile` (Personal + Hall) | A map of canonical ingredient key → `StockLevel` ("always" / "usually" / "never"). Matching items are excluded from the active list entirely — see "Pantry Intelligence" below. |
| `ShoppingHistory` | Archive of completed sessions, enabling "shop this again". |

## How a recipe becomes a shopping list

1. Caller (e.g. a recipe page) supplies a `ShoppingRecipeInput` — `{ slug, title, baseServings, ingredients }` — it already has this from the page it's rendering; the engine never fetches recipes itself.
2. `ShoppingService.addRecipeToSession(session, recipe, crewSize)`:
   - Scales the recipe's raw ingredients from `baseServings` to `crewSize` by reusing the existing crew-scaling logic (`shared/golden-100/recipe-quality/crew-scale.ts` — same sub-linear seasoning scaling and count-rounding used on recipe pages, so results match what a firefighter already sees on the recipe itself).
   - Normalizes each ingredient (`IngredientNormalizer`) into a canonical key + department + parsed quantity.
   - Merges it into the session's aggregate ingredient map — combining with any matching ingredient already contributed by another recipe in the session.
   - Rebuilds `session.list`, preserving `checked` state, manual items, and pantry flags from before the rebuild.
3. `ShoppingService.setRecipeCrewSize(session, slug, newCrewSize)` re-runs step 2 for that recipe only — every quantity it contributes recalculates instantly, and the merge with other recipes' contributions re-runs too.
4. `ShoppingService.groupByDepartment(session.list.items)` returns items ordered by the canonical department list for rendering.

### Combining duplicate ingredients across units

When two recipes contribute the same canonical ingredient in the *same* unit, `IngredientNormalizer.mergeContributions` sums the values ("2 lb" + "1 lb" → "3 lb"). When units differ, it shows both instead of guessing a conversion ("2 lb + 3 cans") — this keeps the list honest rather than silently wrong.

## Pantry Intelligence (Sprint 2.2)

Firehall Meals should know what the firefighter — and the hall — already has, without anyone setting up "inventory." Two pantries share one shape:

| Pantry | Scope | Storage |
|---|---|---|
| **Personal Pantry** | This device/firefighter's own staples. | `firehall_pantry_profile_v1` (localStorage) |
| **Hall Pantry** | This fire hall's shared canteen staples. | `firehall_hall_pantry_v1`, scoped by the existing client-side `hallId` (same identity `hall-favorites-store.ts` uses — no server hall membership required) |

Both are just `PantryProfile = { items: Record<canonicalKey, StockLevel>, ... }` where `StockLevel` is `"always"`, `"usually"`, or `"never"`. An **untracked** key behaves exactly like `"never"` — no setup means no behavior change, which is what makes this feel automatic rather than like inventory software.

### It ships pre-decided, not empty

Every new pantry (`createPantryProfile()`) seeds `shared/shopping/common-staples.ts` — salt, pepper, cooking oil, olive oil, butter, coffee, flour, rice, and common spices (garlic powder, onion powder, paprika, cumin, chili powder, oregano, basil, Italian seasoning, cinnamon, bay leaves, red pepper flakes) — all marked `"always"`. A firefighter's very first shopping list is already free of the stuff every kitchen has, with zero configuration.

### How items disappear (and how to get them back)

`ShoppingService.resolvePantryStatus(pantryContext, canonicalKey)` resolves the effective level with this precedence:

1. **Personal Pantry**, if the firefighter has an explicit entry for that ingredient (including an explicit `"never"` — this is how you force something to show even though the hall stocks it).
2. Otherwise **Hall Pantry** — if the hall always/usually has it, nobody needs to buy it either.
3. Otherwise `"never"` — show it, business as usual.

`ShoppingService.splitPantryItems(items)` splits a list into `active` (still need to buy) and `skipped` (pantry already covers it) — the shopping list page renders only `active` items as the main checklist, with `skipped` tucked behind a collapsed "Already in your pantry" disclosure for transparency and a one-tap "I need this" override, rather than silently vanishing forever.

### Editing without it feeling like inventory

`/me/pantry` lists the common staples plus anything else tracked, each with three small pill buttons (Always / Usually / Never) — no counts, no par levels, no quantities. A quick-tap `PackageCheck` icon directly on a shopping-list item (`ShoppingService`'s `cycleStockLevel`, wrapped by the hook's `cyclePantryStockLevel`) cycles Personal Pantry through never → always → usually → never for one-tap "I have this" without leaving the list. "Reset to defaults" (`resetPantryProfile()` / Hall Pantry's `resetHallPantry()`) discards custom edits and restores the seeded common-staples list — "allow resetting" without needing a destructive "clear everything" affordance.

## Persistence model (why localStorage, not a server table)

This is a **personal, device-local** feature — it works for any visitor building a list from a recipe, not just authenticated Hall Pro members, and needs zero backend round-trips to feel instant. `client/src/lib/shopping/shopping-store.ts` mirrors the existing, proven `hall-favorites-store.ts` pattern:

- Versioned JSON snapshots in `localStorage` (`firehall_shopping_session_v1`, `firehall_shopping_history_v1`, `firehall_pantry_profile_v1`, `firehall_shopping_undo_v1`).
- A `ShoppingStore` interface (`getSession/saveSession/getHistory/...`) so a server-backed implementation can be swapped in later (e.g. to sync a signed-in user's list across devices) without changing any calling code in the hook or UI.
- A `window` pub/sub event (`shopping-session-changed`) so every component using `useShoppingSession()` re-renders when any tab/component mutates the session.

**Undo** is a bounded (20-deep) stack of full prior `ShoppingSession` snapshots kept alongside the session in storage. The hook pushes a snapshot before every mutating call and pops it on `undo()` — simple, always correct, and easy to reason about compared to per-field undo logic.

## Relationship to other shopping features (do not confuse these)

| Feature | Scope | Status |
|---|---|---|
| `client/src/lib/shopping-list.ts` + `shopping-list-modal.tsx` | Ephemeral, single-recipe list shown in a dialog (copy/print/email). | Existing — untouched by this sprint. |
| **This engine** (`shared/shopping/*`, `/me/shopping-list`) | Persistent, multi-recipe, normalized list for any user, on this device. | New — Sprint 2.1. |
| `server/hall-shopping-list/*` ("The Run") | Hall-Pro, multi-member, server-persisted shared list for a fire hall. | Existing, separate feature. |
| `review/smart-shopping-engine.md` (design only) | Hall Ops purchasing *intelligence* (inventory pars, recurring rules, retailers, approval workflow) — a much larger, not-yet-approved system that would eventually feed "The Run". | Design doc, not implemented. |

This sprint's engine is intentionally the smallest, most reusable layer: it has no concept of a hall, inventory, retailer, or approval workflow. A future integration could let a user push an approved `ShoppingSession` into "The Run", or let the Hall Ops engine's `meal_plan_demand` detector call the same `IngredientNormalizer`/`ShoppingService` functions — but neither is built here, per the "no retailer logic, no affiliate logic" instruction for this sprint.

## Extension points (for later, not built now)

- **Server sync**: implement the `ShoppingStore` interface against a REST API; swap `localShoppingStore` for it behind a feature flag or auth check.
- **Push into "The Run"**: an "Add approved items to hall list" action could map `ShoppingListItem[]` → the existing `addManualItem`/`addRecipeIngredients` calls in `server/hall-shopping-list/store.ts`.
- **Retailer/affiliate layer**: deliberately out of scope. If added later, it should sit *outside* `shared/shopping/` as a separate optional layer that reads a completed `ShoppingSession`, never as a dependency of the normalizer or service.

## Tests

`scripts/test-shopping-engine.ts` (run via `npm run check` or `tsx scripts/test-shopping-engine.ts`) covers:

- Ingredient name canonicalization merging qualifier/plural variants.
- Department classification.
- Single-recipe list generation grouped by department.
- Crew-size rescaling recalculating merged quantities.
- Multi-recipe duplicate-ingredient combining with source tracking preserved.
- Manual item add/remove, checking off, and "clear checked".
- Removing a recipe removes only its unique contributions.
- Undo restoring a prior session snapshot.
- Common-staple defaults seeded as "always stocked" on a fresh pantry.
- 3-tier stock level cycling (never → always → usually → never) and explicit removal.
- Personal vs. Hall Pantry precedence (personal's explicit choice always wins; otherwise falls back to hall).
- Pantry items automatically splitting out of the active list (`splitPantryItems`) and manual items respecting the pantry immediately.
- Archiving to history and reusing a past session's recipe list.
