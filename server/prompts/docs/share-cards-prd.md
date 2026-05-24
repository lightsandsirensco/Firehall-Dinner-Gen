# PRD: Instagram-Ready Share Cards

**Product:** FirehallMeals  
**Status:** Draft  
**Owner:** Product  
**Goal:** Turn every winning meal into **organic station marketing** — one tap from recipe card to a branded image optimized for Instagram Stories, Reels covers, and group chats.

---

## 1. Problem & opportunity

### Current state
- Recipe card offers **Print**, **Email**, **Shopping list**, **Save** — no share-to-social path.
- Roadmap flags **share image inconsistencies** (missing logo, bad formatting) — no unified system exists.
- Users screenshot the app UI → cropped chrome, no logo, inconsistent typography, poor Story aspect ratio.
- Product vision lists **Instagram shares** as a core success metric; shareability is a current focus pillar.

### Opportunity
Firefighters share station life constantly. A **deterministic, on-brand 1080×1920 (Story) card** with meal title, hero visual, crew/time, and `firehallmeals.com` watermark drives:
- Organic discovery (crew → other halls → DMs)
- Brand recall (not “random recipe app screenshot”)
- Trust (“built for the hall” visual language)

### Success definition
Cook taps **Share to crew** → native share sheet or save image → posts to Instagram Story without editing → at least one peer asks “what app is that?”

---

## 2. Goals & non-goals

### Goals
| # | Goal |
|---|------|
| G1 | **Mobile-first** share flow ≤3 taps from recipe card |
| G2 | **Firefighter branding** — dark hall aesthetic, flame accent, logo, no influencer/diet vibes |
| G3 | **Native share** via Web Share API (`files[]`) where supported; graceful download fallback |
| G4 | **Story/Reel ready** — 9:16 primary; optional 1:1 feed variant later |
| G5 | **Visual consistency** — single template system; same card on generator, pizza, explore detail |
| G6 | **Organic growth** — URL + subtle CTA on every card |

### Non-goals (v1)
- In-app Instagram OAuth posting
- Video/Reel generation or animated templates
- User-editable templates or Canva-style editor
- Hashtag auto-copy packs (v1.1 candidate)
- Share cards for Hall Vote QR (separate initiative)
- TikTok-specific safe zones (use Story margins; sufficient for v1)

---

## 3. User flows

### 3.1 Primary — Share tonight’s meal (happy path)

| Step | Actor | Action | System |
|------|-------|--------|--------|
| 1 | Cook | Views recipe card after generation | Meal visible with trust line |
| 2 | Cook | Taps **Share to crew** (recipe actions) | Opens share sheet modal or bottom sheet |
| 3 | System | Renders share card preview (9:16) | Canvas/DOM capture &lt;2s |
| 4 | Cook | Taps **Share** or **Save image** | `navigator.share({ files: [png] })` or download |
| 5 | Cook | Picks Instagram Story | Image fills frame; logo + title readable |
| 6 | Peer | Views Story | Sees brand + meal; optional link sticker added manually |

### 3.2 Native share supported (iOS Safari / Android Chrome)

```
Share to crew → Generate PNG → Web Share API (image/png file)
→ User selects Instagram / Messages / AirDrop
```

### 3.3 Fallback (desktop / unsupported browser)

```
Share to crew → Preview → Download PNG
→ Toast: "Image saved — upload to Instagram"
```

### 3.4 Optional copy link (secondary)

```
Share sheet → Copy link (firehallmeals.com or deep link ?classic=slug when applicable)
```

### 3.5 Explore / curated meal

Same flow from explore detail modal when full recipe is shown — card uses explore hero image or emoji fallback.

### 3.6 Pizza night

Pizza card uses pizza title + pizza hero styling; same template shell.

---

## 4. Mobile UX

### 4.1 Entry point
| Requirement | Spec |
|-------------|------|
| Location | Recipe card action row with Print / Email / List |
| Label | **Share to crew** (not “Instagram” — works for group texts too) |
| Icon | `Share2` or `Instagram` subline optional |
| Touch target | Min **48px** height |
| Visibility | Only when recipe loaded (not empty/loading) |

### 4.2 Share sheet (bottom sheet on mobile)
| Zone | Content |
|------|---------|
| **Preview** | Scrollable 9:16 card scaled to fit width (~280px wide preview) |
| **Primary** | **Share…** (native) |
| **Secondary** | **Save image** |
| **Tertiary** | **Copy link** (text) |
| **Dismiss** | Swipe down / Close |

### 4.3 Loading state
- Skeleton placeholder matching 9:16 aspect
- Copy: “Building your hall card…”
- Target render **&lt;1.5s** on mid-range Android

### 4.4 Error state
- “Couldn’t build image — try again” + retry
- Never silent fail

