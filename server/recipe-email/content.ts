/**
 * Recipe email body. Ingredients and steps arrive already formatted exactly as
 * the page showed them (crew size, measurement system, allergy substitutions),
 * so the email matches what the person was looking at. Everything is escaped.
 */
import { SUPPORT_EMAIL } from "../../shared/support-contact.js";

export interface RecipeEmailInput {
  title: string;
  crewSize: number;
  ingredients: string[];
  steps: string[];
  proTips: string[];
  recipeUrl: string | null;
  unsubscribeUrl: string;
  siteUrl: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** CASL requires a valid mailing address in commercial email; set FIREHALL_MAILING_ADDRESS before launch. */
export function mailingAddress(): string | null {
  return process.env.FIREHALL_MAILING_ADDRESS?.trim() || null;
}

export function buildRecipeEmail(input: RecipeEmailInput): { subject: string; text: string; html: string } {
  const crewLine = input.crewSize > 0 ? `Quantities for a crew of ${input.crewSize}.` : "";
  const address = mailingAddress();
  const why = "You're getting this because you asked for this recipe and subscribed to Firehall Meals emails.";
  const subject = `Your recipe: ${input.title}`;

  const text = [
    input.title,
    crewLine,
    "",
    "INGREDIENTS",
    ...input.ingredients.map((i) => `- ${i}`),
    "",
    "STEPS",
    ...input.steps.map((s, n) => `${n + 1}. ${s}`),
    ...(input.proTips.length ? ["", "PRO TIPS", ...input.proTips.map((t) => `- ${t}`)] : []),
    "",
    input.recipeUrl ? `View it on Firehall Meals: ${input.recipeUrl}` : `Firehall Meals: ${input.siteUrl}`,
    "",
    "--",
    why,
    `Firehall Meals · ${SUPPORT_EMAIL}${address ? ` · ${address}` : ""}`,
    `Unsubscribe: ${input.unsubscribeUrl}`,
  ]
    .filter((l, i, all) => !(l === "" && all[i - 1] === ""))
    .join("\n");

  const section = (heading: string, body: string) =>
    `<tr><td style="padding:18px 28px 0;"><div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#a3a3a3;margin-bottom:8px;">${heading}</div>${body}</td></tr>`;
  const list = (items: string[], ordered: boolean) =>
    `<${ordered ? "ol" : "ul"} style="margin:0;padding-left:20px;color:#e5e5e5;font-size:15px;line-height:1.6;">${items
      .map((i) => `<li style="margin:0 0 6px;">${esc(i)}</li>`)
      .join("")}</${ordered ? "ol" : "ul"}>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f0f0f;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#171717;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 28px 4px;">
          <div style="font-family:Impact,Haettenschweiler,'Arial Narrow Bold',sans-serif;font-size:14px;letter-spacing:0.12em;color:#dc2626;">FIREHALL MEALS</div>
          <h1 style="margin:8px 0 4px;font-size:24px;line-height:1.25;color:#f5f5f5;">${esc(input.title)}</h1>
          ${crewLine ? `<p style="margin:0;color:#a3a3a3;font-size:14px;">${esc(crewLine)}</p>` : ""}
        </td></tr>
        ${section("Ingredients", list(input.ingredients, false))}
        ${section("Steps", list(input.steps, true))}
        ${input.proTips.length ? section("Pro tips", list(input.proTips, false)) : ""}
        <tr><td style="padding:24px 28px;text-align:center;">
          <a href="${esc(input.recipeUrl ?? input.siteUrl)}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">${input.recipeUrl ? "View on Firehall Meals" : "Visit Firehall Meals"}</a>
        </td></tr>
        <tr><td style="padding:16px 28px 24px;border-top:1px solid #2a2a2a;color:#737373;font-size:12px;line-height:1.6;">
          ${esc(why)}<br />
          Firehall Meals · <a href="mailto:${SUPPORT_EMAIL}" style="color:#a3a3a3;">${SUPPORT_EMAIL}</a>${address ? ` · ${esc(address)}` : ""}<br />
          <a href="${esc(input.unsubscribeUrl)}" style="color:#a3a3a3;">Unsubscribe from Firehall Meals emails</a> — your account and saved recipes stay as they are.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
