/**
 * Pro early-access waitlist API. Success is only ever reported after the
 * Postgres row exists; Klaviyo sync happens afterwards and is retried by
 * startProWaitlistSyncWorker. Joining is NOT newsletter consent — that is
 * recorded only when newsletter_opt_in is explicitly true.
 */
import type { Express, Response } from "express";
import {
  proWaitlistJoinSchema,
  type ProWaitlistJoinResponse,
  type ProWaitlistStatusResponse,
} from "../../shared/schema.js";
import { requireCsrf } from "../csrf.js";
import type { AuthedRequest } from "../auth/auth-middleware.js";
import { getUserById } from "../auth/auth-store.js";
import { enforceEmailRateLimit } from "../email-rate-limit.js";
import { recordConsentOptIn } from "../marketing-consent/store.js";
import { recordEmailLeadCapture } from "../admin-users/email-directory.js";
import { subscribeToList } from "../klaviyo.js";
import { log, logError, maskEmail } from "../logger.js";
import { getProWaitlistEntry, joinProWaitlist, syncProWaitlistEntry } from "./store.js";

async function accountEmail(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const user = await getUserById(userId);
  return user?.email?.trim().toLowerCase() || null;
}

export function registerProWaitlistRoutes(app: Express): void {
  app.get("/api/pro-waitlist/status", async (req: AuthedRequest, res: Response) => {
    try {
      const email = await accountEmail(req._authUserId);
      const entry = email ? await getProWaitlistEntry(email) : null;
      const body: ProWaitlistStatusResponse = {
        signed_in: Boolean(req._authUserId),
        account_email: email,
        joined: Boolean(entry),
        joined_at: entry?.joined_at ?? null,
      };
      return res.json(body);
    } catch (err) {
      logError("pro-waitlist", "status failed", err);
      return res.status(503).json({ message: "Couldn't check your early-access status. Please try again." });
    }
  });

  app.post("/api/pro-waitlist", requireCsrf, async (req: AuthedRequest, res: Response) => {
    const parsed = proWaitlistJoinSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Please enter a valid email address.", errors: parsed.error.flatten().fieldErrors });
    }
    const { source, newsletter_opt_in } = parsed.data;

    let email: string;
    let userId: string | null = null;
    try {
      const fromAccount = await accountEmail(req._authUserId);
      if (req._authUserId && !fromAccount) {
        return res.status(400).json({ message: "Your account has no email address to notify." });
      }
      if (fromAccount) {
        email = fromAccount;
        userId = req._authUserId ?? null;
      } else if (parsed.data.email) {
        email = parsed.data.email.trim().toLowerCase();
      } else {
        return res.status(400).json({ message: "Please enter your email address." });
      }
    } catch (err) {
      logError("pro-waitlist", "account lookup failed", err);
      return res.status(503).json({ message: "Couldn't save your spot right now. Please try again." });
    }

    let result: Awaited<ReturnType<typeof joinProWaitlist>>;
    try {
      if (!enforceEmailRateLimit(req, res, email)) return;
      result = await joinProWaitlist({ email, userId, source });
      await recordEmailLeadCapture({ email, source: "pro_waitlist", signup_form: source });
      if (newsletter_opt_in === true) {
        await recordConsentOptIn({ email, userId, source: "pro_waitlist" });
      }
    } catch (err) {
      logError("pro-waitlist", `join failed email=${maskEmail(email)}`, err);
      return res.status(503).json({ message: "Couldn't save your spot right now. Please try again." });
    }

    if (result.status === "joined") {
      void syncProWaitlistEntry(email, 0);
    }
    if (newsletter_opt_in === true) {
      // subscribeToList queues its own durable retry on failure.
      void subscribeToList(email).catch(() => {});
    }

    log(`[pro-waitlist] ${result.status} email=${maskEmail(email)} source=${source} newsletter=${newsletter_opt_in === true}`, "email");
    const body: ProWaitlistJoinResponse = {
      status: result.status,
      email,
      joined_at: result.entry.joined_at,
      newsletter: newsletter_opt_in === true ? "subscribed" : "not_requested",
    };
    return res.status(result.status === "joined" ? 201 : 200).json(body);
  });
}
