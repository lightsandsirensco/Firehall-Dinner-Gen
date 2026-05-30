# Breakfast Image Remediation

- Generated: 2026-05-30T18:47:55.165Z
- Recipes fixed: **3**

## Summary

| Slug | Title | Method | Explore | Catalog JSON |
| --- | --- | --- | --- | --- |
| `bbq-breakfast-hash` | BBQ Breakfast Hash | donor (chorizo-breakfast-hash) | yes | yes |
| `bacon-hash-burritos` | Bacon Hash Burritos | donor (breakfast-crunchwraps) | yes | yes |
| `big-pot-savory-oats` | Big-Pot Savory Oats | donor (denver-breakfast-casserole) | yes | yes |

## Per-recipe details

### BBQ Breakfast Hash (`bbq-breakfast-hash`)

- Method: **donor** (donor: `chorizo-breakfast-hash`)
- Old hero MD5: `8d65d578203d…`
- New hero MD5: `8d65d578203d…`
- Hero: `/images/breakfast/bbq-breakfast-hash.jpg`
- Thumb: `/images/thumbs/breakfast/bbq-breakfast-hash.jpg`
- Mobile: `/images/mobile/breakfast/bbq-breakfast-hash.jpg`
- Rail (Explore card): `/images/rails/breakfast/bbq-breakfast-hash.jpg`

### Bacon Hash Burritos (`bacon-hash-burritos`)

- Method: **donor** (donor: `breakfast-crunchwraps`)
- Old hero MD5: `668d840bfee5…`
- New hero MD5: `668d840bfee5…`
- Hero: `/images/breakfast/bacon-hash-burritos.jpg`
- Thumb: `/images/thumbs/breakfast/bacon-hash-burritos.jpg`
- Mobile: `/images/mobile/breakfast/bacon-hash-burritos.jpg`
- Rail (Explore card): `/images/rails/breakfast/bacon-hash-burritos.jpg`

### Big-Pot Savory Oats (`big-pot-savory-oats`)

- Method: **donor** (donor: `denver-breakfast-casserole`)
- Old hero MD5: `2b296af68078…`
- New hero MD5: `2b296af68078…`
- Hero: `/images/breakfast/big-pot-savory-oats.jpg`
- Thumb: `/images/thumbs/breakfast/big-pot-savory-oats.jpg`
- Mobile: `/images/mobile/breakfast/big-pot-savory-oats.jpg`
- Rail (Explore card): `/images/rails/breakfast/big-pot-savory-oats.jpg`

## Governance

Permanent breakfast title/path rules added in `shared/curated-image-governance/image-accuracy-rules.ts`:
- **Hash** titles require potato/hash/skillet cues in hero path
- **Burrito** titles require burrito/tortilla/wrap cues; biscuits/gravy forbidden
- **Oats** titles require oat/oatmeal cues; biscuits/gravy and sweet dessert forbidden

## Follow-up (AI regen on Replit)

Local `OPENAI_API_KEY` was not configured — donor fallbacks were used. For production-quality unique heroes:
```bash
FOOD_IMAGERY_ENABLED=true npm run remediate:breakfast-images
```
- **big-pot-savory-oats** — priority AI regen (no oatmeal donor exists; interim casserole donor removes biscuits/gravy mismatch)
- **bacon-hash-burritos** — AI regen recommended for cut burrito cross-section (interim crunchwrap donor has tortilla, not burritos)
