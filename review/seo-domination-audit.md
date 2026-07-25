# Firehall Meals — SEO Domination Audit

**Role:** Enterprise SEO / topical authority strategy  
**Site:** https://www.firehallmeals.com  
**Audit date:** July 17, 2026  
**Method:** Live SERP sampling (Google-indexed web results), codebase technical review, prior SEO docs, competitor landscape  
**North star:** Undisputed organic authority for firefighter meal planning — not generic recipe SEO

---

## Executive verdict

Firehall Meals is **already competitive on brand and primary-head terms** in a way most early-stage niche sites are not. Live SERP sampling shows the homepage frequently ranking **#1 for `firefighter meals`**, **#1 for `firehall meals`**, and **#1 for `firefighter dinner ideas`**.

That is not the same as “SEO is done.”

| Reality | Implication |
|---------|-------------|
| Strong #1 / top-3 presence on several head terms | Defend and deepen; do not rewrite the homepage into keyword soup |
| Institutional PDFs (FRESH / IAFF wellness, county fire books) still dominate `firefighter recipes` and `fire station meals` | Authority + citation problem, not a content-volume problem |
| Generic giants (Taste of Home, AllRecipes) win cultural / listicle SERPs | Do not compete head-on; own firefighter-modified long-tail |
| Technical foundation is strong (393 URLs, Recipe/FAQ/Org schema) | Gaps are packaging, link graph, off-page, and one live critical: **sitemap.xml returns HTTP 500** |
| App/product SEO is drifting away from catalog SEO | Homepage meta split (static HTML vs runtime title) confuses crawlers |

**Honest 12-month #1 probability for `firefighter meals`:** see final section — **55–65% to hold or reclaim durable #1**, assuming execution. Not 90%. Not 20%.

---

## Scorecard (0–100)

| Dimension | Score | Rationale |
|-----------|------:|-----------|
| **Technical SEO** | **72** | Clean robots, canonicals, schema builders; live sitemap 500 is a P0; SPA meta injection risk |
| **Content** | **78** | 300+ recipes, 58 guides, 8 landings — deepest niche catalog online |
| **EEAT** | **68** | Real firefighter brand (Lights & Sirens); thin public founder proof vs institutional PDFs |
| **Topical Authority** | **74** | Strong coverage; missing `/firehouse-meals`, `/crew-meals`, `/firefighter-dinner-ideas` pillars |
| **Internal Linking** | **62** | Home→pillars good; recipe→recipe good; **recipe→guide/pillar missing** |
| **Schema** | **80** | Org, WebSite+SearchAction, Recipe, Article, FAQ, Breadcrumb — no HowTo/Review/AggregateRating |
| **Performance / CWV** | **55** | No fresh Lighthouse rows in-repo; SPA + large JS bundles are a risk |
| **Mobile SEO** | **70** | Mobile-first UX exists; crawl/index of app shells (`/me`, `/hall`) not locked down |
| **Backlinks** | **35** | Young domain; weak vs .gov/.org PDFs and national media |
| **Overall SEO** | **68** | Niche leader on-page; authority and off-page still immature |

---

# Phase 1 — Search Visibility

## How to read these rankings

Positions are from **live SERP sampling on July 17, 2026** (Google-indexed web results via search tools). They are **snapshots**, not GSC averages. Bing/DuckDuckGo typically mirror Google for this niche but weight brand/PDF less consistently — treat Bing/DDG as **±2 positions** of Google unless noted.

Volume / difficulty are **directional estimates** for a North American niche (not paid Keyword Planner exports). Firefighter meal queries are **low-to-mid volume, high intent**.

### Primary keyword table

