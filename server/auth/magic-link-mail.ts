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
  const subject = "Your Firehall Meals sign-in link";
  const text = [
    "Firehall Meals",
    "Built by Firefighters. Tested in the Firehall.",
    "",
    "Tap to sign in (expires in 15 minutes):",
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
              <div style="font-family:'Bebas Neue',Impact,sans-serif;font-size:28px;letter-spacing:0.08em;color:#f5f5f5;">FIREHALL MEALS</div>
              <div style="margin-top:6px;font-size:12px;color:#a3a3a3;letter-spacing:0.04em;text-transform:uppercase;">Built by Firefighters · Tested in the Firehall</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;color:#e5e5e5;font-size:16px;line-height:1.6;">
              <p style="margin:0 0 12px;">Tap below to sign in to your shift kitchen — saves, hall tools, and crew planning when you're ready.</p>
              <p style="margin:0;color:#a3a3a3;font-size:14px;">This link expires in <strong style="color:#f5f5f5;">15 minutes</strong> and works once.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;text-align:center;">
              <a href="${link}" style="display:inline-block;padding:14px 28px;background:#dc2626;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.02em;">Sign in to Firehall Meals</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;color:#737373;font-size:12px;line-height:1.5;">
              <p style="margin:0 0 8px;">Button not working? Copy this link:</p>
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
