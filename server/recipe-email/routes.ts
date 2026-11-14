/**
 * Email Recipe = subscribe to Firehall Meals emails and get the recipe sent.
 * Order matters: refuse without explicit consent, respect prior unsubscribes
 * and Klaviyo suppressions, save consent evidence, send the recipe, and only
 * then start a Klaviyo subscription — and only for people not already
 * subscribed, so nobody gets the welcome series twice.
 */
import type { Express, Request, Response } from "express";
import { emailRecipeSchema, type EmailRecipeResponse } from "../../shared/schema.js";
import {
  RECIPE_EMAIL_CONSENT_SOURCE,
  RECIPE_EMAIL_CONSENT_VERSION,
  RECIPE_EMAIL_COPY,
  recipeEmailDisclosureText,
} from "../../shared/marketing/recipe-email-consent.js";
import { SUPPORT_EMAIL } from "../../shared/support-contact.js";
import { requireCsrf } from "../csrf.js";
import type { AuthedRequest } from "../auth/auth-middleware.js";
import { enforceEmailRateLimit } from "../email-rate-limit.js";
import {
  ensureUnsubscribeToken,
  getConsent,
  markKlaviyoUnsubscribeSynced,
  normalizeEmail,
  recordConsentEvent,
  recordConsentOptIn,
  unsubscribeByToken,
} from "../marketing-consent/store.js";
import { recordEmailLeadCapture } from "../admin-users/email-directory.js";
import {
  getEmailMarketingStatus,
  subscribeToList,
  trackRecipeEvent,
  unsubscribeFromMarketing,
  validateKlaviyoConfig,
} from "../klaviyo.js";
import { isSiteMailConfigured, sendSiteEmail } from "../email/mailer.js";
import { resolvePublicSiteOrigin } from "../seo/sitemap.js";
import { clip, log, logError, maskEmail } from "../logger.js";
import { buildRecipeEmail } from "./content.js";

const CANT_SEND =
  `We can't send email to this address right now. The full recipe is still right here on this page — contact ${SUPPORT_EMAIL} if you think this is a mistake.`;

function siteOrigin(req: Request): string {
  return resolvePublicSiteOrigin(req.get("host"), req.get("x-forwarded-proto")).replace(/\/$/, "");
}

function recipeFromAddress(): string {
  return process.env.RECIPE_EMAIL_FROM?.trim() || `Firehall Meals <${SUPPORT_EMAIL}>`;
}

