# Firehall Photo Intensive Audit

Generated: 2026-06-02T13:13:37.535Z

## Audit runs

- **firehall_photo_standard** (`audit:firehall-photo-standard`): OK
- **image_accuracy** (`audit:image-accuracy`): OK
- **explore_image_mapping** (`audit:explore-image-mapping`): OK
- **image_governance** (`audit:image-governance`): FAIL — Command failed: npm run audit:image-governance
- **breakfast_images** (`audit:breakfast-images`): OK

## Consolidated totals

| Metric | Value |
|---|---:|
| Recipes (photo standard) | 371 |
| Failed photo standard | 17 |
| Queued for replacement | 17 |
| P0 replacement priority | 17 |
| P1 replacement priority | 0 |
| Duplicate hero groups (standard) | 6 |
| Donor overrides | 0 |
| Image accuracy failures | 216 |
| Explore eligible | 310 / 315 |
| Explore excluded (dupes) | 5 |
| Governance failures | 57 |

## Next batch command

```bash
npm run batch:firehall-photo-replacements -- --batch-size=10 --priority=p0
```
