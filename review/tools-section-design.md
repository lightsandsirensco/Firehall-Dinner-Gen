# Tools Section Design & Implementation Roadmap

**Status:** Design only — **do not implement until approved**  
**Date:** 2026-07-17  
**Proposed hub:** `/tools`

> **Superseding rethink:** Treat Tools as one connected Kitchen OS, not seven calculators — see [`review/tools-ecosystem-redesign.md`](./tools-ecosystem-redesign.md). This doc remains useful for SEO URL mapping and per-surface input/output specs; the mission spine, shell, merges, and workspaces live in the redesign.

---

## Executive summary

Firehall Meals already has **educational product SEO pages** for tool intents (`/cost-per-plate-calculator`, `/crew-grocery-budget`, `/hall-meal-planner`, etc.) but almost no **interactive public tools**. That leaves link-worthy SERP intents stranded on explainers.

A `/tools` hub should:

1. Own firefighter-specific calculator/checklist queries  
2. Earn backlinks from departments, training academies, and fire-service media  
3. Soft-gate advanced saves / multi-crew sync behind **Hall Pro**  
4. Monetize via Pro conversion + selective affiliates (gear, bulk staples, cookware)  
5. Never index private hall data — tools stay educational / anonymous-first  

**Principle:** Public tools compute and educate. Private hall apps remember and sync.

---

## Information architecture

```
/tools                          ← Hub (indexable)
  ├─ /tools/cost-per-plate      ← Interactive calculator (canonical tool URL)
  ├─ /tools/crew-ingredient-calculator
  ├─ /tools/grocery-budget
  ├─ /tools/kitchen-checklist
  ├─ /tools/pantry-checklist
  ├─ /tools/meal-planner
  └─ /tools/shopping-builder

Existing explainer landings (keep; retarget as “learn” spokes):
  /cost-per-plate-calculator → CTA into /tools/cost-per-plate
  /crew-grocery-budget       → CTA into /tools/grocery-budget
  /hall-meal-planner         → CTA into /tools/meal-planner
  /fire-hall-grocery-list    → CTA into /tools/shopping-builder
  /fire-hall-pantry          → CTA into /tools/pantry-checklist
  /fire-station-kitchen-inventory → CTA into /tools/kitchen-checklist
```

**Canonical rule**

| Intent type | Canonical URL | Role of existing product SEO page |
|-------------|---------------|-----------------------------------|
| “cost per plate calculator” (tool) | `/tools/cost-per-plate` | Explainer stays; add prominent “Open calculator” CTA; eventual soft merge of thin explainer sections into tool page FAQs |
| “how fire halls budget groceries” (informational) | Guide + `/crew-grocery-budget` | Keep educational narrative |
| Private hall shopping / pantry | `/hall/*` (noindex) | Never compete with tools |

Do **not** delete Phase 11 product SEO pages in Wave 1 of tools. Redirects only after the interactive tool outranks and content is folded.

---

## Hub page: `/tools`

### Job

One composition: brand + “Station kitchen tools” + short line + grid of tools. Not a dashboard of stats.

### Contents

- H1: **Station Kitchen Tools** (or **Firehall Tools**)  
- One supporting sentence: crew portions, budgets, and checklists built for the hall — not home blogs of four  
- Tool cards (name, one-line outcome, CTA)  
- Secondary strip: links to `/explore`, `/guides`, `/hall/join`  
- FAQ (3–5): public vs Hall Pro, data privacy, printing/PDF  
- Schema: `CollectionPage` + `ItemList` of tools (`SoftwareApplication` / `WebApplication` each)

### SEO targets (hub)

- firehall tools / fire station kitchen tools  
- firefighter meal calculator  
- fire hall grocery calculator  

Lower volume than individual tools — hub exists for IA + internal links + branded navigability.

---

## Tool specs

### 1. Cost Per Plate Calculator — `/tools/cost-per-plate`

**User job:** Estimate $/plate for a crew dinner before or after shopping.

**Inputs (public, no account)**

- Head count (2–20)  
- Grocery lines: item, qty, unit price (or total bag split)  
- Optional: separate “canteen / staples” toggle so restocks don’t inflate dinner plate cost  
- Optional: recipe preset (pull ingredient list from catalog slug; user fills prices)

**Outputs**

- Total spend  
- Cost per plate  
- Cost per firefighter  
- Shareable summary card / print view  
- CTA: “Save to hall budget” (Hall Pro) · “Open cheap meals guide” · recipe links

**Maps to:** `/cost-per-plate-calculator` explainer · guide `cheap-firehall-meals`

---

### 2. Crew Ingredient Calculator — `/tools/crew-ingredient-calculator`

**User job:** Scale a recipe from “serves 4 blog” or base 8 → tonight’s head count without napkin math.

**Inputs**

