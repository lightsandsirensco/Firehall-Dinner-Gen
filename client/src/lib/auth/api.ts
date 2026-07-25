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
  const res = await fetch("/api/auth/config", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load auth config");
  return res.json();
}

export async function fetchAuthMe(): Promise<AuthMePayload> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load account");
  return res.json();
}
