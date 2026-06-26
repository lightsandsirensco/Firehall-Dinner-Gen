# Crew Pulse — Kill or Keep?

**Date:** June 22, 2026  
**Lens:** Firefighter on B shift · product founder · zero tolerance for “interesting” features  
**Question:** Does Crew Pulse solve a **real shift-night problem**?  
**Sources:** `hall-activity-v1.md`, `hall-dashboard-v2.tsx`, `stop-building.md`, `hall-pro-audit.md`, `final-ceo-roadmap.md`

---

## Executive verdict

**Recommendation: 3 — Reduce to simple hall history.**

Do **not** ship Crew Pulse V1. Do **not** keep the activity feed as-is. **Delete** the social layer (teaser, full page prominence, leaderboard-at-top, streak-as-hero). **Keep** one honest block: **“Recent crew meals”** — last 3–5 cooked meals with date, shift, and tap-to-recook.

Crew Pulse is a **founder fantasy** dressed as retention science. It answers *“is anyone using our app?”* — not *“what’s for dinner?”*

| Option | Verdict |
|--------|---------|
| 1. Delete entirely | Too aggressive — you still need meal memory |
| 2. Postpone until 100 halls | Close, but today’s feed **actively hurts** the dashboard |
| **3. Reduce to simple hall history** | **← Do this** |
| 4. Keep as-is | No — duplicates, wrong order, empty feed |

---

## Shift-night reality (5:47 PM, hall kitchen)

You just got back from a medical call. Four guys are already asking about food. Nobody opens an app to read a **feed**.

What actually happens:

| Person | Question | Tool they need |
|--------|----------|----------------|
| Cook | “What are we making?” | Generator, wheel, or **open vote** |
| Captain | “Did we vote yet?” | **Vote link** or last vote card |
| Probie | “How do I scale this?” | **Cook mode** on the recipe |
| Canteen guy | “What do I grab at No Frills?” | **Shopping list** |
| Anyone | “Didn’t we do chili last week?” | **Meal log** — not a social timeline |

**Crew Pulse solves none of the urgent questions.** At best it answers a lazy one: *“What happened lately?”* — and the dashboard already has **Tonight’s Meal**, **Recent Meals**, **Last Vote**, and **Supply Shortages** for that.

If the feed is empty (it usually is), it screams *“dead app.”* That **reduces** trust on shift night.

---

## Four pillars evaluation

| Pillar | Does Crew Pulse help? | Score | Notes |
|--------|----------------------|-------|-------|
| **Decide dinner** | **No** | 0/10 | Feed is backward-looking. Vote/generator/wheel decide. |
| **Cook dinner** | **No** | 1/10 | Card might link to recipe; cook mode is elsewhere. |
| **Remember dinner history** | **Partially** | 4/10 | Overlaps `HallHistoryTimeline` + `HallTonightsMealCard`. Feed buries meals in votes/saves/spins. |
| **Manage hall necessities** | **Barely** | 2/10 | “Shopped” and supply events duplicate `HallSupplyShortagesCard`. |

**Pillar average: 1.75/10** — fails the founder filter from `stop-building.md`.

---

## Four hard questions

### Would a firefighter miss it if removed?

**No — if you keep Recent Meals.**

Test: Remove `HallActivityTeaser` and `HallLeaderboardTeaser` tomorrow. Keep:

- Tonight’s Meal card  
- Recent Meals timeline (3–5 items)  
- Last Vote highlight  
- Supply shortages card  

Nobody on the line notices. The cook still picks dinner. The canteen guy still sees what’s low.

They **would** miss a **crew meal log** (“chili again?”) — but that’s **history**, not a pulse feed.

### Would a captain pay for it?

**No.**

Captains pay for (`hall-pro-audit.md`):

1. **One list** — shared shopping  
2. **One log** — what the hall actually cooked  
3. **One report** — proof for slush fund / morale  

Crew Pulse is proposed as **free**. Streaks and leaderboards are **morale garnish**, not budget line items. A captain does not explain to the chief: *“We need $149/yr for the activity feed.”*

### Would it increase weekly usage?

**Unlikely — and today it may decrease it.**

| Claim (design doc) | Reality (code + shift behavior) |
|--------------------|----------------------------------|
| “Halls feel alive” | Feed is mostly **local device history** merged with sparse server events |
| “See who cooked” | **No member names** on cards — only shift letter, twice |
| “Return next shift” | Firefighters return for **vote link in group chat**, not dashboard FOMO |
| “Retention loop” | Empty dashed box at **top of dashboard** before actions = abandonment signal |

