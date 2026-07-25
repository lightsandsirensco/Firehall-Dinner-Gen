# Hall Event Engine

**Status:** Design only — do not implement until approved  
**Date:** 2026-07-17  
**Role:** The runtime brain of Hall Operations  
**Depends on:** `review/hall-operations-design.md` · Inventory · Smart Shopping · Whiteboard · Logbook · Merchandise · Canteen Payments · Tools Ecosystem  

**What this is:** An event-driven operating system. Firefighters record **what happened**. The engine updates **everything else**.  

**What this is not:** A page map · a notification settings screen · an AI product · a chatbot.

---

## 0. The Stripe analogy (product truth)

Stripe is not a “pay” button. Every charge emits events; webhooks and ledgers react.

Hall Ops is not a Board page. Every station action emits a **Hall Event**. Projections (Board, Inventory, Run, Dues, Logbook, Home) **subscribe**.

```
Firefighter action
       │
       ▼
┌──────────────────┐
│  Command API     │  validate · authorize · write intent
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Event Store     │  append-only facts (source of truth for history)
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Hall Brain      │  rules · projections · notifications · learning hooks
└────────┬─────────┘
         ▼
   Module views update (derived state)
```

**UX implication:** UI never says “also update Inventory.” UI says “Coffee’s out.” The engine does the rest.

---

## 1. Event architecture

### 1.1 Core concepts

| Concept | Definition |
|---------|------------|
| **Command** | Intent from a user or system (“Mark coffee OUT”) |
| **Event** | Immutable fact that the command succeeded (`inventory.item_emptied`) |
| **Projection** | Derived read model (Board Tonight strip, Run lines, Dues balances) |
| **Reaction** | Side effect triggered by an event (notify runner, open Smart Shopping card) |
| **Policy** | Hall-configurable rule that shapes reactions (“digest vs push”) |
| **Signal** | Aggregated pattern over events (for future learning — not required v1) |

### 1.2 Event envelope (every event)

```
HallEvent {
  id              UUID
  hall_id         UUID
  type            string          // e.g. inventory.item_emptied
  version         int             // schema version per type
  occurred_at     timestamptz     // when it happened in the hall
  recorded_at     timestamptz     // when we wrote it
  actor           Actor           // user | system | integration
  correlation_id  UUID            // ties a chain (e.g. one dinner night)
  causation_id    UUID?           // event that caused this event
  aggregate       { type, id }    // inventory_item | dinner | run | …
  payload         object          // type-specific
  visibility      enum            // hall | role_restricted
  idempotency_key string?         // safe retries
}
```

**Actor**

```
Actor {
  kind: "member" | "system" | "automation" | "integration"
  member_id?
  role_at_time?     // captain | canteen_manager | member | treasurer
  source?           // "app" | "smart_shopping" | "tools_bridge" | "webhook"
}
```

### 1.3 Processing pipeline

```
Command
  → AuthZ (role + hall membership)
  → Validate against aggregate state
  → Append Event(s)  [same transaction as write model when possible]
  → Fan-out:
        ├─ Projection updaters (sync or near-sync)
        ├─ Reaction rules (async queue OK)
        ├─ Notification planner
        ├─ Logbook auto-entry writer
        └─ Learning signal sink (append-only; no model required)
```

**Failure rule:** Event append is sacred. If a projection fails, rebuild from events — do not invent silent “extra writes” without an event.

### 1.4 Idempotency & tones

Fire halls drop mid-tap. Commands carry `idempotency_key`. Duplicate “Mark OUT” within N minutes collapses to one event (or `inventory.item_emptied` once + ignored duplicate).

Hold / cancel dinner must not orphan shopping: see **Event chains** §4.

### 1.5 Module vs engine

| Module (UI face) | Engine role |
|------------------|-------------|
| Board | Projection of Tonight + notices + pulse chips |
| Inventory | Aggregate + projection |
| The Run / Shopping | Aggregate + projection |
| Smart Shopping | Reaction consumer + recommendation aggregate |
| Dues / Payments | Aggregate ledger |
| Cabinet / Merch | Inventory domain + sales ledger |
| Logbook | Projection of human + auto events |
| Meal History | Projection of meal lifecycle |
| Tools Mission | Optional upstream commands when bridged |

**There is no “Inventory page logic” that bypasses the engine.** Pages are subscribers.

---

## 2. Event catalog

Naming: `domain.past_tense_fact`  
Domains: `inventory` · `shopping` · `meal` · `vote` · `duty` · `payment` · `merch` · `board` · `notice` · `shift` · `member` · `budget` · `protein` · `hall`

For each event: **Cause · Trigger · Auto · Notify · Modules · Learn?**

---

### 2.1 Inventory

#### `inventory.item_marked_low`

