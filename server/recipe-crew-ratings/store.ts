/**
 * SQLite store — firefighter crew recipe ratings (thumbs up/down).
 */

import crypto from "node:crypto";
import { log } from "../logger.js";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import {
  buildBadgeLibraryContext,
  evaluateRecipeBadges,
  type BadgeEvaluationInput,
} from "../../shared/recipe-crew-ratings/badges.js";
import { computeApprovalScore, toPublicRatingLines } from "../../shared/recipe-crew-ratings/display.js";
import type {
  CrewRatingComplaintCategory,
  CrewRatingVote,
  RecipeCrewRatingBadgeId,
  RecipeCrewRatingCollectionsResponse,
  RecipeCrewRatingPublicView,
  RecipeCrewRatingStats,
} from "../../shared/recipe-crew-ratings/types.js";
import { normalizeRecipeCrewRatingCollections } from "../../shared/recipe-crew-ratings/types.js";
import type { CastCrewRatingVoteInput } from "../../shared/recipe-crew-ratings/schema.js";

let db: SqliteDatabase;

export async function initRecipeCrewRatingsStore(): Promise<void> {
  db = await getSharedLocalDb();
  log("Recipe crew ratings store initialized", "catalog");
}

function getDb(): SqliteDatabase {
  if (!db) {
    throw new Error("Recipe crew ratings store not initialized — call initRecipeCrewRatingsStore() first");
  }
  return db;
}

export function normalizeRecipeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function hashCrewRatingFingerprint(ip: string, userAgent: string): string {
  const salt = "firehall-crew-rating-v1";
  return crypto.createHash("sha256").update(`${ip}|${userAgent}|${salt}`).digest("hex").substring(0, 32);
}

type RatingRow = {
  recipe_slug: string;
  thumbs_up_count: number;
  thumbs_down_count: number;
  total_votes: number;
  approval_score: number | null;
  created_at: string;
  updated_at: string;
};

