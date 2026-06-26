import { log, logError } from "../logger.js";
import type { ShiftReminderAction } from "../../shared/shift-reminder/types.js";
import {
  SHIFT_REMINDER_ACTION_LABELS,
  SHIFT_REMINDER_ACTION_PATHS,
} from "../../shared/shift-reminder/types.js";

function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.VITE_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:5000"
  ).replace(/\/$/, "");
}

export function buildShiftReminderOpenUrl(sendId: string): string {
  return `${appBaseUrl()}/api/shift-reminder/open/${encodeURIComponent(sendId)}`;
}

export function buildShiftReminderClickUrl(sendId: string, action: ShiftReminderAction): string {
  return `${appBaseUrl()}/api/shift-reminder/click/${encodeURIComponent(sendId)}?action=${encodeURIComponent(action)}`;
}

function actionButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin:8px 8px 8px 0;padding:12px 18px;background:#c41e1e;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">${label}</a>`;
}

export function buildShiftReminderEmailHtml(input: {
  sendId: string;
  displayName: string | null;
  shiftDateLabel: string;
}): string {
  const greeting = input.displayName?.trim() ? `Hey ${input.displayName.trim()},` : "Hey crew,";
  const generateUrl = buildShiftReminderClickUrl(input.sendId, "generate");
  const wheelUrl = buildShiftReminderClickUrl(input.sendId, "wheel");
  const voteUrl = buildShiftReminderClickUrl(input.sendId, "vote");
  const openPixel = buildShiftReminderOpenUrl(input.sendId);

  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
  <p>${greeting}</p>
  <h1 style="font-size:22px;margin:16px 0;">Tomorrow is shift day.</h1>
  <p>Pick tonight&apos;s meal for the crew — or start a hall vote so everyone weighs in before ${input.shiftDateLabel}.</p>
  <div style="margin:24px 0;">
    ${actionButton(SHIFT_REMINDER_ACTION_LABELS.generate, generateUrl)}
    ${actionButton(SHIFT_REMINDER_ACTION_LABELS.wheel, wheelUrl)}
    ${actionButton(SHIFT_REMINDER_ACTION_LABELS.vote, voteUrl)}
  </div>
  <p style="font-size:13px;color:#666;">Firehall Meals — one less &quot;what&apos;s for dinner?&quot; text on shift eve.</p>
  <img src="${openPixel}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />
</body>
</html>`;
}

export function buildShiftReminderEmailText(input: {
  sendId: string;
  displayName: string | null;
  shiftDateLabel: string;
}): string {
  const greeting = input.displayName?.trim() ? `Hey ${input.displayName.trim()},` : "Hey crew,";
  return `${greeting}

Tomorrow is shift day.

Pick tonight's meal for the crew — or start a hall vote before ${input.shiftDateLabel}.

${SHIFT_REMINDER_ACTION_LABELS.generate}: ${buildShiftReminderClickUrl(input.sendId, "generate")}
${SHIFT_REMINDER_ACTION_LABELS.wheel}: ${buildShiftReminderClickUrl(input.sendId, "wheel")}
${SHIFT_REMINDER_ACTION_LABELS.vote}: ${buildShiftReminderClickUrl(input.sendId, "vote")}

Firehall Meals`;
}

export async function sendShiftReminderEmail(input: {
  sendId: string;
  email: string;
  displayName: string | null;
  shiftDateLabel: string;
}): Promise<{ sent: boolean; preview?: string }> {
  const from = process.env.SMTP_FROM?.trim() || "noreply@firehallmeals.com";
  const host = process.env.SMTP_HOST?.trim();
  const subject = "Tomorrow is shift day — pick tonight's meal";
  const html = buildShiftReminderEmailHtml(input);
  const text = buildShiftReminderEmailText(input);

  if (!host) {
    log(`[shift-reminder] Email for ${input.email} (send=${input.sendId})`, "email");
    return { sent: false, preview: text };
  }

  try {
    const nodemailer = await import("nodemailer" as string);
    const transport = (nodemailer as {
      createTransport: (opts: Record<string, unknown>) => {
        sendMail: (opts: Record<string, unknown>) => Promise<unknown>;
      };
    }).createTransport({
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
      to: input.email,
      subject,
      text,
      html,
    });

    return { sent: true };
  } catch (err) {
    logError("shift-reminder", "email failed", err);
    return { sent: false, preview: text };
  }
}

export function redirectPathForAction(action: ShiftReminderAction, sendId: string): string {
  const base = SHIFT_REMINDER_ACTION_PATHS[action];
  const params = new URLSearchParams({
    utm_source: "shift_reminder",
    utm_medium: "email",
    utm_campaign: "shift_reminder",
    shift_action: action,
    sr_send: sendId,
  });
  return `${base}?${params.toString()}`;
}
