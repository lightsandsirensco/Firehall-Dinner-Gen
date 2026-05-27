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

  return fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });
}