function rowToStats(row: RatingRow): RecipeCrewRatingStats {
  return {
    recipeSlug: row.recipe_slug,
    thumbsUpCount: row.thumbs_up_count,
    thumbsDownCount: row.thumbs_down_count,
    totalVotes: row.total_votes,
    approvalScore: row.approval_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getVoteWindows(slug: string): {
  votesLast30Days: number;
  votesLast7Days: number;
  votesPrior23Days: number;
} {
  const d = getDb();
  const votesLast30Days = (
    d
      .prepare(
        `SELECT COUNT(*) AS c FROM recipe_crew_rating_ballots
         WHERE recipe_slug = ? AND created_at >= datetime('now', '-30 days')`,
      )
      .get(slug) as { c: number }
  ).c;

  const votesLast7Days = (
    d
      .prepare(
        `SELECT COUNT(*) AS c FROM recipe_crew_rating_ballots
         WHERE recipe_slug = ? AND created_at >= datetime('now', '-7 days')`,
      )
      .get(slug) as { c: number }
  ).c;

  const votesPrior23Days = (
    d
      .prepare(
        `SELECT COUNT(*) AS c FROM recipe_crew_rating_ballots
         WHERE recipe_slug = ? AND created_at >= datetime('now', '-30 days')
           AND created_at < datetime('now', '-7 days')`,
      )
      .get(slug) as { c: number }
  ).c;

  return { votesLast30Days, votesLast7Days, votesPrior23Days };
}

function loadBadgeContextRows(): Array<{
  slug: string;
  totalVotes: number;
  approvalScore: number | null;
  votesLast30Days: number;
  votesLast7Days: number;
  votesPrior23Days: number;
}> {
  const d = getDb();
  const ratings = d
    .prepare(`SELECT recipe_slug, total_votes, approval_score FROM recipe_crew_ratings WHERE total_votes > 0`)
    .all() as Array<{ recipe_slug: string; total_votes: number; approval_score: number | null }>;

  return ratings.map((r) => {
    const windows = getVoteWindows(r.recipe_slug);
    return {
      slug: r.recipe_slug,
      totalVotes: r.total_votes,
      approvalScore: r.approval_score,
      ...windows,
    };
  });
}

let badgeCtxCache: { at: number; ctx: ReturnType<typeof buildBadgeLibraryContext> } | null = null;
const BADGE_CTX_TTL_MS = 60_000;

function getBadgeLibraryContext(): ReturnType<typeof buildBadgeLibraryContext> {
  const now = Date.now();
  if (badgeCtxCache && now - badgeCtxCache.at < BADGE_CTX_TTL_MS) {
    return badgeCtxCache.ctx;
  }
  const ctx = buildBadgeLibraryContext(loadBadgeContextRows());
  badgeCtxCache = { at: now, ctx };
  return ctx;
}

function invalidateBadgeCache(): void {
  badgeCtxCache = null;
}

function resolveBadges(
  slug: string,
  category: string,
  stats: RecipeCrewRatingStats,
): RecipeCrewRatingBadgeId[] {
  const windows = getVoteWindows(slug);
  const input: BadgeEvaluationInput = {
    slug,
    category,
    totalVotes: stats.totalVotes,
    approvalScore: stats.approvalScore,
    ...windows,
  };
  return evaluateRecipeBadges(input, getBadgeLibraryContext());
}

function getUserVote(slug: string, fingerprint: string | undefined): CrewRatingVote | null {
  if (!fingerprint) return null;
  const row = getDb()
    .prepare(`SELECT vote FROM recipe_crew_rating_ballots WHERE recipe_slug = ? AND fingerprint_hash = ?`)
    .get(slug, fingerprint) as { vote: CrewRatingVote } | undefined;
  return row?.vote ?? null;
}

function getStatsRow(slug: string): RecipeCrewRatingStats | null {
  const row = getDb()
    .prepare(`SELECT * FROM recipe_crew_ratings WHERE recipe_slug = ?`)
    .get(slug) as RatingRow | undefined;
  return row ? rowToStats(row) : null;
}

export function getRecipeCrewRatingPublicView(
  slugInput: string,
  options: { fingerprint?: string; category?: string } = {},
): RecipeCrewRatingPublicView {
  const slug = normalizeRecipeSlug(slugInput);
  const stats = getStatsRow(slug);
  const category = (options.category || "").trim().toLowerCase();

  if (!stats || stats.totalVotes <= 0) {
    return {
      recipeSlug: slug,
      thumbsUpCount: 0,
      thumbsDownCount: 0,
      totalVotes: 0,
      approvalScore: null,
      approvalLabel: toPublicRatingLines({ approvalScore: null, totalVotes: 0 }).approvalLabel,
      ratingsLabel: null,
      badges: [],
      userVote: getUserVote(slug, options.fingerprint),
    };
  }

  const lines = toPublicRatingLines(stats);
  return {
    recipeSlug: slug,
    thumbsUpCount: stats.thumbsUpCount,
    thumbsDownCount: stats.thumbsDownCount,
    totalVotes: stats.totalVotes,
    approvalScore: stats.approvalScore,
    approvalLabel: lines.approvalLabel,
    ratingsLabel: lines.ratingsLabel,
    badges: category ? resolveBadges(slug, category, stats) : [],
    userVote: getUserVote(slug, options.fingerprint),
  };
}

export function castRecipeCrewRatingVote(
  slugInput: string,
  input: CastCrewRatingVoteInput,
  fingerprint: string,
  sessionId?: string,
): { ok: true; view: RecipeCrewRatingPublicView } | { ok: false; error: string; status: number } {
  const slug = normalizeRecipeSlug(slugInput);
  if (!slug) return { ok: false, error: "Invalid recipe", status: 400 };

  const d = getDb();
  const existing = d
    .prepare(`SELECT vote FROM recipe_crew_rating_ballots WHERE recipe_slug = ? AND fingerprint_hash = ?`)
    .get(slug, fingerprint) as { vote: CrewRatingVote } | undefined;

  if (existing) {
    return { ok: false, error: "You already rated this recipe", status: 409 };
  }

  const category = (input.category || "").trim().toLowerCase();
  const complaint =
    input.vote === "down" && input.complaint ? (input.complaint as CrewRatingComplaintCategory) : null;

  const tx = d.transaction(() => {
    d.prepare(
      `INSERT INTO recipe_crew_ratings (recipe_slug) VALUES (?)
       ON CONFLICT(recipe_slug) DO NOTHING`,
    ).run(slug);

    d.prepare(
      `INSERT INTO recipe_crew_rating_ballots (recipe_slug, vote, fingerprint_hash, session_id, complaint_category)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(slug, input.vote, fingerprint, sessionId || null, complaint);

    if (input.vote === "up") {
      d.prepare(
        `UPDATE recipe_crew_ratings SET
           thumbs_up_count = thumbs_up_count + 1,
           total_votes = total_votes + 1,
           approval_score = CAST(thumbs_up_count + 1 AS REAL) / CAST(total_votes + 1 AS REAL),
           updated_at = datetime('now')
         WHERE recipe_slug = ?`,
      ).run(slug);
    } else {
      d.prepare(
        `UPDATE recipe_crew_ratings SET
           thumbs_down_count = thumbs_down_count + 1,
           total_votes = total_votes + 1,
           approval_score = CAST(thumbs_up_count AS REAL) / CAST(total_votes + 1 AS REAL),
           updated_at = datetime('now')
         WHERE recipe_slug = ?`,
      ).run(slug);
    }
  });

  tx();
  invalidateBadgeCache();

  const view = getRecipeCrewRatingPublicView(slug, { fingerprint, category });
  log(`[crew-rating] vote slug=${slug} vote=${input.vote}`, "catalog");
  return { ok: true, view };
}

function collectionEntry(
  slug: string,
  stats: RecipeCrewRatingStats,
  category: string,
): {
  recipeSlug: string;
  approvalScore: number | null;
  totalVotes: number;
  approvalLabel: string;
  badges: RecipeCrewRatingBadgeId[];
} {
  const lines = toPublicRatingLines(stats);
  return {
    recipeSlug: slug,
    approvalScore: stats.approvalScore,
    totalVotes: stats.totalVotes,
    approvalLabel: lines.approvalLabel,
    badges: resolveBadges(slug, category, stats),
  };
}

export function getRecipeCrewRatingCollections(): RecipeCrewRatingCollectionsResponse {
  const d = getDb();
  const ctx = getBadgeLibraryContext();
  const rows = d
    .prepare(`SELECT * FROM recipe_crew_ratings WHERE total_votes > 0 ORDER BY total_votes DESC`)
    .all() as RatingRow[];

  const crewFavourites: RecipeCrewRatingCollectionsResponse["crewFavourites"] = [];
  const topRated: RecipeCrewRatingCollectionsResponse["topRated"] = [];
  const trending: RecipeCrewRatingCollectionsResponse["trending"] = [];
  const rookieApproved: RecipeCrewRatingCollectionsResponse["rookieApproved"] = [];
  const firehallClassics: RecipeCrewRatingCollectionsResponse["firehallClassics"] = [];

  for (const row of rows) {
    const stats = rowToStats(row);
    const slug = row.recipe_slug;
    const windows = getVoteWindows(slug);
    const badges = evaluateRecipeBadges(
      {
        slug,
        category: "",
        totalVotes: stats.totalVotes,
        approvalScore: stats.approvalScore,
        ...windows,
      },
      ctx,
    );
    const entry = collectionEntry(slug, stats, "");

    if (badges.includes("crew_favourite")) crewFavourites.push({ ...entry, badges: ["crew_favourite"] });
    if (badges.includes("top_rated")) topRated.push({ ...entry, badges: ["top_rated"] });
    if (badges.includes("trending")) trending.push({ ...entry, badges: ["trending"] });
  }

  return normalizeRecipeCrewRatingCollections({
    crewFavourites: crewFavourites
      .sort((a, b) => (b.approvalScore ?? 0) - (a.approvalScore ?? 0))
      .slice(0, 12),
    topRated: topRated.sort((a, b) => (b.approvalScore ?? 0) - (a.approvalScore ?? 0)).slice(0, 12),
    trending: trending.sort((a, b) => b.totalVotes - a.totalVotes).slice(0, 12),
    rookieApproved: rookieApproved.slice(0, 12),
    firehallClassics: firehallClassics.slice(0, 12),
  });
}

/** Collections enriched with catalog categories for badge rules. */
export function getRecipeCrewRatingCollectionsForCatalog(
  catalogEntries: Array<{ slug: string; category: string }>,
): RecipeCrewRatingCollectionsResponse {
  const categoryBySlug = new Map(catalogEntries.map((e) => [normalizeRecipeSlug(e.slug), e.category]));
  const d = getDb();
  const ctx = getBadgeLibraryContext();

  const crewFavourites: RecipeCrewRatingCollectionsResponse["crewFavourites"] = [];
  const topRated: RecipeCrewRatingCollectionsResponse["topRated"] = [];
  const trending: RecipeCrewRatingCollectionsResponse["trending"] = [];
  const rookieApproved: RecipeCrewRatingCollectionsResponse["rookieApproved"] = [];
  const firehallClassics: RecipeCrewRatingCollectionsResponse["firehallClassics"] = [];

  const rows = d
    .prepare(`SELECT * FROM recipe_crew_ratings WHERE total_votes > 0`)
    .all() as RatingRow[];

  for (const row of rows) {
    const stats = rowToStats(row);
    const slug = row.recipe_slug;
    const category = categoryBySlug.get(slug) || "";
    const windows = getVoteWindows(slug);
    const badges = evaluateRecipeBadges(
      {
        slug,
        category,
        totalVotes: stats.totalVotes,
        approvalScore: stats.approvalScore,
        ...windows,
      },
      ctx,
    );
    const entry = collectionEntry(slug, stats, category);

    if (badges.includes("crew_favourite")) crewFavourites.push({ ...entry, badges: ["crew_favourite"] });
    if (badges.includes("top_rated")) topRated.push({ ...entry, badges: ["top_rated"] });
    if (badges.includes("trending")) trending.push({ ...entry, badges: ["trending"] });
    if (badges.includes("rookie_approved")) rookieApproved.push({ ...entry, badges: ["rookie_approved"] });
    if (badges.includes("firehall_classic")) firehallClassics.push({ ...entry, badges: ["firehall_classic"] });
  }

  const byApproval = (a: typeof crewFavourites[0], b: typeof crewFavourites[0]) =>
    (b.approvalScore ?? 0) - (a.approvalScore ?? 0);

  return normalizeRecipeCrewRatingCollections({
    crewFavourites: crewFavourites.sort(byApproval).slice(0, 12),
    topRated: topRated.sort(byApproval).slice(0, 12),
    trending: trending.sort((a, b) => b.totalVotes - a.totalVotes).slice(0, 12),
    rookieApproved: rookieApproved.sort(byApproval).slice(0, 12),
    firehallClassics: firehallClassics.sort(byApproval).slice(0, 12),
  });
}

export interface CrewRatingAnalytics {
  mostLiked: Array<{ slug: string; thumbsUp: number; totalVotes: number; approvalScore: number | null }>;
  mostDisliked: Array<{ slug: string; thumbsDown: number; totalVotes: number; approvalScore: number | null }>;
  highestApproval: Array<{ slug: string; approvalScore: number; totalVotes: number }>;
  lowestApproval: Array<{ slug: string; approvalScore: number; totalVotes: number }>;
  mostVoted: Array<{ slug: string; totalVotes: number; approvalScore: number | null }>;
  fastestGrowing: Array<{ slug: string; votesLast7Days: number; votesLast30Days: number }>;
  complaintBreakdown: Array<{ category: string; count: number }>;
  badgeDistribution: Record<string, number>;
  totalRatedRecipes: number;
  totalVotes: number;
  badgeRate: number;
}

export function getRecipeCrewRatingAnalytics(
  catalogEntries: Array<{ slug: string; category: string }>,
): CrewRatingAnalytics {
  const d = getDb();
  const categoryBySlug = new Map(catalogEntries.map((e) => [normalizeRecipeSlug(e.slug), e.category]));
  const ctx = getBadgeLibraryContext();

  const mostLiked = (
    d
      .prepare(
        `SELECT recipe_slug, thumbs_up_count, total_votes, approval_score FROM recipe_crew_ratings
         WHERE total_votes >= 5 ORDER BY thumbs_up_count DESC LIMIT 15`,
      )
      .all() as Array<{ recipe_slug: string; thumbs_up_count: number; total_votes: number; approval_score: number | null }>
  ).map((r) => ({
    slug: r.recipe_slug,
    thumbsUp: r.thumbs_up_count,
    totalVotes: r.total_votes,
    approvalScore: r.approval_score,
  }));

  const mostDisliked = (
    d
      .prepare(
        `SELECT recipe_slug, thumbs_down_count, total_votes, approval_score FROM recipe_crew_ratings
         WHERE total_votes >= 5 ORDER BY thumbs_down_count DESC LIMIT 15`,
      )
      .all() as Array<{ recipe_slug: string; thumbs_down_count: number; total_votes: number; approval_score: number | null }>
  ).map((r) => ({
    slug: r.recipe_slug,
    thumbsDown: r.thumbs_down_count,
    totalVotes: r.total_votes,
    approvalScore: r.approval_score,
  }));

  const highestApproval = (
    d
      .prepare(
        `SELECT recipe_slug, approval_score, total_votes FROM recipe_crew_ratings
         WHERE total_votes >= 10 AND approval_score IS NOT NULL
         ORDER BY approval_score DESC LIMIT 15`,
      )
      .all() as Array<{ recipe_slug: string; approval_score: number; total_votes: number }>
  ).map((r) => ({
    slug: r.recipe_slug,
    approvalScore: r.approval_score,
    totalVotes: r.total_votes,
  }));

  const lowestApproval = (
    d
      .prepare(
        `SELECT recipe_slug, approval_score, total_votes FROM recipe_crew_ratings
         WHERE total_votes >= 10 AND approval_score IS NOT NULL
         ORDER BY approval_score ASC LIMIT 15`,
      )
      .all() as Array<{ recipe_slug: string; approval_score: number; total_votes: number }>
  ).map((r) => ({
    slug: r.recipe_slug,
    approvalScore: r.approval_score,
    totalVotes: r.total_votes,
  }));

  const mostVoted = (
    d
      .prepare(
        `SELECT recipe_slug, total_votes, approval_score FROM recipe_crew_ratings
         ORDER BY total_votes DESC LIMIT 15`,
      )
      .all() as Array<{ recipe_slug: string; total_votes: number; approval_score: number | null }>
  ).map((r) => ({
    slug: r.recipe_slug,
    totalVotes: r.total_votes,
    approvalScore: r.approval_score,
  }));

  const fastestGrowing = loadBadgeContextRows()
    .filter((r) => r.votesLast7Days >= 3)
    .sort((a, b) => b.votesLast7Days - a.votesLast7Days)
    .slice(0, 15)
    .map((r) => ({
      slug: r.slug,
      votesLast7Days: r.votesLast7Days,
      votesLast30Days: r.votesLast30Days,
    }));

  const complaintBreakdown = (
    d
      .prepare(
        `SELECT complaint_category AS category, COUNT(*) AS count FROM recipe_crew_rating_ballots
         WHERE vote = 'down' AND complaint_category IS NOT NULL
         GROUP BY complaint_category ORDER BY count DESC`,
      )
      .all() as Array<{ category: string; count: number }>
  );

  const badgeDistribution: Record<string, number> = {};
  let recipesWithBadges = 0;
  const rows = d.prepare(`SELECT recipe_slug, total_votes, approval_score FROM recipe_crew_ratings`).all() as Array<{
    recipe_slug: string;
    total_votes: number;
    approval_score: number | null;
  }>;

  for (const row of rows) {
    const category = categoryBySlug.get(row.recipe_slug) || "";
    const windows = getVoteWindows(row.recipe_slug);
    const badges = evaluateRecipeBadges(
      {
        slug: row.recipe_slug,
        category,
        totalVotes: row.total_votes,
        approvalScore: row.approval_score,
        ...windows,
      },
      ctx,
    );
    if (badges.length > 0) recipesWithBadges++;
    for (const b of badges) {
      badgeDistribution[b] = (badgeDistribution[b] || 0) + 1;
    }
  }

  const totals = d
    .prepare(`SELECT COUNT(*) AS recipes, COALESCE(SUM(total_votes), 0) AS votes FROM recipe_crew_ratings`)
    .get() as { recipes: number; votes: number };

  return {
    mostLiked,
    mostDisliked,
    highestApproval,
    lowestApproval,
    mostVoted,
    fastestGrowing,
    complaintBreakdown,
    badgeDistribution,
    totalRatedRecipes: totals.recipes,
    totalVotes: totals.votes,
    badgeRate: totals.recipes > 0 ? recipesWithBadges / totals.recipes : 0,
  };
}

export function getRatingSortMap(): Map<string, { approvalScore: number | null; totalVotes: number; trendingScore: number }> {
  const d = getDb();
  const map = new Map<string, { approvalScore: number | null; totalVotes: number; trendingScore: number }>();
  const rows = d.prepare(`SELECT recipe_slug, approval_score, total_votes FROM recipe_crew_ratings`).all() as Array<{
    recipe_slug: string;
    approval_score: number | null;
    total_votes: number;
  }>;

  for (const row of rows) {
    const windows = getVoteWindows(row.recipe_slug);
    map.set(row.recipe_slug, {
      approvalScore: row.approval_score,
      totalVotes: row.total_votes,
      trendingScore: windows.votesLast7Days * 2 + windows.votesLast30Days,
    });
  }
  return map;
}

export { computeApprovalScore };
