import type { GenerationErrorCode } from "@shared/generation-errors";
import {
  GENERATION_USER_FAILURE_MESSAGE,
  GENERATION_USER_RETRY_MESSAGE,
} from "@shared/generation-reliability";

export interface ParsedApiError {
  status: number;
  message: string;
  code?: GenerationErrorCode;
  retryAfterSeconds?: number;
}

/** Parse `apiRequest` errors shaped as "429: {\"message\":...}" */
export function parseApiError(err: unknown): ParsedApiError {
  const raw = err instanceof Error ? err.message : String(err);
  const statusMatch = raw.match(/^(\d{3}):\s*/);
  const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
  const jsonPart = statusMatch ? raw.slice(statusMatch[0].length) : raw;

  try {
    const body = JSON.parse(jsonPart) as {
      message?: string;
      code?: GenerationErrorCode;
      retry_after_seconds?: number;
    };
    const waitHint =
      body.retry_after_seconds && body.retry_after_seconds > 0
        ? ` Try again in about ${Math.ceil(body.retry_after_seconds)} seconds.`
        : "";
    const rawMsg = body.message || "";
    const safeMsg =
      /zod|invalid_type|expected|string must|validation failed|unrecognized/i.test(rawMsg)
        ? GENERATION_USER_RETRY_MESSAGE
        : rawMsg || GENERATION_USER_FAILURE_MESSAGE;
    return {
      status,
      code: body.code,
      message: safeMsg + waitHint,
      retryAfterSeconds: body.retry_after_seconds,
    };
  } catch {
    if (raw.includes("timed out") || (err instanceof Error && err.name === "AbortError")) {
      return {
        status: 504,
        code: "upstream_timeout",
        message: "Request timed out. Tap Pick Tonight's Meal again — the hall line is still working.",
      };
    }
    if (
      /String must contain at most|too_big|Invalid request:|ZodError|validation/i.test(raw) ||
      /expected string|invalid_type|Unrecognized key/i.test(raw)
    ) {
      return {
        status: status || 400,
        code: "validation_error",
        message: GENERATION_USER_RETRY_MESSAGE,
      };
    }
    if (/generation_failed|upstream_timeout|503|500|504/i.test(raw)) {
      return {
        status: status || 500,
        code: status === 504 ? "upstream_timeout" : "generation_failed",
        message: GENERATION_USER_FAILURE_MESSAGE,
      };
    }
    return { status, message: GENERATION_USER_FAILURE_MESSAGE };
  }
}