| Keyword | Est. pos. | Indexed page (ours) | Intent | Est. monthly vol. | KD | CTR opportunity | Who beats us (or sits near) |
|---------|----------:|---------------------|--------|------------------:|---:|-----------------|-----------------------------|
| **firefighter meals** | **1** | `/` | Hub + catalog + tool | 800–1,500 | Med | High if title stays keyword-clear | Brand already owns; risk = meta drift to “Meal App” |
| **firefighter meal ideas** | 1–3 | `/` or `/firefighter-meals` | Inspiration list | 200–500 | Med | High — expand listicle depth | Thin competition |
| **firefighter recipes** | **4** | `/` | Recipe discovery | 600–1,200 | Med-High | Medium — PDFs steal clicks | FRESH cookbook PDF, Montgomery Co. PDF, CalCas article |
| **firefighter dinner ideas** | **1** | `/` | Listicle / stuck crew | 300–700 | Med | High | Own it with dedicated pillar |
| **firehall meals** | **1** | `/` | Brand + Canadian phrasing | 200–600 | Low-Med | High brand CTR | Lights & Sirens Shopify page, YouTube “Firehall Meals” |
| **fire hall meals** | 1–2 | `/` | Same as above | 100–300 | Low | High | Same |
| **firehouse meals** | 2–5 | `/` (no dedicated URL) | Cultural classics | 400–900 | Med | **Critical gap** | FRESH PDFs, news features, `/firehouse-recipes` only |
| **meals for firefighters** | 1–3 | `/firefighter-meals` | Planning | 200–500 | Med | High | Landing exists |
| **meals for the fire hall** | 1–5 | `/` / guides | Operational | 50–150 | Low | Medium | Sparse SERP — easy win |
| **meals for the fire station** | 2–6 | `/fire-station-meals` | Operational | 100–250 | Low-Med | Medium | Landing thin vs PDFs |
| **fire station meals** | **5** | `/fire-station-meals` | Operational hub | 400–800 | Med | High if pillar deepened | FRESH PDF, Firerescuetm kitchen post, HeraldNet feature |
| **firehouse dinner ideas** | 2–6 | `/` / guides | Inspiration | 100–250 | Low-Med | Medium | Need dedicated URL |
| **station dinner ideas** | 3–10 | guides | Inspiration | 50–150 | Low | Medium | Under-served |
| **crew meals** | Not owned | scattered copy | Group cooking | 200–500* | Med | High if `/crew-meals` | Ambiguous intent (also military/sports) |
| **meals for 8 firefighters** | 2–5 | overlapping guides | Portion math | 50–150 | Low | High | Cannibalized guides |
| **meals for 10 firefighters** | **4** | guides | Portion math | 80–200 | Low | High | FRESH tables, USFireDept, Arlington PDF |

\*“crew meals” has mixed intent — filter to firefighter modifiers in copy and title.

### If not ranking (or ranking behind PDFs) — why

1. **Institutional EEAT** — `.gov` / `.org` wellness PDFs (First Responder Center FRESH book, county fire recipe books) carry trust Google still prefers for “healthy firefighter recipes.”
2. **Missing exact-match pillars** — `firehouse meals`, `crew meals`, `firefighter dinner ideas` lack dedicated URLs.
3. **Guide cannibalization** — three near-duplicate “cooking for 10” guides dilute one clear winner.
4. **Backlink gap** — competitors are cited by departments and insurers; Firehall Meals is a young commercial domain.
5. **Homepage title drift** — runtime title emphasizes “Meal App”; static HTML emphasizes “Firefighter Meals & Firehall Recipes.” Crawlers that sample pre-JS HTML vs post-hydrate can see different signals.
6. **Live sitemap failure** — `https://www.firehallmeals.com/sitemap.xml` returned **HTTP 500** during this audit (static `client/public/sitemap.xml` has 393 URLs). Discovery and recrawl suffer until fixed.

### Additional keyword opportunities

| Opportunity cluster | Example queries | Priority |
|---------------------|-----------------|----------|
| Decision tools | hall vote dinner, firehouse dinner wheel, what’s for dinner fire station | P0 |
| Budget / kitty | fire station grocery budget, Costco firehouse shopping, cheap firehall meals | P0 |
| Equipment | dutch oven fire station, crockpot firehouse meals, one oven firehall | P1 |
| Shift ops | meals that hold when tones drop, cook between calls fire station | P0 |
| Breakfast heritage | firefighter red lead recipe, firehall breakfast burrito bar | P0 (moat) |
| Health tension | healthy firehouse meals guys will eat, firefighter heart healthy station food | P1 |
| Local / career | firefighter meal prep academy, probationary firefighter cooking | P2 |
| Video intent | firehall meals youtube, station chef recipes | P1 (YouTube SEO) |

