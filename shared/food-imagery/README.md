# Firehall editorial food imagery (style system v3.0)

**Principle: consistency > creativity.** Every generated hero uses the same master grade, lighting, and shadow rules. Only dish-specific lines and **locked shot presets** vary by meal category.

## Module map

| File | Role |
|------|------|
| `master-style.ts` | Single brand block + `FOOD_IMAGERY_STYLE_VERSION` (bump to invalidate cache) |
| `shot-presets.ts` | Camera angle / lens / plating per category (burger, tacos, pizza, …) |
| `negative-prompt.ts` | Shared rejection list (style, lighting, composition, texture, content) |
| `aspect-ratio.ts` | 1024×1024 generation, 5/4 display crop |
| `prompt-assembler.ts` | Fixed section order for all positive prompts |
| `prompt-builder.ts` | Meal prompts → assembler + preset |
| `pizza-prompt-builder.ts` | Pizza prompts → same assembler + `pizza` preset |
| `quality-score.ts` | Vision QA rubric + thresholds (realism ≥7, brand ≥7) |

## Server pipeline

1. **Preflight** (`server/food-imagery/preflight.ts`) — policy, prompt, hash, size
2. **Generate** (`pipeline.ts`) — cache by `prompt_hash`, versioned files (`-v2` suffix)
3. **Validate** (`validate-output.ts`) — heuristics + optional vision brand QA
4. **Attach** (`attach-hero.ts`) — permanent curated / slug hero URLs
5. **Resolve** (`fallback-hierarchy.ts`) — generated → pinned classic → editorial fallback → pending

## Regenerating after a style bump

1. Set `FOOD_IMAGERY_STYLE_VERSION` in `master-style.ts` (e.g. `3.0` → `3.1`)
2. Run `npm run imagery:generate` with `--force` or delete stale rows in `food_imagery_assets`
3. New prompts hash differently → new assets versioned on disk

## Enable in production

```env
FOOD_IMAGERY_ENABLED=true
FOOD_IMAGERY_VISION_VALIDATE=true   # recommended for brand QA
```
