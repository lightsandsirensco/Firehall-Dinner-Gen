/** Parse a fetch response as JSON; reject HTML SPA fallbacks and invalid bodies. */
export async function fetchJsonResource<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { credentials: "same-origin", ...init });
    if (!res.ok) return null;

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (contentType.includes("text/html")) return null;

    const text = await res.text();
    const trimmed = text.trimStart();
    if (trimmed.startsWith("<!") || trimmed.startsWith("<html")) return null;

    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function fetchJsonResourceOrThrow<T>(
  url: string,
  label: string,
  init?: RequestInit,
): Promise<T> {
  const data = await fetchJsonResource<T>(url, init);
  if (!data) throw new Error(`${label}: expected JSON at ${url}`);
  return data;
}