| | |
|--|--|
| **Cause** | Stock visually/physically low |
| **Trigger** | Member taps Low (or scanner/integration later) |
| **Auto** | Upsert shortage; Smart Shopping candidate; Board pulse chip; Logbook auto; optional Budget soft estimate |
| **Notify** | Canteen manager (or digest); if assigned runner exists for open Run — soft nudge |
| **Modules** | Inventory · Smart Shopping · Board · Logbook · Home |
| **Learn?** | Yes — frequency of Low → par suggestion |

#### `inventory.item_emptied`

| | |
|--|--|
| **Cause** | Item fully out |
| **Trigger** | Member taps Out |
| **Auto** | Same as Low at higher priority; may force Weekly Order / Run line; Board “Needs pulse” |
| **Notify** | Canteen manager push (configurable); runner if Run open |
| **Modules** | Inventory · Smart Shopping · Board · Logbook · Run |
| **Learn?** | Yes — Out streaks → par / pack size |

#### `inventory.item_restocked` / `inventory.receive_recorded`

| | |
|--|--|
| **Cause** | Goods arrived / counted up |
| **Trigger** | Receive flow, Run complete, or adjust |
| **Auto** | Clear shortage; close related shopping lines; Logbook; Budget actual if dinner/canteen tagged; Board pulse clear |
| **Notify** | Optional: cook if dinner protein arrived |
| **Modules** | Inventory · Run · Budget · Logbook · Board · Smart Shopping |
| **Learn?** | Yes — lead time, preferred retailer signals |

#### `inventory.par_changed`

| | |
|--|--|
| **Cause** | Manager changes min/par |
| **Trigger** | Canteen manager / captain |
| **Auto** | Recompute shortage vs new par; may emit synthetic Low |
| **Notify** | None (or Logbook quiet) |
| **Modules** | Inventory · Smart Shopping |
| **Learn?** | Input for learning — human override of AI suggestion |

#### `inventory.ownership_changed`

| | |
|--|--|
| **Cause** | Item reassigned canteen / department / merch / dinner |
| **Trigger** | Manager |
| **Auto** | Smart Shopping routing changes (notify dept vs buy) |
| **Notify** | If department — optional facilities note |
| **Modules** | Inventory · Smart Shopping · Logbook |
| **Learn?** | No |

#### `inventory.expire_warning`

| | |
|--|--|
| **Cause** | Expiry date approaching |
| **Trigger** | System cron |
| **Auto** | Logbook; Board chip; Plan suggest use-soon recipes (reaction) |
| **Notify** | Cook / canteen digest |
| **Modules** | Inventory · Board · Plan/Tonight · Logbook |
| **Learn?** | Yes — waste patterns |

---

### 2.2 Shopping / The Run

#### `shopping.run_opened`

| | |
|--|--|
| **Cause** | New shopping mission / weekly order started |
| **Trigger** | Member or Smart Shopping “Start Run” |
| **Auto** | Board Tonight/Run strip; link Mission if Tools bridge |
| **Notify** | Hall soft (or only assignees) |
| **Modules** | Run · Board · Home |
| **Learn?** | Timing patterns (when halls shop) |

#### `shopping.line_added` / `shopping.line_removed` / `shopping.line_qty_changed`

| | |
|--|--|
| **Cause** | Need Anything / Smart Shopping / cook request |
| **Trigger** | Member or automation |
| **Auto** | Recalc Run totals; Budget soft estimate |
| **Notify** | Runner if claimed (batched) |
| **Modules** | Run · Budget · Board |
| **Learn?** | Common add-ons |

#### `shopping.run_claimed` (`duty.runner_assigned` often co-emitted)

| | |
|--|--|
| **Cause** | Someone owns the run |
| **Trigger** | Self-claim or captain assign |
| **Auto** | Board update; lock edit policy optional |
| **Notify** | Runner confirmation; cook |
| **Modules** | Run · Board · Duty · Home |
| **Learn?** | Who shops → Runner suggestion |

#### `shopping.list_locked`

| | |
|--|--|
| **Cause** | Vote closed / captain lock / leave-for-store |
| **Trigger** | System on vote close or manual |
| **Auto** | Freeze dinner-driven lines; allow canteen adds by policy |
| **Notify** | Runner · Cook |
| **Modules** | Run · Meal · Board |
| **Learn?** | No |

#### `shopping.run_started` / `shopping.run_completed` / `shopping.run_cancelled`

| | |
|--|--|
| **Cause** | Left for store / back with goods / aborted |
| **Trigger** | Runner / captain |
| **Auto** | **Completed** → prompt Receive → restock events → Logbook → Budget actual → clear Board shopping pulse · **Cancelled** → unlock list · reopen Smart Shopping |
| **Notify** | Hall on complete; cook on protein arrival path |
| **Modules** | Run · Inventory · Budget · Logbook · Board · Smart Shopping |
| **Learn?** | Duration, retailer, missed items |

#### `shopping.recommendation_created` / `shopping.recommendation_accepted` / `shopping.recommendation_dismissed`

