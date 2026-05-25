/**
 * Resolve the public site URL for links and imagery (Replit deployment + local dev).
 */
export function resolvePublicAppUrl(): string {
  const explicit = process.env.PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (domain) return `https://${domain.replace(/^https?:\/\//i, "")}`;

  const devDomain = process.env.REPLIT_DEV_DOMAIN?.trim();
  if (devDomain) return `https://${devDomain.replace(/^https?:\/\//i, "")}`;

  return `http://localhost:${process.env.PORT || "5000"}`;
}
