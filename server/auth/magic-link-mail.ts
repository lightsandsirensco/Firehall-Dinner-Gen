import { log, logError } from "../logger.js";

function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.VITE_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:5000"
  );
}

export function buildMagicLinkUrl(rawToken: string): string {
  const base = appBaseUrl().replace(/\/$/, "");
  return `${base}/api/auth/verify-magic?token=${encodeURIComponent(rawToken)}`;
}

export async function sendMagicLinkEmail(email: string, rawToken: string): Promise<{ sent: boolean; devLink?: string }> {
  const link = buildMagicLinkUrl(rawToken);
  const from = process.env.SMTP_FROM?.trim() || "noreply@firehallmeals.com";
  const host = process.env.SMTP_HOST?.trim();

  if (!host) {
    log(`[auth] Magic link for ${email}: ${link}`, "auth");
    return { sent: false, devLink: link };
  }

  try {
    const nodemailer = await import("nodemailer" as string);
    const transport = (nodemailer as { createTransport: (opts: Record<string, unknown>) => { sendMail: (opts: Record<string, unknown>) => Promise<unknown> } }).createTransport({
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
      from,
      to: email,
      subject: "Sign in to Firehall Meals",
      text: `Tap to sign in (expires in 15 minutes):\n\n${link}\n\nIf you didn't request this, ignore this email.`,
      html: `<p>Tap to sign in (expires in 15 minutes):</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, ignore this email.</p>`,
    });

    return { sent: true };
  } catch (err) {
    logError("auth", "magic link email failed", err);
    return { sent: false, devLink: link };
  }
}
