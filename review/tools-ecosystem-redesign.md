# Tools Ecosystem Redesign

**Status:** Design only — do not implement until approved  
**Date:** 2026-07-17  
**Supersedes (thinking, not deletion):** `review/tools-section-design.md` as isolated calculators  
**Aligns with:** Hall Ops, Inventory, Smart Shopping, Whiteboard, Logbook, Merchandise, Canteen Payments, Personal-First strategy  

**Mission:** Firehall Meals is the operating system for every fire hall kitchen. Public Tools are the **free edition** of that OS — one continuous workflow, not seven calculators.

---

## 0. The rethink (challenge the old frame)

| Old assumption | New frame |
|----------------|-----------|
| Seven SEO tool pages | One **Kitchen OS shell** with deep-linkable surfaces |
| Each tool starts blank | Shared **Mission context** carries forward |
| Public tools ≠ Hall Ops | Public = **guest / personal rehearsal**; Hall = **live crew state** |
| Shopping Builder = the list | List is an **artifact**; Smart Shopping is the brain (Hall) |
| Checklists are PDFs | Checklists **seed inventory** and stay in the mission |
| Cost / Budget / Scale are separate apps | They are **lenses on the same dinner mission** |
| “Suggested next tool” CTAs | **Guided rails** + persistent mission bar |

**Notion / Linear / Shopify analogy**

- **Notion:** one workspace, many views of the same objects  
- **Linear:** issues flow stages; you never re-type the ticket  
- **Shopify:** admin is one OS; “products / orders / analytics” are facets  

Firehall Meals Tools → **Kitchen Workspace**: dinners, ingredients, lists, budgets, readiness — same objects, different panels.

---

## 1. Ecosystem architecture

### 1.1 Three layers

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER A — EXPERIENCE SHELL                                  │
│  My Firehall · Mission bar · Rails · Activity · Quick actions│
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  LAYER B — WORKFLOW SURFACES (not “apps”)                    │
│  Plan · Scale · Price · Budget · Ready · Shop · Record       │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  LAYER C — SYSTEM OF RECORD                                  │
│  Mission · Meal · Ingredient lines · List · Inventory ·      │
│  Budget period · Payments · Log · Board                      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Workflow surfaces (replace “seven tools”)

| Surface | Job | Old tool mapping |
|---------|-----|------------------|
| **Plan** | Choose / schedule dinners | Meal Planner |
| **Scale** | Crew-size ingredients | Crew Ingredient Calculator |
| **Price** | Cost per plate for this mission | Cost Per Plate |
| **Budget** | Kitty / period constraints | Grocery Budget Calculator |
| **Ready** | Kitchen + pantry readiness | Kitchen + Pantry Checklists (**merge**) |
| **Shop** | Build / export list; hand to Hall Run | Shopping Builder |
| **Record** | (Hall) receive, log, dues, board | Hall Ops — not a public calculator |

Public Tools = Plan → Scale → Price → Budget → Ready → Shop.  
Hall Ops continues Shop → Receive → Inventory → Logbook → Smart Shopping → Payments → Board.

### 1.3 The continuous spine (canonical journey)

```
Cost too high (Price)
    → tighten Budget
    → change Plan (cheaper meals)
    → Scale ingredients
    → Ready (pantry gaps)
    → Shop (list)
    → [Join / Hall Pro] sync The Run
    → Receive → Inventory
    → Logbook
    → Smart Shopping predicts next
```

**One object carries state:** the **Mission** (see §6 Workspaces & §8 Data).

---

## 2. Shared UX shell (“not seven calculators”)

### 2.1 Tools OS chrome (every public tool page)

```
┌──────────────────────────────────────────────────────────┐
│ Firehall Meals · Tools                    [Sign in] [Hall]│
├──────────┬───────────────────────────────────────────────┤
│ MISSION  │  Surface content (Plan / Scale / Price…)        │
│ · Dinner │                                               │
│ · Crew 10│  [Suggested next]                             │
│ · Budget │                                               │
│ · List…  │                                               │
│──────────│                                               │
│ Rails    │                                               │
│ Plan     │                                               │
│ Scale    │                                               │
│ Price    │                                               │
│ Budget   │                                               │
│ Ready    │                                               │
│ Shop     │                                               │
│──────────│                                               │
│ Recent   │                                               │
│ Saved    │                                               │
│ Activity │                                               │
└──────────┴───────────────────────────────────────────────┘
```