| | |
|--|--|
| **Cause** | Smart Shopping engine output / human decision |
| **Trigger** | System / member |
| **Auto** | Accept → line_added; Dismiss → learn negative signal |
| **Notify** | Canteen manager digest for new high-priority recs |
| **Modules** | Smart Shopping · Run · Inventory |
| **Learn?** | **Primary learning surface** |

---

### 2.3 Meal / Tonight

#### `meal.selected` / `meal.locked`

| | |
|--|--|
| **Cause** | Captain pick or vote winner |
| **Trigger** | Vote close or manual lock |
| **Auto** | Board Tonight; Scale ingredients; Shop lines for gaps; open recipe; suggest cook/runner if unset; Budget estimate; correlation_id = dinner night |
| **Notify** | Hall: “Tonight: Chili”; cook/runner if assigned |
| **Modules** | Tonight · Board · Run · Budget · Recipe · Home |
| **Learn?** | Popularity (with care — see automation) |

#### `meal.cancelled` / `meal.held` / `meal.resumed`

| | |
|--|--|
| **Cause** | Call volume / tones / schedule change |
| **Trigger** | Cook / captain |
| **Auto** | Board status; Hold note; optionally unlock shopping; don’t delete inventory plans |
| **Notify** | Runner · Cook · Hall soft |
| **Modules** | Board · Meal · Run |
| **Learn?** | Hold frequency by night |

#### `meal.cooked` / `meal.served` / `meal.completed`

| | |
|--|--|
| **Cause** | Dinner done / cleaned up |
| **Trigger** | Cook marks Fed / Complete |
| **Auto** | Logbook; Meal History; popularity signal; inventory usage estimates; Budget actual reconcile; recipe rating prompt; clear Tonight strip; leftover prompt |
| **Notify** | Optional thanks / rating; none noisy |
| **Modules** | Logbook · History · Inventory · Budget · Board · Recs |
| **Learn?** | **Core** — taste, cost, effort |

#### `meal.headcount_changed`

| | |
|--|--|
| **Cause** | Drop-ins / mutual aid |
| **Trigger** | Member |
| **Auto** | Rescale open Run if unlocked; Budget estimate |
| **Notify** | Cook · Runner |
| **Modules** | Meal · Run · Budget · Board |
| **Learn?** | Drop-in patterns |

---

### 2.4 Vote

#### `vote.opened` / `vote.option_added` / `vote.cast` / `vote.closed` / `vote.cancelled`

| | |
|--|--|
| **Cause** | Crew choosing dinner |
| **Trigger** | Captain / system schedule / member (policy) |
| **Auto** | Board pulse; on **closed** → `meal.locked` chain; anti-repeat policy may suppress winners |
| **Notify** | Hall open; reminder before close; result |
| **Modules** | Tonight · Board · Meal |
| **Learn?** | Preference matrix; fatigue (“taco always wins”) |

---

### 2.5 Duty assignments

#### `duty.cook_assigned` / `duty.cook_unassigned`

| | |
|--|--|
| **Cause** | Who cooks |
| **Trigger** | Self / captain / rotation rule |
| **Auto** | Board; open recipe deep link; remind before prep |
| **Notify** | Cook |
| **Modules** | Board · Tonight · Home |
| **Learn?** | Fairness / rotation |

#### `duty.runner_assigned` / `duty.runner_unassigned`

| | |
|--|--|
| **Cause** | Who shops |
| **Trigger** | Self / captain / suggestion accept |
| **Auto** | Board; claim Run |
| **Notify** | Runner |
| **Modules** | Board · Run · Home |
| **Learn?** | Prefer frequent shoppers as suggestions |

#### `duty.rotation_advanced`

| | |
|--|--|
| **Cause** | Scheduled rotation |
| **Trigger** | System |
| **Auto** | Emit assign events |
| **Notify** | Assignees |
| **Modules** | Duty · Board |
| **Learn?** | No |

---

### 2.6 Payments / Dues

#### `payment.received` / `payment.recorded` / `payment.reversed`

| | |
|--|--|
| **Cause** | Member paid (cash/e-transfer recorded — Stripe later) |
| **Trigger** | Treasurer / canteen manager / self-report (policy) |
| **Auto** | Balance update; remove Board dues chip for member; monthly report projection; Logbook (privacy: amount visibility policy); Home pulse |
| **Notify** | Treasurer (batch OK); member confirmation |
| **Modules** | Dues · Board · Logbook · Reports · Home |
| **Learn?** | Payment timing |

#### `payment.due_opened` / `payment.overdue` / `payment.reminder_sent` / `payment.waived` / `payment.period_closed`

| | |
|--|--|
| **Cause** | Billing cycle / lateness |
| **Trigger** | System cron / treasurer |
| **Auto** | Board reminder chips; escalate after N months |
| **Notify** | Member; after 3 months → canteen manager + captain (policy) |
| **Modules** | Dues · Board · Home · Reports |
| **Learn?** | Chronic late payers (sensitive — role-gated) |

