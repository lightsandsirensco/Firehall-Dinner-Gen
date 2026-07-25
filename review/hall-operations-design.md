# Hall Operations — Product Design

**Status:** Design only — do not implement until approved  
**Date:** 2026-07-17  
**Authors:** Product design (firefighter UX lens)  
**Flagship intent:** The operating system for running a fire hall — not a shopping list, not a recipe blog with a group chat bolted on.

> **Engine (not pages):** UI records what happened; consequences are owned by the event-driven runtime — see [`review/hall-event-engine.md`](./hall-event-engine.md). This doc remains the face/stations IA; the Brain, event catalog, chains, and automation live there.

---

## 1. The job to be done

A firefighter should open Firehall Meals **every day**, even when they are not cooking.

On a quiet Tuesday that means:

- Who’s on? What’s for dinner? Who’s shopping?  
- Are we out of coffee? Did dues land?  
- Did the captain post about Saturday training food?  
- Is the canteen order going out this week?

On a busy night that means:

- Vote closed — cook this.  
- List is locked — runner is Mike.  
- Hold the chili; tones dropped.  
- Mark delivered when the Costco run walks in.

**Hall Operations** is the digital equivalent of:

| Station artifact | Digital surface |
|------------------|-----------------|
| Kitchen whiteboard | **The Board** |
| Canteen notebook | **Canteen** |
| Shopping clipboard | **The Run** |
| Pantry shelves | **Staples / Pantry** |
| Merchandise cabinet | **Hall Store** (cabinet) |
| Payment spreadsheet | **Dues** |
| Bulletin board | **Board posts / Notices** |

If it feels like enterprise software, we failed.  
If a captain says “yeah, we already do that on the fridge,” we won.

---

## 2. Design principles (non-negotiable)

1. **Of course every hall would want this** — obvious, not clever.  
2. **Never corporate** — no “workspaces,” “workspaces,” “workflows,” “synergy.” Station language: board, run, canteen, dues, tour, tones.  
3. **Phone first** — thumb reach, big taps, readable in a bay with gloves off.  
4. **Few taps** — most daily jobs ≤ 3 taps from Hall home.  
5. **Public SEO ≠ private ops** — `/tools` and product landings educate; `/hall/*` runs the station and stays noindex.  
6. **Personal app stays personal** — Firefighter Plus owns meal taste/history for *you*; Hall Ops owns the *crew*.  
7. **Fail soft when tones drop** — hold state, don’t punish incomplete forms.  
8. **Roles match the hall** — captain runs the house; canteen manager runs the cabinet; everyone can see the board.

---

## 3. What exists today (honest baseline)

Firehall Meals already has pieces of a hall OS — they are not yet framed as one system.

| Built | Reality |
|-------|---------|
| `/hall` dashboard | Tonight + shopping + Need Anything + notes + favorites |
| Hall Vote | Basic polls; advanced features partially gated |
| Shared shopping list | Strong “clipboard” start (Hall Pro) |
| Canteen Manager V2 | Staples, weekly order, deliveries, Costco handoff, notes |
| Canteen dues tracker | Spreadsheet replacement (track only; no Stripe yet) |
| Hall history | Meal log (Pro cloud story) |
| Protein deals | Grocery planning assist |
| Roles | `captain` · `canteen_manager` · `member` |
| Hall Pro | Per-hall subscription; shopping, history, advanced vote, grocery, dues, canteen Pro |

**Missing as a coherent OS**

- Unified **Board** (whiteboard + notices)  
- Clear daily **home for non-cook days**  
- Duty / cook assignment beyond “whoever cooks”  
- Merchandise cabinet  
- Ops notifications (vote closing, low stock, dues overdue, run claimed)  
- Mental model: one Hall Ops module vs a pile of sub-pages  

**Design mandate:** Re-architect navigation and IA around Hall Operations; deepen what exists; add Board, Notices, Cabinet, Notifications — without throwing away Canteen V2 or shopping.

---

