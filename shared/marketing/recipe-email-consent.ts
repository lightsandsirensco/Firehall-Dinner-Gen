/**
 * Email Recipe signup copy. The client renders these strings verbatim and the
 * server stores the matching version's text as consent evidence, so any wording
 * change MUST bump RECIPE_EMAIL_CONSENT_VERSION.
 */
import { SUPPORT_EMAIL } from "../support-contact.js";

export const RECIPE_EMAIL_CONSENT_VERSION = "recipe-email-v1-2026-11-14";
export const RECIPE_EMAIL_CONSENT_SOURCE = "email_recipe";

export const RECIPE_EMAIL_COPY = {
  heading: "Get This Recipe in Your Inbox",
  description:
    "Subscribe to Firehall Meals emails and we'll send you this recipe for your crew, plus future firehouse meal ideas and occasional Firehall Meals updates.",
  checkbox:
    "Yes, email me this recipe and subscribe me to Firehall Meals emails with firehouse meal ideas and occasional updates. I can unsubscribe at any time.",
  cta: "Get Recipe & Subscribe",
  declineNote: "Not ready to subscribe? The full recipe stays right here on this page.",
  consentRequired: "Tick the box to subscribe and get the recipe by email, or keep using it on this page.",
  sender: `Sent by Firehall Meals · ${SUPPORT_EMAIL}`,
} as const;

/** Exactly what the person saw when they ticked the box — stored with every consent record. */
export function recipeEmailDisclosureText(): string {
  return [
    RECIPE_EMAIL_COPY.heading,
    RECIPE_EMAIL_COPY.description,
    `[checkbox, unchecked by default] ${RECIPE_EMAIL_COPY.checkbox}`,
    `[button] ${RECIPE_EMAIL_COPY.cta}`,
    RECIPE_EMAIL_COPY.declineNote,
    `${RECIPE_EMAIL_COPY.sender} · Privacy policy: /privacy`,
  ].join("\n");
}
