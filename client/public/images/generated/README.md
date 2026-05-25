# AI-generated food heroes

Produced by the Firehall food imagery pipeline (`server/food-imagery/`).

- Files: `{slug}-v{n}.jpg` (versioned on regen)
- Public URL: `/images/generated/...`
- Metadata: `food_imagery_assets` in `data/cache.db`

Regenerate:

```bash
npx tsx scripts/generate-food-imagery.ts smash-burgers --sync --force
```