Mobile: bottom **Mission pill** + horizontal surface switcher; sidebar becomes a sheet.

### 2.2 Shell modules

| Module | Behavior |
|--------|----------|
| **Mission bar** | Always shows active dinner(s), crew size, budget remaining, list readiness |
| **Rails** | Jump surfaces without losing mission |
| **Next steps** | 1–3 contextual actions (“Dinner over budget — open Budget”) |
| **Recent activity** | Last scales, prices, lists (local or account) |
| **Saved calculations** | Named missions (“Friday chili for 12”) |
| **Recent recipes** | From catalog / plan |
| **Quick actions** | New mission · Import recipe · Print list · Share link |

SEO still gets unique URLs per surface (`/tools/price`, …) for rankings — chrome is shared.

---

## 3. Merges, cuts, and simplifications

| Decision | Rationale |
|----------|-----------|
| **Merge Kitchen Checklist + Pantry Checklist → Ready** | One “Can we cook this?” surface with two tabs: Gear · Staples |
| **Demote standalone Ingredient Calculator as entry** | Default entry = Plan or Price; Scale is a step, still deep-linkable for SEO |
| **Shopping Builder is not Smart Shopping** | Public Shop builds a list; Hall Smart Shopping *recommends* buys |
| **Do not build seven home pages** | One Tools home = Mission picker + journey templates |
| **Keep SEO landing explainers** | Marketing spokes → enter Mission mid-flow |
| **Reject “calculator gallery” hub** | Hub = “Start a dinner mission” + journey cards |

**Unnecessary if built wrong:** A separate “Reports” tool before Hall analytics exist — fold into My Firehall later.

---

## 4. Public vs Personal vs Hall vs Hall Pro

Challenge: old doc said “tools never remember.” That kills continuity. Soften it.

| Tier | Who | What persists | What does not |
|------|-----|---------------|---------------|
| **Guest Mode** | Anonymous | Mission in `localStorage` / share URL | Cross-device, crew sync |
| **Personal (Firefighter+)** | Signed-in FF | Saved missions, prefs, personal history | Other people’s dues/inventory |
| **Hall (linked)** | Crew member | Live Board, Run, Inventory, Log, Votes | — |
| **Hall Pro** | Paying hall | Smart Shopping, full inventory, dues, merch, cloud sync, auto log | — |

### Feature placement matrix

| Capability | Guest | Personal | Hall free | Hall Pro |
|------------|:-----:|:--------:|:---------:|:--------:|
| Plan / Scale / Price / Budget / Ready / Shop | ✓ | ✓ | ✓ | ✓ |
| Save named missions | | ✓ | ✓ | ✓ |
| Share mission link | ✓ | ✓ | ✓ | ✓ |
| Push list → The Run | | | limited | ✓ |
| Inventory / Receive | | | limited | ✓ |
| Smart Shopping recommendations | | | teaser | ✓ |
| Whiteboard / Logbook | | | ✓ / limited | ✓ full |
| Dues / Merchandise | | | — | ✓ |
| Cross-device mission sync | | ✓ | ✓ | ✓ |

**Assumption challenged:** “Calculate always free, save always Pro.”  
**New rule:** **Calculate + local mission always free. Crew sync + intelligence = Hall Pro. Personal save = account (Plus soft-upsell, not hard gate).**

---

## 5. Workspaces

| Workspace | What it is | Pros | Cons |
|-----------|------------|------|------|
| **Guest / Temporary** | Ephemeral mission in browser or share link | Zero friction SEO; viral share | Easy to lose; no crew |
| **Personal Workspace** | Firefighter’s saved missions, prefs, home dinners | Habit; Plus revenue; feeds hall later | Must not confuse with hall truth |
| **Hall Workspace** | Live crew OS (Board, Inventory, Run…) | Source of truth; Pro moat | Requires join |
| **Shared Hall Workspace** | = Hall Workspace (don’t split naming) | One mental model | — |
| **Draft “Sandbox” inside Hall** | Captain tests a menu without locking Board | Safe planning | Extra complexity — **Phase 2** |

