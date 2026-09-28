/**
 * Inbound Klaviyo system webhook — syncs unsubscribe/suppression state back
 * to the Postgres marketing-consent source of truth (user_marketing_consent).
 *
 * Topics handled are exactly the two documented, verified-real Klaviyo
 * system-webhook topics for this purpose (see
 * developers.klaviyo.com/en/docs/working_with_system_webhooks —
 * "Common webhook topics" table). No other topic/event type is invented or
 * assumed:
 *   - event:klaviyo.unsubscribed_from_email_marketing
 *   - event:klaviyo.manually_suppressed_from_email_marketing
 *
 * Setting up the Klaviyo side (creating the webhook subscription with these
 * topics + a secret_key) is a manual, one-time step — see the final report
 * for exact instructions. Note: Klaviyo's system Webhooks API is currently
 * gated to Advanced KDP plans/app partners; if this account isn't on that
 * tier, the Klaviyo-side subscription cannot be created yet and this
 * endpoint will simply receive nothing until it is.
 */
import type { Express, Request, Response } from "express";
import { logError, log } from "../logger.js";
import { getKlaviyoProfileEmail, verifyKlaviyoWebhookSignature } from "../klaviyo.js";
import { recordUnsubscribe } from "./store.js";
import { pgOne, pgRun } from "../db/pg-sql.js";

const UNSUBSCRIBE_TOPICS = new Set([
  "event:klaviyo.unsubscribed_from_email_marketing",
  "event:klaviyo.manually_suppressed_from_email_marketing",
]);

interface KlaviyoWebhookDelivery {
  data?: Array<{
    external_id?: string;
    topic?: string;
    payload?: {
      data?: {
        relationships?: {
          profile?: { data?: { id?: string } };
        };
      };
    };
  }>;
  meta?: { klaviyo_webhook_id?: string };
}

export function registerMarketingConsentWebhookRoutes(app: Express): void {
  // Intentionally NOT behind requireCsrf/requireAuth — authenticity comes
  // from Klaviyo-Signature + KLAVIYO_WEBHOOK_SECRET (verified below), same
  // pattern as the Stripe webhook. req.rawBody is captured by the global
  // express.json({ verify }) hook in server/index.ts.
  app.post("/api/klaviyo/webhook", async (req: Request, res: Response) => {
    try {
      const signature = req.headers["klaviyo-signature"];
      const timestamp = req.headers["klaviyo-timestamp"];
      const webhookId = req.headers["klaviyo-webhook-id"];

      if (
        typeof signature !== "string" ||
        typeof timestamp !== "string" ||
        !req.rawBody ||
        !verifyKlaviyoWebhookSignature(req.rawBody as Buffer, timestamp, signature)
      ) {
        log("webhook signature verification failed or missing headers", "klaviyo");
        return res.status(400).json({ message: "Invalid signature" });
      }

      const body = req.body as KlaviyoWebhookDelivery;

      // Defensive integrity check per Klaviyo docs: header id must match
      // body meta id, or this may not be a genuine delivery.
      if (body.meta?.klaviyo_webhook_id && webhookId && body.meta.klaviyo_webhook_id !== webhookId) {
        return res.status(400).json({ message: "Webhook id mismatch" });
      }

      for (const item of body.data ?? []) {
        if (!item.topic || !UNSUBSCRIBE_TOPICS.has(item.topic) || !item.external_id) continue;

        const already = await pgOne(
          `SELECT 1 FROM klaviyo_webhook_events WHERE external_id = $1`,
          [item.external_id],
        );
        if (already) continue;

        const profileId = item.payload?.data?.relationships?.profile?.data?.id;
        const email = profileId ? await getKlaviyoProfileEmail(profileId) : null;

        if (email) {
          await recordUnsubscribe(email, item.topic);
          log(`unsubscribe synced topic=${item.topic}`, "klaviyo");
        } else {
          logError("klaviyo", "webhook event missing resolvable profile email", new Error(item.topic));
        }

        await pgRun(
          `INSERT INTO klaviyo_webhook_events (external_id, topic) VALUES ($1, $2) ON CONFLICT (external_id) DO NOTHING`,
          [item.external_id, item.topic],
        );
      }

      // Klaviyo requires a 200/201/202 within 5s or it treats this as failed and retries.
      return res.status(200).json({ ok: true });
    } catch (err) {
      logError("klaviyo", "webhook handling failed", err);
      return res.status(500).json({ message: "Webhook handling failed" });
    }
  });
}
