# Firehall Meals — Strategic Audit + 90/100 Roadmap

**Date:** June 22, 2026  
**Auditor lens:** Product strategist · Growth · UX · SEO · Monetization · Fire service industry  
**Method:** Codebase audit, shipped feature review, competitive reality check, fire service culture  
**Current score:** **68 / 100**  
**Target score:** **90 / 100**  
**North Star:** **Halls using Firehall Meals every shift for 4 consecutive weeks**

---

## Executive Summary (Read This First)

Firehall Meals solves a **real problem** in a **defensible niche**. The catalog, crew scaling, Hall Vote, and generator are genuinely useful. Engineering and content quality are **ahead of distribution, retention proof, and monetization** — classic builder trap.

Since the last strategic audit (~62/100), you shipped meaningful product: **auth, cloud sync, hall membership, Hall Dashboard V2, cook mode, category filter fix, billing architecture**. That moved the score. It did **not** move the business — because **no hall has been onboarded as a ritual**, **no one pays**, and **distribution is still mostly SEO hope**.

The brutal truth: you are **one decision away from being a great media brand** and **three decisions away from being an operating system for hall meals**. The gap to 90 is not recipes. It is:

1. **Hall ritual** — same crew, same tool, every shift night  
2. **Mobile clarity** — 3-second comprehension, one browse path, stove-ready UX  
3. **Hall Pro with teeth** — shared lists, vote history, canteen workflow, real payment  
4. **Distribution in halls** — QR on fridge, Facebook groups, captains, not Google alone  

Stop building catalog infrastructure. Start **installing the product into physical halls**.

---

# PART 1 — CURRENT PRODUCT SCORE

### Overall: **68 / 100**

| Dimension | Score | Working | Weak | Growth blocker |
|-----------|------:|---------|------|----------------|
| **Value proposition** | **7.5/10** | “What’s for dinner?” is instantly understood. Crew-size scaling is real utility. Firefighter voice is authentic. | Value is episodic (2–4 nights/week). Competes with group chat + Google. “AI” overpromise vs curated matcher. | Users get value once via SEO; no reason to install as hall OS. |
| **Mobile experience** | **6.5/10** | Safe areas, haptics, PWA shell, shortened hero (~50dvh), touch targets, `dvh` handling. | Explore still filter-heavy. Recipe pages long. Hall Dashboard dense on small screens. Performance on mid-tier Android untested at scale. | Mobile Safari is your primary hall device — friction = bounce before ritual forms. |
| **Homepage clarity** | **6/10** | Hero improved; How It Works + Hall Vote section; SEO blocks hidden on mobile. | Still ~8 sections. Featured meals rail duplicates Explore. Trust + social proof without real hall names. Multiple paths to same job. | First-time firefighter doesn’t know: Generator vs Wheel vs Vote vs Explore. |
| **Pick Tonight’s Meal** | **8/10** | Fast, reliable, category filters now accurate (225/225 audit). Crew filters, shopping list, haptics. | Filter panel still intimidating for first run. “AI” label. Email gate after 3rd gen can feel bait-and-switch. | Strong core — don’t over-invest here; **onboard halls to this flow**. |
| **Classics Wheel** | **7/10** | Best emotional hook in product. Animation, streaks, cultural fit. | Small pool (~10 classics). Weak share attribution. Not tied to hall identity. | Delight without habit — spins don’t compound without hall context. |
| **Hall Vote** | **6.5/10** | Solves real crew decision problem. Shareable link. Good OG potential. | Buried in nav. No hall-required onboarding path. Vote → cook → list loop incomplete. | **Should be top-of-funnel for halls** — currently a feature, not the product. |
| **Recipe quality** | **8/10** | 300+ audited recipes, crew scaling, nutrition QA, owned imagery governance, pro tips. | Users can’t tell — looks like any recipe site until they cook. Some duplicate/near-duplicate pairs. | Quality is table stakes; **not a growth lever** at current scale. |
| **Explore** | **6/10** | Strong card grid, sort modes, crew ratings collections, SEO depth. | Filter wall before food on mobile. Overlaps `/recipes`, category pages, homepage rails. “Full catalog” language. | Browse paralysis — users who browse rarely convert to generator habit. |
| **Cook Mode** | **6.5/10** | Exists (`Start Cooking`, step view, adapters for golden/breakfast/explore). | Not on every recipe surface. Not default UX. No voice advance. Screen-wake hint only. | **Moment of truth** (at stove, gloves, interruptions) still feels like a blog recipe with a modal. |
| **Hall profiles** | **7/10** | Membership V1: create/join/invite, roles, permissions, Dashboard V2, cloud sync. | Onboarding is optional and invisible to guests. Most users never create a hall. Hall name/stats feel empty without crew adoption. | Infrastructure without **mandatory hall setup** = single-player app in multiplayer culture. |
| **Hall retention** | **5.5/10** | History, favorites, vote, wheel streak, sync — seeds exist. Analytics events wired. | No proof of 4-week hall habit. Shift reminders flag exists but email loop unproven. Shared shopping lists / supplies are billing flags, not shipped UX. | **Retention is theoretical** until 10 halls use it 4 weeks straight. |
| **Monetization readiness** | **4/10** | Plan catalog, feature gates, `/plans`, admin billing, clear tier structure. | **Zero payment processing.** Hall Pro value mostly aspirational. No pricing validation. Free tier may be too generous forever. | Can’t learn willingness-to-pay without charging something real. |
| **SEO** | **8.5/10** | 393 sitemap URLs, guides, programmatic landings, internal linking, canonical discipline. | SEO drives **visits**, not **halls**. Conversion from landing → hall creation near zero. | Traffic without retention = content company metrics. |
| **Analytics** | **8/10** | Deep first-party events (generator, wheel, vote, hall, sync, billing). Admin dashboard. | No growth dashboard tied to North Star. No cohort view (hall created → week 4 active). Team can over-index on pageviews. | You’re measuring everything except **“did this hall use us again this shift?”** |
| **Trust / social proof** | **6/10** | Crew ratings, editorial guides, honest sync messaging, image governance. | No named firefighters, departments, or hall photos. “Hall-tested” is a claim, not a network. Dual brand (Firehall Meals + Lights & Sirens Co.) splits authority. | Fire service buys **people they know** — you look polished but anonymous. |
| **Business model** | **5/10** | Guest / Personal / Hall Pro structure is directionally right. Canteen angle is smart. | Personal tier overlaps free. Hall Pro buyer unclear. No pilot pricing. Physical product path underused. | Model untested — architecture ≠ business. |
| **Distribution readiness** | **4/10** | QR-ready vote links, PDF lead magnet (Red Lead), brand bridge to L&S Co. | No systematic hall outreach. No ambassador program. No captain/canteen playbook. No case studies. | **Best product in the world loses if no one installs it in the kitchen.** |

