/**
 * Insight-Driven Personalization — deterministic, non-AI soft-ranking
 * signals layered onto the EXISTING generator scoring (see
 * pickFromSummaries in ./pick-local-recipes.ts). NO new recommendation
 * architecture: this module only computes a small score delta + an optional
 * one-line explanation per candidate; hard filters/explicit session choices
 * are untouched and always applied first (see recipePassesHardFilters,
 * allergen/dietary/foods-to-avoid checks in pick-local-recipes.ts).
 *
 * Reuses the SAME data sources as Personalized Insights
 * (server/insights/engine.ts, server/insights/catalog-meta.ts) — same
 * user_meal_history table, same cuisine/protein catalog lookup, same
 * minimum-sample philosophy. No new tables, no derived personality labels
 * persisted anywhere — everything here is recomputed fresh per request.
 */
import { pgAll } from "../db/pg-sql.js";
import { getRecipeMeta } from "../insights/catalog-meta.js";

// ── Minimum sample thresholds — same philosophy as Personalized Insights ───
export const CUISINE_AFFINITY_MIN_SAMPLES = 4;
export const PROTEIN_MAKE_AGAIN_MIN_SAMPLES = 4;
export const CUISINE_MAKE_AGAIN_MIN_SAMPLES = 4;
export const STRONG_RATING_THRESHOLD = 4.0;
export const STRONG_MAKE_AGAIN_PCT = 70;
/** A 4-5★ favorite may get a repeat boost only once this much time has passed — never fights the recency penalty below. */
export const REPEAT_BOOST_COOLDOWN_DAYS = 21;
/** How many of the most recent picks count toward the diversity-guardrail cuisine-saturation check. */
export const DIVERSITY_RECENT_WINDOW = 6;
/** Floor multiplier so a genuine favorite is dampened, never fully zeroed out, by the diversity guardrail. */
const DIVERSITY_FLOOR_MULTIPLIER = 0.15;
/** Overall cap on the sum of POSITIVE history bonuses — keeps learned signals modest relative to explicit session choices. */
const MAX_POSITIVE_HISTORY_BONUS = 45;
/** Strong soft-suppression for an exact "Make Again = No" recipe — not a hard reject (still eligible as an absolute last resort). */
const EXACT_RECIPE_SUPPRESSION_PENALTY = -1000;

const HISTORY_LOOKBACK_LIMIT = 300;
/** Short in-process cache so rapid "Try Another" clicks in one sitting don't each re-query the DB. Proactively invalidated on any new log/rating/feedback write (see invalidateHistorySignalsCache below), so this is purely a load-shedding optimization, never a source of staleness. */
const HISTORY_CACHE_TTL_MS = 45_000;

/** Meal Memory: a meal cooked this recently is never auto-picked while anything else qualifies. */
export const RECENT_COOK_EXCLUSION_DAYS = 7;

export type HistorySignalType =
  | "recipe_suppressed"
  | "recency_7d"
  | "recency_30d"
  | "high_rating_repeat"
  | "saved_favorite"
  | "feedback_took_too_long"
  | "feedback_too_expensive"
  | "feedback_crew_loved"
  | "protein_make_again"
  | "cuisine_make_again"
  | "cuisine_affinity";

export type SampleSizeBucket = "none" | "sparse" | "moderate" | "strong";

export interface HistorySignals {
  totalRows: number;
  everCookedSlugs: Set<string>;
  cuisineAffinity: Map<string, { avg: number; count: number }>;
  proteinMakeAgain: Map<string, { pct: number; count: number }>;
  cuisineMakeAgain: Map<string, { pct: number; count: number }>;
  recipeSuppress: Set<string>;
  /** Most recent star rating per recipe (a later 2★ overrides an earlier 5★). */
  latestRatingBySlug: Map<string, number>;
  /** Catalog slugs in the user's saved recipes. */
  savedSlugs: Set<string>;
  recipeFeedback: Map<string, { tookTooLong: boolean; tooExpensive: boolean; crewLoved: boolean }>;
  recentCuisineCounts: Map<string, number>;
  recencyDaysAgoBySlug: Map<string, number>;
}

/**
 * The DB-derived, per-user aggregates — everything in `HistorySignals`
 * EXCEPT `recentCuisineCounts`, which depends on the caller's current
 * recentSlugs (varies picks-to-pick within a sitting) and is therefore
 * always recomputed fresh, never cached (see computeHistorySignals below).
 */
