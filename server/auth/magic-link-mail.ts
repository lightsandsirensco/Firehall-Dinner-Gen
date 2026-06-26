import { resolvePublicSiteOrigin } from "../seo/sitemap.js";
import { log, logError } from "../logger.js";

export type MagicLinkMailResult =
  | { sent: true }
  | { sent: false; devLink: string; mode: "development" }
  | { sent: false; error: "not_configured" | "send_failed"; message: string };

export function isMagicLinkEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() || process.env.SMTP_HOST?.trim());
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

export function buildMagicLinkUrl(rawToken: string): string {
  const base = resolvePublicSiteOrigin().replace(/\/$/, "");
  return `${base}/api/auth/verify-magic?token=${encodeURIComponent(rawToken)}`;
}

function buildMagicLinkContent(link: string): { subject: string; text: string; html: string } {
  const subject = "Sign in to Firehall Meals";
  const text = `Tap to sign in (expires in 15 minutes):\n\n${link}\n\nIf you didn't request this, ignore this email.`;
  const html = `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
  <p>Tap the button below to sign in to Firehall Meals. This link expires in 15 minutes.</p>
  <p style="margin:24px 0;">
    <a href="${link}" style="display:inline-block;padding:12px 20px;background:#c41e1e;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Sign in</a>
  </p>
  <p style="font-size:13px;color:#666;word-break:break-all;">Or copy this link:<br>${link}</p>
  <p style="font-size:13px;color:#666;">If you didn't request this, you can ignore this email.</p>
</body>
</html>`;
  return { subject, text, html };
}

async function sendViaResend(input: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Resend API ${res.status}: ${detail}`);
  }
}

async function sendViaSmtp(input: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) throw new Error("SMTP_HOST is not set");

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
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
  });
}

export async function sendMagicLinkEmail(email: string, rawToken: string): Promise<MagicLinkMailResult> {
  const link = buildMagicLinkUrl(rawToken);
  const { subject, text, html } = buildMagicLinkContent(link);
  const exposeDev = shouldExposeDevLink();

  if (!isMagicLinkEmailConfigured()) {
    log(`[auth] Magic link (email not configured) for ${email}: ${link}`, "auth");
    if (exposeDev) {
      return { sent: false, devLink: link, mode: "development" };
    }
    return {
      sent: false,
      error: "not_configured",
      message: "Email is not configured on this server.",
    };
  }

  const from = magicLinkFromEmail();
  const payload = { from, to: email, subject, html, text };

  try {
    if (process.env.RESEND_API_KEY?.trim()) {
      await sendViaResend(payload);
    } else {
      await sendViaSmtp(payload);
    }
    return { sent: true };
  } catch (err) {
    logError("auth", "magic link email failed", err);
    if (exposeDev) {
      return { sent: false, devLink: link, mode: "development" };
    }
    return {
      sent: false,
      error: "send_failed",
      message: "We could not send the sign-in link. Try again.",
    };
  }
}
