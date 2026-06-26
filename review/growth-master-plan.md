# Firehall Meals — Growth Master Plan

**Date:** June 25, 2026  
**Role:** Chief Growth Officer  
**Assumption:** Product is launch-ready (91/100 readiness per product polish sprint).  
**North Star:** A hall uses Firehall Meals on **every shift night for 4 consecutive weeks**.  
**Constraint:** **No paid advertising until 100 retained halls.**

**Retained hall definition (use everywhere):** ≥3 active members, ≥2 hall activities in week 1 (vote, meal cooked, or shopping list update), ≥5 members return in week 2, captain confirms intent to keep using.

---

## CGO thesis (60 seconds)

Firehall Meals will not win on Google alone. You already have a **393-URL SEO engine** — that is demand capture, not demand creation in a fire hall kitchen.

Halls adopt tools the way Slack and Calendly spread: **one captain installs it where the crew already gathers**, the first ritual succeeds in one shift, and the product makes the captain look good.

Your unfair advantage is not recipes. It is **Tonight → Vote → Shopping List → Cook Mode** in one PWA, with **QR invite already built** (`HallInvitePanel`: link, QR, 6-char code).

The entire growth plan is: **get a QR on the fridge, run one vote tonight, close the loop before anyone goes home.**

Paid ads before 100 halls would buy traffic into a funnel that still lacks Stripe, case studies, and proven 4-week retention. That burns cash and teaches nothing.

---

# STEP 1 — Hall Acquisition

## Fastest path by milestone

| Milestone | Timeline | Halls | Active members | Weekly hall activities |
|-----------|----------|-------|----------------|------------------------|
| **10 halls** | Weeks 1–4 | 10 | 40+ | 25+ |
| **25 halls** | Weeks 5–8 | 25 | 120+ | 75+ |
| **50 halls** | Weeks 9–12 | 50 | 250+ | 175+ |
| **100 halls** | Weeks 13–18 | 100 | 500+ | 400+ |

## Department-type strategy

### Career departments (target first for case studies)

**Profile:** 8–24 members per shift, formal captain/lieutenant, canteen manager or union meal budget, slower to adopt but sticky once embedded.

**Why first:** One career hall case study unlocks 10 volunteer halls. Captains talk across battalions.

**Outreach (exact):**

1. **Direct captain DMs** — Identify 30 career departments within 2-hour drive or in your network. Message template: *"I'm a firefighter who built a free hall dinner app — vote on tonight's meal from your phone, shared grocery list for the crew. Can I send a fridge QR poster? Takes 5 minutes to set up."*
2. **State / provincial fire associations** — Email association newsletter editors (Ontario, BC, Texas, Florida, etc.): offer **free Founding Hall kit** + 15-minute demo for their member bulletin.
3. **Union locals / IAFF locals** — Pitch as **canteen budget tool**, not "another app." Lead with Hall Vote + shared shopping list.
4. **Regional training officers** — Offer to run a **15-minute "Hall Dinner in 2026"** lunch-and-learn at drill night; demo live vote on projector.

**Conversion target:** 3 career halls in weeks 1–2 → publish case study by week 4.

### Volunteer departments (target for volume)

**Profile:** 15–40 members, Facebook-heavy, captain = whoever shows up, decisions in GroupMe/iMessage.

**Why second:** Faster yes, lower friction, but higher churn without fridge ritual.

**Outreach (exact):**

1. **Facebook groups** — Post in "Volunteer Firefighters [State/Region]" groups (search: volunteer firefighter, VFD, rural fire). Post format: photo of meal + *"We built a free tool for hall dinner — crew votes on phones, winner goes on the shopping list. Who wants the fridge QR PDF?"* (Not a link dump — ask for DMs.)
2. **VFD forums / Firehouse.com forums** — One helpful thread per week: "How we stopped the 'what's for dinner' argument" with vote screenshot.
3. **Mutual aid clusters** — When one VFD in a county adopts, personally visit the 3 neighboring stations with printed QR kit (see Step 6).
4. **County fire chiefs meetings** — Ask for 5 minutes on agenda: "Free crew meal tool — no IT install."