**Recommendation**

1. **Guest Temporary Mission** (public tools default)  
2. **Personal Workspace** (signed in)  
3. **Hall Workspace** (linked) — single name, not “Shared Hall Workspace”  
4. Skip a fourth productized workspace until Hall Sandbox is needed  

**Advantage:** Continuity without forcing signup on first Cost-per-plate visit.  
**Disadvantage:** Must teach “You’re in Guest mission — Join hall to sync.”

---

## 6. My Firehall (central home)

**Path:** `/my-firehall` or upgrade `/home` when linked; public tools users see a lighter **Tools Home**.

### Design goal

One glance for the next action — **not** a KPI wall.

### Layout (linked hall)

```
┌─────────────────────────────────────────┐
│ My Firehall · Station 6 · A Shift        │
├─────────────────────────────────────────┤
│ TONIGHT          │  MISSION RAIL         │
│ Chili · Vote locked│ Continue: Shop (12)│
├──────────────────┴──────────────────────┤
│ NEEDS YOU (max 5)                        │
│ · Coffee out · 2 overdue dues · Unread log│
├─────────────────────────────────────────┤
│ THIS WEEK                                │
│ Dinners · Shopping mission · BBQ Sat     │
├─────────────────────────────────────────┤
│ QUIET PULSE                              │
│ Budget OK · Merch 1 low · Board 1 pin    │
└─────────────────────────────────────────┘
```

### Surface rules (anti-overload)

| Slot | Max items | Source |
|------|-----------|--------|
| Tonight | 1 block | Board |
| Needs You | ≤5 | Inventory, dues, log unread, Run assignee |
| This Week | ≤7 | Plan + events |
| Quiet Pulse | chips only | Budget, merch, board |

No charts. No “engagement score.” Tap → deep link into the right surface with mission context.

### Guest / Personal Tools Home

- Start mission templates: “Plan Friday dinner” · “Price last night’s shop” · “Stock a new pantry”  
- Recent missions  
- SEO tool entry points (same chrome)

---

## 7. User journey maps

### 7.1 Rookie firefighter

1. Lands via SEO “fire hall grocery list” → **Shop** empty  
2. Shell suggests: “Start from a recipe” → Plan → picks Chili  
3. Scale to 10 → Price (sticker shock) → Budget tip → cheaper Plan  
4. Ready checklist teaches pantry basics  
5. Shop export / print; prompted to create Personal account to save  
6. Later: Join hall QR on fridge → sees same meal on Board  

**Emotion:** Guided, not tested.

### 7.2 Daily cook

1. My Firehall → Tonight strip  
2. If empty: Plan / Vote / Wheel  
3. Scale + Ready (“we have rice?”)  
4. Shop gaps only (pantry-aware when Hall)  
5. Cook; Board → Fed; Logbook auto  

**Emotion:** Fast path, few taps.

### 7.3 Canteen manager

1. My Firehall → Needs You (lows)  
2. Smart Shopping review (Hall Pro)  
3. Approve → Run; choose retailers  
4. Purchase → Receive → Inventory  
5. Logbook autos; Budget soft update if dinner vs canteen split  
6. Public Tools rarely — except onboarding checklists  

**Emotion:** Ops queue, not recipe browsing.

### 7.4 Hall captain

1. Board + Log unread  
2. Vote / lock dinner  
3. Assign cook & runner  
4. Glance dues / budget pulse  
5. Pin Whiteboard announcement  

**Emotion:** Command without spreadsheet.

### 7.5 Officer (training / admin adjacent)

1. Board events (training night feed 16)  
2. Plan large-crew meal → Scale → Budget  
3. Department-owned supplies → Smart Shopping “Notify Department”  
4. Logbook standing orders  

**Emotion:** Coordination, not canteen ownership.

### 7.6 Treasurer

