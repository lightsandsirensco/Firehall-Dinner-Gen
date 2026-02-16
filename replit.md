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

## Use What's in the Fridge Mode
- Toggle in filter panel enables "pantry mode" (labeled "Use What's in the Fridge")
- Users enter comma-separated ingredients they have on hand
- Protein filter is hidden when mode is active
- Template filtering bypasses protein matching in this mode
- AI generates recipes prioritizing provided ingredients
- Response includes ingredients_used[] and extra_items_needed[]
- Recipe card shows "Using What's in the Fridge" section with used ingredients
- "You may need to grab" section shows 1-4 extra items if needed
- Print layout also includes pantry sections
- Cache key includes use_what_we_have and ingredients_on_hand

## Budget Feature
- Filter dropdown with Low ($), Standard ($$), Splurge ($$$)
- Request field: budget_level ("low" | "standard" | "splurge"), default "standard"
- Response fields: budget_level (string), budget_tips (string[])
- Low ($): AI prefers cheap proteins/staples, avoids premium ingredients, includes 2-3 budget_tips
- Standard ($$): Normal balanced choices, no constraints
- Splurge ($$$): Premium ingredients allowed (ribeye, salmon, shrimp, etc.)
- In pantry mode, budget only influences extra_items_needed suggestions
- "Budget-friendly" badge shown on recipe card when budget_level is "low"
- Budget tips section shown with lightbulb icon when tips exist
- Print layout includes budget label and tips
- Cache key includes budget_level

## Homemade Pizza Night (route: /pizza)
- Separate page at /pizza with its own filters and recipe output
- Navigation links between Meal Generator (/) and Pizza Night (/pizza) in header
- Controls: crew_size (2-20), time_available (30-45/45-60/60-90/90-150), dough_option (premade/from_scratch/surprise_me), style_preference (classic/creative/comfort/healthier), heat_level (mild/medium/spicy), allergens_to_avoid, vegetarian_swap_needed
- POST /api/generate-pizza endpoint with same rate limiting, caching, budget protections
- 23 pizza concepts rotated randomly (hot honey pepperoni, Big Mac, buffalo chicken, BBQ chicken, philly cheesesteak, taco, chicken bacon ranch, garlic parm white, meatball ricotta, hawaiian, spicy italian, greek, veggie supreme, margherita, cheeseburger, breakfast, nashville hot chicken, pesto chicken, mushroom truffle, donair, leftovers, meat lovers, supreme classic)
- Anti-repeat: last_pizza_style_id excludes previous concept
- Allergen filtering: breakfast pizza excluded if eggs avoided, pesto chicken excluded if nuts avoided
- Dough handling: premade gives stretching tips + shorter time; from-scratch includes full recipe with make-ahead notes
- Response: PizzaResponse with pizza_style_id, title, dough_type, why_this_works, recommended_pizzas, timing (prep/bake/total), oven_setup (temp F/C, rack, surface), ingredients grouped (dough/sauce/cheese/toppings/drizzles), build_steps, protein_safety, veg_option, cleanup_tip, macros_per_serving
- Veg option: no tofu, uses plant-based crumbles/mushrooms/roasted veg, matches same flavor profile
- Pizza scaling: crew 6 = 3-4 pizzas, crew 10 = 5-6, etc.
- Print + Email buttons reuse existing patterns (print-friendly layout, Klaviyo flow)
- Key files: client/src/pages/pizza-night.tsx, client/src/components/pizza-filter-panel.tsx, client/src/components/pizza-card.tsx, server/pizza-ai.ts

## Shopping List Feature
- Available on both Meal Generator and Pizza Night pages
- "Shopping List" button next to Print / Email actions on recipe cards
- Deterministic: built from existing recipe JSON, no extra AI calls
- Modal with Copy List, Print List, Email List actions
- Ingredients categorized into grocery sections: Proteins, Produce, Dairy/Dairy Alternatives, Pantry & Spices, Bakery/Dough, Frozen, Condiments & Sauces, Other
- Duplicate items merged with amounts combined
- Ingredient-first formatting: "Chicken thighs — 1.8 kg"
- Pantry mode ("Use What's in the Fridge"): shows "Using what's in the fridge" and "You may need to grab" sections
- Budget "Low ($)": includes budget swap suggestions for premium items
- Veg option items shown under "Veg Option (1 Serving)" subheading (no tofu)
- Print prints only the shopping list (white background, black text, footer: www.lightsandsirensco.com)
- Email uses Klaviyo flow with "Shopping List Requested" event
- POST /api/email-shopping-list endpoint with Klaviyo integration
- Key files: client/src/lib/shopping-list.ts, client/src/components/shopping-list-modal.tsx
- Helper: buildShoppingListFromMeal(recipe, options) and buildShoppingListFromPizza(recipe, options)

## User Preferences
- No accounts, meal plans, history, template management, or Shopify