## 4. Product architecture — Hall Operations

### 4.1 Module name

**Hall Ops** (in-app tab label can stay **Hall**)  
Subtitle line: *Run the hall — dinner, canteen, dues, and the board.*

Avoid: “Command Center,” “Station Portal,” “Crew Workspace.”

### 4.2 Mental model: seven stations

Everything in Hall Ops maps to one of seven stations. Firefighters already know these places in the building.

```
┌─────────────────────────────────────────────────────────┐
│  HALL HOME  — “What’s going on this tour”                 │
└─────────────────────────────────────────────────────────┘
         │
         ├── 1. THE BOARD      whiteboard + notices
         ├── 2. TONIGHT        vote · pick · cook assignment
         ├── 3. THE RUN        shopping clipboard
         ├── 4. CANTEEN        staples · order · delivery
         ├── 5. DUES           who paid · who’s short
         ├── 6. THE CABINET    hall merch / fundraising stock
         └── 7. THE LOG        meal history · what we cooked
```

Settings, members, invites, billing sit behind **Hall Settings** (captain territory) — not in the daily path.

### 4.3 Daily loop (why they open it every day)

| Moment | Open Hall Ops for… |
|--------|---------------------|
| Start of tour | Board + Tonight + who’s shopping |
| Mid-shift | Vote, Need Anything, notes |
| Shop run | The Run + Costco handoff |
| Delivery | Mark canteen delivered |
| End of month | Dues |
| Quiet day / not cooking | Board notices, canteen low stock, dues nudge |
| After dinner | Log it · leftovers note |

**Success metric (product):** DAU among linked hall members on **non-cook** days (board views, canteen checks, dues glances) — not only “cooked” events.

---

## 5. Navigation

### 5.1 Global bottom tabs (keep)

`Home · Tonight · Explore · Hall · Me`

Hall remains the crew door. Do not invent a sixth tab.

### 5.2 Hall Ops primary nav (replace current sub-nav)

**Today:** Linked Hall · Hall Vote · Shared Shopping · Meal History · Canteen  

**Proposed Hall Ops bar (5 items max on mobile):**

| Tab | Label | Destination |
|-----|-------|-------------|
| 1 | **Home** | Hall Ops home (tour pulse) |
| 2 | **Board** | Whiteboard + notices |
| 3 | **Tonight** | Deep-link `/tonight` with hall context (vote / pick) |
| 4 | **Canteen** | `/hall/canteen` |
| 5 | **More** | Run · Dues · Log · Cabinet · Settings |

**More sheet (bottom sheet, not nested menus):**

- The Run (shopping)  
- Dues  
- The Log (history)  
- The Cabinet (merch) — Phase 2  
- Protein deals  
- Hall Settings (role-gated)  
- Invite crew  

**Rationale:** Canteen and Board are daily; shopping and dues are frequent but not every open; settings never compete with dinner.

### 5.3 Hall Ops Home (flagship screen)

Not a dashboard of widgets. One composition: **the tour pulse**.

**Above the fold (phone)**

1. Hall name / motto (identity — already exists)  
2. **Tonight strip** — dinner status in one line  
   - `Vote open · 6 voted` / `Cooking: Chili · Mike` / `Nothing picked — spin or vote`  
3. **Board peek** — latest notice or “Dinner: Chili. Runner: Sam.”  
4. Primary CTA — context-aware (Vote / Open list / Mark delivered / Post to board)

**Below fold (one scroll)**

5. **Needs Attention** — canteen lows (existing)  
6. **The Run** — compact shopping status  
7. **Dues** — “3 unpaid” or hidden if clean  
8. **Last cooked** — one row into The Log  

No charts. No KPI tiles. No “engagement score.”

### 5.4 Deep links from SEO / Tools

Public `/tools/*` and product SEO pages CTA into:

- Join hall → Hall Ops Home  
- Or specific unlock: Shopping Builder → The Run (after join + Pro)

Never expose private hall boards publicly.

---

## 6. Feature surfaces (detailed)

