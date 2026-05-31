# Firehall Photo Intensive Audit

Generated: 2026-05-31T12:17:57.234Z

## Audit runs

- **firehall_photo_standard** (`audit:firehall-photo-standard`): OK
- **image_accuracy** (`audit:image-accuracy`): OK
- **explore_image_mapping** (`audit:explore-image-mapping`): OK
- **image_governance** (`audit:image-governance`): OK
- **breakfast_images** (`audit:breakfast-images`): OK

## Consolidated totals

| Metric | Value |
|---|---:|
| Recipes (photo standard) | 376 |
| Failed photo standard | 0 |
| Queued for replacement | 0 |
| P0 replacement priority | 0 |
| P1 replacement priority | 0 |
| Duplicate hero groups (standard) | 0 |
| Donor overrides | 0 |
| Image accuracy failures | 203 |
| Explore eligible | 233 / 233 |
| Explore excluded (dupes) | 0 |
| Governance failures | 58 |

## Next batch command

```bash
npm run batch:firehall-photo-replacements -- --batch-size=10 --priority=p0
```
