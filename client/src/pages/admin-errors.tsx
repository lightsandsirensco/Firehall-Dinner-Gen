import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppPageHeader } from "@/components/mobile/app-page-header";

interface ErrorEvent {
  id: string;
  at: string;
  source: "server" | "client";
  message: string;
  stack?: string;
  requestId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
}

export default function AdminErrorsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/admin/errors"],
    queryFn: async () => {
      const res = await fetch("/api/admin/errors?limit=100", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load errors");
      return res.json() as Promise<{ errors: ErrorEvent[]; total: number }>;
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen bg-[#141414] text-[#ededed] pb-24">
      <AppPageHeader title="Production Errors" variant="minimal" />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <Link href="/admin" className="text-sm text-red-400 hover:text-red-300">
          ← Admin
        </Link>
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-400">
            Recent server and client errors (in-memory ring buffer, last 200).
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Refresh
          </button>
        </div>
        {isLoading && <p className="text-neutral-500">Loading…</p>}
        {error && <p className="text-red-400">{(error as Error).message}</p>}
        {(data?.errors ?? []).map((evt) => (
          <article
            key={evt.id}
            className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-sm"
          >
            <div className="flex flex-wrap gap-2 text-xs text-neutral-500 mb-2">
              <span>{new Date(evt.at).toLocaleString()}</span>
              <span className="uppercase">{evt.source}</span>
              {evt.requestId && <span>rid={evt.requestId}</span>}
              {evt.method && evt.path && (
                <span>
                  {evt.method} {evt.path}
                </span>
              )}
              {evt.statusCode != null && <span>{evt.statusCode}</span>}
            </div>
            <p className="font-medium text-red-300">{evt.message}</p>
            {evt.stack && (
              <pre className="mt-2 overflow-x-auto text-xs text-neutral-500 whitespace-pre-wrap">
                {evt.stack.slice(0, 1200)}
              </pre>
            )}
          </article>
        ))}
        {data && data.errors.length === 0 && (
          <p className="text-neutral-500">No errors recorded since server start.</p>
        )}
      </main>
    </div>
  );
}
