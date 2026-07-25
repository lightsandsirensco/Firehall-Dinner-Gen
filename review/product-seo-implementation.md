# Product SEO implementation (Phase 11)

Public educational pages for major Firehall Meals features. **Private hall data is never indexed.**

## Pages

| Path | Feature |
|------|---------|
| `/hall-meal-planner` | Hall Meal Planner |
| `/firefighter-dinner-vote` | Dinner Voting |
| `/fire-hall-pantry` | Fire Hall Pantry Manager |
| `/canteen-manager` | Canteen Manager |
| `/cost-per-plate-calculator` | Cost Per Plate Calculator |
| `/fire-hall-grocery-list` | Crew Shopping List |
| `/fire-station-kitchen-inventory` | Kitchen Inventory |
| `/firefighter-meal-calendar` | Meal Calendar |
| `/crew-grocery-budget` | Hall Grocery Budget |
| `/classics-wheel` | Classics Wheel explainer (spin live at `/wheel`) |

## Page anatomy

Each page includes:

1. Problem firefighters face  
2. How stations currently workaround it  
3. UI previews (mock frames; optional real images via `screenshots[].src`)  
4. Firehall Meals solution  
5. FAQs + FAQ + SoftwareApplication + Breadcrumb schema  
6. CTAs (public tools and/or `/hall/join`)  
7. Links to recipes + guides  
8. Related product pages  

## Code

- Data: `shared/seo/product-pages-data.ts`
- Page: `client/src/pages/seo-product-page.tsx`
- Schema: `buildSoftwareApplicationSchema` in `shared/seo/schema.ts`
- Sitemap: `allProductSeoPagePaths()` in `server/seo/sitemap.ts`
- Hub: product links in `client/src/components/seo/internal-link-hub.tsx`

## Privacy

- `/hall/*` remains noindex / robots Disallow as configured elsewhere  
- Product SEO copy explicitly states educational-only positioning  
- No roster, vote, pantry count, or budget values on public pages  

## Follow-ups

- Add real screenshots under `client/public/images/product/` and wire `src`  
- Cross-link from high-traffic guides and `/hall/features`  
- Build interactive public cost-per-plate widget when ready (page already ranks the intent)
