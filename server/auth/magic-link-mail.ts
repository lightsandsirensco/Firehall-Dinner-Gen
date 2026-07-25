import { resolvePublicSiteOrigin } from "../seo/sitemap.js";
import { normalizePublicSiteOrigin } from "../../shared/seo/urls.js";
import { log, logError } from "../logger.js";

export type MagicLinkMailResult =
  | { sent: true; provider: "resend" | "smtp" }
  | { sent: false; devLink: string; mode: "development" }
  | {
      sent: false;
      error: "not_configured" | "send_failed";
      message: string;
      /** Short machine hint for logs / support (never secrets). */
      hint?: string;
    };

export const MAGIC_LINK_EXPIRY_MINUTES = 30;

export function isMagicLinkEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() || process.env.SMTP_HOST?.trim());
}

/** Public mail status — no secrets. Safe for /api/auth/config. */
export function getMagicLinkMailStatus(): {
  configured: boolean;
  providers: Array<"resend" | "smtp">;
  from_configured: boolean;
  expires_minutes: number;
} {
  const providers: Array<"resend" | "smtp"> = [];
  if (process.env.RESEND_API_KEY?.trim()) providers.push("resend");
  if (process.env.SMTP_HOST?.trim()) providers.push("smtp");
  return {
    configured: providers.length > 0,
    providers,
    from_configured: Boolean(
      process.env.MAGIC_LINK_FROM?.trim() || process.env.SMTP_FROM?.trim(),
    ),
    expires_minutes: MAGIC_LINK_EXPIRY_MINUTES,
  };
}

function magicLinkFromEmail(): string {
  return (
    process.env.MAGIC_LINK_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    "Firehall Meals <noreply@firehallmeals.com>"
  );
}

function shouldExposeDevLink(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.AUTH_MAGIC_LINK_DEV_EXPOSE === "true";
}

/**
 * Build absolute magic-link URL.
 * Order: PUBLIC_SITE_URL → SITE_URL → APP_BASE_URL → VITE_PUBLIC_SITE_URL → REPLIT → request host → canonical.
 */
export function buildMagicLinkUrl(
  rawToken: string,
  opts?: { reqHost?: string; forwardedProto?: string },
): string {
  const envOrigin =
    process.env.PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    process.env.VITE_PUBLIC_SITE_URL?.trim() ||
    process.env.REPLIT_DEPLOYMENT_URL?.trim();

  let base: string;
  if (envOrigin) {
    const cleaned = envOrigin.replace(/\/+$/, "");
    const withProto = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
    base = normalizePublicSiteOrigin(withProto);
  } else {
    base = resolvePublicSiteOrigin(opts?.reqHost, opts?.forwardedProto);
  }

  return `${base.replace(/\/$/, "")}/api/auth/verify-magic?token=${encodeURIComponent(rawToken)}`;
}

