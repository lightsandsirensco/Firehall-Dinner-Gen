# Lights & Sirens - Firehall Meal Generator

## Overview
Lights & Sirens is a single-page web application designed to generate high-protein meal recipes specifically for firefighter crews. Leveraging AI, it creates complete recipes based on user-selected filters, ensuring variety and adherence to dietary needs. The project aims to provide a practical tool for firehall meal planning, offering features like budget control, pantry integration, and even a dedicated pizza night generator.

## User Preferences
No accounts, meal plans, history, template management, or Shopify

## System Architecture
The application features a modern full-stack architecture. The frontend is built with **React, Vite, TailwindCSS, and shadcn/ui**, providing a responsive and aesthetically pleasing user interface with a dark, premium firehouse aesthetic using specific typography and color schemes. The backend, powered by **Express.js**, handles API requests, data processing, and AI integration. **OpenAI (gpt-5-mini)** is utilized via Replit AI Integrations for recipe generation. Data is managed through a CSV file for meal templates and an **SQLite database** (`data/cache.db`) for recipe caching, rate limiting, and usage tracking.

Key features include:
- **Meal Generation**: Generates recipes based on filters such as busy level, time, appliances, proteins, allergens, and budget level (Low, Standard, Splurge).
- **Pantry Mode**: "Use What's in the Fridge" mode allows users to input available ingredients, influencing AI-generated recipes.
- **Vegetarian Swap**: Provides a vegetarian option for one crew member, respecting allergens.
- **Pizza Night**: A dedicated section for generating pizza recipes with specific filters (crew size, time, dough option, style, heat level).
- **Shopping List**: Automatically generates a categorized shopping list from recipes, with options for printing and emailing.
- **Hall Favorites**: Client-side (localStorage) saving plus a backend `POST /api/favourites` endpoint with a max of 5 favourites per session (in-memory store, idempotent, newest-first).
- **Hall Vote**: Enables creation and sharing of vote polls for recipes among crew members, with real-time results.
- **Cuisine Style Filter**: Allows users to specify a cuisine preference, influencing flavor profiles without overriding core constraints.
- **Structure Rotation System**: Each generation selects a `meal_style` from 21 structure types (Bowl, Wrap, Taco, Sandwich, Burger, Sheet Pan, Skillet, Stir Fry, Grill, Flatbread, Stuffed, Casserole, Bake, Soup/Stew, Pasta, Rice Bake, Noodle Toss, Loaded Fries, Stuffed Bread, One-Pot, Breakfast-for-Dinner). Weighted random selection de-prioritizes bowls (weight 1 vs 2-3 for others). Filtered by appliance compatibility and time constraints. Client tracks last 5 `recentMealStyles` in localStorage and sends them with each request. Server excludes last style from back-to-back and avoids last 3 if alternatives exist. "Generate Another" passes `prefer_different_style=true` for explicit style change. Cache/pool hits are bypassed if they conflict with style rotation. `recipe.meal_style` displayed as a badge on the recipe card. Structure passed to both AI prompt and fallback archetype selection.
- **Healthy Variety System**: Incorporates a healthy bias (lean, balanced, comfort) and an in-memory variety tracking system to prevent repetition of cuisines, cooking methods, proteins, carbs, and structures within recent generations. Recipes are tagged for easy identification of qualities like high protein or quick cleanup.
- **Fallback Archetype System**: 20 structure-specific archetypes per protein (chicken, beef, pork, turkey, fish/seafood, vegetarian) with unique titles, base carbs, and cooking methods. Fallback picks the archetype matching the selected structure type, tracks recent archetypes (last 10) to avoid repeats, ensuring variety even without AI.
- **Allergen Safety System** (`server/allergens.ts`): Centralized allergen keyword mapping (dairy, gluten, nuts, peanut, soy, eggs, shellfish) with false-positive guards (e.g., "coconut cream" not flagged as dairy, "gluten-free pasta" not flagged as gluten, "coconut aminos" not flagged as soy). Five-layer enforcement: (1) Template filtering excludes allergen-possible templates — NEVER relaxed; (2) Progressive relaxation only relaxes time constraints, never allergens; if no templates match, enters AI-only mode; (3) AI prompt includes explicit MUST AVOID ingredient list + safe substitution map; (4) Fallback recipes apply `ALLERGEN_SAFE_REPLACEMENTS` swaps; (5) Post-generation `buildResponse()` runs `scanRecipeForAllergens()` + `autoSubstituteAllergens()` on EVERY response (AI, cache, pool, fallback). Available allergens: dairy, gluten, soy, eggs, nuts, shellfish. Auto-substitutions: butter→olive oil, cheese→nutritional yeast, cream→coconut cream, soy sauce→coconut aminos, flour→GF flour, pasta→GF pasta, tortillas→corn tortillas, nuts→seeds, eggs→flax eggs, mayo→egg-free mayo. UI shows "Adjusted meal style to meet allergy requirements" when template filters were relaxed.
- **Strict Diet Enforcement**: Three-layer protein compliance system (AI prompt directive → fallback recipe constraints → post-generation validator). Vegetarian: zero meat/seafood/animal broths/fish sauce/oyster sauce/gelatin/lard/tallow. Seafood: fish + shellfish only, zero land meats (chicken/beef/pork/turkey/lamb), no meat-based broths. Validator scans title + ingredients + steps + pro tips per-segment to prevent false-positive suppression.
- **Global Recipe Validator** (`server/validateRecipe.ts`): Runs on ALL `/api/generate` responses (AI, fallback, cache, pool). Validates structure rules per meal_style (e.g., wraps need tortillas + assembly step, bowls need base layer, pasta needs noodles + boil step). Cuisine proof validation requires 2+ matching flavor indicators before allowing cuisine adjectives in titles. Title-ingredient verification ensures named ingredients exist. Computes content-based fingerprint signatures for deduplication. Logs every validation result with issues and actions taken. **Recipe Content Validator** (`validateRecipe(recipe, requestMealFormat?)`): Cross-references ingredients ↔ steps (every non-trivial ingredient must appear in steps/plating; steps must not reference unlisted ingredients). Format-specific rules enforce structure constraints for all 12 formats: burger→bun/no rice/pasta/tortillas, taco→tortilla/no buns, wrap→tortilla/no buns/rice, bowl→base layer/no buns/tortillas, pasta→pasta/no rice/buns, salad→greens/no rice/pasta/buns, sheet-pan→oven temp + sheet pan mention/no rice/pasta, stir-fry→wok/high-heat/no buns/tortillas, soup-stew→simmer time/no rice/buns, breakfast→anchor ingredient/no rice/pasta, loaded-fries→fries required/no rice/pasta/quinoa/buns. Timing sanity check validates total_minutes is coherent with prep+cook. When `requestMealFormat` is provided (non-random), it overrides `meal_style` for format key resolution. Format violations + timing errors are blocking (`ok=false`); ingredient cross-ref issues are non-blocking warnings. Visible in `_debug.validation_errors` with `?debug=1`.
- **Performance Optimizations**: Includes client-side caching (memory + localStorage), background prefetching, instant UI rendering with skeleton loaders, and memoization of React components.
- **Timeout & Fallback System**: Server-side 35s AI timeout per call, with 8-second fast fallback racing AI. If AI not ready by 8s, a rotating structure-aware fallback is served immediately while AI continues in background and caches the result. Client-side 45s AbortController timeout with retry-friendly error messages. Cold-start detection and logging. Page-mount warm-up prefetch for instant first generation.
- **Global Label Audit** (`server/labelAudit.ts`): Runs on EVERY response in `buildResponse()` after allergen post-check. Infers correct labels from recipe content (ingredients + steps): `meal_style` (21 style evidence patterns), `cuisine` (13 cuisine indicator sets with scoring), `cooking_method` (9 methods), `base_carb` (13 carb types), `healthiness` (lean/balanced/comfort heuristic scoring), `budget_level` (low/standard/splurge heuristic scoring). Cuisine inference requires 2+ unique indicators (3+ for Asian/Korean/Japanese/Thai cuisines, plus mandatory Asian ingredient check — soy/ginger/sesame/teriyaki/miso/etc). Title consistency check validates both style AND cuisine words in titles against actual content. Title always rebuilt last from finalized content (protein + method + base + real flavor indicators). Auto-corrects mismatched labels, writes inferred values back to recipe fields. Improved `inferIngredientCategory()` with 7 categories plus override patterns. Debug UI (`?debug=1`) shows full audit details. Server logs `[audit]` line per request with all label decisions.
- **Auto-Repair Loop**: After AI generates a recipe, `validateRecipe()` checks for blocking format errors (format_missing_required, format_has_forbidden, format_missing_step, format_forbidden_step, timing_invalid). If found: (1) `repairRecipe()` calls LLM with the original JSON + validation errors + repair prompt (15s timeout), (2) re-validates repaired result, (3) if still invalid after 2 attempts, serves a deterministic safe fallback recipe (sheet-pan chicken, burger, tacos, or loaded fries based on `meal_format`). No errors leak to UI — user always gets a coherent recipe. Safe fallbacks are defined in `server/ai.ts` (`buildSafeFallbackRecipe()`) with crew-size scaling.
- **Meal Format → Structure Override**: When user selects a specific `meal_format` (not "random"), the structure type is forced to match (e.g., `loaded_fries` → `loaded-fries`, `soup_chili` → `soup-stew`). This ensures the AI prompt, fallback archetype, and validator all agree on the format.
- **Filter Persistence**: All filter selections (including meal_format, crew_size, proteins, appliances, etc.) are saved to localStorage under key `firehall_filters` and restored on page load.
- **Per-Session Signature Dedup** (`server/cache-store.ts`): Tracks last 15 recipe signatures per session. On every response path (AI, cache, pool, fallback), checks new signature against session history. If duplicate: (1) remix recipe (change sauce + base_carb + title), (2) re-validate, (3) if still duplicate after 2 remix attempts, force a different structure type via fallback. Cache/pool hits are bypassed entirely if their signature exists in session history. Ensures "Generate Another" never returns the same recipe signature back-to-back.
- **Frontend Request Management**: "Generate Another" cancels any in-flight request via AbortController before starting a new one. Skips prefetch cache for "Generate Another" (always fetches fresh). Uses functional state update `setRecipe(() => ({...data}))` for correctness. Scrolls recipe into view via `requestAnimationFrame` after state update.
- **Cost Control**: Implemented through caching, rate limiting per IP/session, a daily AI budget cap, bot blocking, and `ENABLE_POOL_WARMUP` env flag (default false) for Autoscale-friendly on-demand generation.
- **Admin Dashboard**: Provides usage statistics, budget status, cache details, and request logs.
- **Pro Tips**: Recipes include short, practical tips for cooking.