**Conversion target:** 7 volunteer halls weeks 2–4 via Facebook + neighbor effect.

### Combination departments (target for Hall Pro revenue)

**Profile:** Mix of career and volunteer staffing; often have real canteen budget and part-time canteen manager.

**Why third for revenue:** Best Hall Pro fit (shopping list + protein deals + canteen staples).

**Outreach (exact):**

1. **Canteen manager first** — Not captain. Message: *"Track coffee, paper towels, and tonight's grocery run in one place."*
2. **Combo dept lists from state fire marshal directories** — Filter departments with "combination" designation; cold email canteen contact if listed.
3. **Retailer co-marketing** — Local grocery manager knows combo dept canteen managers; ask for intro (see Step 7 bundle).

**Conversion target:** 2 of first 10 halls on Hall Pro trial by week 8.

## Week-by-week acquisition cadence (first 10 halls)

| Week | Goal | Actions |
|------|------|---------|
| 1 | 2 halls live | Founder installs 2 personal-network halls; runs live vote on drill night |
| 2 | 5 halls | 3 career outreach + 2 Facebook group posts; ship QR PDF to every yes |
| 3 | 8 halls | First case study draft; 5 neighbor-station visits with printed kit |
| 4 | 10 halls | Retention check; drop halls with 0 week-2 activity; backfill from waitlist |

---

# STEP 2 — Referral Loops

**Design principle:** Every loop must work **without the captain remembering to share.** The product prompts; the physical kit reminds.

## Primary loop: Fridge QR → Vote → Join (built today)

```
Captain prints QR → /hall/join or /tonight
    → Crew votes or browses tonight
    → "Join [Hall Name]" on welcome screen
    → Member lands on /tonight
    → Captain gets credit (analytics: hall_invite_accepted)
```

**Growth action:** Default QR destination = **`/hall/join?join_code=XXXX`** for new halls, **`/tonight`** for established halls. Document in captain guide.

## Secondary loops (product surfaces already exist)

| Loop | Mechanism | Growth lever |
|------|-----------|--------------|
| **Hall Vote share** | `/vote/:voteId` link in modal | Captain texts GroupMe: "Vote by 5pm" — non-members can vote; join CTA on results |
| **Shopping list runner** | Shared list visible to all members | Runner texts crew: "Need milk, eggs, chicken — list is in the app" |
| **Recipe share** | `/recipes/:slug` SEO URLs | Crew member texts recipe to family/friend at another hall |
| **Cook Mode completion** | Meal logged to hall history | "We made X last Tuesday" — social proof inside hall |
| **Invite panel** | Link / QR / 6-char code | Captain regenerates QR each month; old links still work via join_code |
| **Hall join code** | Permanent 6-char code on settings | Printed on fridge sticker — works forever |

## Tertiary loops (physical + social — build in Step 6)

| Loop | Asset | Viral coefficient target |
|------|-------|--------------------------|
| **Fridge poster** | QR + "Scan to vote on dinner" | 0.3 new members per active hall per month |
| **Kitchen table card** | Laminated Tonight shortcuts | Reduces captain re-training |
| **Mutual aid vote** | Cross-hall vote for training night | 1 new hall per 5 votes |
| **Founding Hall badge** | "Founding Hall #7" on hall dashboard | Status → referral ask at day 30 |
| **Sticker pack** | Helmet sticker QR to /wheel | Junior members discover product |
| **Training academy kit** | Instructor slides + demo vote | 20 recruits → 5 halls in 2 years |

## Referral reward (no cash until scale)

**Founding Hall Program (Step 5):** Refer another hall that hits retention criteria → both halls get **6 months Hall Pro free** (when Stripe live) + Founding badge. Track manually in spreadsheet until referral codes exist.

**Rule:** Every active hall should invite another hall by **day 30**. Captain email on day 21: *"Know another hall still arguing about dinner? Forward this QR kit."*