Weekly usage moves from: **vote in chat → cook → list** — not from scrolling activity.

### Does it solve a real shift-night problem?

**No.**

It solves a **founder problem**: *“How do I know the product is being used?”*  
That’s what **North Star analytics** are for — not a user-facing social feed at 5pm.

---

## What Crew Pulse duplicates today

The hall dashboard already runs **five parallel “what happened” surfaces**:

```
Current /hall dashboard (hall-dashboard-v2.tsx)

1. HallActivityTeaser      ← Crew Pulse (2 feed cards)     DELETE
2. HallLeaderboardTeaser   ← shift competition             DELETE from dash
3. HallStatsGrid           ← meals/votes/wheel counts      KEEP (compact)
4. HallStreaksPanel        ← gamification rows             DEMOTE / postpone
5. HallTonightsMealCard    ← last cooked                   KEEP
6. HallHistoryTimeline     ← recent meals (up to 5)        KEEP — this IS history
7. HallHighlightCard vote  ← last vote                     KEEP
8. HallSupplyShortagesCard ← necessities                   KEEP
```

**Plus:** `useHallActivityFeed` and `useHallLeaderboard` both hit `GET /activity-feed` — **duplicate fetch** on every dashboard load (`dead-code-audit.md`, `performance-priorities-v2.md`).

**Crew Pulse V1** (`hall-activity-v1.md`) would add:

- Server writes on 8 event types  
- Actor-first cards  
- Pulse header with streak  
- Weekly digest email  
- `/hall/activity` as first-class destination  
- Leaderboard snippet inline  

That is **~2–3 engineering weeks** to build a worse version of Instagram for a hall with 4 members.

---

## Why “keep as-is” fails

### 1. Wrong position on the dashboard

`hall-activity-v1.md` says **actions first**. Code does the opposite:

```114:124:client/src/components/hall-dashboard/v2/hall-dashboard-v2.tsx
      <HallActivityTeaser />

      <HallLeaderboardTeaser />

      <HallDashboardActions activeHallId={data.activeHallId} />
```

On a phone, the cook sees **empty activity** before **Vote / Wheel / Generate**. That’s backwards.

### 2. Bad copy erodes trust

Feed cards repeat the shift label and show no person:

```60:64:client/src/components/hall-activity/hall-activity-feed-card.tsx
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{item.shiftLabel}</span> {actionLabel}:
        </p>
        <p className="text-base font-semibold text-foreground leading-snug mt-0.5 line-clamp-2">
          {item.subject}
```

Reads as: **“B Shift B Shift cooked: Big Chili.”** Feels broken, not alive.

### 3. Not actually crew-shared

Server events only populate when Pro analytics sync runs. Most members see **their own phone’s history** dressed as hall activity. That’s dishonest social proof.

### 4. Conflicts with focus doctrine

From `stop-building.md`:

> *Hall activity feed as a “social network”* — firefighters don’t care  
> *Full leaderboard page* — postpone  
> *Achievement badges* — postpone  

Crew Pulse is the social network pitch with a firefighter skin.

---

## Recommendation detail

### Do now (Option 3)

| Action | Rationale |
|--------|-----------|
| **Remove** `HallActivityTeaser` from dashboard | Noise above actions |
| **Remove** `HallLeaderboardTeaser` from dashboard | Competition before density |
| **Demote** `HallStreaksPanel` below fold or into stats chip | Gamification ≠ dinner |
| **Keep** `HallHistoryTimeline` as **“Recent crew meals”** | Real remember pillar |
| **Keep** `HallTonightsMealCard` + vote highlight | Decide + remember |
| **Keep** supply + shopping cards | Necessities |
| **Deprecate** `/hall/activity` — redirect to `/hall#recent-meals` | Orphan page |
| **Deprioritize** `/hall/leaderboard` | Link only if data exists |
| **Cancel** Crew Pulse V1 build (`hall-activity-v1.md`) | Postpone social layer |

### Postpone until 100 halls (do not delete backend yet)

| Asset | Why keep in codebase |
|-------|---------------------|
| `hall_activity_events` table + API | Future true crew log |
| `buildHallActivityFeed` merge logic | Reuse for server-backed history |
| Analytics events | North Star measurement |

**Do not** expose these as a user-facing “pulse” until halls are dense enough that the feed isn’t embarrassing.

### Delete eventually (after history migration)

