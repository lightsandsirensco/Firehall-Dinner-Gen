import type { Express, Request, Response } from "express";
import {
  consumeMagicLink,
  createAuthSession,
  createMagicLink,
  getAuthCapabilitiesForUser,
  getAuthCookieName,
  getAuthMe,
  initAuthStore,
  listSavedRecipes,
  revokeAuthSession,
  syncSavedRecipes,
  updateUserProfile,
  upsertEmailUser,
  upsertOAuthUser,
} from "./auth-store.js";
import { sendMagicLinkEmail } from "./magic-link-mail.js";
import { verifyAppleIdToken, verifyGoogleIdToken } from "./oauth-verify.js";
import { attachAuthUser, requireAuth, type AuthedRequest } from "./auth-middleware.js";
import { requireCsrf } from "../csrf.js";
import { enforceEmailRateLimit } from "../email-rate-limit.js";
import { logError } from "../logger.js";
import {
  magicLinkRequestSchema,
  oauthTokenSchema,
  profileUpdateSchema,
  savedRecipesSyncSchema,
} from "../../shared/auth/schema.js";
import { insertAnalyticsEvents } from "../analytics/analytics-store.js";
import { appendSignedInQuery, sanitizeReturnToPath } from "../../shared/auth/return-to.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initAuthStore();
    storeReady = true;
  }
}

function authCookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie(getAuthCookieName(), token, authCookieOptions());
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(getAuthCookieName(), { path: "/" });
}

function trackAuthEvent(
  req: Request,
  eventType:
    | "account_created"
    | "login"
    | "profile_updated"
    | "magic_link_sent"
    | "magic_link_failed"
    | "magic_link_opened"
    | "magic_link_completed"
    | "magic_link_expired",
  metadata?: Record<string, string | number | boolean>,
): void {
  try {
    const sessionId = (req as AuthedRequest)._sessionId;
    insertAnalyticsEvents(
      [{ event_type: eventType, route: "/account", metadata }],
      sessionId,
    );
  } catch {
    /* analytics optional */
  }
}