### 6.1 The Board — kitchen whiteboard + bulletin

**Job:** Replace the dry-erase board and the cork board beside it.

**Two layers on one screen**

| Layer | Content | Cadence |
|-------|---------|---------|
| **Whiteboard** | Tonight’s meal, cook, runner, hold notes, head count | Changes daily |
| **Notices** | Posts from captain / managers — training food, fridge clean-out, “don’t touch the smoker” | Days–weeks |

**Whiteboard fields (structured, not a freeform doc)**

- Dinner (recipe link optional)  
- Cook (member)  
- Runner (member)  
- Head count / drop-ins  
- Hold note (“covers on, 200° oven”)  
- Status: `Open` · `Voting` · `Locked` · `Cooking` · `Fed` · `Left overs`

**Notices**

- Title + short body  
- Pin (captain)  
- Expiry (auto-archive)  
- Optional “ack” for critical notices (fridge clean-out)

**Permissions**

- All members: view  
- Cook of the day / runner: edit whiteboard dinner fields  
- Captain + canteen_manager: pin notices, lock board  
- Members: suggest dinner (creates draft or vote seed)

**Why this is the flagship**

This is what people walk up to when they enter the kitchen. If Hall Ops owns that moment, daily open is natural.

---

### 6.2 Tonight — vote, pick, cook

**Job:** End the argument; name the cook.

**Keep:** Hall Vote, Classics Wheel, Find a Meal, Tonight flow.

**Add (Hall Ops framing)**

- Vote results write **The Board** automatically  
- Assign **Cook** and **Runner** in two taps after lock  
- “Tones drop” hold note one-tap from Board or Tonight  
- Advanced vote (Pro): deadline, shift-scoped, history — deliver what copy already promises

**Integration with recipes**

- Locked dinner → recipe page + scaled shopping push to The Run  
- Board dinner always deep-links to `/recipes/:slug` when set from catalog  

---

### 6.3 The Run — shopping clipboard

**Job:** One grocery run the whole crew trusts.

**Keep:** Shared list, runner, purchased, recipe-sourced items, export/handoff.

**Deepen**

- States: `Building` → `Locked for run` → `Out shopping` → `Back / putting away` → `Done`  
- Merge from: recipe, Board dinner, canteen Needs Attention, protein deals, Tools Shopping Builder  
- Runner-only “I’m at the store” mode: big checkboxes, offline-tolerant  
- Split view: **Dinner items** vs **Canteen restock** (don’t argue about mustard vs steak)

**Permissions (refine existing)**

- All: add items  
- Captain / canteen_manager / assigned runner: lock, complete, clear  
- Member: cannot unlock after lock without manager  

---

### 6.4 Canteen — notebook + pantry + order

**Job:** Keep the hall stocked without a clipboard war.

**Keep:** Staples, Needs Attention, This Week’s Order, deliveries, Costco handoff, manager notes, activity (Canteen Manager V2).

**Deepen**

- **Pantry view** vs **Canteen/merch view** (same inventory engine, two shelves)  
  - Pantry = cooking staples  
  - Canteen = coffee, snacks, paper, fundraising candy (feeds Cabinet later)  
- “I’m out” report → one tap from any member (already directionally there)  
- Delivery → Board notice optional (“Costco is here — help unload”)  
- Free: limited staples list; Pro: unlimited + history + CSV (existing direction)

**Never:** Store Costco passwords or payment cards.

---

### 6.5 Dues — payment spreadsheet

**Job:** Kill the Excel sheet and the awkward hallway ask.

**Keep:** Canteen Payment Tracker (paid / overdue / history).

**Deepen**

- Month view, who’s short, one-tap mark paid  
- Board peek: “Dues due Friday”  
- Notify unpaid members (in-app + optional email)  
- **Phase later:** real collection (Stripe / e-transfer instructions) — tracker first, money movement second  
- Hall Pro feature (existing `canteen_payment_tracker`)