- Base servings (default 8)  
- Target crew size  
- Ingredient list (paste or pick catalog recipe)  
- Optional: protein buffer % for drop-ins (5–20%)

**Outputs**

- Scaled quantities (friendly units: lb, cups, cans)  
- Shopping-ready list export  
- CTA → Shopping Builder · Find a Meal · recipe page

**Maps to:** guide roadmap “Measuring Crew Portions” · `/hall-meal-planner` · catalog scaling UI

**Differentiation:** Not a generic “recipe scaler” — defaults and language are firehall (crew, drop-ins, hold).

---

### 3. Grocery Budget Calculator — `/tools/grocery-budget`

**User job:** Set a tour / month grocery kitty and see if steak night fits.

**Inputs**

- Firefighters on tour / paying into kitty  
- Period (tour / week / month)  
- Target $/firefighter or total kitty  
- Planned dinners (count × estimated $/plate)  
- Optional canteen restock line

**Outputs**

- Remaining budget  
- Suggested max $/plate  
- Warning when plan exceeds kitty  
- CTA: Hall Pro budget tracker · cheap meals · cost-per-plate tool

**Maps to:** `/crew-grocery-budget` · `firehall-grocery-planning` guide

---

### 4. Kitchen Checklist — `/tools/kitchen-checklist`

**User job:** Confirm the hall can cook the methods it votes for (gear + basics).

**Format**

- Interactive checklist (cookware, thermometers, sheet pans, Dutch oven/slow cooker, knives, sanitation)  
- Progress %  
- Print / PDF download  
- “Email to myself” optional (no hall data required)

**Maps to:** `/fire-station-kitchen-inventory` · guide `station-kitchen-essentials` · roadmap “Cleaning / kitchen” checklists

**Hall Pro upsell:** Save checklist per hall + mark broken/missing gear for the next tour.

---

### 5. Pantry Checklist — `/tools/pantry-checklist`

**User job:** Stock a new hall or reset staples after chaos.

**Format**

- Tiered staples: oils, rice/pasta, stocks, spices, canned tomatoes, canteen basics  
- Check / need / have  
- Print / PDF (“New captain starter pantry”)  
- CTA → Canteen Manager explainer · Hall join

**Maps to:** `/fire-hall-pantry` · `/canteen-manager` · roadmap “Pantry Checklist for New Halls” (P0)

---

### 6. Meal Planner — `/tools/meal-planner`

**User job:** Fill 2–7 dinner slots for the tour without a whiteboard fight.

**Inputs**

- Days / slots  
- Constraints: protein, time, method (skillet / slow cooker / BBQ)  
- Head count  

**Outputs**

- Suggested meals from catalog (public picks)  
- Link each slot → recipe + ingredient calculator  
- Export day list → Shopping Builder  

**Maps to:** `/hall-meal-planner` · `/firefighter-meal-calendar` · `/generator` · `/wheel`

**Public vs Pro**

| Public | Hall Pro |
|--------|----------|
| Anonymous plan in session / localStorage | Shared hall plan, history, votes |
| No roster | Roster-aware slots |
| Print plan | Cloud sync across devices |

---

### 7. Shopping Builder — `/tools/shopping-builder`

**User job:** Turn 1–3 recipes + pantry gaps into one store run.

**Inputs**

- Add recipes (search catalog)  
- Crew size  
- Merge / dedupe ingredients  
- Optional: add pantry “needs” from checklist  

**Outputs**

- Aisle-ish grouped list  
- Copy / print / PDF  
- CTA: Hall shopping list sync (Pro) · Costco handoff narrative (canteen)

**Maps to:** `/fire-hall-grocery-list` · Canteen Manager (restock ≠ dinner)

---

## Evaluation matrix

Score: **1–5** (5 = strongest fit for Firehall Meals right now)

| Tool | SEO | Backlinks | Hall Pro | Monetization | Affiliate | Priority |
|------|----:|----------:|---------:|-------------:|----------:|----------|
| Cost Per Plate | 5 | 5 | 4 | 4 | 2 | **P0** |
| Grocery Budget | 5 | 5 | 5 | 5 | 2 | **P0** |
| Pantry Checklist | 4 | 5 | 4 | 3 | 4 | **P0** |
| Kitchen Checklist | 3 | 4 | 3 | 2 | 5 | **P0** |
| Crew Ingredient Calculator | 4 | 3 | 3 | 3 | 2 | **P1** |
| Shopping Builder | 4 | 3 | 5 | 4 | 3 | **P1** |
| Meal Planner | 4 | 3 | 5 | 5 | 2 | **P1** |
| `/tools` hub | 3 | 2 | 3 | 3 | 1 | Ship with P0 |

### SEO