---

### 2.7 Merchandise / Cabinet

#### `merch.sold` / `merch.sale_unpaid` / `merch.sale_paid` / `merch.returned`

| | |
|--|--|
| **Cause** | Shirt/hoodie sold |
| **Trigger** | Cabinet flow |
| **Auto** | Inventory decrement; revenue ledger; if below min → Low/Empty chain; Smart Shopping reorder; Logbook; Home merch pulse |
| **Notify** | Canteen/merch manager on low; unpaid list for treasurer |
| **Modules** | Cabinet · Inventory · Smart Shopping · Budget/Revenue · Logbook · Home |
| **Learn?** | Size velocity |

#### `merch.restock_ordered` / `merch.restock_received`

| | |
|--|--|
| **Cause** | Reorder cycle |
| **Trigger** | Manager / receive |
| **Auto** | Inventory; clear low; Logbook |
| **Notify** | Manager |
| **Modules** | Cabinet · Inventory · Logbook |
| **Learn?** | Lead times |

---

### 2.8 Board / Notices

#### `notice.posted` / `notice.pinned` / `notice.unpinned` / `notice.archived` / `notice.expired` / `notice.promoted_to_logbook`

| | |
|--|--|
| **Cause** | Human bulletin / expiry cron / promote lasting fact |
| **Trigger** | Member (role) / system |
| **Auto** | Board projection; promote → Logbook entry |
| **Notify** | Hall if pin/urgent; else silent |
| **Modules** | Board · Logbook · Home |
| **Learn?** | Which notices get reactions |

#### `board.pulse_raised` / `board.pulse_cleared`

| | |
|--|--|
| **Cause** | Derived from other events (Out of coffee, dues) |
| **Trigger** | System reaction |
| **Auto** | Home / Board chips only |
| **Notify** | Usually none (visual) |
| **Modules** | Board · Home |
| **Learn?** | No |

---

### 2.9 Shift / Tour

#### `shift.started` / `shift.ended` (optional hall feature)

| | |
|--|--|
| **Cause** | Tour begin/end if hall uses digital tour mark |
| **Trigger** | Member / captain / schedule integration |
| **Auto** | Logbook catch-up digest for oncoming; archive ephemeral board notes policy |
| **Notify** | Oncoming: “N unread in Logbook” |
| **Modules** | Logbook · Board · Home |
| **Learn?** | When halls actually check in |

*If halls don’t mark shift, use “user opened Logbook” as soft shift boundary — still emit `logbook.catchup_opened`.*

#### `logbook.entry_created` / `logbook.entry_resolved` / `logbook.marked_read`

| | |
|--|--|
| **Cause** | Human note or auto writer |
| **Trigger** | Member / system |
| **Auto** | Unread counts; Home pulse |
| **Notify** | Mentions only; else digest |
| **Modules** | Logbook · Home |
| **Learn?** | Category usefulness |

---

### 2.10 Membership

#### `member.joined` / `member.left` / `member.role_changed` / `member.invited`

| | |
|--|--|
| **Cause** | Roster change |
| **Trigger** | Captain / invite accept |
| **Auto** | Dues roster; permission; Logbook; welcome Board note optional |
| **Notify** | Captain; new member |
| **Modules** | Members · Dues · Logbook · Board |
| **Learn?** | No |

---

### 2.11 Budget / Protein / Hall meta

#### `budget.period_opened` / `budget.soft_cap_breached` / `budget.actual_updated`

| | |
|--|--|
| **Cause** | Spend vs kitty |
| **Trigger** | System from Price/Purchase events |
| **Auto** | Board/Home pulse; suggest cheaper Plan |
| **Notify** | Canteen manager / captain |
| **Modules** | Budget · Board · Plan · Home |
| **Learn?** | Cost drift |

#### `protein.deal_found` / `protein.deal_expired` / `protein.deal_applied`

| | |
|--|--|
| **Cause** | Deal logged or scraped (future) / cook enters |
| **Trigger** | Member / integration |
| **Auto** | Smart Shopping rec; Plan suggests recipes using protein; optional Board chip |
| **Notify** | Cook candidates / canteen |
| **Modules** | Protein · Smart Shopping · Plan · Board |
| **Learn?** | Deal → meal conversion |

#### `hall.pro_activated` / `hall.settings_changed`

| | |
|--|--|
| **Cause** | Billing / config |
| **Trigger** | Captain / system |
| **Auto** | Feature flags; Logbook |
| **Notify** | Captain |
| **Modules** | Settings · all gates |
| **Learn?** | No |

---

## 3. Event chains (dozens)

Chains are **causation graphs**. One user action → many events. Correlation_id binds a “dinner night” or “Costco run.”

### 3.1 Coffee runs out

