/**
 * Successful-generation counter. Email collection in the generator is opt-in only
 * (the recipe's "Email" action) — nothing here opens a prompt.
 */

const GEN_COUNT_KEY = "firehall_successful_gen_count";

export function getPersistedGenerationCount(): number {
  try {
    const n = parseInt(localStorage.getItem(GEN_COUNT_KEY) || "0", 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Call once per successful, non-duplicate meal delivery. Returns new total. */
export function recordSuccessfulGeneration(): number {
  const next = getPersistedGenerationCount() + 1;
  try {
    localStorage.setItem(GEN_COUNT_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}
