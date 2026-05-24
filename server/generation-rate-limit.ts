/**
 * User-facing rate limits for /api/generate — prefetch and failed requests are excluded.
 */

import type { Request } from "express";
import { checkRateLimit, recordRateLimit } from "./cache-store.js";
import { log } from "./logger.js";
import type { GenerationIntent } from "../shared/generation-intent.js";

export interface GenerationRateContext {
  intent: GenerationIntent;
  requestId: string;
  isPrefetch: boolean;
}

export function parseGenerationRateContext(req: Request): GenerationRateContext {
  const body = req.body as {
    request_id?: string;
    generation_intent?: GenerationIntent;
  };
  const intent: GenerationIntent =
    body?.generation_intent === "prefetch" ? "prefetch" : "user";
  const requestId =
    typeof body?.request_id === "string" && body.request_id.trim()
      ? body.request_id.trim()
      : `auto-${Date.now()}`;
  return { intent, requestId, isPrefetch: intent === "prefetch" };
}

export interface UserRateLimitResult {
  allowed: boolean;
  status?: number;
  message?: string;
  retryAfterSeconds?: number;
}

/** Enforce burst/hourly limits for user-initiated generations only. */
export function enforceUserGenerationRateLimits(
  ipHash: string,
  sessionId: string,
  ctx: GenerationRateContext,
): UserRateLimitResult {
  if (ctx.isPrefetch) {
    log(`[rate] prefetch rid=${ctx.requestId} — user burst limits skipped`, "rate");
    return { allowed: true };
  }

  const burstCheck = checkRateLimit(`burst:${ipHash}`, 60_000, 3);
  if (!burstCheck.allowed) {
    const retrySec = Math.max(5, Math.ceil(burstCheck.resetMs / 1000));
    log(`[rate] burst blocked ip=${ipHash.slice(0, 8)} rid=${ctx.requestId} resetMs=${burstCheck.resetMs}`, "rate");
    return {
      allowed: false,
      status: 429,
      message: "Slow down! Maximum 3 recipes per minute. Please wait a moment.",
      retryAfterSeconds: retrySec,
    };
  }

  const hourlyCheck = checkRateLimit(`hourly:${ipHash}`, 3_600_000, 10);
  if (!hourlyCheck.allowed) {
    return {
      allowed: false,
      status: 429,
      message: `Hourly limit reached (10 recipes/hour). You have ${hourlyCheck.remaining} remaining. Try again later.`,
      retryAfterSeconds: Math.max(60, Math.ceil(hourlyCheck.resetMs / 1000)),
    };
  }

  const sessionBurst = checkRateLimit(`burst:session:${sessionId}`, 60_000, 3);
  if (!sessionBurst.allowed) {
    return {
      allowed: false,
      status: 429,
      message: "Slow down! Maximum 3 recipes per minute.",
      retryAfterSeconds: Math.max(5, Math.ceil(sessionBurst.resetMs / 1000)),
    };
  }

  const sessionHourly = checkRateLimit(`hourly:session:${sessionId}`, 3_600_000, 10);
  if (!sessionHourly.allowed) {
    return {
      allowed: false,
      status: 429,
      message: "Hourly limit reached (10 recipes/hour). Try again later.",
      retryAfterSeconds: Math.max(60, Math.ceil(sessionHourly.resetMs / 1000)),
    };
  }

  return { allowed: true };
}

/** Count only successful user-initiated generations (not prefetch, not duplicate signature). */
export function recordUserGenerationRateLimit(
  ipHash: string,
  sessionId: string,
  ctx: GenerationRateContext,
  opts: { sameSignature: boolean },
): void {
  if (ctx.isPrefetch) {
    log(`[rate] prefetch rid=${ctx.requestId} — not counted`, "rate");
    return;
  }
  if (opts.sameSignature) {
    log(`[rate] user rid=${ctx.requestId} — same signature, not counted`, "rate");
    return;
  }

  recordRateLimit(`burst:${ipHash}`);
  recordRateLimit(`hourly:${ipHash}`);
  recordRateLimit(`burst:session:${sessionId}`);
  recordRateLimit(`hourly:session:${sessionId}`);
  log(`[rate] user generation counted rid=${ctx.requestId} session=${sessionId}`, "rate");
}
