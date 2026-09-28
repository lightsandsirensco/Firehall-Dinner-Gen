import type { AuthCapabilities, AuthMeResponse } from "@shared/auth/types";

export interface AuthConfig {
  magic_link: boolean;
  email_configured?: boolean;
  magic_link_expires_minutes?: number;
  google: boolean;
  apple: boolean;
}

export type AuthMePayload = AuthMeResponse & { capabilities: AuthCapabilities };

export async function fetchAuthConfig(): Promise<AuthConfig> {
  // no-store: this is identity/session state — never let the browser's own
  // HTTP cache hand back a pre-sign-in snapshot (the service worker's
  // runtime-caching rule for /api/auth/ is the other half of this; see
  // vite.config.ts).
  const res = await fetch("/api/auth/config", { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load auth config");
  return res.json();
}

export async function fetchAuthMe(): Promise<AuthMePayload> {
  const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load account");
  return res.json();
}
