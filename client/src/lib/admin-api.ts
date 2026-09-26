/**
 * Authenticated fetch for /api/admin/* (requires server ADMIN_SECRET).
 * In Vite dev, Golden 100 catalog routes skip the key (server NODE_ENV=development).
 */

const isViteDev = import.meta.env.DEV;

function isGolden100AdminUrl(input: string): boolean {
  return (
    input.includes("/api/admin/golden-100") || input.includes("/api/admin/curated-recipes")
  );
}

function resolveAdminKey(): string {
  const fromEnv = import.meta.env.VITE_ADMIN_SECRET;
  if (typeof fromEnv === "string" && fromEnv.length > 0) return fromEnv;
  try {
    return sessionStorage.getItem("fh_admin_key") || "";
  } catch {
    return "";
  }
}

export function setAdminKey(key: string): void {
  sessionStorage.setItem("fh_admin_key", key);
}

export async function adminFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  if (isViteDev && isGolden100AdminUrl(input)) {
    return fetch(input, {
      ...init,
      credentials: "include",
    });
  }

  let key = resolveAdminKey();
  if (!key && typeof window !== "undefined") {
    const entered = window.prompt("Enter admin key (matches server ADMIN_SECRET):");
    if (entered?.trim()) {
      key = entered.trim();
      setAdminKey(key);
    }
  }

  const headers = new Headers(init?.headers);
  if (key) headers.set("x-admin-key", key);

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });

  // A cached key that the server rejects (403) would otherwise be resent
  // forever — resolveAdminKey() only prompts when the cache is EMPTY, so a
  // single typo silently locked every subsequent admin action until someone
  // manually cleared sessionStorage. Clear it here so the next admin action
  // re-prompts instead of repeating the same wrong key.
  if (res.status === 403 && key) {
    try {
      sessionStorage.removeItem("fh_admin_key");
    } catch {
      /* ignore */
    }
  }

  return res;
}

/**
 * Turns an adminFetch() Response into an accurate, actionable message —
 * never a generic "failed" that hides WHY (missing ADMIN_SECRET vs wrong key
 * vs an actual server error are very different situations for an operator).
 */
export async function describeAdminError(res: Response, fallback: string): Promise<string> {
  if (res.status === 503) {
    return "Admin API is disabled — ADMIN_SECRET is not set in the server environment.";
  }
  if (res.status === 403) {
    return "Wrong admin key. It has been cleared — try the action again and re-enter the correct key.";
  }
  try {
    const body = await res.clone().json();
    if (body && typeof body.message === "string" && body.message) {
      return body.message;
    }
  } catch {
    /* body wasn't JSON — fall through to the generic message */
  }
  return `${fallback} (HTTP ${res.status})`;
}
