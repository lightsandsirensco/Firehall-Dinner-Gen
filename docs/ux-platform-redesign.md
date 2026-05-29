# Firehall Meals — Platform UX/UI Redesign

**North star:** *The operating system for feeding the hall.*

**Reference principles (not visual copies):** Uber (clarity, one action), Airbnb (editorial trust), Sweetgreen (curated food), Whoop/Oura (calm data), Apple Fitness (confident hierarchy), Linear/Notion (restraint, spacing).

---

## 1. UX audit (current state)

| Area | Issue | Severity |
|------|--------|----------|
| Home | Full truck hero + duplicate headlines compete with generate CTA | High |
| Home | Filter panel reads as dashboard; too many labels before first tap | High |
| Home | SEO block above fold on desktop dilutes product focus | Medium |
| Explore | Eyebrows (“Curated · not random AI”, shift-aware feed) feel amateur | High |
| Explore | Rail headers stack hook + badge + chips + subtitle | High |
| Explore | Cards show “Why this meal”, multiple badges, trust lines | Medium |
| Recipe | Badge row + nutrition grid + multiple Card shells feel admin | High |
| Recipe | “Hall score”, “Explore catalog” copy is internal | Medium |
| Generator | Loading/error states OK; send-gate failures felt “broken” (fixed server-side) | Fixed |
| Global | Ember/red overused; Inter + Bebas without clear type scale | Medium |
| Mobile | Sticky bars + filter column + hero = crowded | High |

**What works:** Dark base, food imagery pipeline, one-tap generate concept, curated catalog depth.

---

## 2. Information hierarchy (new)

```
L0  Brand + nav (chrome, minimal)
L1  Primary question / action (one per screen)
L2  Content (meal, rails, recipe body)
L3  Secondary actions (More options, shift chips, related)
L4  Metadata (time, crew, cuisine) — sparse, icon+word
L5  SEO / legal / attribution (footer only)
```

**Screen intents**

- **Home:** Decide dinner → generate → read recipe
- **Explore:** Browse curated meals → open recipe
- **Recipe:** Understand dish → cook → optional related

---

## 3. Design system direction

### Color
- **Canvas:** warm black `#0c0c0c`, charcoal `#141414`
- **Surface:** smoke `#1a1a1a`, elevated `#222`
- **Text:** ivory `#f2efe8`, muted `#9a9590`
- **Accent:** ember `#e85d2a` (primary actions only)
- **Steel:** borders `white/6%`, never harsh `#333` grids

### Typography
- **Display:** Bebas Neue — titles only, large, tight tracking
- **Body:** Inter — 15–16px, regular + medium only
- **Scale:** display 40–56 / title 24–32 / body 15–16 / caption 12–13

### Imagery
- Editorial crop, `contain-blur` on cards, full-bleed heroes
- Desaturate overlays; no Pinterest saturation
- UI defers: gradients only at image edges

### Motion
- 200–380ms ease-out; skeleton shimmer; meal-reveal on result
- No parallax, no bounce, no confetti

---

## 4. Component redesign plan

| Component | Change |
|-----------|--------|
| `TonightHero` | Replace home truck banner; single L1 headline |
| `EmptyState` | “What’s for dinner tonight?” + one CTA |
| `FilterPanel` | Quick picks only; More options collapsed default |
| `AppPageHeader` | `minimal` variant for Explore |
| `ExploreRailHeader` | Title + one line; hide chip row default |
| `ExploreCinematicCard` | Title + time only on image |
| `GoldenRecipePage` | Full-bleed hero, quiet meta, flat sections |
| `design-tokens` + `index.css` | Tokens, `.btn-tonight`, `.text-display` |

---

## 5–8. Screen plans (summary)

**Home:** SiteHeader → TonightHero (L1) → [Results | Empty CTA] + slim filter column. SEO → footer accordion.

**Explore:** Minimal header “Explore” / one subtitle → optional shift row → rails only.

**Recipe:** Edge-to-edge hero → 3 meta pills → description → ingredients → steps → tips as simple lists (no Card chrome).

---

## 9. Mobile-first

- 44px min touch targets (existing)
- Single column; filters in sheet on mobile (existing)
- Sticky generate bar stays; reduced copy
- `px-page` 16px → 20px on sm+
- Hero recipes: `pb-safe-nav` preserved

---

## 10. Typography system

See `client/src/lib/design-tokens.ts` → `type` scale.

---

## 11. Spacing / layout

- **Page gutter:** 16 mobile / 24 tablet / 32 desktop
- **Section gap:** 32 mobile / 48 desktop
- **Card gap:** 12 rail / 16 grid
- **Max width:** home 1600, explore 1320, recipe 720

---

## 12. Implementation order

1. ✅ Tokens + CSS foundation  
2. ✅ Home (`TonightHero`, `EmptyState`, home layout)  
3. ✅ Explore (header, rails, cards)  
4. ✅ Recipe page (golden-recipe-page)  
5. ✅ Filter panel polish + loading copy  
6. ✅ `RecipeCard` (generator result) pass  
7. ✅ Site header nav simplification  
8. ✅ Pizza / wheel / favorites alignment  

---

*Phases 1–2 implemented in this branch.*
