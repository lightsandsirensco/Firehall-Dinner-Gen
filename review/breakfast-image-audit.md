# Breakfast Image Audit

- Recipes audited: **69**
- Passed: **67**
- Failed: **2**
- Duplicate hero groups: **2**
- Format/title passed (ignoring dupes): **69**
- Missing heroes: **0**

## Duplicate image groups

| Hash | Recipes | Recommended fix |
| --- | --- | --- |
| `b0d6a0efa007…` | `bacon-hash-burritos`, `breakfast-burrito-bar` | `bacon-hash-burritos` (canonical); `breakfast-burrito-bar` (canonical) |
| `67ea7cf0b016…` | `cast-iron-breakfast-skillet`, `ham-pepper-skillet` | `cast-iron-breakfast-skillet` (canonical); `ham-pepper-skillet` (canonical) |

## Failed recipes

### Ham & Pepper Breakfast Skillet (`ham-pepper-skillet`) — breakfast_catalog
- Route: `/breakfast/ham-pepper-skillet`
- Hero: `/images/breakfast/ham-pepper-skillet.jpg`
- Formats: skillet
- Duplicate peers: `cast-iron-breakfast-skillet`
- **critical** `duplicate_hero_hash`: hero MD5 shared with cast-iron-breakfast-skillet
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): cast-iron-breakfast-skillet

### Breakfast Burrito Bar (`breakfast-burrito-bar`) — golden_100
- Route: `/recipes/breakfast-burrito-bar`
- Hero: `/images/golden-100/breakfast-burrito-bar.jpg`
- Formats: burrito
- Duplicate peers: `bacon-hash-burritos`
- **critical** `duplicate_hero_hash`: hero MD5 shared with bacon-hash-burritos
- **warning** `donor_override_active`: hero reuses same file as other breakfast recipe(s): bacon-hash-burritos