---

# Phase 2 — Competitor Analysis

| Competitor | Type | Why Google picks them | Content gap vs us | Authority gap | EEAT gap | Schema gap |
|------------|------|----------------------|-------------------|---------------|----------|------------|
| **FRESH / First Responder Center PDF** | Institutional cookbook | `.org` trust, health framing, dietitian byline | Static PDF, not interactive, no crew scaling tool | Huge | RD credentials | N/A (PDF) |
| **County / municipal fire recipe PDFs** | Gov wellness | `.gov` trust | Same | Huge | Official wellness programs | N/A |
| **USFireDept.com** | Fire media + diet article | Domain topicality + practical cost tables | Thin recipe depth | Medium | Editorial brand | Weak |
| **Taste of Home** | National recipe media | Domain Authority, firefighter-approved listicle | Zero crew scaling | Huge DA | Celebrity/editor EEAT | Strong Recipe |
| **LA Times / HeraldNet features** | News | Freshness + local E-E-A-T | One-off stories | News DA | Journalist + named FF | Article |
| **Fire Dept. Meals** | Meal delivery | Brand confusion + firefighter-owned | Different intent (delivery vs cook) | Growing | Strong founder story | Weak for recipes |
| **MyStationChef / Station Chef** | App / video creators | Community + video | Thin indexable web | Social, not web | Face-to-camera trust | Weak web |
| **YouTube “Firehall Meals” creators** | Video | Video carousels | We don’t own video SERP | Platform | Personality | — |
| **Reddit / Facebook groups** | UGC | “People also ask” / forum answers | We don’t appear as cited answers | Community | Lived experience | — |
| **Firerescuetm** | Station kitchen blog | Kitchen setup queries | Meal depth weak | Niche | Operational | Blog |

### Why Google currently chooses competitors instead (when it does)

- **Trust hierarchy:** For health-adjacent queries, institutional PDFs outrank commercial recipe apps.
- **Exact match + freshness:** News features and Taste of Home listicles win “firefighter-approved recipes” cultural queries.
- **Entity clarity:** “Fire Dept. Meals” (delivery) and “Firehall Meals” (recipes/app) can confuse brand entity — reinforce disambiguation in About + schema `sameAs`.
- **Multimedia:** Video carousels steal CTR even when we rank #1 organic.

### Our unfair advantages (defend these)

1. Largest **indexable** firefighter recipe catalog with **crew scaling**
2. Interactive tools (generator, wheel, hall vote) competitors cannot put in a PDF
3. Structured data already better than most niche competitors
4. Canadian “firehall” language ownership + North American “firehouse/station” coverage

---

# Phase 3 — Technical SEO

## What works

| Area | Status |
|------|--------|
| Robots.txt | Allow `/`; Disallow `/admin`, `/api/`, `/vote/`; Sitemap declared |
| Canonical origin | `https://www.firehallmeals.com` (www) |
| Static sitemap inventory | **393 URLs** (home, hubs, 8 landings, 58 guides, ~246 recipes, breakfast, smoothies) |
| Schema builders | Organization, WebSite+SearchAction, CollectionPage, FAQPage, BreadcrumbList, Recipe, Article |
| Landing pages | 7 keyword landings + red lead heritage page |
| Recipe image ALT pattern | Firefighter/crew-aware ALT helpers |

## Critical / high issues

