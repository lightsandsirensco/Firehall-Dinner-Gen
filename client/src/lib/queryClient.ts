import { QueryClient, QueryFunction } from "@tanstack/react-query";

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

async function ensureCsrfToken(): Promise<string> {
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
      throw new Error("Request timed out. The server is still working — tap Generate again to retry.");
    }
    throw err;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
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
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