**Weighted average:** 6.8 / 10 → **68 / 100**

---

# PART 2 — 90/100 GAP ANALYSIS

**Gap: 22 points.** Each point requires **user-visible habit or revenue**, not internal QA.

## P0 — Must fix (blocks 90)

| # | Issue | Why P0 | Fix |
|---|-------|--------|-----|
| 1 | **No hall ritual proof** | Product score caps at ~75 without repeat shift usage | Pilot 10 halls; measure 4-week retention before new features |
| 2 | **Homepage / nav confusion** | 4 ways to decide dinner | One hero job: “Pick tonight” + “Vote the crew”; demote Explore in nav |
| 3 | **Hall onboarding missing** | Guests never become halls | First sign-in → “Create or join your hall” (skippable once, not forever) |
| 4 | **Hall Vote not hero** | Best viral loop buried | Homepage = Vote CTA; post-vote → recipe + shared shopping list |
| 5 | **Cook Mode not default on recipe pages** | Stove UX is the trust moment | Sticky “Start Cooking” above fold; step-first layout on mobile |
| 6 | **Browse surface duplication** | Cognitive load, SEO cannibalization | **Explore = canonical browse**; redirect/merge `/recipes` rails |
| 7 | **“AI generator” trust gap** | Firefighters hate BS | Rebrand: “Hall Matcher” / “Pick from hall-tested meals” |
| 8 | **No payment path** | Monetization readiness stuck at 4/10 | Stripe + one paid SKU (Hall Pro) even at $1 pilot — learn WTP |
| 9 | **Social proof vacuum** | Anonymous = replaceable | 5 real halls with names, photos, quotes (permissioned) |
| 10 | **North Star not instrumented** | Flying blind | Dashboard: halls with ≥1 activity per shift week, 4-week cohort |

## P1 — High leverage

