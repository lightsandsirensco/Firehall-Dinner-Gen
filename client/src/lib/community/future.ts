/**
 * Community features — client-side contract (not wired to API yet).
 * Import types from shared when building hall submissions / voting UI.
 */

export type {
  HallSubmissionDraft,
  HallVoteRecord,
  RegionalMealTag,
  FirefighterStory,
  CommunityApiV1,
  CommunityContentStatus,
} from "@shared/community/schema";

/** Placeholder until /api/community/v1 ships */
export const COMMUNITY_API_ENABLED = false;
