import type { Express, Request, Response } from "express";
import { hallFeedbackSubmitSchema } from "../shared/hall-feedback/schema.js";
import { getClientIp } from "./client-ip.js";
import { log } from "./logger.js";
import { requireCsrf } from "./csrf.js";
import {
  countRecentFeedbackFromIp,
  hashFeedbackIp,
  initHallFeedbackStore,
  insertHallFeedback,
} from "./hall-feedback-store.js";

const RATE_LIMIT_PER_WINDOW = 8;
const RATE_WINDOW_MINUTES = 30;

export async function registerHallFeedbackRoutes(app: Express): Promise<void> {
  await initHallFeedbackStore();

  app.post("/api/hall-feedback", requireCsrf, (req: Request, res: Response) => {
    try {
      const parsed = hallFeedbackSubmitSchema.safeParse(req.body);
      if (!parsed.success) {
        const first = parsed.error.errors[0]?.message || "Invalid feedback.";
        return res.status(400).json({ ok: false, message: first });
      }

      const ip = getClientIp(req);
      const ipHash = hashFeedbackIp(ip);
      const recent = countRecentFeedbackFromIp(ipHash, RATE_WINDOW_MINUTES);
      if (recent >= RATE_LIMIT_PER_WINDOW) {
        return res.status(429).json({
          ok: false,
          message: "Easy on the radio — try again in a few minutes.",
        });
      }

      const sessionId = String((req as Request & { _sessionId?: string })._sessionId || "");
      insertHallFeedback(parsed.data, {
        sessionId: sessionId || undefined,
        ipHash,
        userAgent: req.get("user-agent") || "",
      });

      log(
        `[hall-feedback] saved source=${parsed.data.source} path=${parsed.data.page_path || "—"}`,
        "feedback",
      );

      return res.json({
        ok: true,
        message: "Got it — the hall hears you. Thanks for shaping the next shift.",
      });
    } catch (err: unknown) {
      log(`[hall-feedback] error: ${err instanceof Error ? err.message : String(err)}`, "feedback");
      return res.status(500).json({
        ok: false,
        message: "Could not send feedback right now. Try again in a moment.",
      });
    }
  });
}
