# Stop Building — Founder Scope Audit

**Date:** June 22, 2026  
**Lens:** Experienced startup founder · pre-revenue · zero proven 4-week hall habit  
**North Star:** A hall uses Firehall Meals on **every shift night for 4 consecutive weeks**  
**Focus filter:** Only build what serves these four jobs:

| # | Job | One sentence |
|---|-----|--------------|
| 1 | **Decide dinner** | Pick what the crew eats tonight — fast, fair, no argument |
| 2 | **Cook dinner** | Scale it, follow it, finish at the stove |
| 3 | **Remember dinner history** | Know what we made, avoid repeats, save winners |
| 4 | **Manage hall necessities** | Coffee, paper, protein, shopping — don’t run out |

**Everything else is acquisition, ops, or fantasy until 100 active halls.**

**Companion:** `strategic-audit.md`, `hall-pro-audit.md`, `navigation-v3.md`, `product-audit-v3.md`, `firehall-meals-90-roadmap.md`

---

## Executive verdict

You built **two products in one repo**:

1. **A firefighter recipe media company** — 327+ recipes, 58 guides, 8 SEO landings, 2,300-line sitemap, 100+ npm QA scripts, 11 admin routes  
2. **An early hall ops app** — generator, wheel, vote, cook mode, canteen, shopping list, supplies

Product (1) is **ahead of distribution**. Product (2) is **ahead of monetization** but **behind ritual** — join flows dump captains on settings, cook mode isn’t default, shopping lives in a hash anchor.

**Founder rule:** If a feature doesn’t help a crew **decide, cook, remember, or stock** *this shift*, it doesn’t ship until you have **100 halls with ≥1 activity per week**.

Today ~**40% of routes** are SEO/editorial/admin. ~**25%** duplicate another path. ~**9 Hall Pro features** are listed; **3 are ghost**, **2 are mislabeled**, **2 are server-enforced**.

**Stop adding. Start subtracting.**

---

## Scorecard: code vs focus

| Pillar | Built? | Grade | Biggest distraction |
|--------|--------|-------|---------------------|
| Decide dinner | Generator, wheel, vote, explore | **A-** | 7 browse entry points |
| Cook dinner | Cook mode, crew scaling | **B-** | Image QA > stove UX |
| Remember history | Local history, favorites, sync | **C+** | “Hall” history isn’t hall-shared |
| Manage necessities | Canteen, supplies, shopping | **B** | Buried in `/halls/:id` settings |

| Non-pillar | Scale | Verdict |
|------------|-------|---------|
| SEO / guides | 58 articles, 8 landings | Keep as **static acquisition**, not app IA |
| Admin / QA | 11 admin routes, 100+ scripts | **Freeze** — internal only |
| Billing / Pro | 21 feature flags, no Stripe | **Honesty sprint**, not expansion |
| Gamification | Activity, leaderboard, streaks, badges | **Postpone** until halls feel alive |

---

## What should NEVER be built

These are tempting, on-roadmap, or already listed in billing — but they **do not serve the four jobs** and will not move retention before 100 halls.

### Product fiction (ghost Pro SKUs)

Already in `HALL_PRO_FEATURES` or admin UI but **not real**:

| Feature | Why never (as sold today) |
|---------|---------------------------|
| `meal_calendar` | Crews don’t plan meals in calendars — they decide tonight |
| `hall_badges` | Gamification before gamification proof; no retention data |
| `shift_reports` | Duplicate of canteen export + captain email — pick one later |
| `family_profiles` | Firefighters cook for **crew**, not household meal plans |
| **Paid Personal tier** | Free account is enough; Personal is a fake SKU (`price_label: "Free during preview"`) |

**Action:** Remove from marketing, plans page, and `HallProAdminPanel` until shipped and honest.

### Platform expansions (wrong company stage)

| Never build (now) | Why |
|-------------------|-----|
| Inter-hall / county / regional leaderboards | No density; embarrassingly empty |
| Department / enterprise wellness contracts | Sales cycle before product-market fit |
| Voice cooking mode | Novelty; cook mode isn’t default yet |
| AI chat for recipe Q&A (`server/replit_integrations/chat`) | Support burden; recipes are curated |
| Audio / image generation integrations (Replit) | Unmounted dead code — not your product |
| International / metric-only markets | One country, one culture, one niche |
| Firefighter fitness / wellness cross-sell | Scope creep from Lights & Sirens brand |
| Native iOS/Android apps | PWA is enough until retention proves mobile |
| Facebook-style hall social network | Activity feed ≠ product; crews use group text |
| More catalog silos (BBQ batch-30, hall-expansion SKUs, performance fuel as product line) | 327 recipes is enough (`strategic-audit.md`) |
| New npm audit scripts | **Freeze at current set** — run weekly, not per PR |
| AI pizza generation | Curated pizza catalog exists |
| “Shared favorites” / “shared history” **as Pro** until actually crew-shared on server | False advertising |

