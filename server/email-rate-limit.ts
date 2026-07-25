import type { Request, Response } from "express";
import { checkRateLimit, recordRateLimit, hashIp } from "./cache-store.js";
import { getClientIp } from "./client-ip.js";

const EMAIL_BURST_WINDOW_MS = 60_000;
const EMAIL_BURST_MAX = 5;
const EMAIL_ADDR_WINDOW_MS = 3_600_000;
const EMAIL_ADDR_MAX = 8;

export type EmailRateLimitCheck = { allowed: true } | { allowed: false; retryAfterSeconds: number; message: string };

/** Check limits without recording — so failed sends don't burn the hourly quota. */
export function checkEmailRateLimit(req: Request, email: string): EmailRateLimitCheck {
  const ipHash = hashIp(getClientIp(req));
  const normalizedEmail = email.trim().toLowerCase();
  const emailHash = hashIp(normalizedEmail);

  const burst = checkRateLimit(`email:burst:${ipHash}`, EMAIL_BURST_WINDOW_MS, EMAIL_BURST_MAX);
  if (!burst.allowed) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(burst.resetMs / 1000)),
      message: "Too many requests from this device. Wait a minute and try again.",
    };
  }

  const perAddress = checkRateLimit(`email:addr:${emailHash}`, EMAIL_ADDR_WINDOW_MS, EMAIL_ADDR_MAX);
  if (!perAddress.allowed) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(perAddress.resetMs / 1000)),
      message:
        "We've already sent several links to this email. Check your inbox and spam folder, or wait before requesting another.",
    };
  }

  return { allowed: true };
}

/** Call after a successful (or intentionally accepted) send. */
export function recordEmailRateLimit(req: Request, email: string): void {
  const ipHash = hashIp(getClientIp(req));
  const emailHash = hashIp(email.trim().toLowerCase());
  recordRateLimit(`email:burst:${ipHash}`);
  recordRateLimit(`email:addr:${emailHash}`);
}

/** Returns false and sends 429 when over limit. Records only when allowed (legacy helper). */
export function enforceEmailRateLimit(req: Request, res: Response, email: string): boolean {
  const check = checkEmailRateLimit(req, email);
  if (!check.allowed) {
    res.status(429).json({
      message: check.message,
      retry_after_seconds: check.retryAfterSeconds,
    });
    return false;
  }
  // Burst recorded early to stop spam clicking; address recorded on successful send via recordEmailRateLimit
  const ipHash = hashIp(getClientIp(req));
  recordRateLimit(`email:burst:${ipHash}`);
  return true;
}