---

# STEP 3 — Hall Onboarding

## Current flow (audited against codebase)

| Step | Route | Time (est.) | Friction |
|------|-------|-------------|----------|
| Scan QR / open link | `/hall/join?token\|code\|join_code` | 10s | Low — preview skeleton exists |
| Sign in (magic link) | Auth modal | 60–90s | **Medium** — invite URL can be lost post-auth |
| Join hall | `JoinHallForm` | 20s | Low |
| Welcome | `/hall/welcome` | 30s | Low |
| Tonight onboarding | `/tonight?onboarding=1` | 30s | Low |
| **First vote** | Tonight → Start Vote modal | 45s | Low |
| **First meal** | Generator or recipe → Cook Mode | 3–5 min | Medium — requires recipe pick |
| **First shopping list** | Hall Pro gate if not enabled | N/A | **High** — Pro blocks without captain action |

## Time to first value (TTFV)

| Persona | Fastest path to "wow" | Current TTFV | Target TTFV |
|---------|----------------------|--------------|-------------|
| **Crew member (joiner)** | Vote on active vote | ~2 min | **< 90 sec** |
| **Captain (creator)** | Create hall → start vote → 3 votes | ~8 min | **< 5 min** |
| **Guest** | Spin wheel → see meal | ~1 min | Already there |

## Can it happen in under 3 minutes?

**Yes, for joiners during an active vote** — if captain starts vote before crew scans QR.

**No, for captains creating a hall end-to-end** — create hall still routes through `/account?create_hall=1`; first vote + 3 crew joins exceeds 3 minutes.

## Onboarding improvements (growth-only — no new features unless adoption-critical)

| Priority | Change | Type | Impact |
|----------|--------|------|--------|
| **P0** | Captain playbook: **"Start vote BEFORE sharing QR"** | Process / PDF | Cuts TTFV 50% |
| **P0** | QR kit points to **active vote URL** when vote is open | Kit copy | Instant value |
| **P1** | Preserve invite URL through magic-link return | Product (1 fix) | Stops #1 drop-off |
| **P1** | Join-only path skips captain invite steps | Product (exists partially) | Faster joiners |
| **P2** | Inline create-hall on `/hall/join` | Product | Saves 2 clicks |
| **P2** | Auto-enable Hall Pro trial on hall create (founding cohort) | Ops | Unlocks shopping list day 1 |

## Recommended first-shift ritual (captain script)

1. **5:00 PM** — Captain opens `/tonight`, taps **Start Vote**, picks 3 meals (2 min).
2. **5:05 PM** — Captain texts GroupMe: vote link from modal (30 sec).
3. **5:15 PM** — Crew votes; captain shares join code for stragglers (ongoing).
4. **5:30 PM** — Winner announced; captain taps **Continue Cooking** or opens recipe (1 min).
5. **After meal** — Captain adds ingredients to shopping list if Pro enabled (3 min).

**Total captain effort:** ~10 minutes once. **Crew effort:** ~30 seconds each.

---

# STEP 4 — Landing Pages

## Current state

| Page | URL | Audience | CTA today | Gap |
|------|-----|----------|-----------|-----|
| Homepage | `/` | Everyone | Pick Tonight / Wheel; Tonight if signed in | SEO blocks hidden mobile |
| Tonight | `/tonight` | Members | Operational hub | Not in main nav for guests |
| Plans | `/plans` | Captains | View plans / hall settings | No price anchor |
| Guides | `/guides` | SEO | Browse recipes | No hall CTA above fold |
| SEO landings (×7) | `/firefighter-meals`, etc. | Google | Explore recipes | **No "Start a hall vote" CTA** |
| Hall join | `/hall/join` | Invited crew | Join form | No captain landing variant |
| Red Lead | `/firefighter-red-lead-recipe` | Lead magnet | PDF download | Email only — no hall path |

## Landing pages to create (content-only — use existing `SeoLandingPage` pattern)