### Monetization theater

| Never build (now) | Why |
|-------------------|-----|
| Stripe optimization / pricing experiments | No price without retention |
| Plan comparison UX for Guest vs Personal vs Pro | Confuses buyer; one free account + optional hall Pro |
| Paywall on canteen or vote | Vote is viral; canteen is daily ops — **free forever** |
| Protein deals as primary Pro wedge | Nice-to-have; canteen manager buys lists + reports |

---

## What should be deleted

Deletion reduces cognitive load, bundle size, and user confusion. Prefer **delete over deprecate** for internal-only code.

### Dead code (safe to remove)

| Item | Path | Reason |
|------|------|--------|
| Replit integrations (unmounted) | `server/replit_integrations/*` | Never registered in `server/routes.ts` |
| Dead page files (not in router) | `client/src/pages/recipes-index.tsx` | Replaced by `explore-browse-redirect.tsx` |
| | `client/src/pages/performance-fuel-hub.tsx` | Orphan |
| | `client/src/pages/performance-fuel-recipe-page.tsx` | Orphan |
| | `client/src/pages/firehall-category-page.tsx` | Redirect-only flow exists |
| Ghost billing features | `meal_calendar`, `hall_badges`, `shift_reports` in `HALL_PRO_FEATURES` | Not built — remove from types + UI |
| Duplicate blog route | `/blog/:slug` in `App.tsx` | 301 to `/guides/:slug` only |
| `golden-recipe-page.tsx` | If fully superseded by `catalog-recipe-page.tsx` | Audit then delete one recipe page stack |

### User-facing surfaces to remove or demote

| Surface | Action |
|---------|--------|
| Top-level **Pizza** nav item | Demote to Discover filter + `/recipes` — not a pillar |
| **Guides** in main header nav | Footer + SEO only (`navigation-v3.md`) |
| **`/hall-program`** | Merge into join flow or delete orphan acquisition page |
| **`/plans`** Personal vs Pro confusion | Replace with “Hall Pro — coming soon” on settings only |
| **`/top-rated-recipes`**, **`/hall-of-fame`** as browse paths | Merge into single Discover; keep URLs as 301 for SEO |
| **`/families`** index | Niche collection — not shift-night job |
| **8 SEO landing variants** saying the same thing | Consolidate to 2–3 canonical landings |
| **Misleading Pro copy** | “Shared favorites/history” until server-backed crew data exists |

### Process deletion

| Item | Action |
|------|--------|
| New catalog expansion batches | **Content freeze** at ~327 recipes |
| Per-PR full `npm run check` (40+ scripts) | CI subset for PR; full audit weekly |
| Admin Golden 100 as **eager** main bundle import | Lazy-load; firefighters never hit it |

---

## What is overengineered

Overengineering is code that **costs velocity** without improving the four jobs for a probie on Tuesday night.

### Architecture

| Area | Symptom | Simpler path |
|------|---------|--------------|
| **6 nested React providers** | Every route pays auth + sync + hall + feedback | Scope hall providers to `/hall/*` layout |
| **7 catalog API namespaces** | golden-100, approved, pizza, performance, expansion, smoothies, breakfast | One `approved` catalog + internal tags |
| **3 browse backends** | `/api/explore/*`, `/api/curated/*`, `/api/catalog/*` | One public browse API |
| **Cloud sync coordinator** | 4 snapshot keys, 5-min background sync, merge on every change | Sync on sign-in + explicit save; dirty-domain only |
| **Full billing flag matrix** | 21 `BILLING_FEATURES`, DB flags, no payment | 3 hall Pro gates max until Stripe |
| **Generation pipeline** | LLM timeouts, broadening, caching in routes | Catalog matcher — rename “Hall Match”, simplify path |
| **Dual analytics** | GA4 + 110 SQLite event types + growth dashboard | Keep internal; don’t productize for crews |
| **Hall dashboard v2** | 15+ cards, teasers, locked states | Tonight · Vote · List · Canteen · History |
| **Shift dashboard** | Parallel `/hall/:id/shift/:id` | Fold shopping + timeline into hall home |
| **186 npm scripts** | QA theater | Freeze; delete unused scripts over time |

### Data honesty overengineering

| Area | Problem |
|------|---------|
| `shared_favorites` / `hall_history` as Pro | Per-user `localStorage` backup sold as crew-shared |
| UI-only `PaywallGate` | APIs open to any member — billing is cosmetic |
| Activity feed merge | Local + server + dedup for “social” feed with no crew-visible server writes |

**Fix honesty before adding complexity.**

---

## What features duplicate each other

Duplicates confuse crews (“which door do I use?”) and burn maintenance.

### Decide dinner (pillar 1)