| Tool | Primary queries | Competition | Notes |
|------|-----------------|-------------|-------|
| Cost per plate | cost per plate calculator, fire hall meal cost | Low niche specificity | Explainer already live — interactive page wins featured-snippet / tool SERPs |
| Grocery budget | crew grocery budget, fire hall food budget | Thin | Pair with cheap-meals guide |
| Ingredient calculator | scale recipe for 10, cooking for 10 calculator | Medium generic scalers | Firefighter framing + catalog presets is the moat |
| Pantry / kitchen checklists | fire station pantry checklist, station kitchen checklist | Low | Downloadables rank and get bookmarked |
| Meal planner / shopping | fire hall meal planner, fire hall grocery list | Medium | Tools must not cannibalize recipe hubs; titles stay tool-intent |

**SEO rules**

- Each tool page: unique H1, FAQ schema, SoftwareApplication/WebApplication schema, breadcrumbs, internal links to 2 guides + 4 recipes + related tools  
- Indexable; no private data in URLs or HTML  
- Share links use query params for *anonymous* state only (`?crew=10&total=84`) — never hall IDs  

### Backlinks

Highest link magnets (share in department emails, academy resource pages, wellness programs):

1. **Pantry Checklist PDF** — “new captain / new hall” gift asset  
2. **Kitchen Checklist PDF** — ops / safety adjacent  
3. **Cost Per Plate** — budget meetings, battalion chats  
4. **Grocery Budget** — kitty fairness debates  

**Outreach angles (not code)**

- Training academy “station life” resource lists  
- IAFF local newsletters / wellness committees  
- Firehouse.com / Reddit r/Firefighting helpful replies (no spam)  
- Pair with Fire Prevention Week / new recruit onboarding calendars (already in growth strategy)

### Hall Pro

| Tool | Free value | Pro unlock |
|------|------------|------------|
| Cost per plate | Full calculate + print | Save history to hall · compare tours · export for officers |
| Grocery budget | Full plan math | Live kitty tracker · member contributions · alerts |
| Ingredient calculator | Full scale + copy | Push scaled list into hall shopping |
| Pantry checklist | Full checklist + PDF | Hall staples sync · Needs Attention (Canteen) |
| Kitchen checklist | Full checklist + PDF | Hall inventory status · gear notes |
| Meal planner | Session plan + print | Shared calendar · voting · history |
| Shopping Builder | Build + print | Shared checklist · Costco handoff · Pro shopping |

**Positioning line:** Free tools settle the argument tonight. Hall Pro stops the next tour from starting over.

### Monetization

| Lever | How tools help |
|-------|----------------|
| Hall Pro conversion | Soft gates on save/sync/history; never cripple the core calc |
| Firefighter Plus | Soft CTA after meal planner → Find a Meal / saved meals (personal tier) |
| Lead capture | Optional email for PDF checklist (double opt-in); do not require for calculate |
| Brand trust | Tools as EEAT proof for SEO landings |

**Anti-patterns:** Forced signup before first result; paywall on basic math; dark-pattern “Pro only” on print.

### Affiliate potential

| Tool | Affiliate fit | Examples (evaluate compliance first) |
|------|---------------|--------------------------------------|
| Kitchen Checklist | **High** | Sheet pans, Dutch ovens, thermometers, slow cookers |
| Pantry Checklist | **Medium–High** | Bulk rice, stock, spices, Costco Business Center narrative (no password storage) |
| Shopping Builder | **Medium** | “Buy staples” deep links only where disclosure + policy allow |
| Cost / Budget / Ingredient | **Low** | Keep clean; trust > commissions |
| Meal Planner | **Low–Medium** | Link recipes first; gear only in checklist cross-sell |

**Rules**

- Clear “may earn a commission” disclosure  
- Never affiliate-gate a safety-critical recommendation  
- Prefer evergreen cookware / thermometers over grocery SKU churn  
- Costco: handoff list only — no credentials, cards, or fake “login to Costco” UI  

---

## Relationship to existing surfaces

| Existing | Tools role |
|----------|------------|
| Phase 11 product SEO pages | Traffic + education → CTA into `/tools/...` |
| `/generator`, `/wheel` | Meal Planner uses as pick engines |
| `/hall/canteen`, shopping | Pro destination after public Shopping Builder / Pantry |
| Guides (`cheap-firehall-meals`, `station-kitchen-essentials`, grocery planning) | Editorial depth + backlink landing pads |
| Content consolidation plan | After guide merges, point budget/portion guides at tools |

---

## UX / design constraints (when built)

- One job per tool page; brand visible; no card soup in the hero  
- Calculator results are the hero visual, not stock photos  
- Mobile-first: big tap targets, sticky “Calculate” / “Update list”  
- Print stylesheet for checklists and budgets  
- Local-first state; optional account  
- Accessibility: labeled inputs, keyboardable checklists, live region for results  

---

## Implementation roadmap