function buildMagicLinkContent(link: string): { subject: string; text: string; html: string } {
  const mins = MAGIC_LINK_EXPIRY_MINUTES;
  const subject = "Your Firehall Meals sign-in link";
  const text = [
    "Firehall Meals",
    "Built by Firefighters. Tested in the Firehall.",
    "",
    `Tap to sign in (expires in ${mins} minutes, one-time use):`,
    link,
    "",
    "If you didn't request this, ignore this email.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f0f0f;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#171717;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;text-align:center;background:linear-gradient(180deg,#1f1f1f 0%,#171717 100%);">
              <div style="font-family:Impact,Haettenschweiler,'Arial Narrow Bold',sans-serif;font-size:28px;letter-spacing:0.08em;color:#f5f5f5;">FIREHALL MEALS</div>
              <div style="margin-top:6px;font-size:12px;color:#a3a3a3;letter-spacing:0.04em;text-transform:uppercase;">Built by Firefighters · Tested in the Firehall</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;color:#e5e5e5;font-size:16px;line-height:1.6;">
              <p style="margin:0 0 12px;">Tap below to sign in — saves, hall tools, and crew planning when you're ready.</p>
              <p style="margin:0;color:#a3a3a3;font-size:14px;">This link expires in <strong style="color:#f5f5f5;">${mins} minutes</strong> and works once.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;text-align:center;">
              <a href="${link}" style="display:inline-block;padding:14px 28px;background:#dc2626;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.02em;">Sign in to Firehall Meals</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;color:#737373;font-size:12px;line-height:1.5;">
              <p style="margin:0 0 8px;">Button not working? Copy this link into your browser:</p>
              <p style="margin:0;word-break:break-all;color:#a3a3a3;">${link}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #2a2a2a;color:#737373;font-size:12px;line-height:1.5;">
              If you didn't request a sign-in link, you can safely ignore this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { subject, text, html };
}

function classifyProviderError(err: unknown): { message: string; hint: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (lower.includes("domain") && (lower.includes("not verif") || lower.includes("unverified"))) {
    return {
      message:
        "We could not send email from this server yet. The sending domain still needs verification.",
      hint: "domain_unverified",
    };
  }
  if (lower.includes("invalid api key") || lower.includes("unauthorized") || lower.includes("401")) {
    return {
      message: "Email service credentials look wrong. Try again later or contact support.",
      hint: "api_key_invalid",
    };
  }
  if (lower.includes("429") || lower.includes("rate limit")) {
    return {
      message: "The email service is busy. Wait a minute and try again.",
      hint: "provider_rate_limit",
    };
  }
  if (lower.includes("timeout") || lower.includes("abort")) {
    return {
      message: "The email service timed out. Try again in a moment.",
      hint: "timeout",
    };
  }
  return {
    message: "We could not send the sign-in link. Try again in a moment.",
    hint: "send_failed",
  };
}

async function sendViaResend(input: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const body: Record<string, unknown> = {
      from: input.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      tags: [{ name: "category", value: "magic_link" }],
    };
    if (input.replyTo) body.reply_to = input.replyTo;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new Error(`Resend API ${res.status}: ${detail}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function sendViaSmtp(input: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) throw new Error("SMTP_HOST is not set");

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS ?? "",
        }
      : undefined,
  });

  await transport.sendMail({
    from: input.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
  });
}

function emailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "unknown";
}

export async function sendMagicLinkEmail(
  email: string,
  rawToken: string,
  opts?: { reqHost?: string; forwardedProto?: string },
): Promise<MagicLinkMailResult> {
  const link = buildMagicLinkUrl(rawToken, opts);
  const { subject, text, html } = buildMagicLinkContent(link);
  const exposeDev = shouldExposeDevLink();
  const domain = emailDomain(email);

  if (!isMagicLinkEmailConfigured()) {
    log(`[auth] Magic link (email not configured) domain=${domain} link=${link}`, "auth");
    if (exposeDev) {
      return { sent: false, devLink: link, mode: "development" };
    }
    return {
      sent: false,
      error: "not_configured",
      message: "Email is not configured on this server.",
      hint: "not_configured",
    };
  }

  const from = magicLinkFromEmail();
  const replyTo = process.env.MAGIC_LINK_REPLY_TO?.trim() || undefined;
  const payload = { from, to: email, subject, html, text, replyTo };
  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasSmtp = Boolean(process.env.SMTP_HOST?.trim());

  try {
    if (hasResend) {
      try {
        await sendViaResend(payload);
        log(`[auth] Magic link sent via resend domain=${domain}`, "auth");
        return { sent: true, provider: "resend" };
      } catch (resendErr) {
        logError("auth", `magic link Resend failed domain=${domain}`, resendErr);
        if (hasSmtp) {
          log(`[auth] Falling back to SMTP domain=${domain}`, "auth");
          await sendViaSmtp(payload);
          log(`[auth] Magic link sent via smtp (fallback) domain=${domain}`, "auth");
          return { sent: true, provider: "smtp" };
        }
        throw resendErr;
      }
    }

    await sendViaSmtp(payload);
    log(`[auth] Magic link sent via smtp domain=${domain}`, "auth");
    return { sent: true, provider: "smtp" };
  } catch (err) {
    logError("auth", `magic link email failed domain=${domain}`, err);
    if (exposeDev) {
      return { sent: false, devLink: link, mode: "development" };
    }
    const classified = classifyProviderError(err);
    return {
      sent: false,
      error: "send_failed",
      message: classified.message,
      hint: classified.hint,
    };
  }
}
