import type { SocialProofAttribution } from "./types.js";

/** Compact public count — never shows exact zero on marketing surfaces. */
export function formatSocialProofCount(value: number): string {
  const n = Math.max(0, Math.floor(value));
  if (n === 0) return "—";
  if (n < 1000) return n.toLocaleString("en-CA");
  if (n < 10_000) {
    const k = Math.round(n / 100) / 10;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  const m = Math.round(n / 100_000) / 10;
  return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
}

export function formatTestimonialAttribution(attr: SocialProofAttribution): string {
  if (attr.anonymous) return "Anonymous firefighter";
  const name = attr.name?.trim();
  const role = attr.role?.trim();
  if (name && role) return `${name} · ${role}`;
  if (name) return name;
  return role ?? "";
}
