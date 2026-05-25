import type { Request, Response } from "express";
import { checkRateLimit, recordRateLimit, hashIp } from "./cache-store.js";
import { getClientIp } from "./client-ip.js";

const EXPLORE_BURST_WINDOW_MS = 60_000;
const EXPLORE_BURST_MAX = 40;
const EXPLORE_HOURLY_WINDOW_MS = 3_600_000;
const EXPLORE_HOURLY_MAX = 200;

/** Returns false and sends 429 when over limit. */
export function enforceExploreRateLimit(req: Request, res: Response): boolean {
  const ipHash = hashIp(getClientIp(req));

  const burst = checkRateLimit(`explore:burst:${ipHash}`, EXPLORE_BURST_WINDOW_MS, EXPLORE_BURST_MAX);
  if (!burst.allowed) {
    res.status(429).json({
      message: "Too many explore requests. Please slow down.",
      retry_after_seconds: Math.max(1, Math.ceil(burst.resetMs / 1000)),
    });
    return false;
  }

  const hourly = checkRateLimit(`explore:hourly:${ipHash}`, EXPLORE_HOURLY_WINDOW_MS, EXPLORE_HOURLY_MAX);
  if (!hourly.allowed) {
    res.status(429).json({
      message: "Explore hourly limit reached. Try again later.",
      retry_after_seconds: Math.max(1, Math.ceil(hourly.resetMs / 1000)),
    });
    return false;
  }

  recordRateLimit(`explore:burst:${ipHash}`);
  recordRateLimit(`explore:hourly:${ipHash}`);
  return true;
}
