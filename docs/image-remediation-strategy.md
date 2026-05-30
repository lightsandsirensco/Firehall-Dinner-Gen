# Image Remediation Strategy

**Success metric:** Can a firefighter identify the meal from the hero without opening the recipe?

Accuracy beats uniqueness. Duplicate heroes are acceptable when the image matches the meal.

---

## Priority tiers

### P0 — Trust failures (fix immediately)

Wrong meal type on the card — dessert for hash, pizza for pancakes, soup for burritos, etc.

| Collection | Scope | Config |
| --- | --- | --- |
| Breakfast catalog | 26 slugs | `shared/breakfast-catalog/image-donor-plan.ts` |
| Explore published | 32+ slugs | `shared/curated-image-governance/trust-first-explore-donors.ts` |
| Golden 100 breakfast | 7 slugs | Same breakfast donor plan (`GOLDEN_100_BREAKFAST_SLUGS`) |
| Performance | Boneless chicken thighs | AI regen — `shared/performance-meals/imagery-prompt-overrides.ts` |

**Run:**

```bash
npm run remediate:trust-p0
npm run audit:image-accuracy
npm run audit:image-trust
```

### P1 — After P0 = 0

Split within-category duplicate groups only where titles diverge enough that users notice (same hash on different breakfast names, multiple pizzas, etc.).

### P2 — Defer

Accurate cross-category duplicates (Golden 100 ↔ Explore same correct dish). Do not regen solely for uniqueness.

---

## Do not

- Run donor-shuffle passes for MD5 uniqueness
- Replace an accurate image with a less accurate one to reduce duplicate counts
- Optimize governance scores at the expense of recipe trust

---

## Key files

| File | Purpose |
| --- | --- |
| `shared/breakfast-catalog/image-donor-plan.ts` | Breakfast + Golden breakfast trust-first donors |
| `shared/curated-image-governance/trust-first-explore-donors.ts` | Explore cluster fixes (chicken parm, pulled pork, jambalaya, etc.) |
| `shared/curated-image-governance/explore-image-overrides.ts` | Merged slug locks (trust donors win) |
| `shared/catalog-image-donor-overrides.ts` | Golden / performance catalog copy fixes |
| `shared/performance-meals/image-donor-overrides.ts` | Empty by default — use AI for performance plates |
| `scripts/remediate-trust-p0-images.ts` | Applies all P0 donor copies |
| `scripts/audit-image-trust-report.ts` | P0/P1/P2 trust report (`npm run audit:image-trust`) |

---

## Performance: Boneless Chicken Thighs

Requires a **unique** hero showing seared boneless thighs, sweet potato side, spinach side — not curry/stew/casserole.

```bash
npx tsx scripts/generate-performance-meals-imagery.ts --only=boneless-chicken-thighs-sweet-potato-spinach --force --approve
```

Prompt overrides live in `shared/performance-meals/imagery-prompt-overrides.ts`.

---

## Biscuits & gravy interim note

No accurate biscuits hero exists on disk yet. Interim donor: `monte-cristo-sandwiches` (bread-based breakfast — better than pizza). Schedule AI regen for true biscuits & gravy.

---

## Audit commands

```bash
npm run audit:image-accuracy   # full accuracy audit → review/image-accuracy-audit.json
npm run audit:image-trust      # trust-first P0/P1/P2 → review/image-trust-report.md
npm run audit:breakfast-images # breakfast-only deep audit
npm run explore:verify-images  # Explore hero file existence
```

**Ship gate:** P0 incorrect meal representations = **0** on user-facing Breakfast, Explore published, Pizza Night, Golden 100, Performance.
