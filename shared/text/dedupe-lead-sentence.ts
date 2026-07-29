/**
 * Recipe copy fields (`subtitle`, `shortDescription`, `whyCrewsLikeIt`) are
 * batch-generated and very often restate the same lead sentence — sometimes
 * as an exact duplicate, sometimes as a duplicated *prefix* with a real,
 * distinct sentence tacked on after it (e.g. subtitle "Double pot, triple
 * appetite" + whyCrewsLikeIt "Double pot, triple appetite. Real toasted-
 * chile depth instead of dusty powder…"). Naive `a === b` checks miss the
 * prefix case and let the same phrase render twice on the page (and twice
 * in the meta description shown in Google search results).
 */

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[.!?…\s]+$/g, "");
}

/**
 * Given a `candidate` string and copy that's already shown elsewhere on the
 * page (`shownElsewhere`), return the part of `candidate` that adds new
 * information — or `undefined` if `candidate` is fully redundant.
 */
export function dedupeAgainstShownCopy(
  candidate: string | undefined | null,
  ...shownElsewhere: Array<string | undefined | null>
): string | undefined {
  const trimmed = candidate?.trim();
  if (!trimmed) return undefined;

  const candidateNorm = normalize(trimmed);

  for (const shown of shownElsewhere) {
    const shownTrimmed = shown?.trim();
    if (!shownTrimmed) continue;
    const shownNorm = normalize(shownTrimmed);
    if (!shownNorm) continue;

    if (candidateNorm === shownNorm) return undefined;

    if (candidateNorm.startsWith(shownNorm)) {
      // Strip the duplicated leading phrase, then any leftover punctuation.
      const remainder = trimmed.slice(shownTrimmed.length).replace(/^[.!?…\s]+/, "").trim();
      return remainder.length > 0 ? remainder : undefined;
    }
  }

  return trimmed;
}
