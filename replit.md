# Lights & Sirens - Firehall Meal Generator

## Overview
A single-page web app that generates one high-protein meal recipe for a firefighter crew based on user-selected filters. Uses AI (OpenAI via Replit AI Integrations) to create complete recipes from CSV meal templates.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js
- **AI**: OpenAI (gpt-5-mini) via Replit AI Integrations
- **Data**: CSV file at `/data/firehall_templates_v1.csv`
- **Cache/Rate DB**: SQLite at `data/cache.db` (auto-created) for recipe caching, rate limiting, usage tracking

## Key Files
- `client/src/pages/home.tsx` - Main single-page UI
- `client/src/pages/admin.tsx` - Admin usage dashboard (route: /admin)
- `client/src/components/filter-panel.tsx` - Left panel with all filters
- `client/src/components/recipe-card.tsx` - Right panel recipe output
- `client/src/components/empty-state.tsx` - Empty state before generating
- `client/src/components/loading-state.tsx` - Skeleton loading
- `client/src/components/error-state.tsx` - Error / no-match states
- `server/routes.ts` - POST /api/generate endpoint, CSRF, rate limiting, admin endpoint
- `server/cache-store.ts` - SQLite-backed caching, rate limiting, usage tracking
- `server/templates.ts` - CSV loading and template filtering logic
- `server/ai.ts` - OpenAI recipe generation with token tracking
- `shared/schema.ts` - Zod schemas and TypeScript types
- `scripts/pregen.ts` - Pre-generation script for cache warming
- `data/firehall_templates_v1.csv` - 30 meal templates

## Design
- Dark, premium firehouse aesthetic
- Bebas Neue for headings/buttons/titles
- Inter for body text
- Primary color: fire engine red-orange (hsl 6 78% 50%)

## API
- `POST /api/generate` - Accepts GenerateRequest JSON, returns GenerateResponse JSON
- `GET /api/csrf-token` - Returns CSRF token (set as cookie)
- `GET /api/admin/usage` - Admin usage dashboard data (protected by ADMIN_SECRET env var)
- Template filtering: busy_level, time, appliances, proteins, allergens
- Anti-repeat: last_template_id excludes previous template
- AI retry: 3 attempts with exponential backoff on empty/error responses
- On generation failure, last recipe stays visible (only cleared on no-match)
- `vegetarian_swap_needed` (boolean): when true, recipe includes a `veg_option` section with swap_protein, ingredients, steps, and plating_notes for 1 vegetarian crew member
- Veg option respects allergens_to_avoid (e.g., no tofu/tempeh if soy allergy, no paneer if dairy)

## Cost Control
- **Caching**: SHA256 hash of template_id + normalized filters -> SQLite recipe_cache table
- **Rate Limiting**: 3 req/min burst + 10 req/hr per IP and session (atomic SQLite transactions)
- **Budget**: Daily cap via DAILY_LLM_BUDGET_USD env var (default $5.00), returns 503 when exceeded
- **Bot Blocking**: User-agent filtering for known bot/scraper patterns
- **CSRF**: Token-based validation on POST /api/generate
- **Admin**: Usage dashboard at /admin showing budget, cache stats, request logs, top IPs/sessions

## Klaviyo Email Capture
- `POST /api/email-recipe` - Subscribes email to Klaviyo list + tracks "Recipe Generated" event
- Auto-creates "Firehall Dinner Generator Leads" list in Klaviyo
- Email modal appears after 2nd recipe generation or via "Email me this recipe" button
- Klaviyo Flow handles actual email delivery (not custom sender)
- server/klaviyo.ts - Klaviyo API integration (profile subscribe, event tracking)
- client/src/components/email-modal.tsx - Email capture modal UI

## Environment Variables
- `DAILY_LLM_BUDGET_USD` - Daily AI spending cap (default: "5.00")
- `ADMIN_SECRET` - Optional admin API key for /api/admin/usage (open in dev if not set)
- `SESSION_SECRET` - Session encryption key
- `KLAVIYO_API_KEY` - Klaviyo private API key for email capture

## Use What We Have Mode
- Toggle in filter panel enables "pantry mode"
- Users enter comma-separated ingredients they have on hand
- Protein filter is hidden when mode is active
- Template filtering bypasses protein matching in this mode
- AI generates recipes prioritizing provided ingredients
- Response includes ingredients_used[] and extra_items_needed[]
- Recipe card shows "Using What You Have" section with used ingredients
- "You may need to grab" section shows 1-4 extra items if needed
- Print layout also includes pantry sections
- Cache key includes use_what_we_have and ingredients_on_hand

## User Preferences
- No accounts, meal plans, history, template management, or Shopify