| Priority | Issue | Impact | Fix |
|----------|-------|--------|-----|
| **P0** | Live `/sitemap.xml` returns **HTTP 500** | Blocks efficient discovery/recrawl | Fix `server/seo/sitemap.ts` / route handler; verify production immediately |
| **P0** | Homepage meta split: `client/index.html` title = “Firefighter Meals & Firehall Recipes”; runtime `SEO_DEFAULT_TITLE` = “Firefighter Meal App…” | Mixed ranking signals; CTR risk | Sync static HTML to keyword-first title; keep conversion H1 |
| **P1** | Client-only SEO (`useEffect` head mutation) | Social bots / partial crawlers weaker | Prerender critical templates or SSR for `/`, landings, recipes, guides |
| **P1** | `/me`, `/hall`, `/tonight` crawlable | Thin/app chrome may index | `noindex` or Disallow authenticated shells |
| **P1** | Recipe pages lack Organization + guide links in JSON-LD / body | Weaker entity + topical signals | Add `InternalLinkHub` to golden recipes |
| **P2** | No HowTo / Review / AggregateRating schema | Missed rich result types | Add where ratings exist |
| **P2** | Guide cannibalization (large-crew + breakfast clusters) | Diluted rankings | Merge + 301 |
| **P2** | Lighthouse SEO summary empty in-repo | No CWV evidence | Re-run production Lighthouse; track LCP/CLS |
| **P2** | `useHomeSeo(300)` hardcodes count | Trust/accuracy | Pass live catalog total |
| **P3** | SearchAction → `/explore?q=` | Confirm param works | Wire or point to working search |

## Schema coverage (summary)

| Page type | Org | WebSite | FAQ | Breadcrumb | Recipe/Article |
|-----------|:---:|:-------:|:---:|:----------:|:--------------:|
| Home | ✓ | ✓ | ✓ | ✓ | Collection |
| SEO landings | ✓ | ✓ | ✓ | ✓ | — |
| `/recipes/:slug` | — | — | — | ✓ | Recipe |
| Breakfast / smoothies | — | — | — | ✓ | Recipe |
| Guides | — | — | ✓* | ✓ | Article |

\*when FAQs present

## Performance notes

- Bundle size warnings (>500KB main chunk) from production builds increase **LCP risk** on mobile.
- Hero images recently fixed for crop UX — ensure `fetchpriority` + sized images remain for LCP.
- Recommend: production CWV baseline in GSC + monthly Lighthouse CI.

---

# Phase 4 — Topical Authority

## Current coverage map

| Topic | Status | Evidence |
|-------|--------|----------|
| Firefighter meals | Strong | Home + `/firefighter-meals` + catalog |
| Fire station meals | Medium | Landing + ops guides — thin depth |
| Cooking at the fire hall | Medium | Guides (station_cooking cluster thin count) |
| Feeding a crew | Medium | Overlapping large-crew guides |
| Firefighter nutrition | Strong | 15 nutrition guides |
| Shift meals | Medium | Quick-shift guides + generator |
| Canteen management | Weak (product > SEO) | App feature; little public content |
| Cooking for 8–12 | Medium | Cannibalized guides |

## Recommended architecture

### Pillars (create or elevate)

| Pillar URL | Target keyword | Role |
|------------|----------------|------|
| `/firefighter-meals` | firefighter meals | Existing — deepen |
| `/fire-station-meals` | fire station meals | Existing — deepen ops |
| `/firehouse-meals` | **firehouse meals** | **CREATE** |
| `/firefighter-dinner-ideas` | firefighter dinner ideas | **CREATE** |
| `/crew-meals` | crew meals (firefighter) | **CREATE** |
| `/firefighter-recipes` | firefighter recipes | Existing |
| `/healthy-firefighter-meals` | healthy firefighter meals | Existing |
| `/firefighter-breakfast-recipes` | breakfast | Existing |
| `/guides/topic/firefighter-nutrition` | nutrition hub | Elevate |

### Cluster strategy

```
Pillar
  ├─ Cornerstone guide (2,000–3,500 words)
  ├─ Supporting guides (800–1,500)
  ├─ 8–20 recipe links (crew-scaled)
  ├─ FAQ block (FAQPage schema)
  └─ Tool CTA (generator / wheel / vote)
```

### Internal linking rules

1. Every recipe → 1 pillar + 1 related guide + 2–3 recipes  
2. Every guide → pillar + 3 recipes + 2 guides  
3. Every pillar → sibling pillars + hub tools  
4. Kill orphan recipes (none in sitemap without inbound from category/pillar)

---

# Phase 5 — EEAT

| Signal | Current | Gap | Recommendation |
|--------|---------|-----|----------------|
| **Experience** | “Built by firefighters / Lights & Sirens” | Thin bio, few named shift stories | Founder page with hall background, photos, “how we test recipes” |
| **Expertise** | Practical kitchen ops strong | No RD partnership for health claims | Partner RD for nutrition cluster; clear medical disclaimer |
| **Authority** | Growing catalog | Few .gov/.org citations | Guest resources, academy linkables, press kit |
| **Trust** | HTTPS, clear brand, schema Org | Brand confusion with Fire Dept. Meals | About disambiguation; `sameAs` social; contact; privacy |