| Page | URL (proposed) | Audience | Hero message | Primary CTA |
|------|----------------|----------|--------------|-------------|
| **For Firefighters** | `/for-firefighters` | Crew | "Vote on dinner. Cook together. Stop the argument." | Join hall / Spin wheel |
| **For Captains** | `/for-captains` | Officers | "Run tonight's meal in 5 minutes — free for your hall." | Create hall + download QR kit |
| **For Canteen Managers** | `/for-canteen-managers` | Canteen | "One shopping list. One staples board. One less headache." | Hall Pro trial |
| **Volunteer Halls** | `/volunteer-fire-departments` | VFD | "Built for halls where everyone cooks — and everyone has an opinion." | Get fridge QR |
| **Training Academies** | `/fire-academy-meals` | Instructors | "Teach crew meals before they hit the floor." | Academy kit PDF |
| **Founding Halls** | `/founding-halls` | Early adopters | "Join the first 100 halls. Free Pro. Name on the wall." | Apply form (Typeform) |

## Homepage / SEO CTA hierarchy (no rebuild — copy + placement)

1. **Primary:** "Run tonight's vote" → `/tonight` or vote modal on home Hall Vote section  
2. **Secondary:** "Join your hall" → `/hall/join`  
3. **Tertiary:** "Browse recipes" → `/explore`  
4. **Footer only:** Pizza, guides deep links  

## Trust gaps to close on all captain-facing pages

- Named hall testimonial (even one: "Station 4, [City]")
- Photo of real fridge QR (not mockup)
- "Firefighter-owned" + Lights & Sirens bridge (already in footer)
- "Free for crews — Hall Pro optional for canteen tools"

---

# STEP 5 — Founding Hall Program

## Firehall Meals Founding Hall Program

**Goal:** Acquire **100 halls without paid ads** through status, support, and referral incentives.

### Requirements (to apply)

- Career, volunteer, or combination department in US or Canada
- Captain or canteen manager commits to **4-week pilot**
- ≥8 members willing to join hall in app
- Willing to provide **one photo** of fridge QR + one quote
- Agree to **refer one other hall** within 60 days if experience is positive

### Benefits

| Benefit | Detail |
|---------|--------|
| **Founding Hall badge** | "Founding Hall #[N]" on hall dashboard (manual until badge ships) |
| **Hall Pro free** | 6 months full Pro (shopping, canteen, history, deals) — honor system until Stripe |
| **White-glove onboarding** | 20-minute Zoom with founder; live vote setup |
| **Physical kit** | Fridge poster + 10 kitchen cards + sticker sheet (mailed) |
| **Priority support** | Direct text line to founder for 90 days |
| **Name on website** | Listed on `/founding-halls` (with permission) |

### Rewards for retention

| Milestone | Reward |
|-----------|--------|
| Week 1: ≥3 activities | Founding badge unlocked |
| Week 4: retained | Extended Pro to 12 months |
| Referral converts | Both halls +3 months Pro |
| Case study published | $100 grocery gift card to canteen |

### Pricing (founding cohort)