```
inventory.item_emptied (coffee)
  → shopping.recommendation_created (priority high)
  → board.pulse_raised (out_of_coffee)
  → logbook.entry_created (auto)
  → notify.canteen_manager
  → [if Run open] shopping.line_added
  → budget.soft estimate bump
  → notify.runner (if claimed)
```

### 3.2 Dinner vote closes

```
vote.closed
  → meal.locked
  → board.pulse_raised / Tonight projection
  → duty.cook_assigned (if rotation/default)
  → duty.runner_assigned (if rotation/default)
  → shopping.list_locked (dinner section)
  → shopping.line_added* (scaled gaps vs inventory)
  → recipe.opened (deep link signal / client)
  → budget.estimate_updated
  … later …
  → meal.completed
  → logbook.entry_created
  → meal.history_recorded
  → popularity.signal
  → inventory.usage_estimated
  → budget.actual_updated
  → recipe.rating_requested
  → recommendation_engine.signal
```

### 3.3 Member pays dues

```
payment.received
  → dues.balance_updated (projection)
  → board.pulse_cleared (member overdue chip)
  → notify.treasurer (batchable)
  → report.monthly_projection_updated
  → logbook.entry_created (policy: amount hidden)
```

### 3.4 Merchandise sold

```
merch.sold
  → inventory.qty_decremented (or emptied)
  → revenue.recorded
  → [if below min] inventory.item_marked_low
  → shopping.recommendation_created (merch owner)
  → logbook.entry_created
  → home.merch_pulse
```

### 3.5 Protein deal found

```
protein.deal_found
  → shopping.recommendation_created
  → plan.suggestions_updated (recipes using protein)
  → board.pulse_raised (optional chip)
  → notify.cooks_digest
```

### 3.6 Shopping completed

```
shopping.run_completed
  → inventory.receive_prompt (UI) / receive_recorded*
  → inventory.item_restocked*
  → board.pulse_cleared (shopping)
  → logbook.entry_created
  → budget.actual_updated
  → shopping.recommendation_dismissed* (fulfilled)
  → meal.ready_to_cook (if dinner protein in)
```

### 3.7 Meal cancelled after lock

```
meal.cancelled
  → board.status_held_or_cancelled
  → shopping.list_unlocked (dinner lines) OR shopping.lines_cancelled
  → notify.runner
  → notify.cook
  → logbook.entry_created
  → vote may reopen (policy)
```

### 3.8 Inventory restocked from receive

```
inventory.receive_recorded
  → inventory.item_restocked
  → shopping.line_completed
  → board.pulse_cleared
  → smart_shopping.candidate_cleared
  → budget.actual_updated
  → logbook.entry_created
```

### 3.9 Chronic low → par suggestion (automation, not silent change)

```
inventory.item_marked_low (week N)
inventory.item_marked_low (week N+1)
inventory.item_marked_low (week N+2)
  → signal.par_increase_candidate
  → shopping.recommendation_created (type: adjust_par)
  → notify.canteen_manager
  → [human accepts] inventory.par_changed
```

### 3.10 Always the runner

```
shopping.run_claimed* (same member, many times)
  → signal.preferred_runner
  → duty.suggestion (next lock)
  → [captain accepts] duty.runner_assigned
```

### 3.11 Late dues escalation

```
payment.overdue (month 1) → reminder
payment.overdue (month 2) → reminder + Board chip
payment.overdue (month 3)
  → notify.canteen_manager
  → notify.captain (policy)
  → board.pulse_raised (sensitive: not public shame — manager view)
```

### 3.12 Taco fatigue

```
meal.locked (tacos) × many in window
  → signal.menu_fatigue
  → vote.option_suppressed / downranked (policy: surface less)
  → plan.diversity_nudge
```

### 3.13 BBQ seasonal short

```
notice.posted (BBQ) OR board.event
  + historical inventory.item_emptied before BBQ dates
  → signal.seasonal_stock
  → shopping.recommendation_created (seasonal bump)
  → notify.canteen_manager
```

### 3.14 Drop-in headcount

```
meal.headcount_changed (+4)
  → scale.ingredients_updated
  → shopping.line_qty_changed* (if unlocked)
  → budget.estimate_updated
  → notify.cook
  → notify.runner
```

### 3.15 Department-owned paper towels out

```
inventory.item_emptied (ownership=department)
  → shopping.recommendation_created (type: notify_department)
  → logbook.entry_created
  → NOT shopping.line_added to canteen Run
  → board.pulse_raised (facilities)
```

### 3.16 Unpaid merch → paid

```
merch.sale_unpaid
  → treasurer.unpaid_list
…
merch.sale_paid
  → revenue.recorded
  → unpaid_list clear
  → notify.treasurer (quiet)
```

### 3.17 Notice → lasting fact

```
notice.promoted_to_logbook
  → logbook.entry_created (standing)
  → notice.archived (optional)
```

### 3.18 Member joins mid-month

```
member.joined
  → payment.due_opened (prorate policy)
  → logbook.entry_created
  → notify.captain
  → dues.roster_updated
```