| # | Issue | Impact |
|---|-------|--------|
| 11 | Generator first-run simplification | Crew size + protein + Go; advanced filters collapsed |
| 12 | Wheel tied to hall | “Station Wheel” uses hall favorites + history |
| 13 | Shared shopping list (Hall Pro) | Vote winner → one list for grocery runner |
| 14 | Shift reminder emails | Day-before shift: “Pick dinner” (requires shift day in profile) |
| 15 | PWA install prompt at hall join | Station iPad / personal phone install after first vote |
| 16 | Explore mobile: food before filters | Collapse filters; show 6 cards immediately |
| 17 | Pricing page rewrite | Outcome-based copy for canteen manager, not feature list |
| 18 | Facebook group playbook | 20 groups, weekly value post template |
| 19 | QR hall kit | Printable fridge sticker + vote QR PDF |
| 20 | Kill new recipe expansion | Freeze catalog at ~450 published; fix distribution |

## P2 — Polish (only after P0/P1)

| # | Issue |
|---|-------|
| 21 | FAQ collapse on homepage → link to `/faq` |
| 22 | Admin analytics role separation |
| 23 | Card aspect ratio consistency on Explore |
| 24 | Voice advance in Cook Mode |
| 25 | Hall badges / gamification |
| 26 | More npm audit scripts (stop adding) |

**Do not build:** new catalog silos, AI generation, more SEO pages, admin tooling depth, smoothie/breakfast expansion unless a paying canteen asks.

---

# PART 3 — BUSINESS MODEL REVIEW

## Current structure

| Tier | Price today | Reality |
|------|-------------|---------|
| **Guest** | Free | Generator, wheel, browse — correct free wedge |
| **Personal** | “Free during preview” | Sync, history, calendar, shift reminders |
| **Hall Pro** | “Coming soon” | Shared hall features, analytics, supplies (mostly flags) |

## Is this the right structure?

**Mostly yes — with one change.**

- **Guest:** Keep generous. Firefighters won’t pay to *try* dinner ideas.  
- **Personal:** **Merge into Guest for core sync** OR price at **$3–5/mo** only if you add personal meal calendar + grocery export that saves real time.  
- **Hall Pro:** **This is the business.** Price per hall, not per firefighter.

### Should Personal exist?

**As a paid tier: weak.** Firefighters don’t pay for recipe apps individually — data says subscription fatigue is brutal in niche verticals.

**As a free account tier: yes.** Rename mentally to **“Firefighter Account”** (free sync, saves, history). Upsell to Hall Pro when they join a crew.

**Paid Personal only if:** grocery list → store integration or meal calendar saves 30+ min/week. Otherwise it’s a conversion step, not a SKU.

### Should Hall Pro target halls/canteens vs departments?

**Target: individual hall / station / shift unit — NOT whole fire departments.**

Why:
- Department procurement = 6–18 month sales cycle, union politics, IT review.  
- **Captain + cook + canteen manager** can adopt in one shift with a QR code.  
- Volunteer stations and single-station career houses buy with a credit card or slush fund.

**Buyer hierarchy (best → worst):**
1. **Canteen manager / hall cook** (owns food budget, pain daily)  
2. **Shift captain / acting officer** (owns morale, can mandate vote link)  
3. **Senior FF who “always cooks”** (champion)  
4. **Individual firefighter** (Personal — low WTP)  
5. **Fire chief / department** (enterprise — year 2+ only)

### What should be free forever?

- Pick Tonight’s Meal (generator)  
- Classics Wheel (limited pool)  
- Browse / read recipes  
- Hall Vote (create + vote) — **viral loop must be free**  
- Basic save (device) — account sync free with sign-in  

### What should be paid?

| Hall Pro feature | Why they’ll pay |
|------------------|-----------------|
| Shared hall history + favorites | “What did we make last Tuesday?” |
| Vote history + meal calendar | Canteen planning |
| Shared shopping lists | Grocery runner export |
| Hall supplies checklist | Canteen restock (future) |
| Shift reminders to whole hall | Reduces “what’s for dinner?” texts |
| Hall analytics (meals/month, top meals) | Captain reporting, morale proof |
| Custom hall badge / page | Pride — cheap but sticky |

### Realistic price points (US/Canada)

