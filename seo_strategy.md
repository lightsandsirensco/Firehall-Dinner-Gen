# SEO Strategy — Firehall Meals

## Site overview
Firehall Meals (https://www.firehallmeals.com) is a firefighter crew meal-planning platform providing AI-generated and curated recipes sized for firehouse crews. The app is a React SPA backed by an Express server.

## In scope
- Public marketing and content pages: homepage (`/`), SEO landing pages (`/firefighter-meals`, `/firehouse-recipes`, etc.), product SEO pages (`/hall-meal-planner`, etc.), recipe catalog pages (`/recipes/:slug`), guide/editorial articles (`/guides/:slug`), index pages (`/explore`, `/guides`, `/top-rated-recipes`, `/hall-of-fame`), specialty pages (`/firefighter-red-lead-recipe`, `/about`, `/faq`, `/how-we-test-recipes`, `/smoothies`, `/breakfast`, `/pizza`)

## Out of scope
- Authenticated/app pages: `/tonight`, `/hall`, `/me`, `/settings`, `/profile`, `/onboarding`, `/account`, `/plans`, `/favorites`, `/vote`, `/admin`

## Target audience
- Firefighters and firehouse cooks planning crew meals for shifts

## Primary keywords
- firefighter meals, firefighter recipes, firehall meals, fire station meals, firehouse recipes, meals for firefighters, firefighter dinner ideas, crew meals, station meals, firehouse cooking, healthy firefighter meals

## Rendering architecture
- Pure React SPA — all public content is client-side rendered
- Express catch-all at `server/static.ts` serves `index.html` for all routes
- No SSR, no prerendering layer exists

## Dismissed categories
- (None yet)
