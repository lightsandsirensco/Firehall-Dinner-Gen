# Hall Inventory — Product Specification

**Status:** Design only — do not implement until approved  
**Version:** 2.0  
**Date:** 2026-07-17  
**Depends on:** `review/hall-operations-design.md` · `review/hall-event-engine.md` · Smart Shopping · Logbook · Merchandise  
**Replaces:** `review/inventory-system.md` as the canonical inventory product spec (v1 operational detail absorbed here)  
**Builds on:** Canteen Manager V2 (`hall_canteen_items`, weekly orders, shortage reports)

---

## 1. Purpose

Hall Inventory is how the station knows **what’s on the shelf, what’s gone, what to buy next, and what the hall has learned about each item** — for the canteen and the merch cabinet — without a spreadsheet, binder, or warehouse system.

Every item is a living record: status and quantity for today, plus memory of how it runs out, where it lives, what it needs beside it, and what to do next. Intelligence is earned from use. Firefighters never fill a 20-field form to mark coffee Out.

**v1 ships:** Consumables (canteen) + Merchandise (cabinet), status-first mobile actions, Run / Weekly Order feeds, item history, simple related items, deterministic restock tips.  
**Later:** Equipment/station nodes, barcode scan, richer seasonal advisors, LearningHook models.

**Voice:** shelves, stock target, running low, out, receive, sell, related — not SKU masters, WMS, putaway, or “digital twin” in the UI.

**Not:** ERP · mandatory cycle counts · AI chatbot · a second app beside Canteen · Costco lock-in.

---

## 2. Design principles