**Language:** “Dues,” “paid,” “owes” — not “accounts receivable.”

---

### 6.6 The Cabinet — merchandise / fundraising stock

**Job:** The locked cabinet of hall T-shirts, challenge coins, chocolate bars for the fundraiser.

**Phase 2 flagship expansion** (after Board + notifications)

- SKUs: name, price, qty, photo optional  
- Log sale / giveaway  
- Low stock → Needs Attention  
- Optional tie to Dues (“uniform shirts — paid?”)  

**Why later:** Emotional + fundraising value is high, but daily dinner/canteen must be rock-solid first.

---

### 6.7 The Log — meal history

**Job:** “What did we cook last tour?” and “don’t repeat meatloaf three times.”

**Keep:** Hall meal history, favorites/classics.

**Deepen**

- Board “Fed” status auto-logs dinner  
- Filter by tour / protein / method  
- “We cooked this 4 times this quarter” gentle nudge on Board when picking  

---

### 6.8 Supporting: Protein deals, Notes, Shift dashboard

- **Protein deals** stay under More → feed The Run  
- **Notes** become Board sticky notes or Run messages (collapse duplicate “hall notes” concepts over time)  
- **Shift dashboard** remains for multi-shift halls; Board can be shift-scoped when `hall_shifts` is used  

---

## 7. Hall roles & permissions

### 7.1 Roles (evolve, don’t explode)

| Role | Station reality | Ops power |
|------|-----------------|-----------|
| **Captain** | Runs the house | Settings, members, billing, pin notices, lock board, override |
| **Canteen manager** | Owns cabinet & orders | Canteen, Run complete, dues mark, notices (canteen), Cabinet |
| **Member** | The crew | View all, vote, add to list, report shortages, suggest dinner |
| **Cook of the day** *(ephemeral)* | Not a standing role | Edit Board dinner/hold while assigned |
| **Runner of the day** *(ephemeral)* | Not a standing role | Edit Run while assigned |

**Do not add** “Cook” as a permanent RBAC role — halls rotate. Use **assignment**, not title inflation.

**Captain + canteen:** Allow dual-hat (captain can also be canteen manager) — today captains lack supply perms by default; **fix:** captain inherits canteen manage OR easy dual-role assign.

### 7.2 Permission matrix (target)

| Capability | Member | Runner* | Cook* | Canteen mgr | Captain |
|------------|:------:|:-------:|:-----:|:-------------:|:-------:|
| View Board / Canteen / Run / Dues / Log | ✓ | ✓ | ✓ | ✓ | ✓ |
| Vote / suggest dinner | ✓ | ✓ | ✓ | ✓ | ✓ |
| Report shortage | ✓ | ✓ | ✓ | ✓ | ✓ |
| Add shopping items | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit whiteboard dinner | | | ✓ | ✓ | ✓ |
| Lock / complete Run | | ✓ | | ✓ | ✓ |
| Manage staples / orders | | | | ✓ | ✓† |
| Mark dues paid | | | | ✓ | ✓ |
| Pin / expire notices | | | | ✓‡ | ✓ |
| Manage members / invites | | | | | ✓ |
| Hall Pro billing | | | | | ✓ |
| Cabinet manage | | | | ✓ | ✓ |

\*While assigned †If dual-hat or inherit ‡Canteen-related notices

### 7.3 Hall settings (captain)

- Identity: name, station label, motto, photo, shifts  
- Members & roles (including dual-hat)  
- Default head count, measurement units for crew  
- Vote defaults (deadline length)  
- Notification defaults for the hall  
- Hall Pro subscription panel  
- Danger: leave hall / transfer captaincy  

Keep settings boring and rare. Daily life lives on Home / Board.

---

## 8. Notifications

### 8.1 Principles

- Few, actionable, station-timed  
- Prefer quiet hours respect (no 03:00 dues spam)  
- Deep link to the exact surface  
- No notification center as a product distraction — a simple **Alerts** list under More is enough  

### 8.2 Event catalog (v1)

