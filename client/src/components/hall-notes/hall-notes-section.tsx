import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HallDashboardSection } from "@/components/hall-dashboard/v2/hall-dashboard-section";
import { useAuth } from "@/lib/auth/context";
import { HALL_NOTES } from "@/lib/brand-copy";
import {
  createHallNote,
  deleteHallNote,
  fetchHallNotes,
  updateHallNote,
} from "@/lib/hall-notes/api";
import type { HallNote } from "@shared/hall-notes/types";
import { cn } from "@/lib/utils";

function formatNoteDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface HallNotesSectionProps {
  activeHallId: string | null;
  limit?: number;
  className?: string;
  showComposer?: boolean;
}

export function HallNotesSection({
  activeHallId,
  limit = 5,
  className,
  showComposer = true,
}: HallNotesSectionProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<HallNote[]>([]);
  const [canDeleteAny, setCanDeleteAny] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const load = async (hallId: string) => {
    setLoading(true);
    try {
      const payload = await fetchHallNotes(hallId);
      setNotes(payload.notes.slice(0, limit));
      setCanDeleteAny(payload.can_delete_any);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeHallId) {
      setNotes([]);
      return;
    }
    void load(activeHallId);
  }, [activeHallId, limit]);

  const handleCreate = async () => {
    if (!activeHallId || !message.trim()) return;
    setBusy(true);
    try {
      const payload = await createHallNote(activeHallId, message.trim());
      setNotes(payload.notes.slice(0, limit));
      setMessage("");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!activeHallId || !editText.trim()) return;
    setBusy(true);
    try {
      const payload = await updateHallNote(activeHallId, noteId, editText.trim());
      setNotes(payload.notes.slice(0, limit));
      setEditingId(null);
      setEditText("");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!activeHallId) return;
    setBusy(true);
    try {
      const payload = await deleteHallNote(activeHallId, noteId);
      setNotes(payload.notes.slice(0, limit));
    } finally {
      setBusy(false);
    }
  };

  return (
    <HallDashboardSection
      id="hall-notes"
      title={HALL_NOTES.title}
      className={className}
      testId="hall-notes-section"
    >
      {!activeHallId ? (
        <p className="text-sm text-muted-foreground">{HALL_NOTES.empty}</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading notes…</p>
      ) : (
        <div className="space-y-3">
          {showComposer ? (
            <div className="space-y-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={HALL_NOTES.placeholder}
                className="min-h-[72px] resize-none"
                maxLength={500}
              />
              <Button
                type="button"
                className="min-h-11 w-full"
                disabled={busy || !message.trim()}
                onClick={() => void handleCreate()}
                data-testid="hall-note-add"
              >
                {HALL_NOTES.add}
              </Button>
            </div>
          ) : null}

          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{HALL_NOTES.empty}</p>
          ) : (
            <ul className="space-y-2">
              {notes.map((note) => {
                const isOwn = note.author_user_id === user?.user_id;
                const canDelete = isOwn || canDeleteAny;
                const isEditing = editingId === note.note_id;

                return (
                  <li
                    key={note.note_id}
                    className="rounded-xl border border-border/45 bg-card/40 px-3 py-3 space-y-2"
                    data-testid={`hall-note-${note.note_id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{note.author_display_name}</p>
                        <p className="text-xs text-muted-foreground">{formatNoteDate(note.created_at)}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {isOwn && !isEditing ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-9"
                            onClick={() => {
                              setEditingId(note.note_id);
                              setEditText(note.message);
                            }}
                          >
                            {HALL_NOTES.edit}
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-9 text-destructive"
                            disabled={busy}
                            onClick={() => void handleDelete(note.note_id)}
                          >
                            {HALL_NOTES.delete}
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[72px] resize-none"
                          maxLength={500}
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="min-h-10"
                          disabled={busy || !editText.trim()}
                          onClick={() => void handleSaveEdit(note.note_id)}
                        >
                          {HALL_NOTES.save}
                        </Button>
                      </div>
                    ) : (
                      <p className={cn("text-sm leading-relaxed whitespace-pre-wrap")}>{note.message}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </HallDashboardSection>
  );
}
