# Mobile Redesign Revert

**Date:** 2026-06-22  
**Action:** Complete UI-only rollback of the Mobile First Redesign Sprint and iPhone HIG redesign.  
**Baseline restored:** Git commit `f9aeb04` — *Simplify meal generator, add returning-user personalization, and refresh fire-service branding.*

No merge conflicts. All redesign work was uncommitted local changes; revert used `git checkout HEAD -- client/src/` plus deletion of new untracked files.

---

## What was reverted

### Homepage
- Hero min-height, punchlines, dual CTAs, trust line spacing
- Section visibility (`HomeWhyCrews`, `HomeHallVote`, `HomeCtaBand` visible on mobile again)
- Section padding (`home-how-it-works`, `home-featured-meals`, `home-faq-section`)
- Marketing route `/` serves `home.tsx` again (no redirect to `/home`)

### Generator
- Original field order: Crew → Protein → Appliances → Healthiness → Allergies
- Sticky CTA before and after meal (not post-meal only)
- `SiteHeader` + page headline/subline/wheel link
- `RecentlyCookedStrip` visible on generator
- Original padding and layout grid

### Design system
- `design-tokens.ts` — removed `space`, `radius`, `cardPad`, `stackSm/Md/Lg`, motion tap token
- `index.css` — `px-page` back to 1.125rem; removed `--space-*` / `--motion-*` vars
- `button.tsx` — default `min-h-9`, icon `h-9 w-9`
- `card.tsx` — `p-6` padding restored

### Navigation & chrome
- `site-header.tsx` — mobile CTA `h-9` restored
- `app-top-bar.tsx`, `me-subpage-shell.tsx`, `hall-shell.tsx` — pre-redesign layouts
- `hall-feedback-shell.tsx` — FAB visible on `/generator` again
- Tab pages (`app-home`, `tonight`, `me`, `hall`) — HubTile / section card layouts restored
- `explore-discovery-page.tsx` — `SiteHeader`, mobile subtitle block, footer restored
- `classics-wheel.tsx` — marketing header, L&S copy, footer restored

### iPhone HIG additions (removed entirely)
- Deleted `client/src/components/ios/*`
- Deleted `client/src/hooks/use-in-app-shell.ts`

### Review docs from redesign (removed)
- `review/mobile-redesign.md`
- `review/iphone-hig-redesign.md`

---

## Reverted files (restored from `f9aeb04`)

```
client/src/App.tsx
client/src/components/app-shell/app-top-bar.tsx
client/src/components/app-shell/me-subpage-shell.tsx
client/src/components/explore-catalog-browser.tsx
client/src/components/generator/simplified-generator-form.tsx
client/src/components/hall-dashboard/v2/hall-dashboard-v2.tsx
client/src/components/hall-dashboard/v2/hall-identity-header.tsx
client/src/components/hall-dashboard/v2/hall-tonight-section.tsx
client/src/components/hall-feedback/hall-feedback-shell.tsx
client/src/components/hall/hall-shell.tsx
client/src/components/home/home-faq-section.tsx
client/src/components/home/home-featured-meals.tsx
client/src/components/home/home-hero.tsx
client/src/components/home/home-how-it-works.tsx
client/src/components/site-header.tsx
client/src/components/ui/button.tsx
client/src/components/ui/card.tsx
client/src/index.css
client/src/lib/design-tokens.ts
client/src/pages/account-page.tsx
client/src/pages/app-home-page.tsx
client/src/pages/classics-wheel.tsx
client/src/pages/explore-discovery-page.tsx
client/src/pages/favorites.tsx
client/src/pages/generator.tsx
client/src/pages/hall-page.tsx
client/src/pages/home.tsx
client/src/pages/me-history-page.tsx
client/src/pages/me-page.tsx
client/src/pages/me-settings-page.tsx
client/src/pages/plans-page.tsx
client/src/pages/tonight-page.tsx
```

## Deleted files (redesign-only, not in baseline)

```
client/src/components/ios/ios-list-group.tsx
client/src/components/ios/ios-list-row.tsx
client/src/components/ios/ios-large-title.tsx
client/src/components/ios/ios-primary-button.tsx
client/src/components/ios/ios-screen.tsx
client/src/hooks/use-in-app-shell.ts
review/mobile-redesign.md
review/iphone-hig-redesign.md
```

---

## Not touched (as requested)

Generator filtering/matching logic, authentication, hall features, shopping list, canteen, protein deals, billing, SEO metadata, backend, database, API routes — unchanged at `f9aeb04`.

---

## Merge conflicts

**None.** Revert was a clean checkout of tracked files; no conflict resolution required.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run check` | ✅ Pass |
| `npm run build` | ✅ Pass |
| `npm run dev` | ✅ Started (port 5000) |

---

## UI restoration confirmation

| Surface | Status |
|---------|--------|
| Homepage hero & sections | ✅ Matches pre-redesign (`f9aeb04`) |
| Generator layout & field order | ✅ Crew-first form; dual sticky/inline CTA pattern restored |
| Button/card/spacing tokens | ✅ Pre-redesign values |
| Navigation (header, tabs, FAB) | ✅ Pre-redesign behavior |
| App tab hubs (Home/Tonight/Me/Hall) | ✅ HubTile / section cards restored |
| Explore / Wheel chrome | ✅ SiteHeader + footers restored |
| iOS component layer | ✅ Removed |
| `client/src/` git diff vs HEAD | ✅ Clean (no remaining redesign changes) |

**Previous UI has been fully restored.**