| Event | Who gets it | Channel |
|-------|-------------|---------|
| Vote opened / closing soon / locked | All members | Push + in-app |
| You’re cook / you’re runner | Assignee | Push |
| Run locked — ready to shop | Runner + managers | Push |
| Low stock / Needs Attention (threshold) | Canteen mgr + captain | Push / digest |
| Order delivered marked | Managers | In-app |
| Dues due / overdue | Debtor + managers | Push + email optional |
| Notice pinned | All | In-app |
| Board dinner changed | All (optional mute) | In-app |

### 8.3 Channels

| Channel | Phase |
|---------|-------|
| In-app alerts list | T1 |
| Push (mobile PWA / native later) | T2 |
| Email (digest + dues) | T2 — reuse shift-reminder infrastructure patterns |
| SMS | Not planned (cost + hall culture) |

**Existing:** Shift meal reminders (Plus) stay personal — not Hall Ops. Don’t conflate “remind me to cook” with “hall dues overdue.”

---

## 9. Mobile UX

### 9.1 Interaction rules

- Primary actions: full-width buttons, 44–48px min height  
- Destructive actions: confirm once, plain language  
- Lists: swipe to mark purchased / paid where natural  
- Empty states: one sentence + one CTA (“Post tonight’s dinner,” not “No data yet”)  
- Offline: The Run and Board should read last snapshot; queue checkmarks when possible  

### 9.2 Tour pulse patterns

- **Status chips** not badges-with-numbers-everywhere  
- Red only for true needs: overdue dues, critically low canteen, vote closing  
- Green is rare — don’t gamify the kitchen  

### 9.3 Thumb zones

- Hall Ops bar fixed bottom (above or replacing sub-nav inside Hall shell)  
- FAB only for “Post to board” or “Report out” — one FAB max, context-specific  

### 9.4 Voice & microcopy examples

| Instead of | Use |
|------------|-----|
| Create a collaborative grocery artifact | Start the run |
| Inventory depletion event | We’re out |
| Assign procurement owner | Who’s shopping? |
| Acknowledge bulletin | Got it |
| Finalize poll | Lock it in |

---

## 10. Integration map

### 10.1 Recipes

```
Catalog recipe
  → Board dinner (link + portion note)
  → Scale (crew size) 
  → The Run (ingredients)
  → Log (cooked)
  → Favorites / classics
```

Public recipe SEO stays public. Hall links are private references.

### 10.2 Shopping / Tools

```
/tools/shopping-builder (public)
  → Join / Pro
  → Import into The Run

/tools/pantry-checklist
  → Seed Canteen staples

/tools/cost-per-plate + grocery-budget
  → Optional note on Run or Dues month (Pro save)
```

### 10.3 Hall Pro

| Surface | Free hall link | Hall Pro |
|---------|----------------|----------|
| Board whiteboard (basic) | ✓ view + light edit | ✓ history of board states, multi-shift boards |
| Notices | ✓ limited pins | ✓ archive + ack tracking |
| Tonight / basic vote | ✓ | Advanced vote (deadlines, history, shift) |
| The Run | Teaser / limited | Full shared list + lock + export |
| Canteen staples | ✓ limited | Unlimited + orders + history + Pro manager |
| Dues tracker | — | ✓ |
| The Log (crew cloud) | Personal glimpse | Full hall history |
| Protein deals → list | Browse | Add to Run |
| Cabinet | — | Phase 2 Pro |
| Alerts | Basic in-app | Push + digests |

**Positioning:** Free hall link gets the whiteboard culture started. Pro is how the hall stops losing the clipboard between tours.

### 10.4 Firefighter Plus (personal)

Unchanged: saves, personal history, shift meal reminders, generator preferences.  
Hall Ops never steals personal identity — it borrows your name for cook/runner assignment.

---

## 11. Database architecture (target model)

Design-level — not a migration script. Build on existing tables; add only what’s missing.

### 11.1 Keep / extend