1. Dues home KPIs  
2. Record payments  
3. Optional: Budget period vs collected  
4. Merch unpaid list (Cabinet)  
5. Rarely uses Price tool except audits  

**Emotion:** Ledger clarity.

### 7.7 Hall committee / fundraising

1. Cabinet merch stock  
2. Sales log / unpaid  
3. Whiteboard BBQ / retirement events  
4. Budget for event catering via Plan → Price  

**Emotion:** Fundraising ops, not kitchen micromanagement.

---

## 8. Smart connections (relationship map)

```
                    ┌──────────┐
                    │   PLAN   │
                    └────┬─────┘
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
        SCALE          PRICE        READY
           │             │             │
           └──────┬──────┴──────┬──────┘
                  ▼             ▼
               BUDGET ←─────→ SHOP
                  │             │
                  │      [Hall Pro sync]
                  │             ▼
                  │         THE RUN
                  │             ▼
                  │        RECEIVE ──► INVENTORY
                  │             │
                  └─────────────┼──► BUDGET actuals
                                ▼
                            LOGBOOK
                                ▼
                        SMART SHOPPING ──► next PLAN
```

### Connection table (every surface)

| From | Suggests / writes |
|------|-------------------|
| **Plan** | Scale, Price, Ready, Shop, Budget check |
| **Scale** | Price (with qty), Shop lines, Ready gaps |
| **Price** | Budget (if over), Plan (cheaper meals), Shop |
| **Budget** | Plan filters, Price target $/plate, Shop soft cap |
| **Ready** | Shop (missing staples/gear buy/borrow), Inventory seed |
| **Shop** | Hall Run sync, Price history, Budget spend, Inventory receive stub |
| **Inventory** | Smart Shopping, Shop, Ready, Logbook, Home alerts |
| **Smart Shopping** | Shop/Run, Logbook, Budget estimate |
| **Logbook** | Context only; links back to source objects |
| **Whiteboard** | Plan/Tonight; promote lasting notes → Logbook |
| **Payments** | Home pulse; optional Budget “kitty funded” |
| **Merchandise** | Smart Shopping reorder; Logbook sales |

---

## 9. Information flow (data model)

### 9.1 Core objects

```
Mission
  id, workspace (guest|personal|hall), status
  crew_size, budget_period_id?, soft_cap?
  meals[] → MealRef (recipe_slug, date, role: dinner)
  ingredient_lines[]  (scaled, optional prices)
  readiness[]         (checklist answers)
  shop_list_id?
  hall_run_id?
  notes

MealRef → Recipe / Board dinner
IngredientLine → InventoryItem? / free text
ShopList → ShopLines → Purchase / Run
InventoryItem ← Receive / Consume
BudgetPeriod ← planned vs actual from Prices & Purchases
Payment (dues) — parallel money, soft-link to Budget
LogEntry ← autos from above
BoardState — Tonight truth when hall-linked
```

### 9.2 Flow narrative

```
Meal → Ingredients → Shop → Inventory → Budget → (Payments) → Reports/History → Analytics
```

Guest stops at Shop/export.  
Hall continues through Inventory and Log.  
Analytics = My Firehall pulses + future Hall insights (Pro).

---

## 10. Missing public tools (firehall-specific)

Add only if they strengthen the spine:

| Tool / surface | Problem | Fits where |
|----------------|---------|------------|
| **Drop-in Buffer** | Neighbor hall shows up | Scale modifier (not separate app) |
| **Hold & Reheat Timer** | Tones drop mid-meal | Plan/Tonight companion (Hall) |
| **Kitty Split** | Fair share after shop | Budget sibling or mode |
| **Leftover Remix** | Fridge orphans | Plan + Logbook prompt |
| **Shift Handoff Card** | One-screen for next tour | Logbook template / export |
| **Protein Deal Matcher** | Already exists in Hall | Surface in Shop rails when linked |
| **Crew Allergy / Avoid Board** | Safety | Ready + Plan constraint (Hall) |

**Do not add:** Generic macro counters, wine pairings, Instacart clones.

---

## 11. Smart automation (human-approved)

