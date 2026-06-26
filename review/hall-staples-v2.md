# Hall Staples (Canteen) Collaboration V2

**Date:** June 22, 2026  
**Status:** Implemented  
**Philosophy:** One shared kitchen staples board — not inventory management, not supply chain software.

---

## Product summary

**Question answered:** *"What do we need to pick up for the hall?"*

| Layer | Who | Can do |
|-------|-----|--------|
| **Hall membership (free)** | Any linked member | View staples, mark Good / Running Low / Out, leave Hall Notes |
| **Canteen Manager** | One per hall (captain assigns) | Add, rename, archive, reorder staples |
| **Captain** | Hall admin | Same as canteen manager + assign canteen manager |

Hall Staples is **not** gated on Hall Pro. Shopping List remains separate and Hall Pro–gated for cloud sync.

---

## Architecture

```
Personal account (optional)
        │
        ▼
Hall membership (free link)
        │
        ├── Hall Vote
        ├── Shared Shopping List (Hall Pro for cloud)
        ├── Hall Meal History (Hall Pro for cloud)
        └── Hall Staples + Hall Notes (free, collaborative)
```

### Data stores

| Store | Table | Scope |
|-------|-------|-------|
| Staples | `hall_canteen_items` | One list per hall |
| Notes | `hall_notes` | One board per hall |
| Manager | `halls.canteen_manager_user_id` | Denormalized pointer |

### API routes

| Method | Route | Permission |
|--------|-------|------------|
| GET | `/api/halls/:hallId/canteen` | Member |
| PATCH | `/api/halls/:hallId/canteen/:itemId` | Status: any member; list edits: manager |
| POST | `/api/halls/:hallId/canteen/items` | Canteen manager / captain |
| POST | `/api/halls/:hallId/canteen/report` | Status: any member |
| POST | `/api/halls/:hallId/canteen/manager` | Assign canteen manager |
| GET | `/api/halls/:hallId/notes` | Member |
| POST | `/api/halls/:hallId/notes` | Member |
| PATCH | `/api/halls/:hallId/notes/:noteId` | Author |
| DELETE | `/api/halls/:hallId/notes/:noteId` | Author, or manager/captain |

---

## Permissions

### Shared types

- `canUpdateCanteenStatus(role)` — all members with `view_hall_dashboard`
- `canManageCanteenList(role)` — `canteen_manager` or `captain` (`manage_supplies` / `manage_settings`)
- `canDeleteAnyHallNote(role)` — canteen manager or captain

### Payload flags

```typescript
HallCanteenPayload {
  can_update: boolean;        // any member — status changes
  can_manage_list: boolean;   // manager — add/archive/rename
  needs_attention_count: number;
  canteen_manager_user_id: string | null;
}
```

### Billing change

`canteen_management` **removed from `HALL_PRO_FEATURES`**. Staples collaboration is free with hall link. Hall Pro remains: shared shopping list, hall history, advanced vote, grocery planning.

---

## Database changes

### Migration `034_hall_notes.sql`

```sql
CREATE TABLE hall_notes (
  note_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Default staples (20 items)

Coffee, Milk, Cream, Sugar, Tea, Bread, Bagels, Buns, Butter, Ketchup, Mustard, Mayonnaise, BBQ Sauce, Hot Sauce, Jam, Peanut Butter, Honey, Cooking Oil, Salt, Pepper.

**Guards:**

- `isProteinStapleName()` blocks proteins (shopping list only)
- `findCanteenItemByName()` prevents duplicate names per hall (case-insensitive)

Existing halls keep seeded items; new defaults apply only to missing names on seed.

---

## UI changes

### Hall dashboard (`/hall`) section order

1. **Tonight** — link to `/tonight`
2. **Shared Shopping List** — link to hall settings list
3. **Need Anything?** — shortages only (Running Low / Out), badge count in title
4. **Hall Notes** — recent 3 notes (read-only on dashboard; composer on staples page)
5. **Hall Meal History** — recently cooked + favorites

Removed: 5-tile quick actions grid (replaced by ordered sections).

### Hall Staples page (`/hall/canteen`)

- No Hall Pro paywall
- All members: status buttons (Good / Running Low / Out)
- Manager: add staple, archive any item
- Full Hall Notes board with composer

### Tonight hub

- Need Anything? uses member `can_update` (not Hall Pro)
- Mark Restocked enabled for all linked members

### Notifications

**Not built:** push, email. Badge = `Need Anything (N)` in dashboard section title when N items are low/out.

---

## Validation

### Automated

```bash
npm run check    # includes test-hall-canteen (V2 + notes)
npm run build
```

### Manual checklist

- [ ] Guest / personal-only user: no hall staples, app works normally
- [ ] Linked member: mark coffee Running Low in &lt; 20 seconds
- [ ] Second member sees same status on refresh
- [ ] Canteen manager: add + archive staple in &lt; 2 minutes
- [ ] Regular member cannot add custom staple (403)
- [ ] Chicken rejected as staple name
- [ ] Hall Notes: create, edit own, delete own; manager deletes any
- [ ] Shopping list and staples are separate surfaces
- [ ] Hall Pro not required for staples updates

### Test script coverage (`scripts/test-hall-canteen.ts`)

- 20 default staples
- Member status update + shared visibility
- Member cannot add custom item
- Manager add + duplicate prevention + archive
- Hall notes CRUD + manager delete

---

## Future enhancements (optional)

| Enhancement | Notes |
|-------------|-------|
| `@mentions` in Hall Notes | Deferred per spec |
| Category reorder UI | API supports `sort_order`; drag UI later |
| Sub-nav badge for Need Anything count | Dashboard title badge only for V2 |
| Staple rename inline UI | API supports `name` patch |
| Assign canteen manager UI on staples page | API `POST .../canteen/manager` shipped; wire to members list |
| Cloud sync conflict resolution | Local optimistic updates today |
| i18n for status labels | English only |

---

## Files touched (reference)

| Area | Key files |
|------|-----------|
| Types | `shared/hall-canteen/types.ts`, `shared/hall-notes/types.ts` |
| Server | `server/hall-canteen/store.ts`, `routes.ts`, `server/hall-notes/store.ts`, `routes.ts` |
| Migration | `server/db/migrations/034_hall_notes.sql` |
| Client | `hall-canteen-page.tsx`, `hall-dashboard-v2.tsx`, `hall-need-anything-card.tsx`, `hall-notes-section.tsx` |
| Billing | `shared/billing/types.ts` — staples removed from Hall Pro |
| Tests | `scripts/test-hall-canteen.ts`, `scripts/test-hall-supplies.ts`, `scripts/test-hall-pro-billing.ts` |