| Domain | Existing | Evolution |
|--------|----------|-----------|
| Hall / members / shifts | `halls`, `hall_memberships`, `hall_shifts`, `hall_invites` | Dual-hat flags; captain canteen inherit |
| Vote | `hall_votes`, `hall_vote_ballots` | Write board on lock |
| Shopping | `hall_shopping_lists`, `hall_shopping_list_items` | Run state machine columns |
| Canteen | `hall_canteen_*` (V2) | Shelf type: `pantry` \| `canteen` \| `cabinet` |
| Dues | `hall_canteen_dues_*` | Notify timestamps |
| History / activity | `hall_activity_events`, history snapshots | Board-fed log events |
| Billing | `hall_subscriptions` | Feature flags for board_pro, cabinet |

### 11.2 New (conceptual)

| Table | Purpose |
|-------|---------|
| `hall_board_state` | Current whiteboard fields (1 row per hall or per shift) |
| `hall_board_history` | Optional snapshots when status → Fed |
| `hall_notices` | Bulletin posts (pin, expiry, author, body) |
| `hall_notice_acks` | Optional acknowledgements |
| `hall_assignments` | Ephemeral cook/runner for a date/shift |
| `hall_alerts` | In-app notification records |
| `hall_alert_prefs` | Per-member mute / channel prefs |
| `hall_cabinet_items` | Merch SKUs (Phase 2) |
| `hall_cabinet_events` | Sale / adjust qty (Phase 2) |

### 11.3 Privacy

- All Hall Ops tables are hall-scoped  
- Robots: `/hall`, `/halls/`, `/api` remain disallowed  
- No board content in public sitemaps or SEO landings  

---

## 12. Hall Pro packaging (recommendation)

### Free — “Linked Hall”

Enough to form the habit:

- Board (tonight fields + 1–2 notices)  
- Basic vote  
- Limited staples / Need Anything report  
- View Run (cannot full multi-device sync — or soft limit)  

### Hall Pro — “Run the hall”

- Full Run + lock + export  
- Full Canteen Manager  
- Dues tracker  
- Advanced vote  
- Crew meal log  
- Grocery planning / deals → list  
- Board history + multi-shift  
- Alerts push/digest  
- Cabinet (when shipped)

**Price psychology:** One subscription for the whole hall — already in brand copy. Keep it.

**Do not** put Board view behind Pro — that kills the daily open habit.

---

## 13. Rollout roadmap

### Phase HO-0 — Design lock (this doc)

- Approve IA, roles, Free/Pro split, Board as flagship  
- Name freeze: Board · Run · Canteen · Dues · Log · Cabinet  

### Phase HO-1 — Hall Ops shell (2 weeks)

- Rebrand Hall home as **tour pulse**  
- New Hall Ops nav (Home · Board · Tonight · Canteen · More)  
- More sheet destinations  
- Captain canteen permission fix (dual-hat / inherit)  
- Empty states + microcopy pass  

**Exit:** Same features, clearer OS. Daily path feels intentional.

### Phase HO-2 — The Board v1 (3 weeks)

- Whiteboard structured fields  
- Notices (create, pin, expiry)  
- Vote lock → writes Board  
- Assign cook / runner  
- Board peek on Hall Home  

**Exit:** Halls can throw out the dry-erase for dinner status (aspirational — but usable).

### Phase HO-3 — The Run + Canteen hardening (2–3 weeks)

- Run state machine  
- Dinner vs canteen split on list  
- Shelf types pantry/canteen  
- Delivery → optional notice  
- Tools import hooks (stubs OK)  

### Phase HO-4 — Alerts v1 (2 weeks)

- In-app `hall_alerts`  
- Prefs  
- Wire vote / run / dues / low stock events  
- Push pilot (if PWA ready)  

### Phase HO-5 — Dues polish + Log auto-feed (1–2 weeks)

- Board → Log on Fed  
- Dues reminders  
- Overdue Home peek  

### Phase HO-6 — The Cabinet (Phase 2 flagship, 3–4 weeks)

