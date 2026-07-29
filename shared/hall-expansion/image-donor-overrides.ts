/**
 * Manual hall-expansion hero donors — TEMPORARY ONLY.
 * Empty after global firehall photo replacement (2026-05).
 * Re-add entries only with `temporary: true` intent and remove after regen.
 *
 * Sprint 1.5 (2026-07-27): 25 of the 33 flagged duplicates were regenerated
 * with unique AI photography via `scripts/fix-duplicate-hero-images.ts` and
 * removed from this table. The remaining 8 are still pending — the OpenAI
 * account hit its billing hard limit mid-batch. Re-run
 * `npx tsx scripts/fix-duplicate-hero-images.ts` (no --slugs filter needed,
 * it re-derives targets from the hash audit) once billing is restored, then
 * remove each fixed entry below.
 */
export const HALL_EXPANSION_IMAGE_DONOR_OVERRIDES: Record<string, string> = {
  "white-chicken-chili-crock": "big-chili",
  "burnt-ends-chili-crew": "big-chili",
  "pasta-e-fagioli-hall": "big-chili",
  "firehall-korean-beef-bowls": "bulgogi-bowls",
  "egg-roll-in-a-bowl-crew": "bulgogi-bowls",
  "korean-turkey-rice-bowls": "bulgogi-bowls",
  "teriyaki-chicken-rice-bowls": "teriyaki-donburi",
  "thai-peanut-chicken-crock": "teriyaki-donburi",
};
