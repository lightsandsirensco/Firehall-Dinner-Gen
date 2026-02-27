# Lights & Sirens - Firehall Meal Generator

## Overview
Lights & Sirens is a single-page web application designed to generate high-protein meal recipes for firefighter crews. It leverages AI to create complete recipes based on user-selected filters, ensuring variety and adherence to dietary needs. The project aims to provide a practical tool for firehall meal planning, offering features like budget control, pantry integration, and a dedicated pizza night generator.

## User Preferences
No accounts, meal plans, history, template management, or Shopify

## System Architecture
The application features a modern full-stack architecture. The frontend is built with React, Vite, TailwindCSS, and shadcn/ui, providing a responsive UI with a dark, premium firehouse aesthetic. The backend, powered by Express.js, handles API requests, data processing, and AI integration. OpenAI (gpt-5-mini) is utilized for recipe generation. Data is managed through a CSV file for meal templates and an SQLite database for recipe caching, rate limiting, and usage tracking.

Key architectural features and design patterns include:
- **Meal Generation**: Generates recipes based on filters such as busy level, time, appliances, proteins, allergens, and budget.
- **Pantry Mode**: Allows users to input available ingredients to influence AI-generated recipes.
- **Vegetarian Swap**: Provides an allergen-aware vegetarian option for one crew member.
- **Pizza Night**: Generates pizza recipes with specific filters (crew size, time, dough option, style, heat level).
- **Shopping List**: Automatically generates a categorized shopping list from recipes.
- **Hall Favorites**: Client-side saving with a backend endpoint for up to 5 favorites per session.
- **Hall Vote**: Enables creation and sharing of recipe polls among crew members with real-time results.
- **Cuisine Style Filter**: Allows specifying a cuisine preference without overriding core constraints.
- **Structure Rotation System**: Selects `meal_style` from 21 structure types with weighted random selection and rotation logic to ensure variety.
- **Healthy Variety System**: Incorporates healthy bias (lean, balanced, comfort) and tracks recent generations to prevent repetition of cuisines, cooking methods, proteins, carbs, and structures.
- **Fallback Archetype System**: Uses 20 structure-specific archetypes per protein to ensure variety even without AI, tracking recent archetypes to avoid repeats.
- **Allergen Safety System**: Employs a six-layer enforcement system for allergens, including template filtering, AI prompt guidance, fallback replacements, post-generation scanning and auto-substitution, and a deterministic allergen-safe fallback if violations persist.
- **Strict Diet Enforcement**: Three-layer protein compliance system (AI directive, fallback constraints, post-generation validator) for vegetarian and seafood diets.
- **Global Recipe Validator**: Runs on all generated recipes to ensure structural integrity, cuisine proof, title-ingredient verification, and content-based fingerprinting for deduplication. Includes format-specific rules for 12 meal formats and timing sanity checks.
- **Performance Optimizations**: Client-side caching (memory + localStorage), background prefetching, instant UI rendering with skeleton loaders, and React component memoization.
- **Timeout & Fallback System**: Server-side AI timeout (35s) with an 8-second fast fallback. If AI is slow, a rotating structure-aware fallback is served immediately while AI continues in the background.
- **Global Label Audit**: Infers and validates `meal_style`, `cuisine`, `cooking_method`, `base_carb`, `healthiness`, and `budget_level` from recipe content, auto-correcting mismatched labels.
- **Auto-Repair Loop**: Automatically attempts to repair AI-generated recipes that fail validation using the LLM, falling back to a deterministic safe recipe after multiple attempts.
- **Meal Format → Structure Override**: Forces the structure type to match the user-selected `meal_format`.
- **Filter Persistence**: All filter selections are saved to localStorage and restored on page load.
- **Per-Session Signature Dedup**: Tracks recent recipe signatures and remixes or forces a different structure if duplicates are generated.
- **Frontend Request Management**: Manages "Generate Another" requests by canceling in-flight requests and skipping prefetch cache.
- **Cost Control**: Implemented through caching, rate limiting, daily AI budget caps, and bot blocking.
- **Admin Dashboard**: Provides usage statistics, budget status, cache details, and request logs.
- **Pro Tips**: Recipes include short, practical cooking tips.

## External Dependencies
- **OpenAI**: Used for AI-powered recipe generation (gpt-5-mini via Replit AI Integrations).
- **Klaviyo**: Integrated for email capture and event tracking.
- **SQLite**: Used as the database for caching, rate limiting, and usage tracking.
- **qrcode library**: Client-side library for generating QR codes.