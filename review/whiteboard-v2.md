# Digital Hall Whiteboard v2 — Ruthless Redesign

**Status:** Design only — do not implement until approved  
**Date:** 2026-07-17  
**Supersedes (product thinking):** `review/digital-whiteboard.md` as the dense “bulletin + social-lite” board  
**Depends on:** Hall Ops · Hall Event Engine · Inventory · Logbook · Tonight/Vote · Dues  

**One question the board answers:**

> **What do I NEED to know right now?**

Not what happened. Not what everyone’s doing. Not a feed.

---

## 0. Philosophy (non-negotiable)

| Principle | Meaning |
|-----------|---------|
| **Busy crew** | Assume gloves-off, 10 seconds, bay noise |
| **Calm > complete** | Emptier than the physical board is a win |
| **Useful or gone** | If you can safely ignore it, it doesn’t belong |
| **No duplicate truth** | If another workflow owns it, link — don’t mirror |
| **Auto > post** | Ops state appears from events; humans post only judgment |
| **Finite surface** | Hard caps; expiry is hygiene; almost no scroll |

**The Whiteboard is:** kitchen whiteboard + cork board + operational awareness.  
**The Whiteboard is not:** Slack, Teams, Facebook, Discord, intranet, activity feed, timeline, or “document everything.”

**Success:** Opens Hall → knows what matters for *this shift* in **under 10 seconds** → closes or acts. Lurking is healthy. Posting is rare.

---

## 1. Simplified information architecture

### 1.1 Three zones only

```
┌─────────────────────────────────────────┐
│ KNOW NOW                                 │  Zone A — always ≤1 screen
│  Tonight (minimal)                       │
│  Critical pulses (0–3 auto chips)        │
├─────────────────────────────────────────┤
│ STANDING                                 │  Zone B — pins only (max 3)
│  Captain / hall must-see                 │
├─────────────────────────────────────────┤
│ COMING UP                                │  Zone C — dated items (max 5)
│  Events · training · birthdays · dues    │
└─────────────────────────────────────────┘
         [ + Note ]  ← rare, not the product
```

**Removed as zones:** Today / Active Notes feed · This Week as a long list · Needs a Pulse as a separate marketing strip (folded into Critical) · Shopping / cook detail chrome.

### 1.2 Mental model

| Zone | Job | Source |
|------|-----|--------|
| **Know Now** | Change what you do in the next few hours | Tonight + Event Engine pulses |
| **Standing** | Don’t forget hall rules / long pins | Human pin (captain/mgr) |
| **Coming Up** | Date-bound awareness this week-ish | Events + auto reminders |

If it doesn’t fit a zone, it belongs in **Logbook**, **Tonight**, **Run**, **Canteen**, or **nowhere**.

---

## 2. Essential information only

### 2.1 Tonight — reduced to the minimum

**v1 showed:** Dinner · Status · Cook · Runner · Head count · Hold note  

**v2 keeps permanently:**

| Field | Keep? | Why |
|-------|-------|-----|
| **Dinner** (name + tap → recipe/Tonight) | ✓ | Everyone needs to know what’s cooking |
| **Status** (Voting / Locked / On hold / Fed) | ✓ | Changes behavior (“don’t start,” “eat,” “vote”) |

**v2 removes from permanent board space:**

| Field | Where it lives instead | Why remove from board |
|-------|------------------------|------------------------|
| **Cook** | Tonight workflow · assignment notify | Only cook + captain *need* it daily; clutters everyone else. Optional: show **only if you’re the cook** (“You’re cooking”) as a personal chip — not a public roster line |
| **Runner** | The Run · assignment notify | Same — shopping workflow owns it |
| **Head count** | Tonight / Scale / Run | Maintained for shopping math, not glance awareness |
| **Hold note** (permanent field) | Status = **On hold** + optional one-line when status is hold | Don’t reserve forever-space for a rare state; show only while held |

**Tonight block — v2 layout**

```
┌─────────────────────────────────────────┐
│ TONIGHT                                  │
│ Chili                          LOCKED    │
│ (tap for recipe · vote · details)        │
└─────────────────────────────────────────┘
```

When held:

```
│ Chili                          ON HOLD   │
│ Tones — covered @ 200°                   │  ← only while held
```

When voting:

```
│ Vote open · closes 17:00        VOTING   │
│ (tap to vote)                            │
```

When fed / clear:

```
│ Fed — board quiet               FED      │
│ or empty: “No dinner set” + Vote CTA     │
```

**Rule:** Tonight on the Whiteboard is a **status beacon**, not a duty roster and not a shopping console.

### 2.2 Critical pulses (auto, max 3)

Only issues that change what someone might do **now**:

