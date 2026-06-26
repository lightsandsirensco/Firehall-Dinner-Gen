/**
 * Client helpers for post-auth return navigation.
 */

import { sanitizeReturnToPath } from "@shared/auth/return-to";

const RETURN_TO_KEY = "fh_auth_return_to";

export function captureAuthReturnTo(explicit?: string): string {
  const path =
    sanitizeReturnToPath(explicit) ??
    sanitizeReturnToPath(
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : null,
    ) ??
    "/me/profile";

  if (typeof window !== "undefined") {
    sessionStorage.setItem(RETURN_TO_KEY, path);
  }
  return path;
}

export function readAuthReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  return sanitizeReturnToPath(sessionStorage.getItem(RETURN_TO_KEY));
}

export function clearAuthReturnTo(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(RETURN_TO_KEY);
  }
}

export function stripAuthQueryParams(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of ["signed_in", "error"]) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed) {
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", next);
  }
}