| SKU | Price | Notes |
|-----|-------|-------|
| **Hall Pro** | **$12–19/mo per hall** or **$149–199/yr** | Less than one pizza run; canteen slush fund viable |
| **Hall Pro (volunteer)** | **$8/mo** or **$79/yr** | Volunteer stations are price-sensitive |
| **Personal (if kept paid)** | **$4/mo** max | Only with calendar + export; otherwise free |
| **Physical: Hall Meal Cards deck** | **$24.99** | 50 cards, QR to recipes — L&S Co. fulfillment |
| **Sponsorship** | **$500–2k/mo** | Single brand (Traeger, Costco Business, Gordon Food Service) — “Station BBQ Week” |

### What firefighters will NOT pay for

- “More recipes” (Google exists)  
- “AI meal ideas” (ChatGPT exists)  
- Generic nutrition tracking  
- Another subscription without crew benefit  
- Department-wide software without captain approval  

### What they MIGHT pay for

- **Less arguing about dinner**  
- **One grocery list the whole shift agrees on**  
- **Looking organized for the captain**  
- **Canteen budget justification** (“we used it 18 shifts this month”)  
- **Physical products** (cards, posters, aprons) with pride  

---

# PART 4 — HALL / CANTEEN STRATEGY

## Segment analysis

| Segment | Adopt speed | WTP | Champion | Verdict |
|---------|-------------|-----|----------|---------|
| Individual hall / bay kitchen | **Days** | Medium | Shift cook | **Primary wedge** |
| Shift (A/B/C) | Days | Low-Med | Captain | **Best for Vote loop** |
| Canteen manager | Days–weeks | **Highest** | Self | **Best payer** |
| Whole station | Weeks | Med | Union rep / captain | Secondary |
| Full department | Months | High (budget) | Chief | Year 2 enterprise |

## Recommended GTM

**Best buyer:** Canteen manager or designated hall cook with slush fund access  
**Best user:** Whole shift (4–12 people voting)  
**Best champion:** Captain who sends the vote link before grocery run  
**Best pricing path:** 14-day Hall Pro trial → $149/yr “Station License”  
**Best onboarding path:**

```
QR on fridge → Hall Vote tonight → 
“Save this hall” (create/join) → 
Dashboard shows tonight’s winner → 
Shared shopping list → 
PWA install prompt → 
Week 2: shift reminder email
```

## Do NOT lead with

- Department sales  
- “AI platform”  
- Recipe count  
- SEO blog posts in the hall  

## DO lead with

- “Stop arguing about dinner.”  
- Scan → vote → cook → one list.  
- Photo of a real hall kitchen with QR visible.  

---

# PART 5 — RETENTION STRATEGY

## North Star Metric

**Halls using Firehall Meals every shift for 4 weeks**

Operational definition:
- **Hall** = `hall_id` with ≥3 members OR ≥5 meals logged  
- **Active shift week** = ≥1 of: `meal_generated`, `wheel_spin`, `hall_vote_submitted`, `meal_cooked`  
- **4-week retained hall** = active in week 1 AND weeks 2, 3, 4  

Supporting metrics:
| Metric | Event(s) | Target (90-day) |
|--------|----------|-----------------|
| Hall created | `hall_created` | 100 |
| Hall activated (week 1) | ≥1 activity in 7 days | 60% of created |
| Hall 4-week retained | cohort | **40%** |
| Vote → cook conversion | vote winner → `meal_cooked` within 48h | 30% |
| PWA install rate | `pwa_installed` / hall members | 25% |
| Hall Pro trial → paid | billing | 15% |

## Retention loops (priority order)

### 1. Hall Vote loop (weekly)
- Captain creates vote → crew votes → winner auto-opens recipe + list  
- **Track:** `hall_vote_started`, `hall_vote_submitted`, `hall_vote_shared`  

### 2. Hall Dashboard habit (weekly)
- “This month: 8 meals, top: chili, streak: 3 weeks”  
- **Track:** `hall_dashboard_viewed`, `hall_meal_repeated`  

### 3. Wheel + streak (2–4x/month)
- Station Wheel from hall favorites  
- **Track:** `wheel_spin`, `wheel_streak_updated`, `wheel_streak_broken`  

### 4. Cook Mode completion (per meal)
- Finish cooking → log to hall history  
- **Track:** `meal_cooked`, `cook_mode_completed` (add)  

### 5. Shift reminders (email)
- User sets shift day → email day before: “Pick tonight or send a vote”  
- **Track:** `shift_reminder_sent`, `shift_reminder_clicked` (add)  

### 6. Shared shopping list (Hall Pro)
- Persistent hall list across votes/meals  
- **Track:** `shared_shopping_list_updated` (add)  

