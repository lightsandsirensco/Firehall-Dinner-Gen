/**
 * Site email transport (Resend first, SMTP fallback) shared by sign-in links
 * and recipe emails. Tests swap the transport with setMailTransportForTests so
 * nothing leaves the process.
 */

export interface SiteEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Extra headers, e.g. List-Unsubscribe for marketing mail. */
  headers?: Record<string, string>;
  /** Resend tag for reporting (magic_link, recipe_email, …). */
  category: string;
}

export type MailProvider = "resend" | "smtp" | "test";
type MailTransport = (mail: SiteEmail) => Promise<MailProvider>;

let testTransport: MailTransport | null = null;

export function setMailTransportForTests(transport: MailTransport | null): void {
  testTransport = transport;
}

export function isSiteMailConfigured(): boolean {
  return Boolean(testTransport || process.env.RESEND_API_KEY?.trim() || process.env.SMTP_HOST?.trim());
}

export async function sendViaResend(input: SiteEmail): Promise<void> {
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
      tags: [{ name: "category", value: input.category }],
    };
    if (input.replyTo) body.reply_to = input.replyTo;
    if (input.headers) body.headers = input.headers;

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

export async function sendViaSmtp(input: SiteEmail): Promise<void> {
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
    headers: input.headers,
  });
}

/** Sends through Resend, falling back to SMTP when both are configured. Throws when nothing is configured. */
export async function sendSiteEmail(mail: SiteEmail): Promise<MailProvider> {
  if (testTransport) return testTransport(mail);
  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasSmtp = Boolean(process.env.SMTP_HOST?.trim());
  if (hasResend) {
    try {
      await sendViaResend(mail);
      return "resend";
    } catch (err) {
      if (!hasSmtp) throw err;
    }
  }
  if (!hasSmtp) throw new Error("No email provider configured (RESEND_API_KEY or SMTP_HOST)");
  await sendViaSmtp(mail);
  return "smtp";
}