### Questions answered

- **Does the site clearly communicate it is built by real firefighters?** Partially — tagline yes; proof thin vs FRESH’s named dietitian + IAFF framing.  
- **Does every guide show first-hand experience?** Mixed — some kitchen-table voice; many still “SEO guide” tone.  
- **Does Google have enough trust signals?** Not yet for health queries. Enough for commercial “meal ideas” queries where we already rank #1.

---

# Phase 6 — Homepage

## Current targeting

| Signal | Current |
|--------|---------|
| Static title | Firefighter Meals & Firehall Recipes ✓ |
| Runtime title | Firefighter Meal App — Pick Dinner… ✗ (product-first) |
| Visible H1 | Conversion (“End the What’s for Dinner debate”) — OK |
| Body SEO | Strong keyword coverage in intro/editorial/FAQ |

## Assessment

Homepage **already naturally targets** firefighter meals / firehall recipes / fire station meals in body copy without classic stuffing. The risk is **product-title drift** that softens the #1 SERP snippet.

## Recommended rewrite (meta only — keep conversion H1)

**Title (≤60):**  
`Firefighter Meals & Firehall Recipes | Firehall Meals`

**Meta description (≤155):**  
`Crew-sized firefighter meals for the fire hall and fire station. 300+ shift-tested recipes, dinner ideas for 8–12, and tools to end the what’s-for-dinner debate.`

**Do not** keyword-stuff the hero H1. Keep conversion. Put keywords in title, description, first screen supporting paragraph, and FAQ.

---

# Phase 7 — Recipe Pages

## Template strengths

- Unique title/description builders  
- Recipe + Breadcrumb JSON-LD  
- Crew scaling content (unique vs AllRecipes)  
- Firefighter-aware image ALT  
- Related recipe clusters  

## Why most individual recipes do not rank for head terms

Head terms resolve to **hubs**, not single recipes. Recipes should rank for:

- `{dish} firehall` / `{dish} firehouse`  
- `{dish} for a crowd` / `{dish} feeds 10`  
- Long-tail “firefighter {dish}”

## Template gaps

| Gap | Fix |
|-----|-----|
| No link to pillar/guide | Add InternalLinkHub |
| Thin intro (steps-only feel) | 120–200 word operational intro |
| No AggregateRating in schema where ratings exist | Wire crew ratings → schema |
| Breakfast path inconsistency | Ensure breakfast recipes stay linked from breakfast pillar |
| Hero CLS / crop | Recently fixed — monitor LCP |

## Success metric for recipes

Own **long-tail dish + firefighter modifier** SERPs; feed PageRank up to pillars via internal links.

---

# Phase 8 — Content Roadmap (Top 25)

Priority scoring: Business value × traffic × winnability.