### 4.5 Safe zones (Story/Reel)
```
┌─────────────────────────┐  ← top 12%: avoid (IG UI)
│      [logo small]       │
│                         │
│    HERO IMAGE 60%       │
│                         │
│   TITLE (max 2 lines)   │
│   Crew · Time · Protein │
│   Trust line            │
│   firehallmeals.com     │  ← bottom 14%: avoid (IG swipe-up)
└─────────────────────────┘
     1080 × 1920 px
```

---

## 5. Visual design system

### 5.1 Brand tokens (align with app)
| Token | Value |
|-------|--------|
| Background | `#0a0a0a` → `#141414` gradient |
| Accent | `#C62828` (primary red) |
| Text primary | `#f5f5f5` |
| Text muted | `#a3a3a3` |
| Font headline | `font-heading` (same as app — Bebas/heading stack) |
| Font body | System sans |

### 5.2 Card layout (Story 1080×1920)
1. **Top bar:** Flame icon + `FIREHALL MEALS` wordmark (SVG, always embedded — fixes “logo missing”)
2. **Hero:** Meal image (from `recipe.image_url` or cinematic fallback gradient + emoji)
3. **Title:** Recipe title, max 2 lines, ellipsis
4. **Meta row:** `Crew of 6 · ~35 min · Chicken` (from filters + recipe)
5. **Trust line:** Output of `buildRecipeTrustLine()` — one line, muted
6. **Footer:** `firehallmeals.com` + thin red rule

### 5.3 Photography rules
- `object-fit: cover`; center bias
- Dark gradient scrim behind title for readability
- No raw screenshot of app chrome

### 5.4 What to avoid (per product vision)
- Calorie macros as hero text
- “Healthy eating” / diet culture imagery
- Busy ingredient lists on the card
- Stock photos that don’t match meal

### 5.5 Variants (v1 scope)
| Variant | Size | Priority |
|---------|------|----------|
| **Story** | 1080×1920 | P0 |
| **Square** | 1080×1080 | P2 (crop center from Story template) |

---

## 6. Native share behavior

### 6.1 Web Share API (Level 2 — files)
```typescript
if (navigator.canShare?.({ files: [pngFile] })) {
  await navigator.share({
    files: [pngFile],
    title: `${recipe.title} — Firehall Meals`,
    text: "Tonight's hall dinner",
  });
}
```

### 6.2 Capability detection
| Environment | Behavior |
|-------------|----------|
| iOS Safari 15+ | Native share with image file |
| Android Chrome | Native share with image file |
| Desktop Chrome | Often download only |
| In-app browsers (FB/IG) | Fallback download + copy link |

### 6.3 Filename
`firehall-{slug-title}-{date}.png` — filesystem-safe slug

---

## 7. Analytics events

Add `client/src/lib/share-analytics.ts` (or extend `analytics.ts`).

| Event | When | Params |
|-------|------|--------|
| `share_card_opened` | Share sheet opened | `source: generator \| explore \| pizza \| favorites` |
| `share_card_render_started` | Canvas begin | `format: story` |
| `share_card_render_ok` | PNG ready | `duration_ms`, `has_hero_image: boolean` |
| `share_card_render_failed` | Error | `error_type` |
| `share_card_native_share_clicked` | Share button | `can_share_files: boolean` |
| `share_card_native_share_completed` | share() resolved | — |
| `share_card_native_share_aborted` | User cancel | — |
| `share_card_download_clicked` | Save image | — |
| `share_card_link_copied` | Copy link | `url_type: home \| deep_link` |

**Growth metrics:**
- `share_card_opened` / `recipe_generated` sessions
- `share_card_native_share_completed` / `share_card_opened`

---

## 8. Edge cases

| Case | Behavior |
|------|----------|
| No hero image URL | Branded gradient fallback (match `MealHeroImage`) |
| Hero image CORS fail | Fallback before capture; never blank white |
| Very long title | 2-line clamp + ellipsis |
| Special characters in title | Render safely; slug ASCII for filename |
| Share API unsupported | Show Download + Copy link only |
| Share API throws AbortError | Silent (user cancelled) |
| Low memory / canvas OOM | Reduce export scale; retry once |
| Dark mode / light mode | Card always dark (brand constant) |
| User on desktop | Preview + download; no broken native share |
| Recipe with `_fallback: true` | Still shareable; trust line reflects fallback |
| Private browsing | Download may still work; share may not |
| Norton / security software | No extra deps with native compile; canvas only |

---

## 9. Technical requirements

### 9.1 Recommended approach
**DOM template + `html-to-image` or `html-to-image` → PNG** (pure client, no server round-trip).

Alternative: **Canvas 2D** manual draw — more control, more code.

**Avoid:** Server-side Puppeteer for v1 (latency, hosting cost).

