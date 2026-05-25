import type { Request, Response } from "express";
import { checkRateLimit, recordRateLimit, hashIp } from "./cache-store.js";
import { getClientIp } from "./client-ip.js";

const EMAIL_BURST_WINDOW_MS = 60_000;
const EMAIL_BURST_MAX = 5;
const EMAIL_ADDR_WINDOW_MS = 3_600_000;
const EMAIL_ADDR_MAX = 5;

/** Returns false and sends 429 when over limit. */
export function enforceEmailRateLimit(req: Request, res: Response, email: string): boolean {
  const ipHash = hashIp(getClientIp(req));
  const normalizedEmail = email.trim().toLowerCase();
  const emailHash = hashIp(normalizedEmail);

  const burst = checkRateLimit(`email:burst:${ipHash}`, EMAIL_BURST_WINDOW_MS, EMAIL_BURST_MAX);
  if (!burst.allowed) {
    res.status(429).json({
      message: "Too many email requests. Please wait a minute and try again.",
      retry_after_seconds: Math.max(1, Math.ceil(burst.resetMs / 1000)),
    });
    return false;
  }

  const perAddress = checkRateLimit(`email:addr:${emailHash}`, EMAIL_ADDR_WINDOW_MS, EMAIL_ADDR_MAX);
  if (!perAddress.allowed) {
    res.status(429).json({
      message: "This email address was used recently. Check your inbox or try again later.",
      retry_after_seconds: Math.max(1, Math.ceil(perAddress.resetMs / 1000)),
    });
    return false;
  }

  recordRateLimit(`email:burst:${ipHash}`);
  recordRateLimit(`email:addr:${emailHash}`);
  return true;
}