- **Hall Pro founding price:** **$19/mo per hall** (locked for life) — vs. public $29/mo at launch  
- **Annual:** $190/yr (2 months free)  
- **No Personal tier charge** — keep Personal free forever (it's a sync SKU, not revenue)  
- **Lifetime (hall #1–10 only):** $499 one-time — max 10 sold; funds kit printing  

### Referral incentive

**"Bring another hall to dinner"** — When a referred hall completes week-2 retention, referring captain receives:

1. +3 months Hall Pro  
2. Featured in monthly "Halls Helping Halls" email  
3. Entry into annual gear raffle (fire gloves, etc. — partner with Lights & Sirens Co.)

### Recognition

- Monthly LinkedIn post: "Founding Hall spotlight"  
- Instagram story takeover by one hall per month  
- Physical certificate mailed at week 4 (printable PDF until then)

---

# STEP 6 — Marketing Assets

## Asset list (build order)

### Week 1 — Must ship

| # | Asset | Format | Destination URL |
|---|-------|--------|-----------------|
| 1 | **Fridge QR poster** | 8.5×11 PDF, print-ready | `/hall/join?join_code=` or `/tonight` |
| 2 | **Kitchen table card** | 4×6 laminated card art | `/tonight` shortcuts |
| 3 | **Captain onboarding guide** | 2-page PDF | Step-by-step first vote |
| 4 | **Captain cold email** | Copy-paste template | Link to `/for-captains` |
| 5 | **Launch email** | Mailchimp/Klaviyo to existing list | Vote demo video GIF |

### Week 2–4

| # | Asset | Format |
|---|-------|--------|
| 6 | **Hall Vote screenshot kit** | 3 PNGs for GroupMe/Facebook |
| 7 | **Sticker sheet** | Avery template, QR to `/wheel` |
| 8 | **Founding Hall application** | Typeform → spreadsheet |
| 9 | **60-second demo video** | Screen record: vote → winner → cook |
| 10 | **Case study template** | Google Doc → web page |

### Social strategy (organic only)

**Instagram (3×/week)**

- Mon: Meal hero photo + "Tonight's winner at [Hall]"  
- Wed: Cook Mode reel (15 sec step flip)  
- Fri: Founding Hall spotlight or vote poll in Stories  

**Facebook (2×/week in groups + 1 page post)**

- Target volunteer firefighter groups with **helpful** posts, not links  
- Page: Share case studies + kit offer  

**LinkedIn (1×/week)**

- Founder story: "Why I built this for my hall"  
- Tag fire service leaders; comment on association posts  

**Trade shows (months 2–3)**

| Event type | Booth hook | Lead capture |
|------------|------------|--------------|
| State fire conference | Live vote on big screen | QR to founding program |
| County chiefs meeting | Free QR kit stack | Email signup |
| Fire academy open house | Spin wheel on tablet | Recruit hall join |

**Budget:** Print kits ~$3/hall × 100 = $300. Travel local only until 25 halls.

---

# STEP 7 — Business Model

## Current state

- **Guest / Personal:** Free (generator, wheel, browse, sync)  
- **Hall Pro:** "Coming soon" — 4 real features: shared shopping lists, hall history, canteen management, protein deals  
- **No Stripe** — cannot charge; preview mode only  

## CGO recommendations

### Pricing

| Tier | Price | Rationale |
|------|-------|-----------|
| **Guest** | Free forever | Top of funnel — never paywall generator |
| **Personal** | Free forever | Sync is habit glue; don't nickel-and-dime firefighters |
| **Hall Pro** | **$29/mo per hall** at public launch | Less than one pizza; canteen budget line item |
| **Founding Hall Pro** | **$19/mo locked** | Reward early adopters; create urgency |
| **Hall Pro Annual** | **$290/yr** | Default for career/combo depts (easier procurement) |

### Packaging (do not change)

Four features is correct. Do **not** add calendar, badges, or reports until 100 halls. Sell what works:

> "One grocery run. One staples board. One meal log. One deals board."

### Free tier

Keep generous. **Gate only hall-coordination features** behind Pro. Never gate voting or recipe browse.

### Trial

- **30-day Hall Pro trial** auto-starts when hall is created (founding cohort)  
- Day 7 email: "Your crew used shopping list X times"  
- Day 25 email: "Lock founding price before trial ends"  

### Lifetime

- **$499 lifetime** — only first 10 halls, publicly numbered  
- Creates evangelists; funds kit printing  

### Bundle opportunities

| Partner | Bundle | Revenue |
|---------|--------|---------|
| **Local grocery** | "Hall Pro + weekly flyer deals" | Sponsor pays $50/mo for logo on protein deals |
| **Lights & Sirens Co.** | Meal cards deck + 3mo Pro | Physical product fulfillment |
| **Training academy** | Curriculum license $199/yr | B2B wedge |
| **Insurance / wellness** | White-label hall nutrition report | Enterprise later |

**Action today:** Pick **one** grocery store near your first pilot hall; ask manager for canteen manager intro.

---

# STEP 8 — 90-Day Launch Plan

## Metrics dashboard (weekly)

| Metric | W1 target | W12 target |
|--------|-----------|------------|
| Halls created | 5 | 50 |
| Retained halls (4-wk) | 0 | 15 |
| Active members | 25 | 250 |
| Votes per week | 10 | 100 |
| Meals cooked (logged) | 20 | 200 |
| Hall Pro trials | 2 | 30 |
| Referral halls | 0 | 10 |
| SEO → hall join conversion | baseline | +20% |

---

## Week-by-week

### Weeks 1–2: Install rhythm

| Function | Actions |
|----------|---------|
| **Product** | Ship invite-URL preservation fix if not done; founding trial enabled manually |
| **Marketing** | Fridge QR PDF + captain guide live; founding program page |
| **Sales** | Founder calls 20 captains; 2 live drill-night installs |
| **CS** | Personal onboarding for first 5 halls; daily check-in text |
| **Support** | Founder phone; FAQ doc from top 10 questions |
| **Metrics** | Track hall_invite_sent, vote count, week-2 return manually |

### Weeks 3–4: First 10 halls

| Function | Actions |
|----------|---------|
| **Product** | Stripe MVP for Hall Pro only (if not live) |
| **Marketing** | Case study #1 published; Facebook group posts (3) |
| **Sales** | Neighbor station visits with printed kits |
| **CS** | Week-2 retention calls; drop inactive halls |
| **Support** | Response SLA < 4 hours |
| **Metrics** | 10 halls, 40 members, 3 retained |

### Weeks 5–6: Referral ignition

| Function | Actions |
|----------|---------|
| **Product** | Founding badge on dashboard (manual label OK) |
| **Marketing** | Instagram reels; LinkedIn founder story |
| **Sales** | State association newsletter pitch |
| **CS** | Day-21 referral ask email to captains |
| **Support** | Captain office hours (weekly Zoom) |
| **Metrics** | 25 halls, first referral loop completes |

### Weeks 7–8: Scale playbook

| Function | Actions |
|----------|---------|
| **Product** | `/for-captains` landing live |
| **Marketing** | Academy outreach (5 instructors) |
| **Sales** | Combo dept canteen manager track |
| **CS** | Playbook recorded video replaces live onboarding |
| **Support** | Community FAQ from hall captains |
| **Metrics** | 25 retained halls minimum |

### Weeks 9–10: Conference push

| Function | Actions |
|----------|---------|
| **Product** | Protein deals: one real retailer pilot (CSV OK) |
| **Marketing** | Trade show booth or attendance |
| **Sales** | 10 hall applications from conference |
| **CS** | Batch onboarding sessions |
| **Support** | Print kit mail fulfillment |
| **Metrics** | 40 halls |

### Weeks 11–12: Revenue proof

| Function | Actions |
|----------|---------|
| **Product** | Annual billing option |
| **Marketing** | "50 halls" press release to fire media |
| **Sales** | Founding price deadline campaign |
| **CS** | NPS survey to retained halls |
| **Support** | Document top 20 support issues |
| **Metrics** | 50 halls, first paying customers |

### Weeks 13–18: Path to 100

| Function | Actions |
|----------|---------|
| **Product** | Referral tracking code (if manual breaks) |
| **Marketing** | SEO landing pages get hall CTAs (copy only) |
| **Sales** | Ambassador captains in 3 states |
| **CS** | Automated week-1 / week-4 emails |
| **Support** | Part-time firefighter CS hire (stipend) |
| **Metrics** | **100 halls, 15+ paying, 10+ 4-week retained** |

---

# FINAL DELIVERABLES

## Top 50 growth opportunities

1. Fridge QR poster at every hall  
2. Captain starts vote before sharing invite  
3. Founding Hall Program with locked pricing  
4. Case study #1 with named department  
5. Facebook volunteer firefighter group posts  
6. Neighbor station kit drops (county clusters)  
7. State fire association newsletter feature  
8. `/for-captains` landing page  
9. Hall Vote in GroupMe as weekly ritual  
10. 30-day Hall Pro trial on create  
11. Referral reward: +3 months Pro  
12. Canteen manager outreach track  
13. Training academy instructor kit  
14. Instagram Cook Mode reels  
15. LinkedIn founder narrative  
16. Live vote at drill night demo  
17. Mutual aid cross-hall vote event  
18. Grocery store intro for protein deals  
19. Lights & Sirens cross-promo to meal buyers  
20. Red Lead PDF → hall join email sequence  
21. SEO landing pages → hall vote CTA  
22. Guides → "Run this meal at your hall" CTA  
23. Wheel as junior member entry (stickers)  
24. Shopping list runner texts crew  
25. Recipe share to other halls  
26. Founding Hall badge (status)  
27. Captain day-21 referral email  
28. Week-4 retention call script  
29. County fire chiefs agenda slot  
30. IAFF local lunch-and-learn  
31. VFD forum helpful threads  
32. 60-second demo GIF in outreach  
33. Kitchen table laminated cards  
34. Sticker sheet QR to `/wheel`  
35. Trade show live vote booth  
36. Annual billing for career depts  
37. $19 founding price urgency  
38. Lifetime deal for first 10 halls  
39. Grocery sponsor on protein deals  
40. Academy B2B curriculum license  
41. Preserve invite URL through auth (drop-off fix)  
42. Join-only onboarding shortcut  
43. `/tonight` as QR default for active halls  
44. Hall join code on physical poster  
45. Captain office hours Zoom  
46. "Halls Helping Halls" monthly email  
47. Gear raffle for referrals  
48. Press release at 50 halls  
49. Ambassador captain program (3 states)  
50. Automated founding hall application funnel  

## Top 20 acquisition channels

1. Captain direct outreach (warm network)  
2. Facebook volunteer firefighter groups  
3. Fridge QR in-station (physical)  
4. GroupMe / iMessage vote links  
5. State fire association newsletters  
6. County mutual aid neighbor visits  
7. Firehouse.com / forums  
8. Instagram organic reels  
9. LinkedIn founder posts  
10. Training academy instructors  
11. IAFF / union local meetings  
12. SEO recipe pages (long-tail)  
13. Guides content (top 10 only)  
14. Red Lead lead magnet email  
15. Trade show / conference booth  
16. Grocery store canteen manager intro  
17. Lights & Sirens customer list  
18. Podcast guest (fire service)  
19. Local news "firefighter builds app"  
20. Referrals from Founding Halls  

## Top 20 retention improvements

1. Weekly vote ritual (same day each shift)  
2. Captain week-2 check-in call  
3. Shopping list as closing task after cook  
4. Canteen low-stock alerts habit  
5. Cook Mode completion logging  
6. Hall history "what we ate" review  
7. Streak visibility on hall dashboard  
8. Shift reminder notifications (existing feature)  
9. Founding badge progress  
10. Day-7 "your crew stats" email  
11. Day-30 referral prompt  
12. Seasonal vote themes (BBQ week)  
13. Mutual aid meal challenges  
14. Captain delegation to canteen manager  
15. Pro trial before paywall frustration  
16. Onboarding → Tonight in 3 steps  
17. Post-vote winner auto-pinned on hall  
18. GroupMe bot message template (manual)  
19. Month-1 NPS + fix top complaint  
20. Drop halls with 0 activity week 2 (focus energy)  

## Top 20 referral ideas

1. Founding Hall refer-a-hall Pro extension  
2. Fridge QR with hall join code  
3. Vote link shared to neighboring hall  
4. "Copy invite" in captain weekly script  
5. Mutual aid dinner vote challenge  
6. Sticker QR on helmets  
7. Kitchen card left at training  
8. Academy graduate takes app to first hall  
9. Case study reader → founding application  
10. Grocery bag insert QR (partner)  
11. Lights & Sirens order insert  
12. Captain certificate display → questions  
13. Instagram tag @firehallmeals  
14. Facebook "we use this" crew photo  
15. County chiefs demo to peer chiefs  
16. Instructor demo to other academies  
17. Lifetime hall evangelist speaking  
18. Protein deal share to nearby station  
19. Recipe link texted to friend at other dept  
20. Founding Hall leaderboard public page  

## Top 20 marketing assets to build

1. Fridge QR poster PDF  
2. Kitchen table card  
3. Captain onboarding guide (2-page)  
4. Captain cold email template  
5. Launch email to existing subscribers  
6. Founding Hall application form  
7. `/for-captains` landing page copy  
8. `/for-canteen-managers` landing page copy  
9. `/volunteer-fire-departments` landing page copy  
10. `/founding-halls` public list page  
11. 60-second demo video  
12. Case study #1 web page  
13. Hall Vote screenshot kit (3 images)  
14. Sticker sheet printable  
15. Founding Hall certificate PDF  
16. Trade show booth banner art  
17. Academy instructor slide deck  
18. Instagram story templates (5)  
19. GroupMe message templates (vote, join, shop)  
20. Monthly "Halls Helping Halls" email template  

---

## Roadmap to halls (summary)

| Target | Week | Channel mix | Key proof |
|--------|------|-------------|-----------|
| **10 halls** | 4 | 60% warm outreach, 30% Facebook, 10% SEO | 1 case study, 3 retained |
| **25 halls** | 8 | 40% referral, 35% outreach, 25% social | Referral loop works once |
| **50 halls** | 12 | 35% referral, 30% conference, 20% social, 15% SEO | First paying halls |
| **100 halls** | 18 | 40% referral, 25% ambassadors, 20% SEO, 15% events | 15+ paying, 10+ 4-week retained |

---

## If Firehall Meals fails: five most likely reasons — and what to do today

### 1. No hall ever gets past "nice recipe app"

**Failure mode:** Traffic uses generator once; nobody creates a hall; you remain a media site.

**Prevent today:**

- Call **3 captains** and install fridge QR yourself this week.  
- Make first ritual **vote, not browse**.  
- Measure **halls with ≥2 activities in week 1**, not page views.

### 2. Captains can't get crew to install another app

**Failure mode:** Captain loves it; 2 of 15 join; vote dies.

**Prevent today:**

- Script: vote works in **mobile browser, no install**; join takes **one code**.  
- Start vote in **GroupMe** where crew already lives.  
- Print QR where phones already go — **the fridge**.

### 3. Hall Pro has no price, so no commitment

**Failure mode:** Free forever → no captain ownership → churn at week 3.

**Prevent today:**

- Enable **30-day Pro trial** manually for founding halls (flip in admin).  
- Set public founding price **$19/mo** on `/plans` copy even before Stripe.  
- Book **5 founding hall calls** — verbal commit beats anonymous signup.

### 4. SEO succeeds but hall product starves

**Failure mode:** 10,000 monthly visitors; 0 halls retained.

**Prevent today:**

- Add **"Start a hall vote"** CTA to top 3 SEO landing pages (copy only).  
- **Freeze new guide production** until 10 halls retained.  
- Redirect content team energy to **case study + captain landing**.

### 5. Single-player usage — no crew coordination habit

**Failure mode:** Individuals cook recipes; shopping list and vote unused; no network effect.

**Prevent today:**

- Captain playbook mandates **shared vote every shift night** for 4 weeks.  
- Track **votes per hall per week** as primary metric, not recipes generated.  
- Drop halls with **zero votes in week 2** — reassign founder time to new installs.

---

## CGO sign-off

**Launch-ready:** Yes.  
**Distribution-ready:** Only after first 10 fridges have QR and one published case study.  
**Next 48 hours:** Print QR kit → install 2 halls → run live vote → photograph fridge → send captain email to 20 departments.

**No paid ads until 100 retained halls.** Earn the right to spend by proving: **captains invite their entire crew when dinner is on the line.**
