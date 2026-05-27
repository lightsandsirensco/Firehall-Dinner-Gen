/**
 * Safe JSON parsing — never throw on malformed DB/cache payloads.
 */

export function safeJsonParse<T = unknown>(
  raw: string | null | undefined,
  fallback: T,
): T {
  if (!raw || typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeJsonParseNullable<T = unknown>(raw: string | null | undefined): T | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