| Pulse | Example | Source event |
|-------|---------|--------------|
| Inventory critical | Coffee OUT | `inventory.item_emptied` (high priority items / any Out capped) |
| Equipment down | Dishwasher OOS | Human note type **Broken** or tagged equipment twin |
| Money time-sensitive | Dues due Friday | `payment.*` / schedule |
| Delivery landed | Costco order received | `shopping.run_completed` / receive |
| Vote closing soon | Vote closes in 20m | `vote.*` |

**Hard cap: 3.** If more, rank: safety/equipment → Out staples → time-critical (vote/dues) → delivery. Overflow → Canteen / Home “Needs You” — **not** more board chips.

**Not pulses:** Running low on paprika · shopping progress · who claimed the run · analytics.

### 2.3 Standing pins (max 3)

Human, rare, captain/canteen manager:

- Standing policy (“Don’t use cast iron for tomato”)  
- Long-running hazard (“Walk-in door sticks — lift and pull”)  
- Hall motto / permanent reminder that actually matters  

Pins without expiry still get **review nudge** every 90 days (“Still needed?”).

### 2.4 Coming Up (max 5 visible)

Date-bound only:

- Training / BBQ / open house / retirement / birthday  
- Auto: “Dues due Fri” if within 7 days  
- Auto: “Weekly BBQ Saturday” if on hall calendar  

Each card: **title · when · optional one line**. No essays.

### 2.5 What firefighters may still post (narrow)

Allowed human note intents (v2):

| Intent | Example | Default life |
|--------|---------|--------------|
| **Broken** | Dishwasher out of service | Until marked Fixed (or 14d) |
| **Reminder** | Fridge clean-out Sunday | Until date |
| **Announcement** | Dress uniform Friday | Until date / 7d |
| **Event** | Retirement cake Thu | Until event +1d |

That’s it for v1 of v2.

---

## 3. What was removed and why

### 3.1 From Tonight

| Removed | Why |
|---------|-----|
| Cook on board | Owned by Tonight + notify; noise for non-cooks |
| Runner on board | Owned by The Run + notify |
| Head count | Owned by scale/shop; doesn’t change glance behavior for most |
| Permanent Hold field | Rare; fold into status |

### 3.2 Zones / cards removed

| Removed | Why |
|---------|-----|
| **Today / Active Notes feed** | Becomes a timeline/social list; fights calm |
| **This Week as scroll section** | Replace with capped Coming Up |
| Separate “Needs a Pulse” marketing row | Merge into Critical (max 3) |
| Shopping Notes topic on board | Belongs on The Run / Need Anything |
| Shift Notes as board culture | Belongs in **Logbook** (memory / handoff) |
| Kitchen chatter (“leftovers labeled”) | Logbook or ephemeral Reminder only if truly must-see |

### 3.3 Note types removed (ruthless)

| Removed | Why | Where instead |
|---------|-----|---------------|
| **Question** + answers | Starts thread culture | Logbook Question · or Hall Vote |
| **Suggestion** + 👍/👎 | Soft social network | Logbook Suggestion |
| **Poll** on board | Duplicate of Hall Vote energy | Tonight Vote / rare Logbook |
| **For Sale** | Marketplace creep | Cabinet / hallway; not board |
| **Wanted** | Same | Logbook or Run |
| **Lost & Found** | Clutter magnet | Logbook Lost & Found |
| **Congratulations** as type | Nice ≠ need-to-know; use Event if ceremony date | Coming Up Event or skip |
| Multi-topic taxonomy (12 topics) | Composer friction + filter UI | Drop filters on home |

### 3.4 Features removed or deferred

| Feature | Verdict |
|---------|---------|
| Comments on notes | **Remove from Whiteboard** — threads kill glanceability |
| Emoji reaction row (5 emoji) | **Remove from home**; optional single **Got it** on Broken/Urgent only |
| Photo-first posting | **Defer** — title+line first; photo rare on Broken only |
| Priority enum (normal/important/urgent) | **Simplify:** Broken/Critical auto-rank; no member “Urgent” theater |
| Compose: Type → Topic → Title wizard | **Replace:** 4 big intents or auto from templates |
| Filter sheet (topic/type/shift) | **Remove** from board home |
| “Post a shift note?” tour prompt | **Remove** — pushes posting culture |
| “Leftovers on the board?” after Fed | **Remove** or send to Logbook once |
| Infinite types roadmap (WB-3 culture pack) | **Cancel** as board scope |
| For Sale → merch link | Cabinet only |
| Soft cap “25 active notes” | Wrong problem — **hard cap visible cards** instead |

### 3.5 Integrations that no longer duplicate onto the board

| Don’t show on board | Lives in |
|---------------------|----------|
| Shopping progress / list detail | The Run |
| Who is shopping / cooking (always-on) | Tonight / Run + push |
| Inventory counts / par | Canteen twin |
| Recipe scaling | Scale / Tonight |
| Analytics, system logs, history | Logbook / admin |
| Full shortage list | Canteen Needs Attention |

