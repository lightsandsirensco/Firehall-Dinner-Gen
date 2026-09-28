/**
 * Shop order emails — confirmation (sent from the webhook once an order is
 * finalized) and shipped notification (sent when admin marks an order
 * SHIPPED). Same Resend-first / SMTP-fallback transport as
 * server/auth/magic-link-mail.ts, kept self-contained here rather than
 * factoring out a shared mailer (small, low-risk footprint for this MVP).
 */
import { log, logError } from "../logger.js";
import type { ShopOrderWithItems } from "../../shared/shop/types.js";

function fromEmail(): string {
  return process.env.SHOP_MAIL_FROM?.trim() || process.env.MAGIC_LINK_FROM?.trim() || "orders@firehallmeals.com";
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() || process.env.SMTP_HOST?.trim());
}

async function sendViaResend(input: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        tags: [{ name: "category", value: "shop_order" }],
      }),
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

async function sendViaSmtp(input: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) throw new Error("SMTP_HOST is not set");
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    connectionTimeout: 15_000,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });
  await transport.sendMail({ from: fromEmail(), to: input.to, subject: input.subject, text: input.text, html: input.html });
}

async function sendMail(input: { to: string; subject: string; html: string; text: string }): Promise<void> {
  if (!isMailConfigured()) {
    log(`[shop] Email not configured — would send "${input.subject}" to ${input.to}`, "shop");
    return;
  }
  try {
    if (process.env.RESEND_API_KEY?.trim()) {
      await sendViaResend(input);
    } else {
      await sendViaSmtp(input);
    }
  } catch (err) {
    logError("shop", `order email failed (${input.subject})`, err);
  }
}

function itemLines(order: ShopOrderWithItems): string {
  return order.items
    .map((i) => `${i.product_name}${i.variant_label ? ` — ${i.variant_label}` : ""} ×${i.quantity}`)
    .join("\n");
}

export async function sendOrderConfirmationEmail(order: ShopOrderWithItems): Promise<void> {
  const subject = `Order confirmed — ${order.order_number}`;
  const itemsHtml = order.items
    .map(
      (i) =>
        `<li>${i.product_name}${i.variant_label ? ` — ${i.variant_label}` : ""} × ${i.quantity}</li>`,
    )
    .join("");
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
    <h1 style="font-size:22px;">Order confirmed</h1>
    <p>Thanks — we've got it.</p>
    <p style="font-weight:600;">Order ${order.order_number}</p>
    <ul>${itemsHtml}</ul>
    <p>Total: ${money(order.total_cents, order.currency)}</p>
    <p style="font-size:13px;color:#666;">A confirmation has been sent to ${order.customer_email}. Questions? Reply to this email.</p>
  </body></html>`;
  const text = `Order confirmed\n\nOrder ${order.order_number}\n\n${itemLines(order)}\n\nTotal: ${money(order.total_cents, order.currency)}\n\nA confirmation has been sent to ${order.customer_email}.`;
  await sendMail({ to: order.customer_email, subject, html, text });
}

export async function sendOrderShippedEmail(order: ShopOrderWithItems): Promise<void> {
  const subject = `Your order has shipped — ${order.order_number}`;
  const tracking = order.tracking_number
    ? `<p>Tracking: ${order.tracking_number}${order.tracking_carrier ? ` (${order.tracking_carrier})` : ""}</p>`
    : "";
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
    <h1 style="font-size:22px;">Your order shipped</h1>
    <p style="font-weight:600;">Order ${order.order_number}</p>
    ${tracking}
    <p style="font-size:13px;color:#666;">Firehall Meals</p>
  </body></html>`;
  const trackingText = order.tracking_number
    ? `Tracking: ${order.tracking_number}${order.tracking_carrier ? ` (${order.tracking_carrier})` : ""}\n`
    : "";
  const text = `Your order shipped\n\nOrder ${order.order_number}\n${trackingText}`;
  await sendMail({ to: order.customer_email, subject, html, text });
}