### 3.19 Soft cap breached

```
budget.soft_cap_breached
  → board.pulse_raised
  → plan.cheaper_suggestions
  → notify.canteen_manager
  → shopping.recommendation_created (defer noncritical)
```

### 3.20 Tools Mission synced to Hall

```
tools.mission_pushed (bridge command)
  → shopping.run_opened or line_added*
  → meal.selected (draft)
  → board.pulse_raised
  → logbook.entry_created (optional)
```

### 3.21 Expiry → cook tonight

```
inventory.expire_warning
  → plan.suggestions_updated (use-soon)
  → board.pulse_raised
  → logbook.entry_created
```

### 3.22 Shift start catch-up

```
shift.started OR logbook.catchup_opened
  → notify.digest (unread count)
  → board.ephemeral_prune (policy)
```

### 3.23 Vote opened

```
vote.opened
  → board.pulse_raised
  → notify.hall
  → [schedule] vote.reminder → vote.closed chain
```

### 3.24 Run cancelled mid-trip

```
shopping.run_cancelled
  → shopping.list_unlocked
  → duty.runner_unassigned (optional)
  → board update
  → logbook.entry_created
  → smart_shopping.reopen_candidates
```

### 3.25 Meal completed full learning chain

```
meal.completed
  → logbook.entry_created
  → meal.history_recorded
  → popularity.signal
  → inventory.usage_estimated
  → budget.actual_updated
  → recipe.rating_requested
  → recommendation_engine.signal
  → board.tonight_cleared
  → leftover.prompt
```

---

## 4. The Hall Brain

### 4.1 Definition

**Hall Brain** = event store + rule engine + projection workers + notification planner + signal sink.

It is not a chatbot. It does not “decide dinner.” It **reacts** with deterministic rules first; learning only **proposes**.

### 4.2 Rule engine (v1)

```
ON event_type
IF hall_policy_allows
IF conditions (payload, aggregate state, time window)
THEN emit commands/events OR enqueue notifications OR write projections
```

Rules are data (JSON/YAML or DB rows), versioned per hall with global defaults.

**Example rule**

```yaml
id: out_to_recommendation
on: inventory.item_emptied
then:
  - create_recommendation: { priority: high, reason: empty }
  - logbook_auto: inventory_out
  - board_pulse: item_out
  - notify: { role: canteen_manager, channel: push_or_digest }
unless:
  - ownership: department  # different then-block
```

### 4.3 Projection map

| Projection | Listens (examples) |
|------------|--------------------|
| Board Tonight | meal.*, duty.*, vote.*, shopping.run_* |
| Board Pulses | inventory.*emptied/low, payment.overdue, vote.* |
| Inventory qty/status | inventory.*, merch.sold, receive |
| Run clipboard | shopping.*, meal.locked, headcount |
| Smart Shopping queue | inventory shortages, protein deals, seasonal signals |
| Dues balances | payment.* |
| Logbook feed | almost all (filtered by auto flags) |
| Meal History | meal.completed / cancelled |
| Home “Needs You” | pulses + assignees |
| Monthly reports | payment.*, budget.*, merch revenue |

### 4.4 Correlation patterns

| Pattern | correlation_id |
|---------|----------------|
| Dinner night | `dinner:{hall}:{date}` |
| Shopping trip | `run:{run_id}` |
| Billing period | `dues:{period_id}` |
| Merch sale | `sale:{sale_id}` |

Enables “replay this night” and support debugging.

---

## 5. Automation rules (deterministic + extension points)

Human always confirms **state-changing suggestions** that alter pars, money, or roster — except pure projections (Board chips).

| Rule ID | If… | Then… | Confirm? |
|---------|-----|-------|----------|
| `par_bump_3_week_low` | Same item Low/Out ≥3 weeks | Recommend par ↑ | Yes |
| `prefer_frequent_runner` | Member claimed Run ≥N in window | Suggest as Runner on lock | Yes |
| `dues_late_3` | Overdue ≥3 periods | Notify canteen manager + captain | No (notify only) |
| `menu_fatigue` | Meal wins ≥K in W days | Downrank in next votes | Config |
| `bbq_seasonal` | BBQ event + historical shorts | Seasonal stock rec | Yes |
| `dept_never_on_run` | ownership=department | Notify dept, not canteen cart | No |
| `soft_cap` | Estimate > soft cap | Suggest cheaper meals / defer staples | Soft |
| `protein_deal_to_plan` | Deal found | Recipe suggestions | No |
| `expire_use_soon` | Expiry warning | Plan suggestions | No |
| `post_complete_leftover` | meal.completed | Leftover prompt | No |
| `auto_lock_on_vote_close` | vote.closed | meal.locked + list_locked | Config |
| `receive_after_run` | run_completed | Force receive checklist | Soft |
| `clear_pulse_on_restock` | restocked | Clear Board pulse | No |
| `treasurer_on_pay` | payment.received | Treasurer digest | Digest |
| `merch_low_reorder` | merch sold → below min | Reorder rec | Yes |

