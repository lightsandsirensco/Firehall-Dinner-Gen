/**
 * Manual hall-expansion hero donors — TEMPORARY ONLY.
 * Empty after global firehall photo replacement (2026-05).
 * Re-add entries only with `temporary: true` intent and remove after regen.
 *
 * Sprint 1.5 (2026-07-27): 25 of the 33 flagged duplicates were regenerated
 * with unique AI photography via `scripts/fix-duplicate-hero-images.ts` and
 * removed from this table. The remaining 8 were pending an OpenAI billing
 * hard limit blocker.
 *
 * Image Integrity Sprint (2026-07-30): billing restored; all 8 remaining
 * slugs (white-chicken-chili-crock, burnt-ends-chili-crew, pasta-e-fagioli-hall,
 * firehall-korean-beef-bowls, egg-roll-in-a-bowl-crew, korean-turkey-rice-bowls,
 * teriyaki-chicken-rice-bowls, thai-peanut-chicken-crock) were regenerated
 * with unique AI photography via
 * `scripts/image-sprint-generate-missing-and-duplicate-heroes.ts` and now
 * own distinct hero bytes — table emptied per the process documented above.
 */
export const HALL_EXPANSION_IMAGE_DONOR_OVERRIDES: Record<string, string> = {};
