# Lights & Sirens - Firehall Meal Generator

## Overview
Lights & Sirens is a single-page web application designed to generate high-protein meal recipes for firefighter crews. It leverages AI to create complete recipes based on user-selected filters, ensuring variety and adherence to dietary needs. The project aims to provide a practical tool for firehall meal planning, offering features like budget control, pantry integration, and a dedicated pizza night generator. The vision is to streamline meal preparation for fire departments, promoting healthier eating habits and fostering camaraderie through shared meals.

## User Preferences
No accounts, meal plans, history, template management, or Shopify

## System Architecture
The application features a modern full-stack architecture. The frontend is built with React, Vite, TailwindCSS, and shadcn/ui, providing a responsive UI with a dark, premium firehouse aesthetic. The backend, powered by Express.js, handles API requests, data processing, and AI integration. OpenAI (gpt-5-mini) is utilized for recipe generation, primarily in specific fallback or specialized modes. Data is managed through a CSV file for meal templates and an SQLite database for recipe caching, rate limiting, and usage tracking.

Key architectural features and design patterns include:
- **Meal Generation (V2 Engine)**: The primary recipe generation path uses Spoonacular as the sole source. It employs a 4-pass progressive relaxation search, comprehensive protein audits, and allergen scanning. A deterministic template-based fallback is used if Spoonacular yields no valid results. OpenAI (gpt-4o-mini) is used for "Pantry Mode" (full recipe generation) and as a post-processing step to polish the title, write a crew-friendly description, and rewrite steps with structured headings (heat level + time range), doneness cues, and safe temp enforcement (6-second timeout, falls back gracefully, cached 1 hour per recipe ID).
- **Single-Select Protein Filter**: Users pick exactly one protein — Chicken, Beef, Pork, Turkey, Seafood, Vegetarian, or "Any Protein". "Any Protein" resolves to a randomly weighted real protein server-side (no AI confusion from mixed-protein queries). Backend hard-constraint: selected protein must match the final recipe's inferred protein.
- **Spoonacular Caching**: Search results cached 1 hour by filter combination. Recipe details cached 1 hour by Spoonacular ID. Cache hits/misses logged as `[spoonacular-cache] HIT/MISS`.
- **Specialized Generators**: Dedicated routes exist for "Pantry Mode," "Vegetarian Swap," and "Pizza Night," each with specific functionalities and AI integration where appropriate.
- **Firehouse Flavor System**: AI prompts and post-generation validators enforce mandatory recipe composition, including named sauces/marinades, real cooking techniques, garnishes, and substantial vegetable components. Recipes lean towards bold cuisines and specific verbs for steps.
- **Variety and Health Systems**: The application incorporates a "Structure Rotation System" (21 types), "Healthy Variety System" (bias towards lean, balanced, comfort and tracking to prevent repetition), and "Fallback Archetype System" (20 structure-specific archetypes per protein) to ensure diverse and balanced meal suggestions.
- **Safety and Validation Systems**: A robust "Allergen Safety System" (six-layer enforcement), "Strict Diet Enforcement" (three-layer protein compliance), and a "Global Recipe Validator" ensure structural integrity, dietary adherence, and prevent duplicates. A "Firehouse Flavor Quality Gate" validates and auto-repairs generated recipes for aesthetic and culinary standards.
- **Performance & Reliability**: Features like client-side caching, background prefetching, skeleton loaders, React component memoization, and a server-side "Timeout & Fallback System" (with an 8-second fast fallback) are implemented for optimal performance and user experience.
- **Cost Control**: Implemented through caching, rate limiting, daily AI budget caps, and bot blocking.
- **Admin Dashboard**: Provides usage statistics, budget status, cache details, and request logs.
- **Explore Recipes (Spoonacular)**: A dedicated `/explore` section powered by the Spoonacular API allows searching, discovering, and viewing detailed recipes. It includes "Explore Rotating Recipe Pools" for diverse suggestions and "Firehall Classics" and "Trending in Firehalls" sections for curated content.
- **Progressive Relaxation Fallback (Spoonacular)**: The explore search functionality progressively relaxes non-safety filters if no results are found, eventually falling back to the internal Firehall generator while preserving strict allergen and dietary constraints.
- **Carb Management**: A "Carb-Optional System" intelligently determines appropriate carbs based on meal format, and "Rice Auto-Injection for Asian Dishes" ensures rice is included where culturally appropriate, with allergen considerations.
- **Crew Scale Audit**: Validates and auto-scales ingredient quantities, appliance usage, timing, and nutrition for large crews (12+).
- **Premium Visual Design System**: A comprehensive CSS foundation with custom tokens, keyframes, and utilities ensures a consistent, high-quality "firehouse aesthetic" across all UI elements, including loading states and error messages.

## External Dependencies
- **OpenAI**: Used for AI-powered recipe generation (gpt-5-mini via Replit AI Integrations for general tasks, gpt-4o-mini for Pantry Mode).
- **Klaviyo**: Integrated for email capture and event tracking.
- **Spoonacular**: Recipe search/discovery API for the Explore page.
- **SQLite**: Used as the database for caching, rate limiting, and usage tracking.
- **qrcode library**: Client-side library for generating QR codes.