type HistoryAggregates = Omit<HistorySignals, "recentCuisineCounts">;

interface RawRow {
  recipe_slug: string;
  cooked_at: Date;
  rating: number | null;
  make_again: number | null;
  feedback_tags_json: string | null;
}

function daysAgo(d: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000)));
}

function parseTags(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export function sampleSizeBucket(totalRows: number): SampleSizeBucket {
  if (totalRows <= 0) return "none";
  if (totalRows < 10) return "sparse";
  if (totalRows < 30) return "moderate";
  return "strong";
}

/** Real, already-cooked recency for the diversity guardrail — cuisine mix of the crew's last few generations (durable history + this session's recentSlugs, whichever the caller passes). */
function computeRecentCuisineCounts(recentSlugs: string[] | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  if (!recentSlugs?.length) return counts;
  const window = recentSlugs.slice(-DIVERSITY_RECENT_WINDOW);
  for (const slug of window) {
    const cuisine = getRecipeMeta(slug).cuisine;
    if (!cuisine) continue;
    counts.set(cuisine, (counts.get(cuisine) ?? 0) + 1);
  }
  return counts;
}

const aggregatesCache = new Map<string, { value: HistoryAggregates | null; expiresAt: number }>();

/**
 * Call after ANY write to this user's `user_meal_history` (new cook log,
 * rating, make-again, feedback tags, deletion) so their very next generation
 * reflects it immediately — the TTL cache above is a pure load-shedding
 * optimization, never an intentional source of staleness.
 */
export function invalidateHistorySignalsCache(userId: string): void {
  aggregatesCache.delete(userId);
}

/** DB-derived aggregates only — cached; excludes the always-fresh `recentCuisineCounts`. */
async function loadHistoryAggregates(userId: string): Promise<HistoryAggregates | null> {
  const cached = aggregatesCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = await computeHistoryAggregates(userId);
  aggregatesCache.set(userId, { value, expiresAt: Date.now() + HISTORY_CACHE_TTL_MS });
  return value;
}

/** Catalog slugs of the user's saved recipes (the slug lives in the saved recipe JSON). */
export async function loadSavedRecipeSlugs(userId: string): Promise<Set<string>> {
  const rows = await pgAll<{ recipe_json: string }>(
    `SELECT recipe_json FROM user_saved_recipes WHERE user_id = $1`,
    [userId],
  );
  const slugs = new Set<string>();
  for (const row of rows) {
    try {
      const slug = (JSON.parse(row.recipe_json) as { _slug?: unknown })._slug;
      if (typeof slug === "string" && slug.trim()) slugs.add(slug.trim().toLowerCase());
    } catch {
      // Unparseable saved row — not a usable favorite signal.
    }
  }
  return slugs;
}

async function computeHistoryAggregates(userId: string): Promise<HistoryAggregates | null> {
  const now = new Date();
  const [rows, savedSlugs] = await Promise.all([
    pgAll<RawRow>(
      `SELECT recipe_slug, cooked_at, rating, make_again, feedback_tags_json
       FROM user_meal_history
       WHERE user_id = $1
       ORDER BY cooked_at DESC, id DESC
       LIMIT $2`,
      [userId, HISTORY_LOOKBACK_LIMIT],
    ),
    loadSavedRecipeSlugs(userId),
  ]);

  // Nothing cooked and nothing saved — nothing to learn from. Returning null
  // (rather than an all-empty-but-truthy object) lets callers distinguish
  // "this generation was genuinely influenced by the user's memory" from "the
  // toggle was merely on" for accurate `history_personalization_used` analytics.
  if (rows.length === 0 && savedSlugs.size === 0) return null;

  const everCookedSlugs = new Set<string>();
  const cuisineRatings = new Map<string, number[]>();
  const proteinMakeAgainRaw = new Map<string, { yes: number; total: number }>();
  const cuisineMakeAgainRaw = new Map<string, { yes: number; total: number }>();
  const recipeSuppress = new Set<string>();
  const latestRatingBySlug = new Map<string, number>();
  const recipeFeedback = new Map<string, { tookTooLong: boolean; tooExpensive: boolean; crewLoved: boolean }>();
  const recencyDaysAgoBySlug = new Map<string, number>();

  for (const row of rows) {
    everCookedSlugs.add(row.recipe_slug);
    const meta = getRecipeMeta(row.recipe_slug);
    const cookedDaysAgo = daysAgo(row.cooked_at, now);

    // Most recent cook wins for per-slug recency/repeat-boost lookups (rows are DESC).
    if (!recencyDaysAgoBySlug.has(row.recipe_slug)) recencyDaysAgoBySlug.set(row.recipe_slug, cookedDaysAgo);

    if (row.rating != null) {
      if (meta.cuisine) {
        if (!cuisineRatings.has(meta.cuisine)) cuisineRatings.set(meta.cuisine, []);
        cuisineRatings.get(meta.cuisine)!.push(row.rating);
      }
      if (!latestRatingBySlug.has(row.recipe_slug)) latestRatingBySlug.set(row.recipe_slug, row.rating);
    }

    if (row.make_again != null) {
      const isYes = row.make_again === 1;
      if (meta.protein) {
        const b = proteinMakeAgainRaw.get(meta.protein) ?? { yes: 0, total: 0 };
        b.total += 1;
        if (isYes) b.yes += 1;
        proteinMakeAgainRaw.set(meta.protein, b);
      }
      if (meta.cuisine) {
        const b = cuisineMakeAgainRaw.get(meta.cuisine) ?? { yes: 0, total: 0 };
        b.total += 1;
        if (isYes) b.yes += 1;
        cuisineMakeAgainRaw.set(meta.cuisine, b);
      }
      // Exact-recipe suppression — one explicit "No" is sufficient (spec section 4).
      // Do NOT generalize this to the whole cuisine/protein — one failed recipe
      // never bans an entire category (spec section 2C).
      if (!isYes) recipeSuppress.add(row.recipe_slug);
    }

    const tags = parseTags(row.feedback_tags_json);
    if (tags.length) {
      const fb = recipeFeedback.get(row.recipe_slug) ?? { tookTooLong: false, tooExpensive: false, crewLoved: false };
      if (tags.includes("took_too_long")) fb.tookTooLong = true;
      if (tags.includes("too_expensive")) fb.tooExpensive = true;
      if (tags.includes("crew_loved_it")) fb.crewLoved = true;
      recipeFeedback.set(row.recipe_slug, fb);
    }
  }

  const cuisineAffinity = new Map<string, { avg: number; count: number }>();
  for (const [cuisine, ratings] of cuisineRatings) {
    if (ratings.length < CUISINE_AFFINITY_MIN_SAMPLES) continue;
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    if (avg >= STRONG_RATING_THRESHOLD) cuisineAffinity.set(cuisine, { avg, count: ratings.length });
  }

  const proteinMakeAgain = new Map<string, { pct: number; count: number }>();
  for (const [protein, { yes, total }] of proteinMakeAgainRaw) {
    if (total < PROTEIN_MAKE_AGAIN_MIN_SAMPLES) continue;
    const pct = Math.round((yes / total) * 100);
    if (pct >= STRONG_MAKE_AGAIN_PCT) proteinMakeAgain.set(protein, { pct, count: total });
  }

  const cuisineMakeAgain = new Map<string, { pct: number; count: number }>();
  for (const [cuisine, { yes, total }] of cuisineMakeAgainRaw) {
    if (total < CUISINE_MAKE_AGAIN_MIN_SAMPLES) continue;
    const pct = Math.round((yes / total) * 100);
    if (pct >= STRONG_MAKE_AGAIN_PCT) cuisineMakeAgain.set(cuisine, { pct, count: total });
  }

  return {
    totalRows: rows.length,
    everCookedSlugs,
    cuisineAffinity,
    proteinMakeAgain,
    cuisineMakeAgain,
    recipeSuppress,
    latestRatingBySlug,
    savedSlugs,
    recipeFeedback,
    recencyDaysAgoBySlug,
  };
}

export interface DueFavorite {
  rating: number | null;
  saved: boolean;
  /** null = saved but never cooked. */
  daysSinceCooked: number | null;
}

/**
 * A favorite (saved, or latest rating 4★+) that is due to come back: never
 * cooked, or last cooked at least REPEAT_BOOST_COOLDOWN_DAYS ago. A "Make
 * Again = No" answer always wins over a favorite.
 */
export function dueFavorite(slug: string, signals: HistorySignals): DueFavorite | null {
  if (signals.recipeSuppress.has(slug)) return null;
  const latest = signals.latestRatingBySlug.get(slug);
  const rating = latest != null && latest >= STRONG_RATING_THRESHOLD ? latest : null;
  const saved = signals.savedSlugs.has(slug);
  if (rating == null && !saved) return null;
  // A low latest rating means the crew changed its mind — a save alone doesn't override that.
  if (latest != null && latest < STRONG_RATING_THRESHOLD) return null;
  const daysSinceCooked = signals.recencyDaysAgoBySlug.get(slug) ?? null;
  if (daysSinceCooked != null && daysSinceCooked < REPEAT_BOOST_COOLDOWN_DAYS) return null;
  return { rating, saved, daysSinceCooked };
}

/** Cooked within RECENT_COOK_EXCLUSION_DAYS — excluded from automatic picks while anything else qualifies. */
export function cookedTooRecently(slug: string, signals: HistorySignals): boolean {
  const days = signals.recencyDaysAgoBySlug.get(slug);
  return days != null && days <= RECENT_COOK_EXCLUSION_DAYS;
}

/**
 * Public entry point — fetch (or reuse a fresh cache hit for) this user's
 * DB-derived history aggregates, then combine with an ALWAYS-fresh
 * cuisine-saturation snapshot of their most recent picks (never cached — it
 * must reflect picks made seconds ago in this very sitting for the
 * diversity guardrail to mean anything). Never throws for a normal "no
 * history yet" user — returns null, which callers treat identically to
 * "personalization not applicable this request."
 */
export async function computeHistorySignals(
  userId: string,
  recentSlugsForDiversity?: string[],
): Promise<HistorySignals | null> {
  const aggregates = await loadHistoryAggregates(userId);
  if (!aggregates) return null;
  return { ...aggregates, recentCuisineCounts: computeRecentCuisineCounts(recentSlugsForDiversity) };
}

export interface HistoryScoreResult {
  delta: number;
  appliedSignals: HistorySignalType[];
}

/**
 * Scale a make-again boost by how strong the pattern is: right at the
 * STRONG_MAKE_AGAIN_PCT floor it still gets a meaningful 60% of `base`
 * (a "strong" pattern is a strong pattern, never a zero signal), climbing
 * to the full `base` at 100%.
 */
function makeAgainBoost(base: number, pct: number): number {
  const strength = Math.max(0, Math.min(1, (pct - STRONG_MAKE_AGAIN_PCT) / (100 - STRONG_MAKE_AGAIN_PCT)));
  return base * (0.6 + 0.4 * strength);
}

/** Diversity guardrail (section 3) — dampens a cuisine-scoped boost by how saturated that cuisine already is in the crew's most recent picks. Floored so a genuine favorite is never fully zeroed out. */
function diversityMultiplierFor(cuisine: string, signals: HistorySignals): number {
  const recentCount = signals.recentCuisineCounts.get(cuisine) ?? 0;
  return Math.max(DIVERSITY_FLOOR_MULTIPLIER, 1 - recentCount / DIVERSITY_RECENT_WINDOW);
}

/** Pure — no DB access. Given one candidate + precomputed signals, returns a score delta and which signals fired. */
export function scoreHistorySignal(
  candidate: { slug: string; protein: string },
  signals: HistorySignals,
): HistoryScoreResult {
  const applied: HistorySignalType[] = [];
  let delta = 0;
  const cuisine = getRecipeMeta(candidate.slug).cuisine;

  // C. Negative recipe signal — strongly suppress, but never a hard ban.
  if (signals.recipeSuppress.has(candidate.slug)) {
    delta += EXACT_RECIPE_SUPPRESSION_PENALTY;
    applied.push("recipe_suppressed");
  }

  // D. Recency — real timestamps, not just session-order (complements the
  // existing position-based recentSlugPenalty, which has no actual dates).
  const cookedDaysAgo = signals.recencyDaysAgoBySlug.get(candidate.slug);
  if (cookedDaysAgo != null) {
    if (cookedDaysAgo <= 7) {
      delta -= 50;
      applied.push("recency_7d");
    } else if (cookedDaysAgo <= 30 && !dueFavorite(candidate.slug, signals)) {
      delta -= 15;
      applied.push("recency_30d");
    }
  }

  // E. Favorites (rated 4★+ or saved) that are due to come back. The ranking
  // nudge is modest; the favorites lane in pickFromSummaries is what makes a
  // due favorite actually return at a noticeable rate.
  const favorite = dueFavorite(candidate.slug, signals);
  if (favorite) {
    delta += 10;
    applied.push(favorite.rating != null ? "high_rating_repeat" : "saved_favorite");
  }

  // F. Feedback tags — exact recipe only, never generalized to a whole cuisine/protein.
  const feedback = signals.recipeFeedback.get(candidate.slug);
  if (feedback?.tookTooLong) {
    delta -= 12;
    applied.push("feedback_took_too_long");
  }
  if (feedback?.tooExpensive) {
    delta -= 12;
    applied.push("feedback_too_expensive");
  }
  if (feedback?.crewLoved) {
    delta += 8;
    applied.push("feedback_crew_loved");
  }

  // B. Make-again pattern — protein level. Scaled by how strong the pattern
  // is (70% floor still gets a meaningful modest boost; 100% gets the full
  // amount) rather than a flat step function at the threshold.
  const proteinPattern = signals.proteinMakeAgain.get(candidate.protein);
  if (proteinPattern) {
    delta += makeAgainBoost(15, proteinPattern.pct);
    applied.push("protein_make_again");
  }

  // B. Make-again pattern — cuisine level. Also cuisine-scoped, so it gets
  // the SAME diversity dampening as cuisine affinity below (section 3) —
  // "always make Mexican again" is exactly the kind of pattern that could
  // otherwise create a recommendation bubble on its own.
  const cuisinePattern = cuisine ? signals.cuisineMakeAgain.get(cuisine) : undefined;
  if (cuisinePattern) {
    const boosted = makeAgainBoost(12, cuisinePattern.pct) * diversityMultiplierFor(cuisine!, signals);
    if (boosted >= 1) {
      delta += boosted;
      applied.push("cuisine_make_again");
    }
  }

  // A. Cuisine affinity, dampened by the diversity guardrail (section 3) —
  // a favorite cuisine that has already dominated recent picks gets a much
  // smaller boost here, so other suitable cuisines keep surfacing.
  const affinity = cuisine ? signals.cuisineAffinity.get(cuisine) : undefined;
  if (affinity) {
    const strength = Math.max(0, Math.min(1, (affinity.avg - 3.5) / 1.5));
    const raw = 18 * strength;
    const boosted = raw * diversityMultiplierFor(cuisine!, signals);
    if (boosted >= 2) {
      delta += boosted;
      applied.push("cuisine_affinity");
    }
  }

  // Keep learned signals modest — never let the sum of positive bonuses
  // overpower explicit current-session choices (section 7). Suppression/
  // recency/feedback penalties above are never clamped.
  if (delta > 0) delta = Math.min(delta, MAX_POSITIVE_HISTORY_BONUS);

  return { delta: Math.round(delta), appliedSignals: applied };
}

const CUISINE_LABEL_OVERRIDES: Record<string, string> = {
  bbq: "BBQ",
};

function labelFor(word: string): string {
  return CUISINE_LABEL_OVERRIDES[word] ?? (word.length ? word[0]!.toUpperCase() + word.slice(1) : word);
}

/**
 * One fact behind a pick. Every explanation line is rendered from one of these
 * by describeMemoryReason, so the text can never drift from the data that
 * actually moved the ranking.
 */
export type MemoryReason =
  | { kind: "rated_favorite"; rating: number; daysSinceCooked: number | null; saved: boolean }
  | { kind: "saved_favorite"; daysSinceCooked: number | null }
  | { kind: "crew_loved" }
  | { kind: "cuisine_affinity"; cuisine: string; avg: number; count: number }
  | { kind: "protein_make_again"; protein: string; pct: number; count: number }
  | { kind: "cuisine_make_again"; cuisine: string; pct: number; count: number }
  | { kind: "new_for_crew" };

/** Reasons that mean a personal signal raised this meal's rank ("Picked for you"). */
const PERSONAL_REASON_KINDS = new Set<MemoryReason["kind"]>([
  "rated_favorite",
  "saved_favorite",
  "crew_loved",
  "cuisine_affinity",
  "protein_make_again",
  "cuisine_make_again",
]);

export function isPersonalReason(reason: MemoryReason): boolean {
  return PERSONAL_REASON_KINDS.has(reason.kind);
}

/** Whole days → "today", "5 days ago", "3 weeks ago", "2 months ago" (always rounded down). */
export function formatDaysAgo(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export function describeMemoryReason(reason: MemoryReason): string {
  switch (reason.kind) {
    case "rated_favorite": {
      const cooked = reason.daysSinceCooked != null ? ` · last cooked ${formatDaysAgo(reason.daysSinceCooked)}` : "";
      return `You rated this ${reason.rating}★${cooked}`;
    }
    case "saved_favorite":
      return reason.daysSinceCooked == null
        ? "Saved by you · not cooked yet"
        : `Saved by you · last cooked ${formatDaysAgo(reason.daysSinceCooked)}`;
    case "crew_loved":
      return "Your crew said they loved it last time";
    case "cuisine_affinity":
      return `Your crew rates ${labelFor(reason.cuisine)} meals ${reason.avg.toFixed(1)}★ on average (${reason.count} rated)`;
    case "protein_make_again":
      return `Your crew would make ${labelFor(reason.protein)} meals again ${reason.pct}% of the time (${reason.count} meals)`;
    case "cuisine_make_again":
      return `Your crew would make ${labelFor(reason.cuisine)} meals again ${reason.pct}% of the time (${reason.count} meals)`;
    case "new_for_crew":
      return "Something new — your crew hasn't cooked this yet";
  }
}

/**
 * Every reason behind a pick, strongest first, built only from signals that
 * actually fired for this candidate. Never anything for a suppressed recipe.
 */
export function memoryReasonsFor(
  candidate: { slug: string; protein: string },
  signals: HistorySignals,
  appliedSignals: HistorySignalType[],
): MemoryReason[] {
  if (appliedSignals.includes("recipe_suppressed")) return [];
  const reasons: MemoryReason[] = [];
  const cuisine = getRecipeMeta(candidate.slug).cuisine;

  const favorite = dueFavorite(candidate.slug, signals);
  if (favorite && appliedSignals.includes("high_rating_repeat") && favorite.rating != null) {
    reasons.push({ kind: "rated_favorite", rating: favorite.rating, daysSinceCooked: favorite.daysSinceCooked, saved: favorite.saved });
  } else if (favorite && appliedSignals.includes("saved_favorite")) {
    reasons.push({ kind: "saved_favorite", daysSinceCooked: favorite.daysSinceCooked });
  }
  if (appliedSignals.includes("feedback_crew_loved")) reasons.push({ kind: "crew_loved" });

  const affinity = cuisine ? signals.cuisineAffinity.get(cuisine) : undefined;
  if (affinity && appliedSignals.includes("cuisine_affinity")) {
    reasons.push({ kind: "cuisine_affinity", cuisine: cuisine!, avg: affinity.avg, count: affinity.count });
  }
  const proteinPattern = signals.proteinMakeAgain.get(candidate.protein);
  if (proteinPattern && appliedSignals.includes("protein_make_again")) {
    reasons.push({ kind: "protein_make_again", protein: candidate.protein, pct: proteinPattern.pct, count: proteinPattern.count });
  }
  const cuisinePattern = cuisine ? signals.cuisineMakeAgain.get(cuisine) : undefined;
  if (cuisinePattern && appliedSignals.includes("cuisine_make_again")) {
    reasons.push({ kind: "cuisine_make_again", cuisine: cuisine!, pct: cuisinePattern.pct, count: cuisinePattern.count });
  }

  // Genuine discovery — only once there's an established baseline of real
  // history to call this "new" against (avoids saying "new" to a brand-new
  // account with nothing to compare to).
  if (
    reasons.length === 0 &&
    !appliedSignals.some((s) => s.startsWith("recency") || s.startsWith("feedback_")) &&
    signals.totalRows >= CUISINE_AFFINITY_MIN_SAMPLES &&
    !signals.everCookedSlugs.has(candidate.slug)
  ) {
    reasons.push({ kind: "new_for_crew" });
  }
  return reasons;
}

/** The single strongest explanation line, or null — see memoryReasonsFor. */
export function explainPersonalization(
  candidate: { slug: string; protein: string },
  signals: HistorySignals,
  appliedSignals: HistorySignalType[],
): string | null {
  const [top] = memoryReasonsFor(candidate, signals, appliedSignals);
  return top ? describeMemoryReason(top) : null;
}