| # | Page | Target keyword | Intent | Biz value | Est. traffic /mo | Diff. | Internal links | Priority |
|---|------|----------------|--------|-----------|-----------------:|-------|----------------|----------|
| 1 | Fix live sitemap + meta sync | — | Technical | Critical | — | — | — | **P0** |
| 2 | `/firehouse-meals` | firehouse meals | Hub | High | 300–700 | Med | recipes, classics, BBQ | **P0** |
| 3 | `/firefighter-dinner-ideas` | firefighter dinner ideas | Listicle hub | High | 250–600 | Med | 25/50/100 guides | **P0** |
| 4 | Deepen `/fire-station-meals` | fire station meals | Ops hub | High | 300–600 | Med | kitty, tones-drop | **P0** |
| 5 | `/crew-meals` | crew meals firefighter | Planning | High | 150–400 | Med | vote, generator | **P0** |
| 6 | Merge large-crew guides → 1 pillar | meals for 10 firefighters | Portion | High | 100–250 | Low | all recipes big-crew | **P0** |
| 7 | `/hall-vote` SEO landing | hall vote dinner | Tool | High | 50–200 | Low | tonight, vote | **P0** |
| 8 | Cornerstone: tones drop cooking | cook when tones drop | Ops | High | 80–200 | Low | quick meals | **P0** |
| 9 | Fire station grocery / kitty guide | fire station grocery budget | Ops | High | 100–300 | Low | protein deals | **P0** |
| 10 | Elevate Red Lead + PR | firefighter red lead | Heritage | High | 50–150 | Low | breakfast pillar | **P0** |
| 11 | 100 firefighter dinner ideas | 100 firefighter dinner ideas | Listicle | Med-High | 200–500 | Med | dinner-ideas pillar | **P1** |
| 12 | Cheap firehall meals pillar | cheap firehall meals | Budget | High | 100–250 | Low | deals | **P1** |
| 13 | Crockpot / dutch oven cluster | crockpot firehouse meals | Equipment | Med | 100–250 | Low | recipes | **P1** |
| 14 | Healthy meals guys will eat | healthy firehouse meals | Health | High | 150–350 | Med | nutrition | **P1** |
| 15 | Rookie first cook guide (elevate) | first time cooking firehouse | Anxiety | Med | 80–200 | Low | classics | **P1** |
| 16 | Breakfast burrito bar guide | firehall breakfast bar | Breakfast | Med | 50–150 | Low | breakfast | **P1** |
| 17 | Protein deals SEO hub | firefighter grocery deals | Commerce | High | 50–150 | Low | hall product | **P1** |
| 18 | Compare: cook vs meal delivery | fire dept meals vs cooking | Disambig | Med | 50–100 | Low | about | **P1** |
| 19 | Station kitchen essentials | fire station kitchen setup | Ops | Med | 100–250 | Med | Firerescuetm overlap | **P1** |
| 20 | BBQ night at the station (elevate) | firehouse BBQ night | Event | Med | 80–200 | Low | BBQ landing | **P1** |
| 21 | Canadian firehall cooking guide | firehall meals Canada | Geo | Med | 50–120 | Low | brand | **P2** |
| 22 | IAFF / wellness complementary hub | firefighter nutrition program | Authority | Med | 50–150 | High | cite FRESH respectfully | **P2** |
| 23 | Video landing / embeds hub | firehall meals youtube | Video | Med | — | — | YouTube SEO | **P2** |
| 24 | Local “cooking for the department” | cooking for fire department | Occasional | Low-Med | 50–100 | Low | catering-style | **P2** |
| 25 | Glossary: firehall vs firehouse vs station | firehall vs firehouse | Entity | Low | 20–80 | Low | all pillars | **P2** |

---

# Phase 9 — Backlink Strategy

## Realistic acquisition plan (not fantasy HARO spam)

### Tier A — Industry / trust (months 1–6)

| Target | Angle | Ask |
|--------|-------|-----|
| Training academies | Free “rookie cook” curriculum PDF + link | Resource page link |
| Department wellness coordinators | Complement FRESH — interactive scaling tool | Intranet / wellness page |
| IAFF locals / association newsletters | “End dinner debate” tool for members | Mention + link |
| First responder wellness orgs | Guest checklist (budget, tones-drop meals) | Resource citation |
| Fire service podcasts | Founder interview | Show notes link |

### Tier B — Media / creators (months 3–9)

| Target | Angle |
|--------|-------|
| Local news “day in the life / station dinner” | Offer recipes + photos from real halls |
| YouTube station chefs | Collab; embed + reciprocal about links |
| Firefighter Instagram / TikTok cooks | Recipe credit links |
| Behind the Badge / fire lifestyle blogs | Guest feature |

### Tier C — Digital PR (months 6–12)

| Asset | Why it earns links |
|-------|-------------------|
| “State of the Firehouse Kitchen” survey | Original data |
| Cost-per-plate calculator | Linkable tool |
| Red Lead heritage story | Unique cultural asset |
| Annual “10 classics” update | Freshness magnet |

### Avoid

- Buying links  
- Generic recipe directory spam  
- Competing with FRESH by attacking it — **complement** institutional health content

**Target:** 40–80 referring domains in 12 months from fire-service relevant sites (quality over raw DR).

---

# Phase 10 — Founder 12-Month Roadmap (ROI order)

