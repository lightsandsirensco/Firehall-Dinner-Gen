/**
 * Hall Feedback — lightweight community input (beta).
 * Structured for future channels (meal ideas, classics, UGC) without implementing them yet.
 */

/** Future expansion — only `general` is accepted by the API today. */
export type HallFeedbackChannel =
  | "general"
  | "meal_idea"
  | "community_idea"
  | "hall_classic"
  | "user_recipe";

export type HallFeedbackSource =
  | "floating_button"
  | "footer"
  | "generator_error"
  | "unknown";

export interface HallFeedbackPayload {
  message: string;
  email?: string;
  /** Reserved for future routing — server only accepts `general` for now. */
  channel?: HallFeedbackChannel;
  source?: HallFeedbackSource;
  page_path?: string;
}

export interface HallFeedbackSubmitResponse {
  ok: boolean;
  message: string;
}