### 7. Hall Supplies (future Hall Pro)
- Canteen restock checklist tied to meal plan  
- **Track:** `hall_supplies_viewed` (add)  

### 8. PWA install
- Prompt after first successful vote or cook  
- **Track:** `pwa_prompt_shown`, `pwa_installed`  

## What NOT to optimize for

- Daily active users (wrong cadence — **shift cadence**)  
- Pageviews  
- New recipe count  
- Email list size without hall activation  

---

# PART 6 — MOBILE UX AUDIT (Safari-first)

**Device reality:** Personal iPhone on couch + station iPad + Android secondary. Safari + PWA.

| Surface | Grade | Feels cheap / broken | Exact fixes |
|---------|-------|----------------------|-------------|
| **Homepage** | B+ | Featured rails still duplicate Explore; social proof generic | Hero: 2 CTAs only (`/generate`, `/vote`). One meal rail. Link FAQ don’t embed. |
| **Explore** | C- | Filters before food; 3 `<select>` stacks | Default: 6 cards, filters collapsed “Refine”. Sticky sort chip row only. |
| **Recipe pages** | B- | Long scroll; cook mode below fold | Sticky bottom bar: Start Cooking · Shopping List · Save. Ingredients accordion default closed on mobile. |
| **Cook Mode** | B | Modal not full-screen ritual; no timer hooks | Full-screen takeover, 20px+ step text, swipe steps, keep-awake, “Log cooked” at end. |
| **Hall Dashboard** | B | Information dense; locked states feel like paywall ghost | Guest: show blurred preview + “Join hall”. Card priority: Tonight → Vote → History → Favorites. |
| **Wheel** | A- | Pool size | Full-screen spin; post-spin: “Cook this” + “Add to vote” |
| **Hall Vote** | B+ | Create flow multi-step | 3-tap create: name options → share link → done. Native share sheet first. |
| **Generator** | B+ | Filter panel wall | Progressive disclosure: chips visible, “More filters” collapsed. Show selected category chip prominently. |
| **Plans / pricing** | C | Feature laundry list; “coming soon” kills trust | One comparison table; anchor Hall Pro; testimonial from real hall; remove “preview” language when Stripe live. |

### Mobile performance targets

- LCP < 2.5s on `/` and `/generate` (4G)  
- No layout shift on hero image  
- Generator result < 500ms perceived (already good — market it)  

### 3-second comprehension test

User lands on `/` → must read: **“Pick crew dinner tonight”** and see **[Pick Meal] [Vote Crew]**.  
**Current:** close but Explore/Browse ambiguity remains.

---

# PART 7 — GROWTH PLAN

## First 10 halls (manual, 30 days)

**Profile:** Your network, adjacent stations, friends of friends.

| Tactic | Asset | Script |
|--------|-------|--------|
| Cook live at one station | Phone + generator | “Let’s pick tonight in 10 seconds” — don’t pitch app, solve dinner |
| Hall Vote in group text | `/vote` link | “Vote by 5pm — link closes when I leave for Costco” |
| Fridge QR | PDF sticker | “Can’t decide? Scan → vote” |
| Instagram story | 15s wheel spin | “Shift night solved” — tag station if permitted |
| Follow-up | Text captain | “Want the vote link every shift?” → hall create |

**Success:** 10 halls, 3+ members each, 2+ votes in 30 days.

## First 50 halls (60 days)

| Channel | Campaign |
|---------|----------|
| Facebook groups (5/week) | Value post: “Free vote link for crew dinner — no app download” + screenshot |
| Reddit r/Firefighting | Only answer “what to cook for crew” threads with vote link demo |
| Fire academy probie guide | PDF “First 10 station meals” → QR to generator |
| Micro-influencers (5) | Send Hall Meal Cards + custom hall page |
| Podcast (1–2) | “Feeding the crew” story — not product demo |
| L&S Co. email | One cross-promo to buyers |

**Asset kit:** Vote OG image, 3 screenshots, 60s screen recording, captain one-pager PDF.

## First 100 halls (90 days)

- Repeat what worked in 50  
- **Case study page:** 3 named halls  
- Lightweight referral: “Invite 4 crew → unlock Station Wheel customization”  
- Regional FB group focus (2 provinces/states deep, not national spray)  

## First 500 halls (6–12 months)

- SEO conversion optimization (hall create CTA on top landing pages)  
- Canteen manager outbound (50 DMs with free 90-day Pro)  
- Conference QR (FDIC / regional expo)  
- Sponsored “BBQ Week” with Traeger or similar  
- Firefighter-owned brand co-marketing (5 partners)  

