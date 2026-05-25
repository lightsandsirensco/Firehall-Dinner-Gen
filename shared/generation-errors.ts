/**
 * Stable API error codes for generation endpoints (client + logs).
 */

export type GenerationErrorCode =
  | "rate_limited"
  | "duplicate_request"
  | "in_flight"
  | "validation_error"
  | "no_match"
  | "upstream_timeout"
  | "upstream_failure"
  | "budget_exceeded"
  | "generation_failed"
  | "csrf_failed";

export interface GenerationErrorBody {
  message: string;
  code: GenerationErrorCode;
  retry_after_seconds?: number;
  request_id?: string;
}

export function generationError(
  code: GenerationErrorCode,
  message: string,
  extra: Partial<GenerationErrorBody> = {},
): GenerationErrorBody {
  return { code, message, ...extra };
}