**Auto chips only** for the few critical inventory Outs — not every Low.

---

## 4. Human posts vs automated updates

### 4.1 Default: the board writes itself

| Situation | Human posts? | Board shows |
|-----------|--------------|-------------|
| Coffee Out | No | Critical pulse (from Inventory) |
| Costco run completed | No | Pulse “Order delivered” (short life) |
| Dishwasher dead | **Yes** — Broken | Standing until Fixed |
| Weekly BBQ on calendar | No | Coming Up |
| Dues due Friday | No | Coming Up / pulse if ≤3 days |
| Dinner locked | No | Tonight dinner + status |
| Vote open | No | Tonight voting beacon |
| Cast iron ban | **Yes** — pin Announcement | Standing |
| Birthday Thursday | Optional Event or roster integration | Coming Up |
| Training feed 16 | Event with date | Coming Up (headcount lives in Tonight that day, not forever) |

### 4.2 Manual post policy

- Prefer **not posting** if an event already covers it  
- Compose is **+ Note** with 4 intents — not a feed composer  
- Rate limit: members ≤3 active human notes; managers slightly higher  
- Captains pin ≤3  

### 4.3 Auto pulse lifecycle

| Pulse | Appears | Clears |
|-------|---------|--------|
| Item OUT | On empty | On receive / restock |
| Equipment Broken | On human Broken (or equipment status) | Mark Fixed |
| Dues due | ≤7 days before | Period paid / past due handled in Dues |
| Delivery | On run completed | Auto expire 12–24h |
| Vote closing | ≤60m before close | On close |

---

## 5. Whiteboard layout (v2)

### 5.1 Phone — target: **no scroll** for normal days

```
┌─────────────────────────────────────────┐
│ Station 6                                │
├─────────────────────────────────────────┤
│ TONIGHT                                  │
│ Chili · LOCKED                           │
├─────────────────────────────────────────┤
│ NOW                                      │
│ · Coffee OUT                             │
│ · Dishwasher broken                      │
├─────────────────────────────────────────┤
│ PINNED                            2/3    │
│ · Don’t use cast iron for tomato         │
├─────────────────────────────────────────┤
│ COMING UP                                │
│ · Sat BBQ                                │
│ · Fri dues                               │
│ · Thu — Jasper’s birthday                │
├─────────────────────────────────────────┤
│            [ + Note ]                    │
└─────────────────────────────────────────┘
```

Quiet day (ideal):

```
│ TONIGHT — Fed                            │
│ NOW — All clear                          │
│ PINNED — 1 standing                      │
│ COMING UP — Sat BBQ                      │
```

**“All clear” is a feature.** Empty Now is success.

### 5.2 Desktop

Same hierarchy; more whitespace; still no second column of “activity.”

### 5.3 Personal overlay (not public roster)

If *you* are cook or runner, a single personal line under Tonight:

`You’re cooking · open recipe`  
`You’ve got the run · open list`

Others do **not** see a cook/runner directory on the board.

---

## 6. Card hierarchy

### 6.1 Visual weight (top → bottom)

1. Tonight beacon (largest type)  
2. Now pulses (compact rows, not big cards)  
3. Pins (short titles)  
4. Coming Up (smallest; date first)  

### 6.2 Card anatomy (human notes)

```
Title (required, short)
One optional line
When / expires (required for Reminder/Event)
[Got it] only on Broken
```

No topic chips on the face. No reaction bar. No author hero. Author available on detail if needed for accountability.

### 6.3 Pulse anatomy

```
Coffee OUT                    (tap → Canteen item)
```

One line. No essay. No “reported by Mike” on the face (detail OK).

---

## 7. Lifecycle rules

```
Active on board
  → expires / resolved / event passed
  → leave board (gone from home)
  → Archive (searchable, not a feed)
```

| Kind | Max on board | Expiry / clear |
|------|--------------|----------------|
| Tonight | 1 | Status advances; clears after Fed next morning or tour policy |
| Now pulses | 3 | Event-driven clear or 24h for delivery |
| Pins | 3 | Manual unpin or 90-day review |
| Coming Up | 5 | End of event day (+1 for BBQ) |
| Human Broken | counts toward pins or Now | Until Fixed |
| Human Reminder/Announcement/Event | in Coming Up or Pin | Date required |

**Hard total visible human+coming cards:** keep the screen calm — if Coming Up would exceed 5, show next 5 by date only.

---

## 8. Archive strategy

