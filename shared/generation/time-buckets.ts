/**
 * Canonical Generator time-bucket boundaries — the ONE shared source of truth
 * for "how many minutes does each `time_available` UI bucket actually allow."
 *
 * Previously this map was copy-pasted independently in
 * server/generation/pick-local-recipes.ts and server/recipe-ranker.ts (with
 * identical values, but no guarantee they'd stay in sync), and in both places
 * it was used ONLY as a +15 soft-scoring bonus — never as a hard filter. That
 * meant a user selecting "15-25 min" could still be served a 90+ minute BBQ
 * brisket recipe as long as it scored well on other axes. This file fixes that
 * by giving every caller both the raw boundary AND a real pass/fail check.
 */

/** Every `time_available` bucket id the Generator UI can send. */
export type TimeAvailableBucket = "15-25" | "20-30" | "25-40" | "30-45" | "45-60" | "60-90";

/** Maximum realistic total minutes (prep + cook) allowed for each bucket. */
export const TIME_BUCKET_MAX_MINUTES: Record<TimeAvailableBucket, number> = {
  "15-25": 25,
  "20-30": 30,
  "25-40": 40,
  "30-45": 45,
  "45-60": 60,
  "60-90": 90,
};

/** @deprecated Use TIME_BUCKET_MAX_MINUTES — kept as an alias during migration. */
export const TIME_MAX_MINUTES = TIME_BUCKET_MAX_MINUTES;

/**
 * Small tolerance added to the bucket ceiling before a recipe is considered a
 * hard-filter miss. Recipe timing estimates are inherently approximate (a
 * "45 minute" recipe that actually needs 48 shouldn't be treated as violating
 * a 45-minute request), but this must stay small — large tolerances are how
 * "25 minutes" quietly turns into "60+ minutes" in practice.
 */
export const TIME_BUCKET_GRACE_MINUTES = 10;

export function timeBucketMaxMinutes(bucket: string | undefined | null): number | undefined {
  if (!bucket) return undefined;
  return TIME_BUCKET_MAX_MINUTES[bucket as TimeAvailableBucket];
}

/**
 * Hard-filter check: does a recipe's real total time (prep + cook, in
 * minutes) fit within the user's selected time bucket? Unknown/zero total
 * time is treated as "unknown, don't reject" — reflected recipes must be
 * excluded some other way (missing data), never silently passed off as fast.
 */
export function recipeFitsTimeBucket(
  totalMinutes: number | undefined | null,
  bucket: string | undefined | null,
  graceMinutes: number = TIME_BUCKET_GRACE_MINUTES,
): boolean {
  const maxMin = timeBucketMaxMinutes(bucket);
  if (!maxMin) return true; // no bucket selected — nothing to enforce
  if (!totalMinutes || totalMinutes <= 0) return true; // unknown time — can't penalize
  return totalMinutes <= maxMin + graceMinutes;
}
