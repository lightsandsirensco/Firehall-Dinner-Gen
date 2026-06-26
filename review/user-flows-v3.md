# User Flows v3 — Discover · Tonight · Hall · Me

**Date:** June 22, 2026  
**Companion:** `navigation-v3.md`, `screen-map-v3.md`, `firefighter-user-journeys.md`  
**Scope:** Primary journeys in the v3 IA — before/after, entry points, and friction removed.

---

## Flow index

| # | Flow | Primary tab | Persona |
|---|------|-------------|---------|
| 1 | Cold open → first meal | Tonight | Probie, Senior |
| 2 | Sign up & join hall | Hall → Me | Probie |
| 3 | Captain creates hall | Hall → Me | Captain |
| 4 | Shift night dinner | Tonight → Hall | Hall cook |
| 5 | Crew vote | Tonight | Hall cook, Senior |
| 6 | Wheel tie-break | Tonight | Senior |
| 7 | Shopping run | Hall | Hall cook, Probie |
| 8 | Canteen restock | Hall | Canteen manager |
| 9 | Browse & save recipe | Discover → Hall | Senior |
| 10 | Hall Pro upgrade | Hall → Me | Captain |
| 11 | Return visit | Tonight / Hall | All |

---

## 1. Cold open → first meal

**Goal:** Recipe in hand in under 30 seconds. No homepage scroll.

### Today (v2)

```mermaid
flowchart LR
  A[Google / QR] --> B["/ homepage"]
  B --> C{Scroll past hero}
  C --> D[How It Works]
  C --> E[Hall Vote section]
  C --> F[Featured rails]
  F --> G["/generator"]
  G --> H[Filter panel]
  H --> I[Generate]
```

**Friction:** 5+ CTAs, hero 56–88dvh, browse paths compete with generator.

### v3

```mermaid
flowchart LR
  A[Open app / PWA] --> B{Returning user?}
  B -->|No, SEO /| C["/ marketing"]
  C --> D["FAB: Open Tonight"]
  B -->|Yes| E["/tonight"]
  D --> E
  E --> F["Generate or Wheel"]
  F --> G["Cook Mode recipe"]
```

| Step | Screen | Action |
|------|--------|--------|
| 1 | `/tonight` | Land on hub — two buttons |
| 2 | `/tonight/generate` | Crew size pre-filled from profile or 8 |
| 3 | Tap **Generate** | Recipe card |
| 4 | Auto | **Cook Mode** opens |

**Removed steps:** Homepage sections, header nav choice, "Find a Meal" vs "Pick Tonight's Meal" decision.

---

## 2. Sign up & join hall

**Goal:** Invite link → signed in → Hall tab → ready to vote.

### Today (v2)

```mermaid
flowchart TD
  A["/hall/join?token="] --> B[Sign in sheet]
  B --> C{Auth method}
  C -->|Magic link| D["/account"]
  C -->|Google| E[Stay on join]
  D --> F[Funnel modal on top]
  E --> G[Join]
  G --> H["/halls/:uuid settings"]
  F --> I[Shift + invite + vote steps]
```

**Friction:** Lost invite context, funnel stacks on join page, lands on settings.

### v3

```mermaid
flowchart TD
  A["/hall/join?token="] --> B[Join sheet in Hall tab]
  B --> C{Signed in?}
  C -->|No| D[Sign in — preserve token]
  D --> B
  C -->|Yes| E[Preview hall card]
  E --> F[One tap Join]
  F --> G["/hall dashboard"]
  G --> H{First join?}
  H -->|Yes| I[Pick shift sheet — skippable]
  H -->|No| J[Done]
```

| Step | Screen | Notes |
|------|--------|-------|
| 1 | Hall tab | Join sheet auto-opens from deep link |
| 2 | Sign in | OAuth or magic link **returns to join sheet** |
| 3 | Preview | Hall name, member count |
| 4 | Join | Single CTA |
| 5 | `/hall` | Dashboard — not settings |
| 6 | Shift picker | Bottom sheet; skip if captain assigned role |

**Removed:** Activation funnel steps 3–4 for joiners; duplicate manual code form; `/account` detour.

---

## 3. Captain creates hall

**Goal:** One setup path → crew invite → Hall tab.

### Today (v2)

```mermaid
flowchart TD
  A[hall-program / account / funnel] --> B{Which path?}
  B --> C[Funnel: 2 fields]
  B --> D[Account: full form]
  C --> E["/hall"]
  D --> F["/halls/:id"]
  C --> G[Forced invite share gate]
```

### v3

```mermaid
flowchart TD
  A["Hall tab — empty state"] --> B[Create hall sheet]
  B --> C[Name + crew size]
  C --> D[Defaults: shifts A-D, standard appliances]
  D --> E["/hall"]
  E --> F[Invite row — QR / copy]
  F --> G{Captain ready?}
  G -->|Share now| H[Native share]
  G -->|Later| I[Dashboard]
  I --> J["/hall/settings — edit details"]
```