## Client Recipe Schema
The API response is normalized to `ClientRecipeResponse` before being sent to the frontend. The backend uses `GenerateResponse` internally (validator, fallback, cache) and transforms it via `normalizeToClientFormat()` in `server/routes.ts`.

Key field mappings (internal → client):
- `ingredients[].item/amount/notes` → `ingredients[].name/qty/unit/category` (qty is numeric, category is auto-detected)
- `steps[].heading/body` → `steps[].n/title/heat/minutes/instructions` (n is 1-indexed)
- `timing.prep_minutes/cook_minutes/total_minutes` → `timing.prep_min/cook_min/total_min`
- `protein_safety[]` (array) → `protein_safety{}` (single object with `protein/internal_temp_f/rest_min/notes`)
- `tags` (RecipeTags object) → `tags` (string[]) + `recipe_tags` (full RecipeTags preserved)
- New: `plating { serve_style, assembly_instructions, optional_toppings[] }`
- New: `meal_format` (from request filter), `servings` (crew_size)

Helper functions added in `server/routes.ts`: `parseQtyUnit()`, `categorizeIngredient()`, `normalizeToClientFormat()`
Client shopping list uses `buildShoppingListFromClientMeal()` in `client/src/lib/shopping-list.ts`.

## External Dependencies
- **OpenAI**: Used for AI-powered recipe generation (gpt-5-mini via Replit AI Integrations).
- **Klaviyo**: Integrated for email capture, subscribing users to mailing lists, and tracking recipe-related events.
- **SQLite**: Used as the database for caching, rate limiting, and usage tracking.
- **qrcode library**: Client-side library for generating QR codes for vote sharing.

## Deployment
- **Build command**: `npm ci && npm run build`
- **Run command**: `npm start` (runs `NODE_ENV=production node dist/index.cjs`)
- **Health check**: `GET /health` returns `{ status: "ok", uptime: <seconds> }`
- **Graceful shutdown**: SIGTERM/SIGINT handlers with 10s failsafe timeout
- **Port**: Uses `process.env.PORT` (injected by Replit), falls back to 5000

## Environment Variables
| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Server listen port (injected by Replit) |
| `ENABLE_POOL_WARMUP` | `false` | Set to `"true"` to enable continuous recipe pool pre-generation. Leave false for Autoscale to save cost. |
| `DAILY_LLM_BUDGET_USD` | `5.00` | Daily AI spending cap in USD |
| `ADMIN_SECRET` | _(none)_ | Optional key for `/api/admin/usage` access |
| `KLAVIYO_API_KEY` | _(secret)_ | Klaviyo API key for email features |
| `SESSION_SECRET` | _(secret)_ | Session encryption secret |