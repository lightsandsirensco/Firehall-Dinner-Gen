import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  createHallLogbookEntry,
  fetchHallLogbook,
  markHallLogbookRead,
} from "@/lib/hall-logbook/api";
import type { HallLogbookPayload } from "@shared/hall-logbook/types";

export function HallLogbookPanel({ hallId }: { hallId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<HallLogbookPayload | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const payload = await fetchHallLogbook(hallId);
      setData(payload);
    } catch {
      setData(null);
    }
  }, [hallId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data || data.unread_count === 0) return;
    void markHallLogbookRead(hallId)
      .then(setData)
      .catch(() => undefined);
  }, [data?.unread_count, hallId]);

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="hall-logbook-empty">
        Logbook unavailable.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="hall-logbook">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Logbook</h2>
          <p className="text-sm text-muted-foreground">Hall memory — start of shift catch-up.</p>
        </div>
        {data.unread_count > 0 ? (
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
            {data.unread_count} new
          </span>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a lasting note…"
          className="min-h-11"
          maxLength={200}
        />
        <Button
          className="min-h-11 shrink-0"
          disabled={busy || !title.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              setData(await createHallLogbookEntry(hallId, { title: title.trim() }));
              setTitle("");
            } catch {
              toast({ title: "Could not save", variant: "destructive" });
            } finally {
              setBusy(false);
            }
          }}
        >
          Add
        </Button>
      </div>

      <ul className="space-y-2">
        {data.entries.length === 0 ? (
          <li className="text-sm text-muted-foreground">Nothing logged yet.</li>
        ) : (
          data.entries.map((entry) => (
            <li
              key={entry.entry_id}
              className="rounded-xl border border-border/40 bg-card/30 px-3 py-2.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{entry.title}</p>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {entry.source === "auto" ? "Auto" : "Note"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(entry.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {entry.category !== "general" ? ` · ${entry.category}` : ""}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
