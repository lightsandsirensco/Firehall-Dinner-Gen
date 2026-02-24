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
- **Hall Favorites**: A client-side (localStorage) feature for saving preferred recipes without authentication.
- **Hall Vote**: Enables creation and sharing of vote polls for recipes among crew members, with real-time results.
- **Cuisine Style Filter**: Allows users to specify a cuisine preference, influencing flavor profiles without overriding core constraints.
- **Healthy Variety System**: Incorporates a healthy bias (lean, balanced, comfort) and an in-memory variety tracking system to prevent repetition of cuisines, cooking methods, proteins, and carbs within recent generations. Recipes are tagged for easy identification of qualities like high protein or quick cleanup.
- **Performance Optimizations**: Includes client-side caching (memory + localStorage), background prefetching, instant UI rendering with skeleton loaders, and memoization of React components.
- **Cost Control**: Implemented through caching, rate limiting per IP/session, a daily AI budget cap, and bot blocking.
- **Admin Dashboard**: Provides usage statistics, budget status, cache details, and request logs.
- **Pro Tips**: Recipes include short, practical tips for cooking.

## External Dependencies
- **OpenAI**: Used for AI-powered recipe generation (gpt-5-mini via Replit AI Integrations).
- **Klaviyo**: Integrated for email capture, subscribing users to mailing lists, and tracking recipe-related events.
- **SQLite**: Used as the database for caching, rate limiting, and usage tracking.
- **qrcode library**: Client-side library for generating QR codes for vote sharing.