### Extension point interface (future AI — do not implement models now)

```
LearningHook {
  on_event(event) → append Signal
  propose(hall_id, situation) → Proposal[]
    // Proposal { kind, confidence, reason, requires_confirm, payload }
  feedback(proposal_id, accepted|dismissed)
}
```

v1: `LearningHook` = rule-based heuristics writing Signals.  
v2: ML/LLM implements same interface; UI unchanged (“Suggested — why”).

---

## 6. Notification engine

### 6.1 Principles

1. **Digest > storm** — shift-start Logbook digest beats 40 pushes.  
2. **Role-routed** — dues never blast the whole hall.  
3. **Assignee-urgent** — cook/runner get direct pings.  
4. **Quiet hours** — hall-configurable (overnight).  
5. **Channels** — in-app · push · email (treasurer reports) · SMS later.  
6. **Every notify is itself an event** — `notify.dispatched` / `notify.suppressed` for audit.

### 6.2 Planner

```
Event → Candidate notifications
     → Policy (role, quiet hours, batch window)
     → Dedupe (same pulse 15 min)
     → Channel select
     → Dispatch OR fold into digest
     → notify.dispatched event
```

### 6.3 Priority

| P0 Immediate | P1 Same hour | P2 Digest | P3 Silent UI |
|--------------|--------------|-----------|--------------|
| Runner assigned now | Vote closing 30m | Logbook unread | Board pulse |
| Dinner locked + you’re cook | Out of coffee (manager) | Dues reminders | Recommendation queue |
| Run cancelled while out | Soft cap breach | Monthly report | Popularity signals |

### 6.4 Templates (examples)

- `notify.dinner_locked` — “Tonight: Chili. You’re cook.”  
- `notify.item_out` — “Coffee OUT (Mike).”  
- `notify.run_claimed` — “Sam’s got the run.”  
- `notify.dues_overdue` — member-only.  
- `notify.shift_digest` — “7 unread in Logbook.”  

---

## 7. Module interactions (subscription matrix)

```
                 Inv  Shop  Meal Vote Duty Pay Merch Board Log Home Smart Budget
inventory.*       W    R     R         R         R     R    R   R     R      R
shopping.*        R    W     R    R    R               R    R   R     R      R
meal.* / vote.*   R    R     W    W    R               R    R   R            R
duty.*                 R     R         W               R        R
payment.*                                      W       R    R   R            R
merch.*           W                      W     W       R    R   R     R      R
board/notice.*                                 R       W    R   R
protein.*         R    R     R                             R   R     R
budget.*          R    R     R                             R   R            W
```

W = writes aggregate/projection · R = reacts/reads

**Law:** Cross-module writes happen only by **emitting events**, never by calling another module’s private DB updater.

---

## 8. Data model (engine-centric)

### 8.1 Tables (logical)

```
hall_events                -- append-only event store
hall_aggregates            -- optional snapshot cache (inventory_item, dinner, run…)
hall_projections_*         -- board_tonight, dues_balance, run_lines, …
hall_rules                 -- automation rule defs + hall overrides
hall_notifications         -- outbox + status
hall_notification_prefs    -- per member/role
hall_signals               -- learning features (aggregates over events)
hall_proposals             -- AI/heuristic suggestions awaiting confirm
hall_correlations          -- dinner night / run indexes (optional)
```

### 8.2 Aggregate examples

```
InventoryItem { id, hall_id, qty, status, par, ownership, … }
DinnerNight   { id, date, meal_ref, status, cook_id, runner_id, headcount, … }
ShoppingRun   { id, status, locked, lines[], retailer_pref? }
DuesPeriod    { id, balances[] }
MerchVariant  { id, qty, min, … }
```

Aggregates update **from events** (event sourcing lite) or dual-write event + aggregate in one transaction (pragmatic v1). Prefer: **transactional outbox** if not full event sourcing day one.

### 8.3 Pragmatic v1 vs pure event sourcing

| Approach | When |
|----------|------|
| **Outbox:** write aggregate + event row same TX; async reactions | Ship faster — **recommended v1** |
| **Full event sourcing:** rebuild aggregates from events | Later for audit-heavy money if needed |

Even with outbox, **event catalog is the contract**. UI and AI never depend on page code paths.

---

## 9. Event timeline (product + ops)

A firefighter doesn’t browse the event store. They see:

| Surface | Timeline flavor |
|---------|-----------------|
| **Logbook** | Human-readable auto + manual (primary) |
| **Meal History** | Dinner subset |
| **Dues ledger** | Payment subset |
| **Support / captain debug** | Raw event timeline (Pro / admin) |

### 9.1 Example night (readable)