export function registerAuthRoutes(app: Express): void {
  app.use(attachAuthUser);

  app.get("/api/auth/config", async (_req: Request, res: Response) => {
    return res.json({
      magic_link: true,
      google: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
      apple: Boolean(process.env.APPLE_CLIENT_ID?.trim()),
    });
  });

  app.get("/api/auth/me", async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const me = getAuthMe(req._authUserId ?? null);
      return res.json({
        ...me,
        capabilities: getAuthCapabilitiesForUser(me.user, me.billing),
      });
    } catch (err) {
      logError("auth", "me failed", err);
      return res.status(500).json({ message: "Failed to load account" });
    }
  });

  app.post("/api/auth/magic-link", requireCsrf, async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const parsed = magicLinkRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Enter a valid email address" });
      }

      if (!enforceEmailRateLimit(req, res, parsed.data.email)) return;

      const returnTo = sanitizeReturnToPath(parsed.data.return_to);
      const { rawToken } = createMagicLink(parsed.data.email, returnTo);
      const mail = await sendMagicLinkEmail(parsed.data.email, rawToken);

      if (mail.sent) {
        trackAuthEvent(req, "magic_link_sent", {
          return_to: returnTo ?? "",
        });
        return res.json({
          ok: true,
          sent: true,
          message: "Check your email for a sign-in link.",
        });
      }

      if ("mode" in mail && mail.mode === "development") {
        return res.json({
          ok: true,
          sent: false,
          dev_link: mail.devLink,
          message: "Development mode: use the sign-in link below.",
        });
      }

      if ("error" in mail) {
        trackAuthEvent(req, "magic_link_failed", {
          error: mail.error,
        });
        if (mail.error === "not_configured") {
          return res.status(503).json({ message: mail.message });
        }
        return res.status(502).json({
          message: mail.message || "We could not send the sign-in link. Try again.",
        });
      }

      trackAuthEvent(req, "magic_link_failed", { error: "unknown" });
      return res.status(500).json({ message: "We could not send the sign-in link. Try again." });
    } catch (err) {
      logError("auth", "magic-link failed", err);
      trackAuthEvent(req, "magic_link_failed", { error: "exception" });
      return res.status(500).json({ message: "We could not send the sign-in link. Try again." });
    }
  });

  app.get("/api/auth/verify-magic", async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const token = String(req.query.token ?? "");
      if (!token) {
        trackAuthEvent(req, "magic_link_opened", { valid: false });
        return res.redirect("/me/profile?error=invalid_link");
      }

      trackAuthEvent(req, "magic_link_opened", { valid: true });
      const consumed = consumeMagicLink(token);
      if (!consumed.ok) {
        if (consumed.reason === "expired" || consumed.reason === "used") {
          trackAuthEvent(req, "magic_link_expired", { reason: consumed.reason });
        }
        const errorParam = consumed.reason === "expired" ? "expired_link" : "invalid_link";
        return res.redirect(`/me/profile?error=${errorParam}`);
      }

      const { user, isNew } = upsertEmailUser(consumed.email);
      const session = createAuthSession(user.user_id, isNew);
      setAuthCookie(res, session.token);

      trackAuthEvent(req, isNew ? "account_created" : "login", {
        provider: "email",
      });
      trackAuthEvent(req, "magic_link_completed", {
        is_new: isNew,
        return_to: consumed.returnTo ?? "",
      });

      const destination = appendSignedInQuery(consumed.returnTo ?? "/me/profile");
      return res.redirect(destination);
    } catch (err) {
      logError("auth", "verify-magic failed", err);
      return res.redirect("/me/profile?error=sign_in_failed");
    }
  });

  app.post("/api/auth/google", requireCsrf, async (req: Request, res: Response) => {
    try {
      await ensureStore();
      if (!process.env.GOOGLE_CLIENT_ID?.trim()) {
        return res.status(501).json({ message: "Google Sign In is not configured" });
      }

      const parsed = oauthTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid Google credential" });
      }

      const identity = await verifyGoogleIdToken(parsed.data.id_token);
      const { user, isNew } = upsertOAuthUser({
        provider: "google",
        subject: identity.subject,
        email: identity.email,
        firstName: identity.firstName,
        lastName: identity.lastName,
      });
      const session = createAuthSession(user.user_id, isNew);
      setAuthCookie(res, session.token);

      trackAuthEvent(req, isNew ? "account_created" : "login", { provider: "google" });

      return res.json({ ok: true, is_new: isNew, user: getAuthMe(user.user_id) });
    } catch (err) {
      logError("auth", "google sign-in failed", err);
      return res.status(401).json({ message: "Google sign-in failed" });
    }
  });

  app.post("/api/auth/apple", requireCsrf, async (req: Request, res: Response) => {
    try {
      await ensureStore();
      if (!process.env.APPLE_CLIENT_ID?.trim()) {
        return res.status(501).json({ message: "Apple Sign In is not configured" });
      }

      const parsed = oauthTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid Apple credential" });
      }

      const identity = await verifyAppleIdToken(parsed.data.id_token);
      const appleName = parsed.data.user?.name;
      const { user, isNew } = upsertOAuthUser({
        provider: "apple",
        subject: identity.subject,
        email: identity.email ?? parsed.data.user?.email ?? null,
        firstName: appleName?.firstName ?? null,
        lastName: appleName?.lastName ?? null,
      });
      const session = createAuthSession(user.user_id, isNew);
      setAuthCookie(res, session.token);

      trackAuthEvent(req, isNew ? "account_created" : "login", { provider: "apple" });

      return res.json({ ok: true, is_new: isNew, user: getAuthMe(user.user_id) });
    } catch (err) {
      logError("auth", "apple sign-in failed", err);
      return res.status(401).json({ message: "Apple sign-in failed" });
    }
  });

  app.post("/api/auth/logout", requireCsrf, async (req: Request, res: Response) => {
    try {
      await ensureStore();
      const token = req.cookies?.[getAuthCookieName()] as string | undefined;
      if (token) revokeAuthSession(token);
      clearAuthCookie(res);
      return res.json({ ok: true });
    } catch (err) {
      logError("auth", "logout failed", err);
      return res.status(500).json({ message: "Logout failed" });
    }
  });

  app.patch("/api/auth/profile", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const parsed = profileUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid profile data" });
      }

      const me = updateUserProfile(req._authUserId!, parsed.data);
      trackAuthEvent(req, "profile_updated", {
        has_photo: Boolean(me.profile?.profile_photo_url),
      });

      return res.json({
        ...me,
        capabilities: getAuthCapabilitiesForUser(me.user, me.billing),
      });
    } catch (err) {
      logError("auth", "profile update failed", err);
      return res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get("/api/auth/saves", requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const recipes = listSavedRecipes(req._authUserId!);
      return res.json({ recipes });
    } catch (err) {
      logError("auth", "list saves failed", err);
      return res.status(500).json({ message: "Failed to load saved recipes" });
    }
  });

  app.put("/api/auth/saves", requireCsrf, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      await ensureStore();
      const parsed = savedRecipesSyncSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid saves payload" });
      }

      const upserted = syncSavedRecipes(
        req._authUserId!,
        parsed.data.recipes.map((r) => ({
          recipe_key: r.recipe_key,
          recipe_json: r.recipe_json ?? null,
          saved_at: r.saved_at,
        })),
        { replace: parsed.data.replace },
      );
      const recipes = listSavedRecipes(req._authUserId!);
      return res.json({ ok: true, upserted, recipes });
    } catch (err) {
      logError("auth", "sync saves failed", err);
      return res.status(500).json({ message: "Failed to sync saved recipes" });
    }
  });
}