| Duplicate set | Keep | Kill / merge |
|---------------|------|--------------|
| Browse paths | **`/explore`** (→ `/discover` in v3) | `/recipes` redirect, homepage rails, `/top-rated-recipes`, `/hall-of-fame`, `/smoothies`, `/breakfast`, `/pizza`, `/families`, SEO landings as **app nav** |
| Recipe detail | **`/recipes/:slug`** | `/explore/recipe/:id` → 301 |
| Generators | **`POST /api/generate`** | Pizza as separate top-level generator nav |
| Wheel entry | **`/wheel`** | `/classics-wheel` (already redirects) |
| Category browse | Filters inside Discover | `/categories/:id`, firehall category page |

### Cook dinner (pillar 2)

| Duplicate set | Keep | Kill / merge |
|---------------|------|--------------|
| Recipe page stacks | `catalog-recipe-page.tsx` | `golden-recipe-page.tsx`, `explore-recipe-detail-page.tsx` (legacy paths) |
| Breakfast routes | Recipes tagged breakfast in catalog | Separate `/breakfast` + `/breakfast/performance` indexes |
| Smoothie routes | Catalog kind `smoothie` | Separate `/smoothies` index + page |

### Remember dinner (pillar 3)

| Duplicate set | Keep | Kill / merge |
|---------------|------|--------------|
| History surfaces | **Hall dashboard “recent meals”** + optional full log | `/hall-history` as separate orphan — merge under Me or Hall |
| Favorites | **Hall favorites on `/hall`** | `/favorites` global page vs hall section |
| Saved meals sync | Account saves | “Hall favorites” naming when not hall-shared |
| Streak systems | One streak (meals cooked) | Separate hall-streak + wheel-streak panels until simplified |

### Manage necessities (pillar 4)

| Duplicate set | Keep | Kill / merge |
|---------------|------|--------------|
| Shopping | **`/hall/shopping-list`** (to build) | Personal modal + `#hall-shared-shopping-list` hash on settings |
| Hall home vs settings | **`/hall`** = ops dashboard | `/halls/:uuid` = captain settings only |
| Supplies vs canteen | **`/hall/canteen`** daily | Supplies panel on settings (same data, two UIs) |
| Protein deals URLs | `/hall/protein-deals` | `/hall/deals` redirects (keep one) |
| Deal setup | One setup flow | `/hall/protein-deals/setup` only |

### Editorial / SEO

| Duplicate set | Keep | Kill / merge |
|---------------|------|--------------|
| Guides | `/guides/:slug` | `/blog/:slug` |
| About / FAQ | Homepage FAQ section | Full `/faq` + `/about` for logged-in app users |
| Explore vs Recipes marketing | One “Discover” brand | “Explore”, “Recipes”, “Catalog” in copy |

---

## What firefighters do not care about

These may matter to **you** (SEO, QA, investors) but **not to a cook on shift night**:

### They don’t care about internal names

- Golden 100, Performance 50, hall-expansion, BBQ batch, editorial 150  
- “Approved catalog”, asset revision, thumb cache version  
- Whether matching uses AI vs catalog (**rename Hall Match; stop debating**)

### They don’t care about product mechanics

- Personal vs Guest vs Hall Pro plan tiers  
- Measurement system toggle (nice, not a wedge)  
- 12 categories vs 8 categories  
- Lights & Sirens brand story in the header  
- PWA install prompt polish  
- Image governance scores, plating accuracy, realism firewall  
- Crew rating analytics columns with no UI  
- Admin Golden 100 manifest, ingestion staging, deal admin  

### They don’t care about social product fantasy

- Hall activity feed as a “social network”  
- Full leaderboard page (monthly winner in passing — fine)  
- Inter-crew competition before their own hall has 5 active members  
- Achievement badges, custom hall badge upload  
- “Hall analytics dashboard” — captains want **one paragraph**, not charts  

### They don’t care about content browsing at 5pm

- 58-guide index in the app shell  
- Smoothie catalog as a separate product  
- Breakfast performance as a separate product  
- Families index  
- Top-rated recipes page as navigation  

### They care about (validate this list)

- What’s for dinner **tonight**  
- How to cook it for **8 or 12** without math  
- Not making **chili again** this week  
- Whether **coffee and paper towels** are out  
- **One list** before the grocery run  
- **Vote** when the crew can’t decide  

---

## What to postpone until 100 active halls

**Definition:** 100 halls with **≥3 members** and **≥1 hall-visible activity per week** (cook, vote, or wheel), sustained 4 weeks.

Until then, these are **premature optimization** or **premature monetization**:

### Monetization & billing