### Phase T0 — Spec lock (3–5 days)

- [ ] Approve hub name (`Station Kitchen Tools` vs `Firehall Tools`)  
- [ ] Approve URL map (`/tools/...` vs reusing explainer paths)  
- [ ] Approve Free vs Hall Pro matrix above  
- [ ] Affiliate policy yes/no for Kitchen + Pantry  
- [ ] Analytics events list (tool_open, calculate, pdf_download, pro_cta_click)

**Deliverable:** This doc approved; ticket breakdown.

---

### Phase T1 — Foundation (1 week)

- [ ] Route shell: `/tools` hub page (static content + cards linking to “coming soon” or first live tool)  
- [ ] Shared tool layout: header, breadcrumbs, result panel, FAQ, related recipes/guides, Pro CTA  
- [ ] Schema helpers for WebApplication + FAQ  
- [ ] Sitemap + InternalLinkHub + nav entry (“Tools”)  
- [ ] Update Phase 11 explainers with “Open tool” CTA stubs  

**Exit:** Hub live; no broken promises (only link tools that exist or clearly mark Coming soon).

---

### Phase T2 — P0 interactive tools (2–3 weeks)

Ship in this order:

1. **Cost Per Plate** (highest SEO + backlink + already has explainer)  
2. **Grocery Budget**  
3. **Pantry Checklist** + PDF  
4. **Kitchen Checklist** + PDF  

Per tool:

- [ ] Client calculator/checklist UI  
- [ ] Print / share  
- [ ] FAQ + schema  
- [ ] Wire explainer → tool CTA  
- [ ] Soft Pro CTA (save/sync) — can be “notify when available” if Pro APIs lag  

**Exit:** Four linkable assets live; GSC + PDF download tracking on.

---

### Phase T3 — P1 workflow tools (2–3 weeks)

5. **Crew Ingredient Calculator** (catalog recipe preset)  
6. **Shopping Builder** (multi-recipe merge)  
7. **Meal Planner** (slots + generator/wheel integration)

**Exit:** Plan → scale → shop loop works without an account.

---

### Phase T4 — Hall Pro deep links (1–2 weeks)

- [ ] Save cost/budget runs to hall (private)  
- [ ] Push Shopping Builder → hall shopping list  
- [ ] Pantry checklist → Canteen staples / Needs Attention  
- [ ] Meal Planner → hall calendar / vote nominees  
- [ ] Entitlement checks (`HALL_PRO` features)

**Exit:** Clear free→Pro conversion path without breaking public SEO tools.

---

### Phase T5 — Growth & monetization (ongoing)

- [ ] PDF versions hosted for outreach (pantry + kitchen)  
- [ ] Affiliate modules on Kitchen Checklist only (if approved)  
- [ ] Backlink outreach kit (1-pager + embeddable link)  
- [ ] Seasonal pushes (Fire Prevention Week, new recruit, March meal-prep)  
- [ ] Evaluate consolidating thin explainers → 301 into tool URLs where intent is purely “calculator”

---

## Success metrics (90 days post T2)

| Metric | Target direction |
|--------|------------------|
| Organic landings on `/tools/*` | ↑ from zero |
| Referring domains to tools/PDFs | ↑ (primary backlink KPI) |
| PDF downloads (pantry + kitchen) | Track; aim for shareable volume |
| Calculate → Pro CTA click rate | Baseline, then improve |
| Hall Pro trials from tool referrer | ↑ |
| Explainer → tool CTR | ↑ |
| Support/load: tool JS errors | Near zero |

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Cannibalize product SEO explainers | Keep explainers until tools win; then fold FAQs and 301 |
| Generic “recipe calculator” competition | Firefighter defaults, catalog presets, station language |
| Pro gate kills links/shares | Never gate core math or PDF checklist |
| Affiliate trust damage | Disclosure; limit to checklists; no grocery dark patterns |
| Private data leakage | No hall IDs in public URLs; robots keep `/hall` closed |
| Scope creep into full ERP | Tools stay single-purpose; Canteen/Vote stay in hall app |

---

## Recommended decision defaults (if you want speed)

1. **Hub name:** Station Kitchen Tools  
2. **URLs:** `/tools/...` for interactive; keep Phase 11 explainers as spokes  
3. **Ship first:** Cost Per Plate → Grocery Budget → Pantry PDF → Kitchen PDF  
4. **Affiliates:** Kitchen Checklist only in T5; none on budget/cost tools  
5. **Pro:** Save/sync only — print and calculate always free  

---

## Approval checklist

- [ ] IA / URL map approved  
- [ ] Free vs Hall Pro matrix approved  
- [ ] Affiliate scope approved  
- [ ] Phase T1–T2 schedule approved  
- [ ] Explicit go-ahead to implement (this doc is design-only)

---

*— End of tools section design —*