### Month 1 — Stabilize & defend #1
- Fix live **sitemap 500**
- Sync homepage title/description (static = runtime = keyword-first)
- GSC property verification + sitemap resubmit
- `noindex` app shells
- Baseline rankings sheet for all primary keywords

### Month 2 — Pillar gaps
- Ship `/firehouse-meals`, `/firefighter-dinner-ideas`, `/crew-meals`
- Deepen `/fire-station-meals` (budget, tones-drop, kitty)
- Add InternalLinkHub to all recipe templates

### Month 3 — Cannibalization cleanup
- Merge large-crew guides; 301 losers
- Merge overlapping breakfast guides
- Wire AggregateRating schema where ratings exist

### Month 4 — EEAT sprint
- Founder / About rebuild with proof
- “How we test recipes” page
- Press kit + `sameAs` profiles

### Month 5 — Ops content that PDFs can’t match
- Tones-drop cooking cornerstone
- Grocery / kitty cornerstone
- Hall Vote landing

### Month 6 — Off-page kickoff
- 10 academy/wellness outreach emails/week
- 2 podcast pitches
- Red Lead PR push

### Month 7 — Performance
- CWV pass (LCP images, JS splitting)
- Prerender home + landings + top 50 recipes

### Month 8 — Listicle dominance
- 100 dinner ideas
- Cheap meals pillar
- Equipment cluster

### Month 9 — Video / YouTube SEO
- 8–12 short recipe videos pointing to canonical recipes
- Playlist + channel keyword optimization

### Month 10 — Original research
- Hall kitchen survey → linkable report
- Cost-per-plate calculator tool page

### Month 11 — Authority partnerships
- RD review of nutrition cluster
- Department pilot case study (with permission)

### Month 12 — Defend & expand
- Refresh all pillars
- Expand into adjacent first-responder meal queries only after firefighter ownership is durable
- Annual ranking + traffic report

---

## Deliverable checklist vs phases

| Phase | Covered |
|-------|---------|
| 1 Search visibility | ✓ keyword table + gaps |
| 2 Competitors | ✓ |
| 3 Technical | ✓ incl. live sitemap 500 |
| 4 Topical authority | ✓ pillars + clusters |
| 5 EEAT | ✓ |
| 6 Homepage | ✓ meta rewrite recommendation |
| 7 Recipe pages | ✓ |
| 8 Content roadmap | ✓ Top 25 |
| 9 Backlinks | ✓ |
| 10 12-month plan | ✓ |

---

## The one question

### If Firehall Meals executes this plan, what is the realistic probability of ranking #1 for “firefighter meals” within 12 months?

**Estimate: 55–65%.**

### Why not higher

1. You **already appear #1 in current SERP samples** — the hard problem is **durable #1 with stable CTR**, not first appearance.  
2. Institutional PDFs and national media can still insert above you for blended SERPs (People Also Ask, video, PDF sitelinks).  
3. Homepage “Meal App” positioning can voluntarily surrender the snippet.  
4. Backlink acquisition in the fire service is slow and relationship-driven.  
5. Google can prefer fresher news/listicles seasonally.

### Why not lower

1. Niche is small enough that a deep catalog + tools can dominate informational intent.  
2. On-page and schema foundation already exceed most competitors.  
3. Exact-match brand language (firehall / firefighter meals) aligns with query language.  
4. Competitors with stronger DA do not seriously compete for this niche full-time.

### What “#1” should mean operationally

Not a vanity screenshot. Success = **#1 organic for 8+ of 12 months**, CTR ≥ niche average, and owned sitelinks from pillars — while also ranking top-3 for `fire station meals` and `firehouse meals`.

---

## Immediate P0 actions (this week)

1. **Fix production `/sitemap.xml` 500**  
2. **Align `client/index.html` and `shared/seo/constants.ts` titles** to keyword-first  
3. Confirm Google Search Console sitemap status  
4. Add recipe → pillar internal links  
5. Create `/firehouse-meals` outline and ship

---

*Audit based on live search visibility sampling, production robots/sitemap checks, and repository SEO implementation as of July 17, 2026. Re-validate rankings in Google Search Console for authoritative position averages.*