### 9.2 Implementation sketch

| Piece | Responsibility |
|-------|----------------|
| `ShareCardTemplate.tsx` | Off-screen or fixed 1080×1920 DOM; brand layout |
| `lib/share-card.ts` | `buildShareCardPng(recipe, crewSize, filters)` → `Blob` |
| `ShareCardSheet.tsx` | Bottom sheet UI, preview, actions |
| `recipe-card.tsx` | Add `onShareClick` / inline handler |
| `assets/firehall-wordmark.svg` | Embedded logo (fix roadmap “logo missing”) |

### 9.3 Dependencies (proposed)
```json
"html-to-image": "^1.11.11"
```
- No native bindings (Windows-friendly, aligns with sql.js direction)
- `pixelRatio: 2` for crisp output; export at logical 1080×1920

### 9.4 Image loading
- Preload hero `Image()` with `crossOrigin = "anonymous"` only if CDN supports CORS
- Spoonacular images: use existing image URL; on CORS fail → fallback gradient
- Do not block share on external image — max 3s timeout → fallback

### 9.5 Performance
- Render off main thread if possible (v1.1); v1 acceptable on tap with spinner
- Cache last PNG per `recipe._id` in memory for re-share during session

### 9.6 Accessibility
- Button has `aria-label="Share meal card to crew"`
- Preview has alt text describing meal
- Share sheet focus trap

### 9.7 Privacy
- No PII on card (no email, no station name unless user-added later)
- No full ingredient list (reduces accidental allergen exposure in public posts)

---

## 10. Acceptance criteria

### Epic A — UI entry
- [ ] **AC-A1:** **Share to crew** visible on generator `RecipeCard` when recipe loaded.
- [ ] **AC-A2:** Touch target ≥48px; works on mobile bottom sheet layout.
- [ ] **AC-A3:** Button present on pizza recipe card (same pattern).

### Epic B — Visual output
- [ ] **AC-B1:** Exported PNG is **1080×1920** Story format.
- [ ] **AC-B2:** Includes Firehall wordmark/logo (SVG), not screenshot chrome.
- [ ] **AC-B3:** Shows title, crew size, time, protein, trust line, `firehallmeals.com`.
- [ ] **AC-B4:** Hero image or branded fallback — never empty white card.
- [ ] **AC-B5:** Readable on phone preview at arm’s length (title ≥48px equivalent at export).

### Epic C — Share behavior
- [ ] **AC-C1:** iOS Safari: native share sheet opens with PNG attachment.
- [ ] **AC-C2:** Android Chrome: native share with image file.
- [ ] **AC-C3:** Desktop/unsupported: **Save image** downloads PNG.
- [ ] **AC-C4:** User cancel does not show error toast.

### Epic D — Analytics
- [ ] **AC-D1:** Events in §7 fire on happy path.
- [ ] **AC-D2:** `share_card_render_ok` includes `duration_ms`.

### Epic E — Quality
- [ ] **AC-E1:** No regression to print/email/shopping list.
- [ ] **AC-E2:** Render completes in &lt;3s p95 on mobile throttling (Fast 3G + 4x CPU).
- [ ] **AC-E3:** `data-testid="button-share-recipe"` and `share-card-preview`.

---

## 11. Success metrics

| Metric | 30-day target |
|--------|----------------|
| Share opens / recipe views | **≥ 8%** |
| Share opens → native share or download | **≥ 60%** |
| Median render time | **&lt; 1.5s** |
| Support tickets re: broken share | **0** |
| Instagram / UTM inbound (if tracked) | **+10%** vs baseline |
| Qualitative: “Looks official” in user feedback | 3+ station testimonials |

---

## 12. Rollout plan

| Phase | Week | Scope |
|-------|------|--------|
| **0** | 1 | SVG wordmark asset + off-screen template (no button) |
| **1** | 2 | Generator recipe card + Story PNG + download fallback |
| **2** | 3 | Native Web Share files + analytics |
| **3** | 4 | Pizza + explore detail parity; copy link |

**Flag:** `SHARE_CARDS_V1=true` in env or localStorage.

---

## 13. Open questions

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Include QR to site on card? | v1.1 — clutters Story; URL text only |
| 2 | Deep link to recipe? | v2 — needs shareable recipe IDs |
| 3 | Hall Vote winner card? | Separate template later |
| 4 | User station name overlay? | v2 optional toggle |

---

## 14. Implementation order

1. `firehall-wordmark.svg` + `ShareCardTemplate.tsx`  
2. `buildShareCardPng()` + download fallback  
3. Share sheet UI + recipe card button  
4. Native `navigator.share` files  
5. Analytics  
6. Pizza / explore parity  

**Estimate:** ~2–4 dev days.