1. **Status first, quantity second** — members tap *Running Low* / *Out*; managers optionally count.  
2. **One engine, two faces** — Canteen shelf and Merchandise cabinet share the same item model.  
3. **Memory without homework** — create with name + category; depth grows from events.  
4. **Stock target, not par vs min lectures** — one firefighter-facing control.  
5. **Few taps** — member actions ≤2 taps; receive/adjust are manager flows.  
6. **Station language** — location = “Fridge,” not bin codes.  
7. **Retailer-agnostic** — preferred store is a suggestion chip, never a workflow gate.  
8. **Ownership routes buying** — canteen/dinner buy on The Run; department → notify, not silent cart.  
9. **Events write truth** — every mutation emits Hall Event Engine events + ledger rows.  
10. **Private only** — never SEO-indexed; public Tools may seed packs after join only.  
11. **Confirm before changing targets** — tips never silently raise stock targets.  
12. **No per-item chat** — lasting notes go to Logbook; buying notes stay on the item.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FACES                                                        │
│  Canteen · Cabinet · Item sheet · Needs Attention             │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  ITEM (intelligent object)                                    │
│  Identity · Status · Buy · History · Related · Tips           │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  EVENT SPINE + LEDGER                                         │
│  inventory.* · shopping.* · merch.* (Hall Brain)              │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  DERIVED MEMORY                                               │
│  Usage · stockout cadence · bundles · tips (proposals)        │
└─────────────────────────────────────────────────────────────┘
```

**What every active item can answer (when known):**

| Question | Facet |
|----------|--------|
| What is it? | Identity |
| Where does it live? | Location |
| Who owns the buy? | Ownership |
| How much / how urgent? | Status · on hand · stock target |
| How do we buy it? | Buy dossier |
| What happened? | Timeline |
| What goes with it? | Related |
| What should we change? | Tips |

---

## 4. Domains & categories

### 4.1 Domains

| Domain | Code | Surface |
|--------|------|---------|
| **Canteen** | `canteen` | `/hall/canteen` |
| **Merchandise** | `merchandise` | `/hall/cabinet` |

Equipment as a full domain is **out of v1**. Broken gear belongs on Whiteboard (Broken) or a lightweight related “machine” link later — not fake case quantities.

### 4.2 Ownership (required)

| Ownership | On Low / Out |
|-----------|----------------|
| `canteen` | Smart Shopping → The Run / Weekly Order |
| `dinner` | Same (meal-driven staples) |
| `department` | Tip: **Notify Department** — never auto-add to canteen Run |
| `merchandise` | Cabinet reorder path |

### 4.3 Canteen categories

| Category ID | Label | Examples |
|-------------|-------|----------|
| `coffee_beverages` | Coffee & Drinks | Coffee, creamers, pop, water |
| `dairy_breakfast` | Dairy & Breakfast | Butter, milk, cream, eggs |
| `cooking_oils` | Cooking Oil | Oil, spray |
| `spices_seasonings` | Spices & Seasonings | Salt, pepper, rubs |
| `condiments` | Condiments | Ketchup, mayo, hot sauce |
| `bbq_supplies` | BBQ Supplies | Pellets, charcoal, foil pans |
| `snacks` | Snacks | Chips, bars |
| `freezer` | Freezer | Frozen proteins, veg |
| `pantry` | Pantry | Rice, pasta, stock, cans |
| `refrigerated` | Fridge (other) | Cheese, tortillas |
| `cleaning` | Cleaning | Soap, sanitizer |
| `paper_products` | Paper | Towels, plates, wrap |
| `personal_care` | Personal Care | Shared soap / med kit restock |
| `other` | Other | Catch-all |

Migrate legacy: `breakfast` → `dairy_breakfast`; `frozen` → `freezer`.

### 4.4 Merchandise categories

| Category ID | Label | Examples |
|-------------|-------|----------|
| `apparel_shirts` | Hall Shirts | T-shirts, polos |
| `apparel_hats` | Hall Hats | Caps, toques |
| `apparel_sweaters` | Sweaters / Hoodies | Crewnecks, zip-ups |
| `patches` | Patches | Shoulder / commemorative |
| `coins` | Coins & Challenge Coins | Challenge coins |
| `stickers` | Stickers | Bumper, helmet-safe |
| `drinkware` | Drinkware | Bottles, mugs |
| `other_merch` | Other Merch | Lanyards, kits |

---

## 5. Item model

One type: **Item**. Facets are sparse — empty Buy or Related never blocks Low/Out.

### 5.1 Identity (create-time minimum)

| Field | Required | Notes |
|-------|----------|-------|
| `id`, `hall_id` | ✓ | |
| `domain` | ✓ | canteen · merchandise |
| `ownership` | ✓ | default from domain |
| `name` | ✓ | |
| `category` | ✓ | |
| `unit` | ✓ | each, lb, L, box, case — default `each` |
| `active` / `archived` | ✓ | soft delete |

**On create:** name + category (+ domain from face). Everything else optional later.

Optional identity: `aliases[]`, `photo_url` (single cover in v1), `package_size`, `location`, `barcode` (nullable, unused in UI until later), `purpose` (one short line).

### 5.2 Live status

| Field | Notes |
|-------|-------|
| `status` | `good` · `running_low` · `out` (member-facing) |
| `status_override` | Manual Low/Out until Receive or Count clears it |
| `quantity_on_hand` | Optional; never required to mark Out |
| `stock_target` | Firefighter-facing target on shelf (replaces teaching par vs min) |
| `warn_below` | Optional; defaults to `stock_target` if unset — below this → running_low when qty known |
| `stock_max` | Optional receive warning only |
| `next_expiry` | Optional (dairy / meat) |
| `last_restocked_at` · `last_reported_at` · `last_counted_at` | System-maintained |

**Derivation (when override clear and qty present):**

```
if quantity_on_hand <= 0           → out
else if quantity_on_hand < warn_below → running_low
else                               → good
```

Manual *Running Low* / *Out* overrides until Receive or Adjust.

**Pipeline states** (`on_list`, `ordered`, `being_shopped`) live on **Run / Weekly Order lines**, not as member-facing item status.

### 5.3 Buy dossier (single “Buy” panel)

| Field | Notes |
|-------|-------|
| `preferred_brand` | |
| `preferred_retailer` | Suggestion only |
| `buying_notes` | “Buy the big tin” |
| `reorder_qty` | Default qty when adding to Run / order |
| `preferred_buyer_member_id` | Who usually shops it |
| `estimated_unit_cost` | Optional |
| `search_term` / `product_url` | Retailer handoff helpers |
| `do_not_substitute` | Bool + short reason |

Merchandise also: `sale_price`, `cost_basis`, `size_variant`, `sku_label`, `fundraising_flag`.

**Removed from firefighter UI:** parallel unlabeled `supplier` vs retailer; Costco-only columns; calendar `recurrence` / `next_review_at` as primary drivers (Needs Attention is event-driven).

**Notes split (no mega-field):** `buying_notes` · `manager_notes` · `known_issues`.

### 5.4 Kind (internal)

| Kind | v1 |
|------|-----|
| `consumable` | Default for canteen |
| `merchandise` | Default for cabinet |
| `equipment` · `station` · `kit` | Schema-ready; UI deferred |

---

## 6. Status & member actions

### 6.1 Member actions (≤2 taps)

| Action | Effect |
|--------|--------|
| **Running Low** | Override `running_low`; shortage; feeds Needs Attention / tips |
| **Out** | Override `out`; qty may confirm → 0; stronger alert |
| **Used some** | Optional stepper (−1 / −2 / half pack); may tip into low |

No forms. No required photo. No barcode.

### 6.2 Manager / runner actions

| Action | Effect |
|--------|--------|
| **Receive** | Increase qty; clear Low/Out; `last_restocked_at`; close related lines |
| **Adjust / Count** | Set absolute qty; `last_counted_at` |
| **Add to Run / Weekly Order** | Manual if auto-feed off |
| **Archive / Restore** | Soft hide |
| **Record Sale** (merch) | Decrement; sales log; may go low |
| **Transfer location** | Same item, new `location` + ledger note |

Item→item splits (bulk oil → bottles) are out of v1.

### 6.3 Mobile patterns

**Member:** open item or Needs Attention → Running Low / Out.  
**Manager Receive:** from Run / Weekly Order list → confirm qty → done.  
**Create:** name + category → save → optional “Add buy details.”

---

## 7. Related items

### 7.1 Why

Coffee without filters is a failed restock. Relations power “Also add filters?” chips and cluster tips when something goes Out.

### 7.2 Relation types (v1)

| Type | Example |
|------|---------|
| `requires` | Coffee → Coffee filters |
| `complements` | Coffee → Cream, Sugar |
| `used_with` | BBQ pellets → Smoker (name link OK without full equipment domain) |
| `ingredient_for` | Ground beef → recipe slug |
| `substitutes` | Brand A ↔ Brand B |

Derived (system): `bought_with` from completed Runs; shown as chips, not separate type spam.

**Deferred:** full station graph, kits as first-class shopping composites, `event_demand` edges (use seasonal tips from Board tags instead in early phases).

### 7.3 Storage

```
hall_inventory_relations
  hall_id, from_item_id,
  to_item_id | to_recipe_slug,
  relation_type, strength, source (manual|derived|template)