| Step | Screen | Notes |
|------|--------|-------|
| 1 | Hall tab | "Create your hall" |
| 2 | Sheet | Minimal required fields |
| 3 | `/hall` | Dashboard immediately |
| 4 | Invite row | Optional — not gated |
| 5 | Settings | Full station/dept/shifts when ready |

**Removed:** Parallel `CreateHallForm` on Me tab; hall-program sign-in without intent; funnel modal over other pages.

---

## 4. Shift night dinner (hall cook)

**Goal:** Decide → crew buy-in → list → cook — without leaving app mental model.

### Today (v2)

```
/hall → Pick meal → /generator
     → Start vote → modal
     → Shopping → /halls/:id#hash
     → Recipe → blog layout → hunt Cook Mode
```

### v3

```mermaid
flowchart LR
  subgraph Tonight
    A["/tonight"] --> B[Generate]
    B --> C[Recipe + Cook Mode]
    A --> D[Start Vote]
    D --> E["Share link"]
  end
  subgraph Hall
    F["/hall"] --> G[Shopping list]
    G --> H[Assign runner]
  end
  C --> I[Cook at stove]
  E --> J[Crew votes on phones]
  J --> A
```

| Phase | Tab | Actions |
|-------|-----|---------|
| Decide | Tonight | Generate or Wheel |
| Align crew | Tonight | Vote card on hub + share |
| List | Hall | Shopping list row → check items |
| Cook | Tonight | Cook Mode from tonight's pick card |

**Key fix:** Tonight hub shows **active vote** and **tonight's pick** so cook doesn't re-navigate.

---

## 5. Crew vote

### Today (v2)

| Role | Path |
|------|------|
| Organizer | Generator / wheel / hall dashboard → modal → copy link |
| Voter | `/vote/:id` orphan page, no nav |

### v3

```mermaid
sequenceDiagram
  participant Cook
  participant Tonight
  participant Crew
  participant Hall

  Cook->>Tonight: Start vote (2+ options)
  Tonight->>Tonight: Vote card on hub
  Cook->>Crew: Share /hall link or /tonight/vote/:id
  Crew->>Tonight: Tap option
  Tonight->>Hall: Result logged to activity
  Cook->>Tonight: Close vote when kitchen starts
```

| Organizer | Voter |
|-----------|-------|
| Tonight → Vote → options from recent gens | Opens link → stays in Tonight chrome |
| Share via native sheet | One tap vote |
| Live results on Tonight hub | "Back to Hall" after vote |

**Removed:** Orphan vote page aesthetic; synthetic ballot filler hidden behind "add another option."

---

## 6. Wheel tie-break

### v3 (single tab)

```mermaid
flowchart LR
  A["/tonight"] --> B["/tonight/wheel"]
  B --> C[Spin]
  C --> D[Reveal winner]
  D --> E{Need crew buy-in?}
  E -->|Yes| F[Vote banner — 2 options]
  E -->|No| G["Cook Mode"]
  F --> H["/tonight/vote/:id"]
```

Wheel never lives outside Tonight tab. Explore link on wheel → Discover collection "Classics."

---

## 7. Shopping run

### Today (v2)

```
Recipe modal → Add to hall list
/hall → Shopping tile → /halls/:id#hall-shared-shopping-list
Paywall → settings → captain enables Pro → scroll back
```

### v3

```mermaid
flowchart TD
  A["Tonight — recipe"] --> B[Add to hall list]
  B --> C{Hall Pro?}
  C -->|Yes| D["/hall/shopping"]
  C -->|No| E[Toast + Ask captain CTA]
  E --> F["/hall/settings/billing"]
  D --> G[Check off items]
  G --> H[Mark run complete]
  H --> I[Notify hall — future]
```

| Step | Who | Screen |
|------|-----|--------|
| 1 | Cook | Tonight → add from recipe |
| 2 | Anyone | Hall → Shopping list |
| 3 | Runner | Check items in aisle |
| 4 | Captain / canteen mgr | Mark complete |

**Removed:** Hash navigation; settings page as grocery UI.

---

## 8. Canteen restock

### Today (v2)

| Action | Where |
|--------|-------|
| Report low stock | Shift dashboard modal only |
| View all statuses | `/hall/canteen` |
| Manage purchases | Canteen manager on canteen page |
| Hall supplies (Pro) | Settings page panel |

### v3

```mermaid
flowchart TD
  A["/hall"] --> B["/hall/supplies"]
  B --> C[Needs attention]
  C --> D{Role}
  D -->|Any member| E[Report item sheet]
  D -->|Canteen mgr| F[Mark purchased / restocked]
  E --> B
  F --> B
```