```
16:02  vote.opened
16:45  vote.cast × 6
17:00  vote.closed → meal.locked (Chili)
17:00  duty.cook_assigned (Alex)
17:01  duty.runner_assigned (Sam)
17:01  shopping.list_locked
17:02  shopping.line_added (ground beef 3lb) …
17:40  shopping.run_started
18:15  shopping.run_completed
18:18  inventory.receive_recorded × N
18:20  board.pulse_cleared
19:05  meal.held (tones)
19:40  meal.resumed
20:10  meal.completed
20:10  logbook + history + usage signals
```

### 9.2 Retention

| Data | Retention |
|------|-----------|
| Events | Long (hall life); cold storage OK |
| Logbook projections | Forever (product promise) |
| Board ephemeral | Expire per notice policy |
| Notifications | 90 days |
| Signals | Rolling windows + monthly rollups |

---

## 10. AI extension points (design only)

| Hook | Input signals | Proposal kinds |
|------|---------------|----------------|
| `ParAdvisor` | Low/Out frequency, receive qty | `adjust_par` |
| `RunnerAdvisor` | claim history, fairness | `assign_runner` |
| `MenuDiversity` | lock history, ratings | `suppress_option` / `suggest_alt` |
| `SeasonalStocker` | events + historical shorts | `seasonal_par` |
| `DealMatcher` | protein deals + catalog | `suggest_recipes` |
| `BudgetCoach` | soft cap breaches | `cheaper_plan` |
| `WasteReducer` | expiry + leftovers | `use_soon` |
| `DuesRisk` | overdue patterns | `escalate` (role-gated) |

**Constraints**

- Never auto-change money, pars, or roster without confirm  
- Always show **reason** (“Low 3 weeks running”)  
- Private hall data never trains public models without contract  
- Firefighter language in proposals  

---

## 11. Future integrations (emit/consume events)

| Integration | In | Out |
|-------------|----|-----|
| Tools Mission bridge | `tools.mission_pushed` | Run/Meal commands |
| Calendar / training schedule | events → BBQ/training | Board notices |
| Accounting export | — | `payment.*` / budget CSV |
| SMS / Teams / email bridge | — | `notify.dispatched` webhooks |
| Barcode / scale | receive qty | `inventory.receive_recorded` |
| Retailer deep links | — | preference only (no lock-in) |
| FD roster (careful) | member sync | `member.*` |
| Stripe (future) | paid webhooks | `payment.received` |

Integrations authenticate as `Actor.kind = integration` with scoped keys.

---

## 12. Implementation order (engine)

### EE-0 — Contract  
Freeze event catalog v1 + envelope; approval  

### EE-1 — Event store + outbox  
Append events on existing writes (Inventory Out, Run complete, Vote close)  

### EE-2 — Reaction workers v1  
Out → recommendation + Logbook + Board pulse  

### EE-3 — Notification planner  
Digest + assignee P0  

### EE-4 — Meal lock chain  
Vote close → full dinner night correlation  

### EE-5 — Payments + Merch chains  

### EE-6 — Rules as data + hall overrides  

### EE-7 — Signals + Proposals UI (heuristics)  

### EE-8 — LearningHook swap-ready (still no ML required)  

**Do not** build a raw “event admin UI” for firefighters before Logbook/Home consume the same facts.

---

## 13. Anti-goals

- Silent AI changing dinner or dues  
- Page-to-page `updateInventory()` spaghetti without events  
- Push storms for every Low  
- Public analytics from private hall events  
- Replacing FD official logs  
- Requiring firefighters to understand “event sourcing”

---

## 14. Success metrics

| Metric | Meaning |
|--------|---------|
| % of Out marks that produce recommendation < 60s | Brain alive |
| Avg events per dinner night | Chain completeness |
| Notify suppress rate | Fatigue control |
| Proposal accept rate | Automation quality |
| Manual “also update X” support tickets → 0 | UX promise kept |

---

## 15. Relationship to other design docs

| Doc | Relationship |
|-----|----------------|
| `hall-operations-design.md` | Faces / stations — **this doc is the engine under them** |
| `tools-ecosystem-redesign.md` | Public Mission may **emit** bridge events into Hall |
| Inventory / Smart Shopping / Logbook / Board / Merch / Payments | Module specs = aggregates + projections of these events |

Add to Hall Ops design: *“UI records commands; Hall Event Engine owns consequences.”*

---

## 16. Approval checklist

- [ ] Event envelope + naming approved  
- [ ] Catalog v1 coverage sufficient (inventory → membership)  
- [ ] Outbox pragmatism vs full event sourcing approved  
- [ ] Notification priorities + digest rules approved  
- [ ] Automation confirm/no-confirm matrix approved  
- [ ] AI = LearningHook only (no models in v1) approved  
- [ ] Implementation order EE-1→EE-5 approved  
- [ ] Explicit go-ahead to implement  

---

## 17. One-line product truth

**Firefighters record what happened. The Hall Event Engine makes the hall remember, react, and prepare — automatically.**

---

*— End of Hall Event Engine design —*
