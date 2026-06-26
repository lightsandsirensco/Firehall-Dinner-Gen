/**
 * Safe internal return paths after sign-in (prevents open redirects).
 */

const BLOCKED_PREFIXES = ["/api/", "/admin", "/vote/"] as const;

const AUTH_QUERY_KEYS = new Set([
  "signed_in",
  "error",
  "signed_out",
  "create_hall",
]);

/** Normalize and validate a post-auth redirect path. */
export function sanitizeReturnToPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;

  const pathOnly = trimmed.split("?")[0] ?? trimmed;
  const lower = pathOnly.toLowerCase();

  for (const prefix of BLOCKED_PREFIXES) {
    if (lower === prefix.replace(/\/$/, "") || lower.startsWith(prefix)) {
      return null;
    }
  }

  try {
    const url = new URL(trimmed, "https://www.firehallmeals.com");
    const params = new URLSearchParams(url.search);
    for (const key of [...params.keys()]) {
      if (AUTH_QUERY_KEYS.has(key)) params.delete(key);
    }
    const search = params.toString();
    const path = url.pathname.length > 0 ? url.pathname : "/";
    return search ? `${path}?${search}` : path;
  } catch {
    return null;
  }
}

export function appendSignedInQuery(path: string): string {
  const safe = sanitizeReturnToPath(path) ?? "/me/profile";
  const url = new URL(safe, "https://www.firehallmeals.com");
  url.searchParams.set("signed_in", "1");
  return `${url.pathname}${url.search}`;
}

export function maskEmailAddress(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (local.length <= 1) return `*@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(3, local.length - 1))}@${domain}`;
}

export function inboxUrlForEmail(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return "https://mail.google.com/";
  }
  if (
    domain === "outlook.com" ||
    domain === "hotmail.com" ||
    domain === "live.com" ||
    domain.endsWith(".outlook.com")
  ) {
    return "https://outlook.live.com/mail/";
  }
  if (domain === "yahoo.com" || domain.endsWith(".yahoo.com")) {
    return "https://mail.yahoo.com/";
  }
  if (domain === "icloud.com" || domain === "me.com" || domain === "mac.com") {
    return "https://www.icloud.com/mail/";
  }
  return `mailto:${encodeURIComponent(email)}`;
}
