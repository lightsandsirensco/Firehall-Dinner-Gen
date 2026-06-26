/**
 * Public social proof aggregates — analytics + hall vote ballots.
 */

import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import {
  SOCIAL_PROOF_HEADLINE,
  SOCIAL_PROOF_SUBHEADLINE,
  SOCIAL_PROOF_TESTIMONIALS,
} from "../../shared/social-proof/testimonials-data.js";
import type { SocialProofPayload, SocialProofStats } from "../../shared/social-proof/types.js";

let db: SqliteDatabase;

export async function initSocialProofStore(): Promise<void> {
  db = await getSharedLocalDb();
}

/** Test hook */
export function bindSocialProofDb(database: SqliteDatabase): void {
  db = database;
}

function countAnalyticsEvent(eventType: string): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM analytics_events WHERE event_type = ?`)
    .get(eventType) as { c: number };
  return Number(row?.c ?? 0);
}

function countHallVoteBallots(): number {
  try {
    const row = db.prepare(`SELECT COUNT(*) AS c FROM hall_vote_ballots`).get() as { c: number };
    return Number(row?.c ?? 0);
  } catch {
    return 0;
  }
}

function countHallVotesFromAnalytics(): number {
  const submitted = countAnalyticsEvent("hall_vote_submitted");
  const legacy = countAnalyticsEvent("hall_vote_cast");
  return Math.max(submitted, legacy);
}

export function getSocialProofStats(): SocialProofStats {
  const ballotVotes = countHallVoteBallots();
  const analyticsVotes = countHallVotesFromAnalytics();

  return {
    meals_generated: countAnalyticsEvent("meal_generated"),
    hall_votes: Math.max(ballotVotes, analyticsVotes),
    recipes_saved: countAnalyticsEvent("recipe_save"),
    generated_at: new Date().toISOString(),
  };
}

export function getSocialProofPayload(): SocialProofPayload {
  return {
    stats: getSocialProofStats(),
    testimonials: SOCIAL_PROOF_TESTIMONIALS,
    headline: SOCIAL_PROOF_HEADLINE,
    subheadline: SOCIAL_PROOF_SUBHEADLINE,
  };
}
