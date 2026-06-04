# Firehall Meals — Recipe Sourcing

Canonical policy: `shared/recipe-sourcing-policy.ts`

## Publisher hierarchy

### Tier 1 (prefer first)

1. America's Test Kitchen
2. Cook's Illustrated
3. Serious Eats
4. NYT Cooking
5. Food & Wine

### Tier 2

6. Bon Appétit
7. Epicurious
8. Food Network
9. Allrecipes
10. Simply Recipes

### Tier 3

11. King Arthur Baking
12. Milk Street
13. Southern Living
14. AmazingRibs
15. BBQ Pit Boys

## New recipe rules

When creating new Firehall Meals recipes:

- Start by finding the highest-quality version of the recipe from **Tier 1**.
- If unavailable, use **Tier 2**.
- If unavailable, use **Tier 3**.
- **Never invent recipes.**
- **Never create AI-generated ingredient lists.**
- Use the source recipe as the foundation.
- Rewrite instructions in **Firehall Meals style** (`shared/firehall-instruction-voice.ts`).
- Scale for crews of **4, 6, 8, 10, and 14** (`FIREHALL_CREW_SCALE_SIZES`).
- Add station-friendly serving suggestions.
- Add realistic prep and cook times.
- Attribute `source_name` and `source_url` on every published meal.

## Implementation

| Concern | Module |
|--------|--------|
| Tier list + creation rules text | `shared/recipe-sourcing-policy.ts` |
| Ingestion allowlist + quality bonus | `shared/ingestion/trusted-publishers.ts` |
| Crew picker sizes | `shared/recipe/crew-scaling-config.ts` |
| AI / polish prompts | `shared/chef-quality-prompt.ts` |

Legacy publisher domains (pre-policy catalog) remain on the allowlist at Tier 3 with lower rank — not preferred for new development.
