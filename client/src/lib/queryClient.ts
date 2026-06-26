import { QueryClient, QueryFunction, onlineManager } from "@tanstack/react-query";

if (typeof window !== "undefined") {
  onlineManager.setEventListener((setOnline) => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  });
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function ensureCsrfToken(): Promise<string> {
  let token = getCsrfToken();
  if (!token) {
    await fetch("/api/csrf-token", { credentials: "include" });
    token = getCsrfToken();
  }
  return token;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  timeoutMs: number = 45_000,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    const csrf = await ensureCsrfToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => {
        clearTimeout(timer);
        controller.abort();
      }, { once: true });
    }
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timer);
    await throwIfResNotOk(res);
    return res;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      if (externalSignal?.aborted) {
        throw err;
      }
      throw new Error("Request timed out. The server is still working — tap Pick Tonight's Meal again to retry.");
    }
    throw err;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

/** Build a fetch URL from react-query keys — avoids `/api/foo/bar=baz` join bugs. */
export function buildUrlFromQueryKey(queryKey: readonly unknown[]): string {
  if (queryKey.length === 0) return "/";
  const base = String(queryKey[0]);
  if (queryKey.length === 1) return base;
  const second = queryKey[1];
  if (typeof second === "number" && Number.isFinite(second)) {
    return `${base.replace(/\/$/, "")}/${second}`;
  }
  if (typeof second === "string") {
    if (second.includes("=")) {
      return `${base}${base.includes("?") ? "&" : "?"}${second}`;
    }
    return `${base.replace(/\/$/, "")}/${second}`;
  }
  return base;
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    const url = buildUrlFromQueryKey(queryKey);
    const res = await fetch(url, {
      credentials: "include",
      signal,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      gcTime: 30 * 60 * 1000,
      networkMode: "online",
      retry: (failureCount) => {
        if (typeof navigator !== "undefined" && !navigator.onLine) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    },
    mutations: {
      retry: false,
      networkMode: "online",
    },
  },
});