| Postpone | Why |
|----------|-----|
| Stripe checkout + subscription management | Fix retention first; price without habit = churn |
| Hall Pro pricing experiments | One price, one buyer (canteen manager), one pilot |
| Protein deals live retailer APIs | Demo for 1–2 pilots only |
| Affiliate grocery / Instacart links | Needs traffic + trust |
| Department / B2B license sales | No case studies |
| Physical recipe book SKUs | After 10 halls swear by the app |

### Hall social & gamification

| Postpone | Why |
|----------|-----|
| Full `/hall/activity` page | Inline Crew Pulse on `/hall` is enough (`hall-activity-v1.md`) |
| Full `/hall/leaderboard` page | Snippet on dashboard only |
| Hall badges / achievements | No retention proof |
| Streak notification emails at scale | Manual pilot first |
| Real-time activity WebSocket | Polling + honest server writes first |

### Growth & ops infrastructure

| Postpone | Why |
|----------|-----|
| `/admin/growth` dashboard expansion | North Star in spreadsheet until 20 halls |
| Admin users CRM + Klaviyo automation depth | Manual outreach for first 50 halls |
| Shift reminder email system at scale | Prove one hall uses it 4 weeks |
| 110-event analytics taxonomy expansion | Stop adding event types |
| Facebook-group distribution tooling | Founder-led posting first |
| Sitemap / SEO page expansion | Optimize conversion on existing traffic |
| New guide articles | Freeze; update CTAs on top 10 guides only |

### Product breadth

| Postpone | Why |
|----------|-----|
| Meal calendar (even if built) | Not shift-night behavior |
| Shift reports as separate SKU | Export from canteen when asked |
| Inter-hall features | No network density |
| Family profiles | Wrong persona |
| Multiple shopping lists per hall | One shared list first |
| Advanced hall analytics (trends, exports) | Captain asks “what did we cook most?” — one stat is enough |

### What to ship **before** 100 halls (not postponed)

These are **focus**, not backlog:

1. Join hall → **`/hall`**, not settings  
2. **Cook mode default** on mobile recipe pages  
3. **One Discover** browse path in nav  
4. **Free** canteen + shared shopping list (real routes, not hash)  
5. **Hall Vote** prominent on hall home — free forever  
6. **Honest** sync labeling (“your saves”, not “crew shared”)  
7. Strip ghost Pro features from UI  
8. Content freeze — stop catalog/scripts  

---

## What to keep (the whole company on one page)

```
DECIDE          COOK            REMEMBER         NECESSITIES
────────        ────            ────────         ───────────
Generator       Cook Mode       History log      Canteen page
Wheel           Crew scaling    Favorites        Shopping list
Hall Vote       Recipe pages    Repeat warning   Supplies / shortages
Discover        Sticky cook CTA Cloud backup*    Shift grocery report

* honest personal backup, not fake "hall shared"
```

### Hall Pro (when retention exists) — narrow to 3 sentences

From `hall-pro-audit.md`:

1. **One list** — shared shopping, always current  
2. **One log** — true crew meal history on server (build for real)  
3. **One report** — monthly canteen + meal summary for the captain  

Everything else is upsell later.

---

## Decision framework (use on every PR)

Ask in order:

1. **Which pillar?** If none → don’t ship to users.  
2. **Does a hall cook use it on shift night?** If no → SEO/admin only or postpone.  
3. **Does it duplicate an existing path?** If yes → merge, don’t add.  
4. **Does it require >100 halls to feel useful?** If yes → postpone.  
5. **Can we delete something to ship this?** If no deletion → scope is probably too big.

---

## One sprint subtraction list

If you do nothing else this month:

| # | Action | Pillar |
|---|--------|--------|
| 1 | Remove ghost features from `HALL_PRO_FEATURES` + plans UI | Honesty |
| 2 | Delete `server/replit_integrations/` | Deletion |
| 3 | Delete 4 orphan page files | Deletion |
| 4 | Join → `/hall`; shopping → `/hall/shopping-list` | Necessities |
| 5 | Nav: Generator · Discover · Hall · Me (drop Pizza, Guides from header) | Decide |
| 6 | Cook mode sticky bar on all recipe pages (mobile) | Cook |
| 7 | Free canteen + shopping APIs — remove `PaywallGate` until Stripe | Necessities |
| 8 | Declare Personal = free account; hide `/plans` tier confusion | Honesty |
| 9 | Content freeze — no new recipes, guides, or audit scripts | Focus |
| 10 | Lazy-load `AdminGolden100Page` — out of main bundle | Performance |

---

## Bottom line

Firehall Meals wins if a hall **decides, cooks, remembers, and stocks** — every shift night, four weeks in a row.

You do **not** win with more recipes, more admin dashboards, more Pro feature flags, or more browse URLs.

**Build the hall ritual. Delete the rest. Charge only when they can’t live without Tuesday night.**

---

*Audit based on full route map (`App.tsx`), billing types (`shared/billing/types.ts`), server route registrars, and review corpus. No code changes in this pass.*