| Delete | When |
|--------|------|
| `hall-activity-page.tsx` | After redirect |
| `hall-leaderboard-page.tsx` | After 100 halls or never |
| Duplicate hooks fetching same endpoint | With dashboard refactor |
| `HALL_ACTIVITY` brand copy / Radio icon section | With teaser removal |

---

## Exactly where the kept parts belong

### Target `/hall` layout (mobile-first)

```
┌─────────────────────────────────────────┐
│  HEADER                                 │
│  Hall name · shift · members            │
├─────────────────────────────────────────┤
│  ① QUICK ACTIONS          ← FIRST       │
│  [ Vote ] [ Wheel ] [ Tonight ]         │
├─────────────────────────────────────────┤
│  ② TONIGHT                              │
│  Active vote OR last vote winner          │
│  OR “Pick tonight’s meal” CTA           │
├─────────────────────────────────────────┤
│  ③ NECESSITIES                          │
│  Shopping list shortcut                 │
│  Supply shortages (if any)              │
├─────────────────────────────────────────┤
│  ④ RECENT CREW MEALS      ← ONLY KEEP   │
│  Chili · B shift · Tue                  │
│  Tacos · A shift · Sun                  │
│  [ See all → /hall-history ]            │
├─────────────────────────────────────────┤
│  ⑤ HALL CLASSICS (favorites)            │
├─────────────────────────────────────────┤
│  ⑥ STATS (one row, optional)            │
│  12 meals · 3 votes · 2wk streak        │
└─────────────────────────────────────────┘
```

### What each block does (shift-night)

| # | Block | Shift-night job |
|---|-------|-----------------|
| ① | Quick actions | **Decide** — the only reason to open the app at 5pm |
| ② | Tonight | **Decide** — vote result or prompt |
| ③ | Necessities | **Stock** — before grocery run |
| ④ | Recent crew meals | **Remember** — “not chili again” |
| ⑤ | Classics | **Decide faster** — hall winners |
| ⑥ | Stats | Optional morale; not a feed |

### What is NOT on the dashboard

| Removed surface | Where it goes |
|-----------------|---------------|
| Crew Pulse feed | **Gone** — merged into ④ |
| Leaderboard teaser | **Gone** — `/hall/leaderboard` footer link only if ≥10 events/month |
| Streaks panel | **Stats row** — one number, not three cards |
| `/hall/activity` | **Redirect** → `/hall#recent-meals` |

### “Recent crew meals” spec (the only retained slice)

| Field | Required |
|-------|----------|
| Meal name | Yes — link to recipe |
| When | Yes — “Tue” or “3 days ago” |
| Shift | Yes — one label, not two |
| Who cooked | Nice later — **not** blocking |
| Action types shown | **`meal_cooked` only** — drop voted/saved/spun/shopped from this list |
| Count | **3 on mobile, 5 on desktop** |
| Empty state | “No meals logged yet — cook tonight’s pick” + CTA to generator |

**Do not** call this Crew Pulse. Call it **“Recent crew meals”** or **“Hall meal log.”** Honest nouns beat marketing verbs.

---

## If you ignore this doc (keep Crew Pulse V1)

You will spend 2–3 weeks building:

- Server event writers on every action  
- Actor names and avatars  
- Weekly digest emails  
- Streak header  
- Inline leaderboard  

And still lose to **a vote link in the crew group chat** because that’s where shift night actually happens.

**Founder rule:** If a feature doesn’t help decide, cook, remember, or stock **this shift**, it doesn’t ship.

Crew Pulse fails that test. **Recent crew meals passes it.**

---

## Decision summary

| Question | Answer |
|----------|--------|
| Real shift-night problem? | **No** |
| Decide dinner? | **No** |
| Cook dinner? | **No** |
| Remember history? | **Only if reduced to meal log** |
| Manage necessities? | **No** — other cards win |
| Firefighter would miss it? | **No** |
| Captain would pay? | **No** |
| Increases weekly usage? | **Unproven; likely no** |

| Recommendation | **3 — Reduce to simple hall history** |
|----------------|----------------------------------------|
| Cancel | Crew Pulse V1, activity teaser, leaderboard-at-top |
| Keep | Recent meals, tonight, vote, list, supplies |
| Postpone | Social feed, competition, badges, digest emails until **100 halls** |

---

*Next step for engineering: one PR removing `HallActivityTeaser` + `HallLeaderboardTeaser` from `hall-dashboard-v2.tsx`, reordering actions first, tightening `HallHistoryTimeline` to cooked-only. No new features.*