```

### 7.4 Starter packs (seed relations)

- Coffee station (coffee, filters, cream, sugar)  
- BBQ bay (pellets, sauce, foil)  
- Taco night staples  
- Merch launch (empty until first SKU)

### 7.5 Run chips

When Coffee is added to The Run → “Also filters? cream?” from manual relations + bought-together. One tap adds; dismiss decrements pair score.

---

## 8. Timeline (item history)

Every item has a story. The timeline is a projection of ledger + Hall events — not a social feed.

### 8.1 Story beats

Created · Received · Consumed · Running Low · Out · On The Run · Order received · Adjusted · Sold (merch) · Stock target changed · Archived

### 8.2 UI

```
┌─────────────────────────────────────────┐
│ Coffee · History                         │
│ Today     OUT — Mike                     │
│ Jul 12    Received 2× (Costco) — Sam     │
│ Jul 10    On The Run                     │
│ Jul 8     Running low — Alex             │
│ Jun 1     Stock target 2 → 4 (tip)       │
└─────────────────────────────────────────┘
```

Filters: All · Purchases · Shortages · Sales. Vertical list only — no Gantt.

### 8.3 Header summary (when enough history)

One line max, derived:

- “Runs out ~every 11 days”  
- “Usually Sam buys”  
- “Often low before BBQ”

---

## 9. Automatic feeds

### 9.1 The Run

| Trigger | Default qty |
|---------|-------------|
| Out | `reorder_qty` or 1 |
| Running Low | `reorder_qty` or max(stock_target − on_hand, 1) |
| Below warn_below after consume | Same |

Dedupe by `inventory_item_id`. Respect ownership (no department auto-cart). Merch auto-add off unless hall enables. Full auto-feed = Hall Pro; free halls: Needs Attention + Add to Run.

### 9.2 Weekly Order

Build from Needs Attention + preferred bulk retailers (hall list). Receive from order → restock + clear status.

### 9.3 Needs Attention (Canteen / Cabinet / Home)

- Counts of Out + Running Low  
- Top line: “Coffee out — reported by Sam”  
- Tap → filtered list  
- Tips count badge when proposals pending (managers)

### 9.4 Whiteboard / Home pulses

Align with Whiteboard v2: at most a few **Out** pulses — not every Low. Clear on Receive.

### 9.5 Notifications

| Event | Audience | Priority |
|-------|----------|----------|
| Out | Canteen mgr (+ captain policy) | High |
| First Low this week | Canteen mgr | Digest / normal |
| Merch below warn | Managers | Normal |
| Receive complete | Optional ack to reporters | Low |

Cap: one push per item per 24h unless Out. Digest > storm.

### 9.6 Merchandise sales

Sell → qty down → sales log → unpaid/paid per Cabinet design → Needs Attention if low. Not a full POS.

### 9.7 Dinner / recipes

Locked dinner does **not** auto-decrement pantry in v1 (too noisy). Recipe links on items are informational + tip input only.

---

## 10. Tips (deterministic recommendations)

No ML in v1. Tips are proposals with firefighter English reasons. **Always confirm** before changing stock target, reorder qty, or preferred buyer/retailer.

### 10.1 Proposal shape

```
InventoryTip {
  id, hall_id, item_id?
  kind: raise_target | lower_target | change_reorder_qty
        | seasonal_stock | bought_together | check_related
        | waste_risk | preferred_buyer | preferred_retailer
        | notify_department | merch_reorder
  reason, evidence, confidence (low|med|high)
  status: pending | accepted | dismissed | expired
}
```

### 10.2 Rules (ship order)

| ID | If | Then |
|----|----|------|
| `target_up_3` | Low/Out in ≥3 of last 4 weeks | Raise stock target |
| `target_down_stable` | No Low/Out in 8 weeks and often overstocked | Lower stock target |
| `reorder_down_waste` | ≥2 waste/expiry marks in 60 days | Lower reorder qty |
| `reorder_up_stockout` | Out soon after receive ≥2× | Raise reorder qty |
| `check_related` | Item Out and has `requires`/`complements` | “Check filters / cream” |
| `bought_together` | Strong co-occurrence on Runs | Chip on Run |
| `dept_notify` | ownership=department + Out | Notify department — no cart |
| `seasonal_bbq` | BBQ event ≤14d + historical spike | Seasonal stock tip |
| `merch_low` | Below warn after sale | Reorder tip |

### 10.3 Surfaces

- Item sheet → Tips (managers)  
- Smart Shopping queue  
- Needs Attention “Tips”  
- Pre-event (BBQ) manager digest — not a crowded Whiteboard

Accept → emit `inventory.par_changed` / profile updates via Event Engine. Dismiss → remember negative for that tip kind.

---

## 11. Derived signals (background)

Computed on events / nightly; never typed in by firefighters.

| Signal | Use |
|--------|-----|
| `usage_rate` | Summary chips · tips |
| `stockout_interval` | “Runs out every N days” |
| `waste_rate` | reorder_down_waste |
| `buyer_affinity` | preferred buyer tip |
| `bundle_score` | bought_together chips |
| `month_shortage_index` | seasonal tips |

---

## 12. Item sheet (IA)

Firefighter-facing name: **Item** (not twin).

```
┌─────────────────────────────────────────┐
│ Coffee                         OUT       │
│ Fridge · Canteen                         │
│ Runs out ~every 11 days                  │
├─────────────────────────────────────────┤
│ [ Running Low ]  [ Out ]  [ Used some ]  │
├─────────────────────────────────────────┤
│ Stock target 4 · On hand ~1 · bag        │
├─────────────────────────────────────────┤
│ Related: Filters · Cream                 │
├─────────────────────────────────────────┤
│ Tip: Raise target to 6 — low 3 weeks     │
│      [ Accept ] [ Dismiss ]              │
├─────────────────────────────────────────┤
│ History · Buy · More                     │
└─────────────────────────────────────────┘
```

**Tabs / sections:** Overview (default) · Buy · History · Related · Tips (mgr).  
Members live on Overview. No discussion thread.

---

## 13. Navigation & faces

| Entry | Path | Filter |
|-------|------|--------|
| Canteen | `/hall/canteen` | domain=canteen |
| Cabinet | `/hall/cabinet` | domain=merchandise |
| Inventory power list | `/hall/inventory` (More, managers) | both |

**Canteen home:** Needs Attention → By category → This week’s order → Recent activity.  
**Cabinet home:** Needs Attention → Categories → Recent sales → Low stock.

Optional admin list is not the daily path.

---

## 14. Permissions

| Action | Member | Runner* | Canteen mgr | Captain |
|--------|:------:|:-------:|:-----------:|:-------:|
| View canteen / merch | ✓ | ✓ | ✓ | ✓ |
| Mark low / out / used some | ✓ | ✓ | ✓ | ✓ |
| Receive / adjust | | ✓† | ✓ | ✓ |
| Create / archive / edit Buy | | | ✓ | ✓ |
| Manage relations / accept tips | | | ✓ | ✓ |
| Weekly Order | | | ✓ | ✓ |
| Record merch sale | | | ✓ | ✓ |
| Edit sale price / unit cost | | | ✓ | ✓ |

\*Assigned runner †Receive against The Run only

### Free vs Hall Pro

| Capability | Free linked | Hall Pro |
|------------|-------------|----------|
| Active canteen items | Cap (e.g. 25) | Unlimited |
| Merchandise | Preview cap or — | Full Cabinet |
| Auto-feed Run / Weekly Order | Manual from Needs | Auto + bulk build |
| Photos | Limited / — | Full |
| Tips engine | Basic (related check) | Full tip set |
| Ledger / CSV export | — | ✓ |
| Sales log | — | ✓ |

---

## 15. Data model (conceptual)

```
hall_inventory_items       -- unified canteen + merch; stock_target; ownership; Buy fields
hall_inventory_ledger      -- all qty/status mutations
hall_inventory_relations   -- graph
hall_inventory_signals     -- derived metrics
hall_inventory_tips        -- proposals queue
hall_inventory_waste       -- optional explicit waste/expiry toss
hall_merchandise_sales     -- sales (Cabinet)
(reuse) weekly orders + shopping lines with inventory_item_id
```

**Item hot columns:** identity, status, qty, stock_target, warn_below, ownership, domain, category, location, reorder_qty, preferred_*, timestamps.  
**Sparse profile:** buying_notes, manager_notes, known_issues, photo meta — JSON or side columns.

**Ledger actions:** `mark_low`, `mark_out`, `consume`, `receive`, `adjust`, `transfer`, `archive`, `sale`, `status_clear`, `target_changed`, …

**Migration from Canteen V2:** add domain=`canteen`; map categories; backfill qty; preserve ids and history; feature-flag Cabinet until canteen path is solid.

Unique: `(hall_id, lower(name), domain) WHERE archived = false`.

---

## 16. Event Engine contract

| User / system action | Events (examples) |
|----------------------|-------------------|
| Mark Low / Out | `inventory.item_marked_low` / `inventory.item_emptied` |
| Receive | `inventory.receive_recorded` · `inventory.item_restocked` |
| Target change | `inventory.par_changed` (keep event name for compatibility) |
| Ownership change | `inventory.ownership_changed` |
| Sale | `merch.sold` (+ inventory decrement) |
| Tip created/accepted | `shopping.recommendation_created` / tip accept commands |

Reactions: Logbook auto lines · Whiteboard Out pulse · Smart Shopping candidates · Needs Attention · notify managers — per Hall Event Engine + Whiteboard v2 caps.

---

## 17. Edge cases

| Case | Rule |
|------|------|
| Duplicate names | Unique per hall+domain; suggest merge |
| Negative qty | Block; force Adjust |
| Receive above stock_max | Warn; allow with confirm |
| Out while qty says 12 | Override Out; prompt manager to count later |
| Archive with open lines | Soft-block until cleared |
| Department item Out | Never silent canteen cart |
| Two reporters same Out | Idempotent within window |
| Offline runner | Queue Receive; sync later |

---

## 18. Implementation roadmap

### INV-0 — Spec lock

- [ ] Stock target model approved  
- [ ] Ownership routing approved  
- [ ] Free/Pro caps approved  
- [ ] Tips confirm-only approved  

### INV-1 — Unify engine

- Evolve canteen → `hall_inventory_items` + ledger  
- Status derivation + Low/Out/Receive  
- Canteen UI on new engine  

### INV-2 — Needs Attention + Run feed

- Add to Run · Pro auto-feed · Home pulse  

### INV-3 — Item sheet v1

- Overview · Buy · History timeline  
- Stock target editing  

### INV-4 — Weekly Order build + Receive  

### INV-5 — Relations + Run chips + starter packs  

### INV-6 — Tips engine (target_up_3, check_related, bought_together, dept_notify)  

### INV-7 — Cabinet + sales  

### INV-8 — Signals job + seasonal_bbq · waste tips  

### INV-9 — Photos · Tools checklist import · CSV  

### INV-10 — Barcode entry (field already reserved)  

---

## 19. Success metrics

| Metric | Signal |
|--------|--------|
| Halls with ≥10 active canteen items | Adoption |
| Low/Out marks per week | Live usage |
| Median Out → Receive time | Ops health |
| Auto or one-tap adds to Run | Clipboard replacement |
| Tip accept rate | Advisor quality |
| Runs accepting a related chip | Relations value |
| Median fields filled at create | Must stay low |
| Merch sales logged / month | Cabinet value |
| Non-cook DAU on Needs Attention | Hall Ops habit |

---

## 20. Risks & anti-goals

| Risk | Mitigation |
|------|------------|
| ERP creep | Status-first; Buy behind progressive disclosure |
| Quantity guilt | Never force counts on members |
| Tip / notify fatigue | Confirm tips; pulse caps; digests |
| Double systems | One engine, Canteen + Cabinet faces |
| Merch before canteen solid | Cabinet after INV-1–4 |
| Graph complexity | Four relation types + chips only in early INV |

**Anti-goals:** Full WMS · multi-warehouse · AP purchase orders · barcode-required receiving · per-item social · silent target changes · AI forecasting as a blocker · public qty sync.

---

## 21. Copy

| Instead of | Use |
|------------|-----|
| Par / min / max (three controls) | Stock target (+ optional warn below for managers) |
| SKU / bin / putaway | Name / location |
| Digital twin | Item |
| Cycle count campaign | Count now |
| Demand forecast | Tip: “Usually runs out every …” |
| Supplier master | Buy · preferred store |

Empty Canteen: “Add coffee and paper towels — or apply a starter pack.”  
All clear: “Shelves look good.”

---

## 22. One-line pitch

**Hall Inventory remembers what’s on the shelf, what’s gone, what belongs on the run, and what the hall has learned about each item — without turning the kitchen into a warehouse.**

---

## 23. Approval checklist

- [ ] Domains, categories, ownership approved  
- [ ] Stock target model approved  
- [ ] Action set + feeds approved  
- [ ] Relations v1 + tips confirm rules approved  
- [ ] Free vs Pro caps approved  
- [ ] Roadmap INV-1 → INV-7 sequencing approved  
- [ ] Explicit go-ahead to implement  

---

*— End of Hall Inventory product specification v2 —*