**Reality check:** 500 halls × ~8 members = 4,000 firefighters touched. That’s a business. 500 pageviews is not.

---

# PART 8 — PRODUCT ROADMAP

## 30 days — Fix + focus

| Do | Stop |
|----|------|
| Hall onboarding after sign-in | New recipes |
| Hall Vote as homepage co-hero | New audit scripts |
| Cook Mode sticky + full-screen mobile | SEO page sprawl |
| Explore: cards before filters | AI marketing language |
| Instrument North Star dashboard | Feature flags without UX |
| 10-hall pilot program | Personal tier paid launch |
| 5 real hall testimonials | |

**Test:** Vote-only onboarding vs generator-first — which retains 4 weeks?

## 60 days — Hall Pro validation

| Build | Validate |
|-------|----------|
| Shared shopping list (MVP) | 3 canteen managers use weekly |
| Vote history on dashboard | Captains view ≥2x/month |
| Stripe Hall Pro ($149/yr pilot) | 5 paying halls |
| Shift reminder emails (day-before) | 25% open rate |
| QR hall kit (PDF) | 50 downloads |
| Merge browse paths → Explore canonical | Bounce rate down 10% |

## 90 days — Monetization + scale

| Build | Validate |
|-------|----------|
| Hall supplies checklist (beta) | 2 canteens feedback |
| Station Wheel from hall favorites | Spins +20% |
| Referral / invite flow polish | 1.5 invites/hall |
| Physical meal cards (L&S) | 100 decks sold |
| Sponsorship deck | 1 LOI signed |
| 100 halls total | 40% 4-week retention |

---

# PART 9 — IMPLEMENTATION PLAN (Cursor Prompts)

Each sprint: goal, files, acceptance criteria, analytics, commands.

---

### Sprint 1 — Mobile homepage clarity

**Goal:** 3-second comprehension; two primary actions.

**Files:** `client/src/pages/home.tsx`, `client/src/components/home/*`, `client/src/lib/brand-copy.ts`, `client/src/components/site-header.tsx`

**Acceptance criteria:**
- Mobile hero ≤50dvh with “Pick crew dinner tonight” + subline
- Exactly 2 primary CTAs: `/generate`, `/vote`
- Max 1 meal rail on mobile
- FAQ links to `/faq`, not accordion

**Analytics:** `homepage_cta_click` with `{ cta: "pick_meal" | "vote" }`

**Commands:** `npm run check && npm run build`

**Prompt:**
```
Mobile homepage clarity sprint. Reduce mobile homepage to: compact hero (≤50dvh), plain subline explaining generator in one sentence, two CTAs (Pick Tonight's Meal → /generate, Vote the Crew → /vote), How It Works (3 steps), one Hall Favorites rail, trust row (single line). Remove duplicate CTAs and collapse FAQ to link. Update site-header mobile nav to prioritize Generate, Vote, Hall, Explore. Do not add new content sections. Run check and build.
```

---

### Sprint 2 — Category filter accuracy (DONE — maintain)

**Goal:** 0 out-of-category generator results.

**Files:** `shared/firehall-categories.ts`, `server/generation/*`, `scripts/audit-generator-categories.ts`

**Acceptance criteria:** `npm run audit:generator-categories` → 225/225 pass

**Analytics:** `meal_generation_started`, `meal_generated` include `meal_category`, `matched_category`, `category_broadened`

**Commands:** `npm run audit:generator-categories && npm run test:generator-stress && npm run check`

---

### Sprint 3 — Hall Pro onboarding

**Goal:** New signed-in user → create or join hall within 2 minutes.

**Files:** `client/src/pages/hall-join-page.tsx`, `client/src/pages/hall-page.tsx`, `client/src/components/hall-membership/*`, auth flow

**Acceptance criteria:**
- Post-sign-in modal/sheet: Create Hall | Join with code | Skip once
- Skip shows persistent “Join hall” on dashboard
- Create hall → invite link copy → share sheet

**Analytics:** `hall_onboarding_shown`, `hall_onboarding_completed`, `hall_created`, `hall_joined`

**Commands:** `npm run test:hall-membership && npm run check`

