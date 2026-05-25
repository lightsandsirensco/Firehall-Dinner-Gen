import { ensureCsrfToken } from "@/lib/queryClient";

/** POST/PUT/PATCH/DELETE with CSRF cookie + header (same-origin). */
export async function fetchWithCsrf(input: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();
  const headers = new Headers(init?.headers);

  if (method !== "GET" && method !== "HEAD") {
    const csrf = await ensureCsrfToken();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
  });
}
