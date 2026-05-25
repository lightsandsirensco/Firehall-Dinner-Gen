/**
 * User-facing rate limits for /api/generate — prefetch and failed requests are excluded.
 */

import type { Request } from "express";
import { peekRateLimit, recordRateLimit } from "./cache-store.js";
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
  code?: "rate_limited";
  retryAfterSeconds?: number;
  remaining?: number;
}

function isDevRelaxedLimits(): boolean {
  if (process.env.RATE_LIMIT_RELAXED === "true") return true;
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

function burstLimits(): { windowMs: number; max: number } {
  if (isDevRelaxedLimits()) {
    return { windowMs: 60_000, max: 40 };
  }
  return { windowMs: 60_000, max: 8 };
}

function hourlyLimits(): { windowMs: number; max: number } {
  if (isDevRelaxedLimits()) {
    return { windowMs: 3_600_000, max: 200 };
  }
  return { windowMs: 3_600_000, max: 30 };
}

/** One burst key per IP — avoids double-counting IP + session for the same click. */
function burstKey(ipHash: string): string {
  return `gen:burst:${ipHash}`;
}

function hourlyKey(ipHash: string): string {
  return `gen:hourly:${ipHash}`;
}

/**
 * Peek-only limits before generation starts (does not consume quota).
 * Quota is consumed only on successful completion via recordUserGenerationRateLimit.
 */
export function enforceUserGenerationRateLimits(
  ipHash: string,
  sessionId: string,
  ctx: GenerationRateContext,
): UserRateLimitResult {
  if (ctx.isPrefetch) {
    log(`[rate] prefetch rid=${ctx.requestId} session=${sessionId.slice(0, 8)} — limits skipped`, "rate");
    return { allowed: true };
  }

  const burst = burstLimits();
  const burstCheck = peekRateLimit(burstKey(ipHash), burst.windowMs, burst.max);
  if (!burstCheck.allowed) {
    const retrySec = Math.max(5, Math.ceil(burstCheck.resetMs / 1000));
    log(
      `[rate] burst blocked ip=${ipHash.slice(0, 8)} rid=${ctx.requestId} count_at_limit resetMs=${burstCheck.resetMs} dev=${isDevRelaxedLimits()}`,
      "rate",
    );
    return {
      allowed: false,
      status: 429,
      code: "rate_limited",
      message: `Slow down — you can generate about ${burst.max} meals per minute. Try again in ${retrySec}s.`,
      retryAfterSeconds: retrySec,
      remaining: 0,
    };
  }

  const hourly = hourlyLimits();
  const hourlyCheck = peekRateLimit(hourlyKey(ipHash), hourly.windowMs, hourly.max);
  if (!hourlyCheck.allowed) {
    const retrySec = Math.max(60, Math.ceil(hourlyCheck.resetMs / 1000));
    log(
      `[rate] hourly blocked ip=${ipHash.slice(0, 8)} rid=${ctx.requestId} remaining=${hourlyCheck.remaining}`,
      "rate",
    );
    return {
      allowed: false,
      status: 429,
      code: "rate_limited",
      message: `Hourly limit reached (${hourly.max} meals/hour). Try again in ${Math.ceil(retrySec / 60)} min.`,
      retryAfterSeconds: retrySec,
      remaining: hourlyCheck.remaining,
    };
  }

  log(
    `[rate] peek ok ip=${ipHash.slice(0, 8)} burst_remaining=${burstCheck.remaining} hourly_remaining=${hourlyCheck.remaining} rid=${ctx.requestId}`,
    "rate",
  );

  return {
    allowed: true,
    remaining: Math.min(burstCheck.remaining, hourlyCheck.remaining),
  };
}

/** Count one successful user-initiated generation (not prefetch, not same signature retry). */
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
    log(`[rate] rid=${ctx.requestId} same signature — not counted`, "rate");
    return;
  }

  recordRateLimit(burstKey(ipHash));
  recordRateLimit(hourlyKey(ipHash));
  log(`[rate] counted success rid=${ctx.requestId} session=${sessionId.slice(0, 8)}`, "rate");
}

/** Pizza uses separate namespace but same relaxed/dev policy. */
export function enforcePizzaGenerationRateLimits(ipHash: string): UserRateLimitResult {
  const burst = burstLimits();
  const burstCheck = peekRateLimit(`pizza:burst:${ipHash}`, burst.windowMs, burst.max);
  if (!burstCheck.allowed) {
    return {
      allowed: false,
      status: 429,
      code: "rate_limited",
      message: "Slow down on pizza generation — try again in a moment.",
      retryAfterSeconds: Math.max(5, Math.ceil(burstCheck.resetMs / 1000)),
    };
  }
  const hourly = hourlyLimits();
  const hourlyCheck = peekRateLimit(`pizza:hourly:${ipHash}`, hourly.windowMs, hourly.max);
  if (!hourlyCheck.allowed) {
    return {
      allowed: false,
      status: 429,
      code: "rate_limited",
      message: "Pizza hourly limit reached. Try again later.",
      retryAfterSeconds: Math.max(60, Math.ceil(hourlyCheck.resetMs / 1000)),
    };
  }
  return { allowed: true };
}

export function recordPizzaGenerationRateLimit(ipHash: string): void {
  recordRateLimit(`pizza:burst:${ipHash}`);
  recordRateLimit(`pizza:hourly:${ipHash}`);
}