- Merch inventory  
- Sale log  
- Low stock into Needs Attention  

### Phase HO-7 — Monetization & growth

- Hall Pro paywall aligned to new surfaces  
- Payments_enabled when Stripe ready (dues collection optional)  
- SEO/tools CTAs → Join → Board  
- Measure non-cook DAU  

---

## 14. Success metrics

| Metric | Why it matters |
|--------|----------------|
| Hall DAU / WAU among linked members | Habit |
| % of DAU with **no cook event** that day | Proves non-cook open |
| Board views per tour | Flagship adoption |
| Votes that write Board | System coherence |
| Runs completed / week | Clipboard replacement |
| Canteen shortages resolved time | Ops value |
| Dues marked within 7 days of due | Spreadsheet death |
| Hall Pro conversion from Board/Run usage | Monetization |
| Time-to-first-Board-post after join | Activation |

**Qualitative:** Captain quote — “We actually look at it instead of the fridge.”

---

## 15. Risks & anti-goals

| Risk | Mitigation |
|------|------------|
| Building a corporate intranet | Station language, few taps, no charts |
| Feature pile without a home | Everything maps to 7 stations |
| Pro-gating the Board | Board view free forever |
| Role explosion | Ephemeral cook/runner only |
| Competing with Tonight / Home personal flows | Hall is crew; personal stays on Home/Me |
| Scope: full ERP / HR / scheduling | Out of scope — no timesheets, no apparatus checks |
| Real money before trust | Tracker before Stripe |
| SEO leaking private boards | Strict noindex + no public board URLs |

**Anti-goals**

- Not a generic Slack  
- Not a full accounting suite  
- Not a merch Shopify clone in v1  
- Not “AI that runs your hall”  

---

## 16. Competitive / cultural fit

Halls already run on:

- Dry-erase + Sharpie hierarchy  
- “Who’s buying?” group texts that die mid-shift  
- A binder nobody updates  
- One lieutenant’s spreadsheet  

Hall Ops wins by **feeling like those objects**, synchronized, on the phone in the kitchen — not by adding fields firefighters didn’t ask for.

---

## 17. Open decisions (need approval)

1. **Nav:** 5-tab Hall Ops bar vs keep Canteen in More and put Run in primary?  
   - *Recommendation:* Canteen primary (daily stock anxiety is real).  
2. **Free Board depth:** Notices free or Pro?  
   - *Recommendation:* Free create/view; Pro for archive + ack + multi-shift.  
3. **Captain supply perms:** Inherit canteen manage by default?  
   - *Recommendation:* Yes, with ability to delegate primary canteen manager.  
4. **Cabinet:** Confirm Phase 2, not HO-2.  
5. **Push:** PWA push in HO-4 or wait for native?  

---

## 18. Approval checklist

- [ ] Seven-station mental model approved  
- [ ] Board as flagship approved  
- [ ] Nav IA approved  
- [ ] Roles + ephemeral cook/runner approved  
- [ ] Free vs Hall Pro split approved  
- [ ] Roadmap HO-1 → HO-6 sequencing approved  
- [ ] Explicit go-ahead to implement (design-only until then)

---

## Appendix A — Screen inventory (target)

| Screen | Path (proposed) |
|--------|-----------------|
| Hall Ops Home | `/hall` |
| Board | `/hall/board` |
| Tonight (existing) | `/tonight` |
| Canteen | `/hall/canteen` |
| The Run | `/hall/run` (alias shopping) |
| Dues | `/hall/dues` |
| The Log | `/hall/history` |
| Cabinet | `/hall/cabinet` |
| Alerts | `/hall/alerts` |
| Settings | `/hall/settings` |
| Features / join | `/hall/features`, `/hall/join` |

## Appendix B — One-line pitch

**Hall Ops turns Firehall Meals into the kitchen whiteboard, canteen notebook, and shopping clipboard — so the crew opens the app to run the hall, not only to pick dinner.**

---

*— End of Hall Operations design —*
