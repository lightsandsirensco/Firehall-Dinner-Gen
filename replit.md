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
- **Structural Variety System**: Each generation randomly selects a meal structure type (bowl, wrap, taco, sandwich, burger, sheet-pan, skillet, stir-fry, flatbread, stuffed, casserole, pasta, one-pot, noodle-toss, loaded-fries, soup/stew, breakfast-for-dinner, etc.) filtered by appliances and time. Last 5 structures tracked in memory to prevent back-to-back repeats. Structure is passed to both AI prompt and fallback archetype selection.
- **Healthy Variety System**: Incorporates a healthy bias (lean, balanced, comfort) and an in-memory variety tracking system to prevent repetition of cuisines, cooking methods, proteins, carbs, and structures within recent generations. Recipes are tagged for easy identification of qualities like high protein or quick cleanup.
- **Fallback Archetype System**: 20 structure-specific archetypes per protein (chicken, beef, pork, turkey, fish) with unique titles, base carbs, and cooking methods. Fallback picks the archetype matching the selected structure type, ensuring variety even without AI.
- **Performance Optimizations**: Includes client-side caching (memory + localStorage), background prefetching, instant UI rendering with skeleton loaders, and memoization of React components.
- **Timeout & Fallback System**: Server-side 35s AI timeout per call, with 8-second fast fallback racing AI. If AI not ready by 8s, a rotating structure-aware fallback is served immediately while AI continues in background and caches the result. Client-side 45s AbortController timeout with retry-friendly error messages. Cold-start detection and logging. Page-mount warm-up prefetch for instant first generation.
- **Cost Control**: Implemented through caching, rate limiting per IP/session, a daily AI budget cap, bot blocking, and `ENABLE_POOL_WARMUP` env flag (default false) for Autoscale-friendly on-demand generation.
- **Admin Dashboard**: Provides usage statistics, budget status, cache details, and request logs.
- **Pro Tips**: Recipes include short, practical tips for cooking.

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