**Prompt:**
```
Hall onboarding sprint. After first sign-in, show onboarding sheet: Create Hall (name, crew size default), Join Hall (invite code), Skip for now (once per account). Completing create generates invite link with native share. Persist reminder banner on /hall until user joins or creates. Track hall_onboarding_* analytics. Permission gates unchanged. Tests for create/join/skip flows.
```

---

### Sprint 4 — Shared hall features (Hall Pro MVP)

**Goal:** Vote winner → shared shopping list visible to hall members.

**Files:** `server/hall-*`, `client/src/lib/shopping-list.ts`, `client/src/pages/vote.tsx`, billing gates

**Acceptance criteria:**
- Hall Pro gate shared list; free hall sees preview
- Vote close → “Add ingredients to hall list”
- List persists per `hall_id` via cloud sync API

**Analytics:** `shared_shopping_list_opened`, `shared_shopping_list_item_added`, `shared_shopping_list_exported`

**Commands:** `npm run test:cloud-sync && npm run test:hall-membership && npm run check`

---

### Sprint 5 — Canteen manager workflow

**Goal:** Canteen manager can plan week from vote history.

**Files:** `client/src/components/hall-dashboard/v2/*`, `client/src/pages/hall-history-page.tsx`

**Acceptance criteria:**
- Dashboard card: “This week’s meals” (vote + generated)
- Export week shopping list PDF
- “Repeat last shift meal” one tap

**Analytics:** `hall_week_plan_viewed`, `hall_grocery_export`, `hall_meal_repeated`

---

### Sprint 6 — Pricing page optimization

**Goal:** Convert hall captains — outcome copy, real price, social proof.

**Files:** `client/src/pages/plans-page.tsx`, `client/src/components/billing/plan-card.tsx`, `shared/billing/types.ts`

**Acceptance criteria:**
- Hero: “Feed your crew without the group chat argument”
- Hall Pro anchored at $149/yr; 3 bullet outcomes not 15 features
- One testimonial block (real hall)
- CTA: Start 14-day trial (Stripe when ready)

**Analytics:** `plan_viewed`, `plan_selected`, `checkout_started` (add)

---

### Sprint 7 — Cook Mode improvement

**Goal:** Default stove experience on all catalog recipe pages.

**Files:** `client/src/components/cook-mode/*`, `client/src/pages/golden-recipe-page.tsx`, `client/src/pages/catalog-recipe-page.tsx`, `client/src/pages/explore-recipe-detail-page.tsx`

**Acceptance criteria:**
- Sticky bottom bar on mobile: Start Cooking
- Full-screen cook mode, swipe steps, 18px+ text
- End screen: “Mark as cooked” → hall history

**Analytics:** `cook_mode_started`, `cook_mode_step_viewed`, `cook_mode_completed`, `meal_cooked`

**Prompt:**
```
Cook Mode sprint. Add sticky mobile action bar to all catalog recipe pages (golden, explore detail, catalog). Start Cooking opens full-screen cook mode with swipeable steps, large type, optional keep-awake hint. On complete, prompt Mark as Cooked logging to hall history (if authenticated). Track cook_mode_* events. Do not change recipe content.
```

---

### Sprint 8 — Hall Vote viral loop

**Goal:** Vote share → new hall creation.

**Files:** `client/src/pages/vote.tsx`, OG meta, `client/src/components/home/home-hall-vote.tsx`

**Acceptance criteria:**
- OG image: “Vote for tonight’s hall dinner”
- Post-vote: share link + QR
- Guest voter prompt: “Save this hall’s votes — join hall”

**Analytics:** `hall_vote_shared`, `hall_vote_guest_join_prompt`, `hall_joined_from_vote`

---

### Sprint 9 — Social proof system

**Goal:** Real halls visible on homepage and pricing.

**Files:** `client/src/components/home/home-social-proof.tsx`, new `shared/testimonials/halls.ts`, optional `/halls` showcase

**Acceptance criteria:**
- 5 permissioned hall quotes with station name + state/province
- Photo optional; fallback to hall badge
- Admin script to add testimonial without redeploy (JSON ok)

**Analytics:** `testimonial_viewed`, `testimonial_cta_click`

---

### Sprint 10 — Growth dashboard

**Goal:** North Star visible in admin.

**Files:** `client/src/pages/admin-analytics.tsx`, `server/analytics/*`, new SQL aggregations

**Acceptance criteria:**
- Cards: halls created, 4-week retained %, votes/week, meals/week
- Cohort table: week 0 → week 4
- Filter by date range

**Analytics:** internal only

**Commands:** `npm run validate-analytics && npm run check`

