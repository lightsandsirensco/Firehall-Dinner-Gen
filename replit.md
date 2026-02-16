# Lights & Sirens - Firehall Dinner Generator

## Overview
A single-page web app that generates one high-protein dinner recipe for a firefighter crew based on user-selected filters. Uses AI (OpenAI via Replit AI Integrations) to create complete recipes from CSV meal templates.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js
- **AI**: OpenAI (gpt-5-mini) via Replit AI Integrations
- **Data**: CSV file at `/data/firehall_templates_v1.csv`
- **No database** - this app is stateless, reads CSV templates and generates on-the-fly

## Key Files
- `client/src/pages/home.tsx` - Main single-page UI
- `client/src/components/filter-panel.tsx` - Left panel with all filters
- `client/src/components/recipe-card.tsx` - Right panel recipe output
- `client/src/components/empty-state.tsx` - Empty state before generating
- `client/src/components/loading-state.tsx` - Skeleton loading
- `client/src/components/error-state.tsx` - Error / no-match states
- `server/routes.ts` - POST /api/generate endpoint
- `server/templates.ts` - CSV loading and template filtering logic
- `server/ai.ts` - OpenAI recipe generation
- `shared/schema.ts` - Zod schemas and TypeScript types
- `data/firehall_templates_v1.csv` - 30 meal templates

## Design
- Dark, premium firehouse aesthetic
- Bebas Neue for headings/buttons/titles
- Inter for body text
- Primary color: fire engine red-orange (hsl 6 78% 50%)

## API
- `POST /api/generate` - Accepts GenerateRequest JSON, returns GenerateResponse JSON
- Template filtering: busy_level, time, appliances, proteins, allergens
- Anti-repeat: last_template_id excludes previous template
- AI retry: 3 attempts with exponential backoff on empty/error responses
- On generation failure, last recipe stays visible (only cleared on no-match)

## User Preferences
- No accounts, meal plans, history, template management, or Shopify