export function registerRecipeEmailRoutes(app: Express): void {
  app.post("/api/email-recipe", requireCsrf, async (req: AuthedRequest, res: Response) => {
    const parsed = emailRecipeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Please enter a valid email address.", errors: parsed.error.flatten().fieldErrors });
    }
    const input = parsed.data;
    const email = normalizeEmail(input.email);

    if (input.marketing_consent !== true) {
      return res.status(400).json({ code: "consent_required", message: RECIPE_EMAIL_COPY.consentRequired });
    }
    if (input.consent_version !== RECIPE_EMAIL_CONSENT_VERSION) {
      return res.status(409).json({ code: "stale_form", message: "This form has been updated. Please refresh the page and try again." });
    }
    if (!input.steps.length || !input.ingredients.length) {
      return res.status(400).json({ message: "This recipe is missing ingredients or steps, so we can't email it." });
    }
    if (!enforceEmailRateLimit(req, res, email)) return;
    if (!isSiteMailConfigured() || !validateKlaviyoConfig().ok) {
      log("[recipe-email] blocked: site mail or Klaviyo not configured", "email");
      return res.status(503).json({ message: "Recipe emails aren't available right now. The full recipe is still on this page." });
    }

    let alreadySubscribed: boolean;
    try {
      const local = await getConsent(email);
      if (local?.unsubscribed_at) return res.status(409).json({ code: "cannot_send", message: CANT_SEND });
      const klaviyo = await getEmailMarketingStatus(email);
      if (klaviyo === "blocked") return res.status(409).json({ code: "cannot_send", message: CANT_SEND });
      alreadySubscribed = (local?.marketing_consent === true) || klaviyo === "subscribed";
    } catch (err) {
      logError("recipe-email", `consent status check failed email=${maskEmail(email)}`, err);
      return res.status(503).json({ message: "Recipe emails aren't available right now. The full recipe is still on this page." });
    }

    let unsubscribeToken: string;
    try {
      await recordConsentEvent({
        email,
        userId: req._authUserId ?? null,
        status: "granted",
        source: RECIPE_EMAIL_CONSENT_SOURCE,
        disclosureVersion: RECIPE_EMAIL_CONSENT_VERSION,
        disclosureText: recipeEmailDisclosureText(),
        context: {
          recipe_title: input.recipe_title,
          recipe_slug: input.recipe_slug ?? null,
          crew_size: input.crew_size,
          page_path: input.page_path ?? null,
          already_subscribed: alreadySubscribed,
        },
      });
      await recordConsentOptIn({ email, userId: req._authUserId ?? null, source: RECIPE_EMAIL_CONSENT_SOURCE });
      unsubscribeToken = await ensureUnsubscribeToken(email);
      await recordEmailLeadCapture({ email, source: "generator", signup_form: "email-recipe" });
    } catch (err) {
      logError("recipe-email", `consent record failed email=${maskEmail(email)}`, err);
      return res.status(503).json({ message: "We couldn't save your subscription, so nothing was sent. Please try again." });
    }

    const origin = siteOrigin(req);
    const unsubscribeUrl = `${origin}/unsubscribe?t=${encodeURIComponent(unsubscribeToken)}`;
    const content = buildRecipeEmail({
      title: input.recipe_title,
      crewSize: input.crew_size,
      ingredients: input.ingredients,
      steps: input.steps,
      proTips: input.pro_tips,
      recipeUrl: input.page_path ? `${origin}${input.page_path}` : null,
      unsubscribeUrl,
      siteUrl: origin,
    });
    try {
      await sendSiteEmail({
        from: recipeFromAddress(),
        to: email,
        replyTo: SUPPORT_EMAIL,
        category: "recipe_email",
        ...content,
        headers: {
          "List-Unsubscribe": `<${origin}/api/marketing/unsubscribe?t=${encodeURIComponent(unsubscribeToken)}>, <mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
    } catch (err) {
      logError("recipe-email", `send failed email=${maskEmail(email)}`, err);
      return res.status(502).json({ message: "You're subscribed, but the recipe email didn't go out. Please try again in a minute." });
    }

    if (!alreadySubscribed) {
      // subscribeToList queues a durable retry on failure.
      void subscribeToList(email).catch(() => {});
    }
    void trackRecipeEvent(email, {
      recipe_title: input.recipe_title,
      primary_protein: input.primary_protein,
      healthiness_level: input.healthiness_level,
      crew_size: input.crew_size,
      ingredients: input.ingredients,
      steps: input.steps,
      pro_tips: input.pro_tips,
      macros: input.macros ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      generated_at: new Date().toISOString(),
    }).catch(() => {});

    log(
      `[recipe-email] sent email=${maskEmail(email)} title="${clip(input.recipe_title, 50)}" crew=${input.crew_size} subscription=${alreadySubscribed ? "existing" : "new"}`,
      "email",
    );
    const body: EmailRecipeResponse = {
      status: "sent",
      subscription: alreadySubscribed ? "existing" : "new",
      message: "Recipe sent. Check your inbox.",
    };
    return res.json(body);
  });

  // Link scanners prefetch GETs, so the page only confirms; the button POSTs.
  app.get("/unsubscribe", (req: Request, res: Response) => {
    const token = typeof req.query.t === "string" ? req.query.t : "";
    res.set("Cache-Control", "no-store").type("html").send(unsubscribePage(token, null));
  });

  // Form button and RFC 8058 one-click (List-Unsubscribe-Post) both land here. The token is the credential.
  app.post("/api/marketing/unsubscribe", async (req: Request, res: Response) => {
    const token = typeof req.query.t === "string" ? req.query.t : "";
    let email: string | null;
    try {
      email = await unsubscribeByToken(token, "email_link");
    } catch (err) {
      logError("recipe-email", "unsubscribe failed", err);
      return res.status(503).type("html").send(unsubscribePage(token, "error"));
    }
    if (!email) return res.status(404).type("html").send(unsubscribePage("", "unknown"));
    try {
      await unsubscribeFromMarketing(email);
      await markKlaviyoUnsubscribeSynced(email);
    } catch (err) {
      // Stays pending; the Klaviyo retry worker pushes it later.
      logError("recipe-email", `klaviyo unsubscribe deferred email=${maskEmail(email)}`, err);
    }
    log(`[recipe-email] unsubscribed email=${maskEmail(email)}`, "email");
    return res.type("html").send(unsubscribePage("", "done"));
  });
}

function unsubscribePage(token: string, state: "done" | "unknown" | "error" | null): string {
  const body =
    state === "done"
      ? `<h1>You're unsubscribed</h1><p>You won't get Firehall Meals marketing emails anymore. Your account, sign-in and saved recipes are unchanged.</p>`
      : state === "unknown"
        ? `<h1>Link not recognised</h1><p>This unsubscribe link is invalid or expired. Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> and we'll unsubscribe you.</p>`
        : state === "error"
          ? `<h1>Something went wrong</h1><p>Please try again, or email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> and we'll unsubscribe you.</p>`
          : `<h1>Unsubscribe from Firehall Meals emails?</h1><p>You'll stop getting meal ideas and updates. Your account and saved recipes stay as they are.</p>
             <form method="post" action="/api/marketing/unsubscribe?t=${encodeURIComponent(token)}"><button type="submit">Unsubscribe</button></form>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex" /><title>Firehall Meals — Email preferences</title>
<style>body{margin:0;background:#0f0f0f;color:#e5e5e5;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif}main{max-width:480px;margin:64px auto;padding:0 20px}h1{font-size:24px;color:#f5f5f5}p{line-height:1.6;color:#a3a3a3}a{color:#f5f5f5}button{background:#dc2626;color:#fff;border:0;border-radius:10px;padding:12px 22px;font-size:15px;font-weight:700;cursor:pointer}</style></head>
<body><main><p style="letter-spacing:.12em;color:#dc2626;font-weight:700">FIREHALL MEALS</p>${body}<p><a href="/">Back to Firehall Meals</a></p></main></body></html>`;
}
