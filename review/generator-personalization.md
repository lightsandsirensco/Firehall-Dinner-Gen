# Generator Personalization — Returning User Optimization

**Date:** June 22, 2026  
**Goal:** A returning firefighter reaches dinner in **three taps** — open app, confirm protein (optional), tap **Find Tonight's Meal**.

---

## Field Audit — Remember vs Ask

| Generator question | First visit | Returning (device) | Signed-in | Linked hall | Source |
|-------------------|-------------|-------------------|-----------|-------------|--------|
| **Crew size** | Ask (default 5–8) | Remember last bucket | Profile crew or remembered | **Hall `crew_size`** (editable tonight) | Hall > personal > local profile |
| **Protein** | Ask (default chicken) | **Remember last** | **Remember last** | **Remember last** | Personal prefs (`firehall_generator_personal_v1`) |
| **Appliances** | Optional (all common) | Remember last session | Account appliance prefs | **Hall appliances (locked)** | Hall settings when linked |
| **Healthiness** | Ask (default balanced) | **Remember last** | **Remember last** | **Remember last** | Personal prefs |
| **Allergies** | Ask (none) | **Remember last** | Account dietary + remembered | **Remember last** | Personal prefs > account dietary |

### Removed repeat questions

When the system already knows an answer, the returning-user UI **does not re-ask**:

- Linked hall: appliances hidden (read from hall settings)
- Returning user: crew, healthiness, allergies collapsed into summary
- Only **protein** stays visible for a one-tap confirm/change

---

## Fields Remembered

Stored in `localStorage`:

| Key | Contents |
|-----|----------|
| `firehall_generator_personal_v1` | Protein, healthiness, allergens, optional crew bucket |
| `firehall_generator_v2` | Full last session (all five fields) |
| `firehall_generator_has_used` | Flag — enables returning-user compact UI |

Personal prefs update on every filter change (after first render) and on successful generation.

---

## Hall Defaults

When user is linked to a hall (`useHallMembership` + `fetchHallDetail`):

| Field | Hall source | Behavior |
|-------|-------------|----------|
| Crew size | `hall.crew_size` | Pre-filled bucket; editable via "Adjust crew, appliances & more" |
| Appliances | `hall.appliances` | **Always from hall** — shown as read-only summary; not overridable per shift |

Hall merge runs once when hall detail loads or active hall changes.

---

## Personal Defaults

| Field | Source | Priority |
|-------|--------|----------|
| Protein | Last generator selection | Beats account `preferred_proteins[0]` |
| Healthiness | Last generator selection | No account field — device only |
| Allergies | Last generator selection | Beats account `dietary_restrictions` |
| Appliances (no hall) | Last session, then account `appliance_preferences` | Session first |

Account dietary restrictions map to generator allergens (dairy, gluten, nuts, shellfish, eggs). Vegetarian/vegan/soy are excluded from allergen mapping.

---

## User Flows

### First-time user

1. Opens `/generator` — full five-question form
2. All fields visible with sensible defaults (crew 5–8, chicken, balanced)
3. Summary + **Find Tonight's Meal**
4. After first change or generation → personal prefs saved → returning mode enabled

### Returning user (no hall)

1. Opens app → compact **Tonight's pick** card
2. Summary shows remembered crew, appliances, healthiness, allergies
3. **Protein tonight** chips — confirm or change (0–1 taps)
4. **Find Tonight's Meal** (1 tap)
5. **Total: 1–2 taps** if protein unchanged

### Linked hall flow

1. Hall name shown: `{Hall} · tonight's pick`
2. Crew + hall appliances + healthiness + allergies in summary
3. Protein chips + generate
4. Appliances locked to hall settings
5. **Total: 1–2 taps** (same as returning)

### Expand filters

**Adjust crew, appliances & more** → full form for tonight-only edits. Crew and allergies editable; appliances remain hall-sourced when linked.

---

## Implementation

| File | Role |
|------|------|
| `shared/generator-personalization.ts` | Merge rules, mapping, parse/save types |
| `client/src/lib/generator-personalization.ts` | localStorage + load/merge helpers |
| `client/src/components/generator/simplified-generator-form.tsx` | Compact returning UI + hall appliance lock |
| `client/src/pages/generator.tsx` | Auth/hall merge, persist on change |
| `client/src/lib/hall-profile-store.ts` | Crew size reads from generator v2 keys |

---

## Validation Results

| Command | Status |
|---------|--------|
| `npx tsc` | Run in CI check |
| `npm run test:generator-personalization` | Merge rule unit tests |
| `npm run test:generator-simplified-qa` | 120/120 hard-filter pass (unchanged) |
| `npm run build` | Production build |
| `npm run dev` | Dev server |

---

## Success Metric

> A firefighter who cooked chicken last shift opens the generator, sees **Chicken** already selected with their hall's BBQ + oven, and taps **Find Tonight's Meal** without re-entering crew, appliances, healthiness, or allergies.

**Target:** 3 taps max — open → (optional protein change) → generate.