| Screen | Content |
|--------|---------|
| `/hall/supplies` | Unified: canteen statuses + hall supply SKUs |
| Report sheet | Available from supplies page **and** shift view |
| Shift quick report | Deep link → same sheet |

**Removed:** Split report (shift only) vs manage (canteen only) discovery problem.

---

## 9. Browse & save to hall

### v3

```mermaid
flowchart LR
  A["Discover tab"] --> B[Search / chip filter]
  B --> C["/recipes/:slug"]
  C --> D[Recipe preview sheet]
  D --> E{Action}
  E -->|Cook tonight| F["Tonight tab + Cook Mode"]
  E -->|Save to hall| G{Joined hall?}
  G -->|Yes| H["Hall favorites"]
  G -->|No| I[Join prompt]
```

Discover opens recipe as **sheet** over tab bar; "Cook tonight" hands off to Tonight tab with context.

---

## 10. Hall Pro upgrade

### Today (v2)

Paywall on settings → "View plans" → personal plans page → user confused.

### v3

```mermaid
flowchart TD
  A[Member hits locked feature] --> B["/hall/shopping or /supplies"]
  B --> C[Inline lock card]
  C --> D["Ask your captain"]
  D --> E{Is captain?}
  E -->|Yes| F["/hall/settings/billing"]
  E -->|No| G[Share message to captain]
  F --> H[Start trial]
  H --> I[Return to feature — unlocked]
```

| User | Experience |
|------|------------|
| Member | Never sees `/me/plans` for hall features |
| Captain | Billing only under Hall settings |
| `/me/plans` | Personal tier only |

---

## 11. Return visit

### v3 default routing

```mermaid
flowchart TD
  A[App open] --> B{Auth + hall?}
  B -->|Guest| C["/tonight"]
  B -->|Authed, no hall| D["/tonight"]
  B -->|Authed + hall member| E{Last tab persisted}
  E --> F["/hall" or /tonight]
  B -->|SEO entry /| G["/ marketing"]
  G --> H{Authed?}
  H -->|Yes| F
  H -->|No| G
```

| Signal | Default tab |
|--------|-------------|
| Within 2h of shift start (reminder) | Hall |
| Active vote exists | Tonight |
| Default | Last used tab or Tonight |

---

## Cross-flow comparison

### Navigation depth (tap count to goal)

| Goal | v2 taps | v3 taps |
|------|---------|---------|
| Generate meal | 2–4 (home → nav → generator) | 1–2 (Tonight → Generate) |
| Join hall from invite | 4–7 (+ wrong landing) | 2–3 (Hall sheet → Join) |
| Hall shopping list | 3–5 (+ scroll hash) | 2 (Hall → Shopping) |
| Cook at stove | 3+ (recipe → find Cook Mode) | 1 (auto Cook Mode) |
| Report canteen item | 4+ (find shift page) | 2 (Hall → Supplies → Report) |

### Modal vs route policy (v3)

| Use modal/sheet | Use full route |
|-----------------|----------------|
| Sign in | Discover grid |
| Join / create hall | Tonight generate |
| Personal shopping list | Hall shopping |
| Vote create (quick) | Vote participate (share URL) |
| Recipe preview from Discover | Cook Mode |
| Report supply item | Hall settings |

---

## Persona quick paths

### Probie (first week)

```
Invite link → Hall tab join → /hall
Tonight tab → Generate → Vote link to crew
```

### Senior (skeptic)

```
Tonight tab → Wheel → Cook Mode
(No account required)
```

### Hall cook (shift night)

```
Tonight: Generate + Vote
Hall: Shopping list
Tonight: Cook Mode
```

### Canteen manager

```
Hall → Supplies → report / purchase
(Optional) Hall → Shopping for joint run
```

### Captain (setup once)

```
Hall → Create → Invite row
Hall → Settings → Billing (Hall Pro)
Never blocks crew on onboarding funnel
```

---

## Implementation checklist (flows)

| Flow | Depends on |
|------|------------|
| Join → `/hall` | Redirect fix + join sheet |
| Tonight hub state | Active vote API on hub load |
| `/hall/shopping` | Extract panel from settings |
| Cook Mode default | Recipe open handler |
| Magic link return URL | Auth redirect with `?next=` |
| Tab bar | `AppTabShell` component |
| Paywall CTA | Point to `/hall/settings/billing` |

---

## Related documents

| Doc | Contents |
|-----|----------|
| `screen-map-v3.md` | Every route, duplicates, orphans |
| `navigation-v3.md` | Tab IA, chrome, migration phases |
| `firefighter-user-journeys.md` | Persona pain points that drove v3 |

---

*End of user flows v3.*