| Automation | Trigger | Result |
|------------|---------|--------|
| Over-budget rail | Price > Budget target | Suggest Plan swap |
| Pantry subtract | Ready + Inventory linked | Shop only gaps |
| Post-shop receive | Run completed | Inventory + Logbook + Budget actual |
| Out → recommendation | Inventory Out | Smart Shopping card |
| Dinner lock → scale | Board lock | Mission meal + Scale |
| Guest → Hall promote | Join with active mission | Map list → Run draft |

All Hall writes require membership; Guest automations stay local.

---

## 12. SEO strategy inside the ecosystem

- Keep **indexable surface URLs** (`/tools/price`, `/tools/shop`, …)  
- Shared chrome does not hurt SEO if content + H1 unique  
- Explainers remain spokes → `?mission=` or `start=price`  
- Hub `/tools` = “Start a dinner mission” not calculator grid  
- Internal links: every surface ↔ 2 guides + recipes + next rail  

---

## 13. Implementation order (revised)

### Phase E0 — Principles lock  
Approve Mission object, merges (Ready), workspace tiers  

### Phase E1 — Shell + Mission  
Shared Tools chrome, Mission bar, local persistence, share URLs  

### Phase E2 — Spine v1  
Plan → Scale → Price → Shop continuous; Next-step rails  

### Phase E3 — Budget + Ready (merged checklists)  
Budget constraints; Ready seeds; PDF still for backlinks  

### Phase E4 — Personal save  
Named missions; My Firehall light  

### Phase E5 — Hall bridge  
Push Shop → Run; Receive loop; Logbook autos; Home pulses  

### Phase E6 — Smart Shopping + Inventory depth  
Recommendations feed Shop/Run  

### Phase E7 — Dues / Merch / Board polish  
Full OS cohesion  

**Deprecate:** Shipping seven isolated calculator MVPs without Mission shell.

---

## 14. Diagrams (compact)

### Feature relationships

```
[My Firehall]
    ├─ Tonight (Board)
    ├─ Mission rail ──► Plan/Scale/Price/Budget/Ready/Shop
    ├─ Needs You ──► Inventory / Dues / Log / Run
    └─ This Week ──► Plan / Events

[Hall Ops]
    Board ↔ Logbook
    Run ← Smart Shopping ← Inventory
    Cabinet (Merch) ← Smart Shopping
    Dues (Payments)
```

### Journey template cards (Tools Home)

1. **Price a dinner** → Price → Budget → Plan → Shop  
2. **Plan the tour** → Plan → Scale → Ready → Shop  
3. **Stock a hall** → Ready → Shop → (Join) Inventory  
4. **Rescue overspend** → Price → Budget → Plan  

---

## 15. Success metrics

| Metric | Meaning |
|--------|---------|
| Missions with ≥2 surfaces used | Continuity |
| Guest → Account / Hall conversion from Mission CTA | Funnel |
| Shop→Run attach rate | OS bridge |
| Bounce from tool with zero next-step click | Shell failure |
| My Firehall DAU non-cook days | Ops habit |

---

## 16. Risks

| Risk | Mitigation |
|------|------------|
| Shell feels “enterprise” | Station language; Mission bar skinny |
| SEO dilution | Unique content per URL; explainers stay |
| Premature Hall complexity | E1–E3 public spine first |
| Dual truth (personal mission vs Board) | Hall Tonight wins when linked; mission becomes suggestion |

---

## 17. One-line product truth

**Public Tools are how a firefighter rehearses running the kitchen; Hall Ops is how the crew runs it for real — same mission, deeper memory.**

---

## 18. Approval checklist

- [ ] Mission-centric spine approved (vs seven calculators)  
- [ ] Merge Ready (kitchen+pantry) approved  
- [ ] Workspace model (Guest / Personal / Hall) approved  
- [ ] Public vs Plus vs Hall Pro matrix approved  
- [ ] My Firehall anti-overload rules approved  
- [ ] Implementation order E1→E5 approved  
- [ ] Explicit go-ahead to implement  

---

*— End of Tools Ecosystem Redesign —*