**Prompt:**
```
Growth dashboard sprint. Extend admin analytics with North Star metrics: active halls per week, 4-week retention cohort, hall_vote count, meal_generated count, hall_pro trials. Use existing SQLite analytics tables. No new external services. Read-only dashboard.
```

---

# PART 10 — FINAL CEO RECOMMENDATION

## If this were my company, I would do next (this week)

1. **Call 10 hall cooks I know.** Not email — call. Offer to run vote link tonight.  
2. **Ship hall onboarding prompt** (Sprint 3).  
3. **Rewrite homepage mobile** to Generator + Vote only (Sprint 1).  
4. **Instrument North Star dashboard** (Sprint 10).  
5. **Collect 5 hall testimonials** with photos — even iPhone kitchen shots.  

## What I would stop doing

- Adding recipes beyond maintenance  
- New npm audit scripts  
- “AI” marketing  
- SEO page expansion  
- Building Personal tier as paid product  
- Department-wide enterprise sales (for now)  
- Perfecting internal catalog QA that users can’t see  

## What I would build (90-day)

1. Hall ritual loop: Vote → recipe → shared list → history  
2. Hall Pro with Stripe ($149/yr)  
3. Cook Mode as default mobile recipe UX  
4. Shift reminder emails  
5. QR hall kit for physical kitchens  

## What I would ignore (for now)

- Instacart integration  
- AI custom generation  
- Nutrition tracking app comparisons  
- Smoothie/breakfast silo expansion  
- Native iOS/Android apps (PWA is enough)  
- Venture fundraising narrative until 40% 4-week hall retention  

## Fastest path to 90/100

**Product score formula:**  
50% = **4-week hall retention** (ritual proof)  
25% = **mobile clarity + cook mode** (stove trust)  
15% = **monetization live** (even 10 paying halls)  
10% = **social proof** (real names)  

Not more features. **More halls using the same features every shift.**

## Fastest path to paying users

1. **Canteen manager pilot:** 14-day Hall Pro free → $149/yr  
2. **Physical meal cards** on L&S Co. ($24.99, impulse buy)  
3. **One sponsor** for BBQ Week content pack ($500–2k)  

Consumer Personal subscription is the **slowest** path. Hall Pro + physical is the **fastest**.

## Biggest risk

**Building in isolation** — shipping Hall Dashboard V2 while zero halls use it weekly. You become a beautiful product no crew depends on.

Secondary risk: **ChatGPT** for “dinner for 8 firefighters chicken 45 min.” Your counter is **trust, portions, vote, and hall memory** — not generation.

## Single most important next step

**Get one hall to use Hall Vote + Generator every shift for 4 weeks.**  
Document it. Film it. Name them. Everything else follows.

---

# PRIORITIZED ACTION LIST

| Priority | Action | Owner | Week |
|----------|--------|-------|------|
| 1 | 10-hall manual pilot + weekly check-in | CEO/Founder | 1–4 |
| 2 | North Star analytics dashboard | Eng | 1–2 |
| 3 | Mobile homepage: Pick + Vote only | Eng/Design | 2 |
| 4 | Post-sign-in hall onboarding | Eng | 2–3 |
| 5 | Cook Mode sticky + full-screen | Eng | 3 |
| 6 | 5 hall testimonials on site | Growth | 3–4 |
| 7 | Hall Vote OG + share polish | Eng | 3 |
| 8 | Shared shopping list MVP (Hall Pro) | Eng | 4–6 |
| 9 | Stripe Hall Pro $149/yr pilot | Eng | 6–8 |
| 10 | QR hall kit PDF | Growth | 4 |
| 11 | Explore: food before filters | Eng | 5 |
| 12 | Shift reminder email (day-before) | Eng | 6–7 |
| 13 | Kill “AI” external copy | Marketing | 2 |
| 14 | Freeze recipe count | Content | 1 |
| 15 | Facebook group playbook (20 groups) | Growth | 4–12 |

---

# SCORE TRAJECTORY

| Milestone | Expected score |
|-----------|----------------|
| Today | **68** |
| 10 halls, onboarding shipped, homepage fixed | **74** |
| 40% 4-week retention, Cook Mode default | **80** |
| Hall Pro paid + shared lists + testimonials | **85** |
| 100 halls, 40% retention, $5k MRR | **90** |

---

**The goal is not more features. The goal is more halls using Firehall Meals every shift.**

*End of audit.*
