import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  createHallBoardNote,
  fetchHallBoard,
  fixHallBoardNote,
  updateHallBoardTonight,
} from "@/lib/hall-board/api";
import type { BoardNoteIntent, HallBoardPayload } from "@shared/hall-board/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<HallBoardPayload["tonight"]["status"], string> = {
  empty: "No dinner set",
  voting: "Voting",
  locked: "Locked",
  on_hold: "On hold",
  fed: "Fed",
};

export function HallWhiteboard({ hallId }: { hallId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<HallBoardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [intent, setIntent] = useState<BoardNoteIntent>("reminder");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const payload = await fetchHallBoard(hallId);
      setData(payload);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [hallId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
        Loading board…
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const tonight = data.tonight;
  const dinnerLine =
    tonight.status === "empty"
      ? "No dinner set"
      : tonight.dinner_title?.trim() || STATUS_LABEL[tonight.status];

  return (
    <section
      className="space-y-3 rounded-2xl border border-border/50 bg-card/40 p-4"
      data-testid="hall-whiteboard"
      aria-label="Hall whiteboard"
    >
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          What do I need to know?
        </h2>
      </div>

      <div className="rounded-xl bg-background/80 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tonight
            </p>
            <p className="truncate text-lg font-semibold leading-tight text-foreground">
              {dinnerLine}
            </p>
            {tonight.status === "on_hold" && tonight.hold_note ? (
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{tonight.hold_note}</p>
            ) : null}
            {tonight.you_are_cook ? (
              <p className="mt-1 text-xs font-medium text-primary">You’re cooking</p>
            ) : null}
            {tonight.you_are_runner ? (
              <p className="mt-1 text-xs font-medium text-primary">You’ve got the run</p>
            ) : null}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              tonight.status === "locked" && "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
              tonight.status === "voting" && "bg-amber-500/15 text-amber-900 dark:text-amber-300",
              tonight.status === "on_hold" && "bg-orange-500/15 text-orange-900 dark:text-orange-300",
              tonight.status === "fed" && "bg-muted text-muted-foreground",
              tonight.status === "empty" && "bg-muted text-muted-foreground",
            )}
          >
            {STATUS_LABEL[tonight.status]}
          </span>
        </div>
        {tonight.status === "empty" ? (
          <div className="mt-2 flex gap-2">
            <Button asChild size="sm" variant="secondary" className="min-h-10">
              <Link href="/hall#hall-tonight">Set dinner</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="min-h-10"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const next = await updateHallBoardTonight(hallId, {
                    dinner_title: "Crew pick",
                    status: "locked",
                  });
                  setData(next);
                } catch {
                  toast({ title: "Could not set dinner", variant: "destructive" });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Lock dinner
            </Button>
          </div>
        ) : null}
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Now
        </p>
        {data.pulses.length === 0 ? (
          <p className="text-sm text-muted-foreground">All clear</p>
        ) : (
          <ul className="space-y-1">
            {data.pulses.map((pulse) => (
              <li key={pulse.pulse_id}>
                {pulse.href ? (
                  <Link
                    href={pulse.href}
                    className="block rounded-lg px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted/50"
                  >
                    {pulse.title}
                  </Link>
                ) : (
                  <span className="block rounded-lg px-2 py-1.5 text-sm font-medium">{pulse.title}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {data.pins.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Pinned · {data.pins.length}/3
          </p>
          <ul className="space-y-1">
            {data.pins.map((note) => (
              <li key={note.note_id} className="rounded-lg bg-muted/30 px-2 py-1.5 text-sm">
                {note.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.coming_up.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Coming up
          </p>
          <ul className="space-y-1">
            {data.coming_up.map((note) => (
              <li
                key={note.note_id}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm"
              >
                <span className="min-w-0 truncate">
                  {note.event_at ? (
                    <span className="mr-1.5 text-muted-foreground">
                      {new Date(note.event_at).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  ) : null}
                  {note.title}
                </span>
                {note.intent === "broken" && !note.fixed_at ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 shrink-0 text-xs"
                    onClick={async () => {
                      try {
                        setData(await fixHallBoardNote(hallId, note.note_id));
                      } catch {
                        toast({ title: "Could not mark fixed", variant: "destructive" });
                      }
                    }}
                  >
                    Fixed
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {composing ? (
        <div className="space-y-2 rounded-xl border border-border/40 p-3">
          <div className="flex flex-wrap gap-1">
            {(["broken", "reminder", "announcement", "event"] as BoardNoteIntent[]).map((id) => (
              <button
                key={id}
                type="button"
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                  intent === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
                onClick={() => setIntent(id)}
              >
                {id}
              </button>
            ))}
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short title"
            className="min-h-11"
            maxLength={120}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="min-h-10"
              disabled={busy || !title.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  const next = await createHallBoardNote(hallId, {
                    intent,
                    title: title.trim(),
                    pinned: intent === "announcement" && data.can_manage,
                  });
                  setData(next);
                  setTitle("");
                  setComposing(false);
                } catch {
                  toast({ title: "Could not post", variant: "destructive" });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Post
            </Button>
            <Button size="sm" variant="ghost" className="min-h-10" onClick={() => setComposing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="min-h-10 w-full"
          onClick={() => setComposing(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Note
        </Button>
      )}
    </section>
  );
}