| Rule | Detail |
|------|--------|
| Board home | **Never** shows archive |
| Auto-archive | Expiry, Fixed, Fed rollover, pulse clear |
| Who searches archive | Managers / captains (Pro: full; free: short window OK) |
| Firefighter default | No “Old notes” browsing habit — that’s Logbook’s job for memory |
| Promote to Logbook | Standing facts (“Filters live by freezer”) → **Promote** action when pinning long-term knowledge; board pin is temporary awareness, Logbook is memory |

**Split remains sacred:** Whiteboard = now · Logbook = memory. v2 makes the board *thinner* so Logbook can be *deeper*.

---

## 9. Compose flow (v2)

1. Tap **+ Note**  
2. Choose: **Broken · Reminder · Announcement · Event**  
3. Title → when (if needed) → Post  

No type/topic matrix. No priority picker. Pin is manager-only on detail.

**Templates (auto-assist, not content farming)**

- Broken: “___ out of service”  
- Reminder: “___ by ___”  
- Event: “___ on ___”  

Inventory Out is **not** a compose template on the board — mark Out in Canteen; pulse appears.

---

## 10. Permissions (simplified)

| Action | Member | Assigned cook/runner | Canteen mgr | Captain |
|--------|:------:|:-------------------:|:-----------:|:-------:|
| View board | ✓ | ✓ | ✓ | ✓ |
| Post 4 intents | ✓ | ✓ | ✓ | ✓ |
| Mark Broken Fixed | ✓ author / mgr | ✓ | ✓ | ✓ |
| Pin / unpin | | | ✓ | ✓ |
| Edit Tonight dinner/status | via Tonight | ✓ limited | ✓ | ✓ |
| Delete any note | | | ✓ | ✓ |

**Got it** on Broken: any member; doesn’t delete for others — only reduces “unacked” urgency for ranking inside the 3-pulse cap.

---

## 11. Event Engine wiring (board as projection)

Board is a **projection**, not a database of duplicated ops.

| Event | Board effect |
|-------|--------------|
| `meal.locked` / vote / hold / fed | Tonight beacon |
| `inventory.item_emptied` | Now pulse (ranked) |
| `inventory.item_restocked` | Clear related pulse |
| `shopping.run_completed` | Short “Delivered” pulse |
| `payment` due window | Coming Up / pulse |
| `notice` human create | Pin or Coming Up |
| Equipment fixed | Clear Broken |

No manual “also post that coffee is out.”

---

## 12. Comparison: v1 → v2

| Dimension | v1 | v2 |
|-----------|----|----|
| Core question | Dinner + hall life | **Need to know now** |
| Tonight fields | 6 | **2** (+ hold line when held) |
| Note types | 8 | **4** |
| Topics | 12 | **0 on home** |
| Comments | Optional | **None on board** |
| Reactions | 5 emoji | **Got it only** |
| Active feed | Yes | **No** |
| Automation | Partial | **Primary author** |
| Scroll | Expected | **Avoid** |
| Calm | Aspiration | **Requirement** |

---

## 13. Implementation order

### WB2-0 — Approve ruthless cuts  

### WB2-1 — Tonight beacon only + personal cook/runner chip  

### WB2-2 — Now pulses from Event Engine (Out, delivery, dues, vote)  

### WB2-3 — Pins (max 3) + Coming Up (max 5)  

### WB2-4 — Human compose (4 intents) + Broken Fixed  

### WB2-5 — Archive for managers + Promote to Logbook  

**Do not implement** v1 WB-3 culture pack (For Sale, Polls, etc.) on the Whiteboard.

---

## 14. Success metrics (v2)

| Metric | Good direction |
|--------|----------------|
| Median glance time | &lt; 10s |
| % sessions with scroll depth ≈ 0 | ↑ |
| Visible cards per open (median) | ↓ (toward ≤8 lines total) |
| Human notes created / tour | Low and stable |
| % of Outs that appear as pulse without manual post | → ~100% |
| Board open → action in Tonight/Canteen/Run | ↑ |
| Posts per user | **Do not maximize** |

---

## 15. Anti-goals

- Filling empty space with prompts to post  
- Showing activity “so the board feels alive”  
- Recreating Logbook on the board  
- Duty roster on the kitchen wall for everyone  
- Marketplace or lost-and-found gravity  

---

## 16. One-line product truth

**The Whiteboard is the calmest surface in Hall Ops — only what the crew must know right now, mostly written by the hall itself.**

---

## 17. Approval checklist

- [ ] Tonight reduced to dinner + status (hold conditional) approved  
- [ ] Cook/runner/headcount off the public board approved  
- [ ] Active notes feed removed approved  
- [ ] Note types cut to 4 approved  
- [ ] Comments/reactions removed (Got it only) approved  
- [ ] Max 3 pulses / 3 pins / 5 coming up approved  
- [ ] Auto-from-events as primary author approved  
- [ ] Explicit go-ahead to implement  

---

*— End of Whiteboard v2 —*
