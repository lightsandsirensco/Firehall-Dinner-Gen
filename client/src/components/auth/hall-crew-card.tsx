import { useState } from "react";
import { Pencil, Users } from "lucide-react";
import { Link } from "wouter";
import { EditHallCrewSheet } from "@/components/auth/edit-hall-crew-sheet";
import { useAuth } from "@/lib/auth/context";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export function HallCrewCard() {
  const { profile, halls } = useAuth();
  const [editing, setEditing] = useState(false);

  const primaryHall = halls[0] ?? null;
  const hasAnyData = Boolean(
    profile?.department || profile?.hall_name || profile?.shift_label || profile?.crew_size || primaryHall,
  );

  return (
    <>
      <section className={cn(app.cardSurface, "p-5 relative")}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className={app.titleCard}>My Hall &amp; Crew</h2>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-muted/20 hover-elevate active-elevate-2 touch-manipulation shrink-0"
            aria-label="Edit hall and crew"
            data-testid="button-edit-hall-crew"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        {primaryHall && (
          <Link
            href="/hall"
            className="mb-3 flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-primary hover-elevate active-elevate-2 touch-manipulation"
            data-testid="link-linked-hall"
          >
            <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              Linked to {primaryHall.hall_name} · {primaryHall.member_count} member
              {primaryHall.member_count === 1 ? "" : "s"}
            </span>
          </Link>
        )}

        {hasAnyData ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Department / service" value={profile?.department} />
            <Field label="Hall / station" value={profile?.hall_name} />
            <Field label="Shift / crew name" value={profile?.shift_label} />
            <Field
              label="Default crew size"
              value={profile?.crew_size ? `${profile.crew_size} firefighter${profile.crew_size === 1 ? "" : "s"}` : null}
            />
          </dl>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Add your hall so Firehall Meals can personalize meals for your crew.
            </p>
            <Link href="/hall" className="text-xs font-medium text-primary hover:underline underline-offset-4">
              Set up your hall →
            </Link>
          </div>
        )}
      </section>

      <EditHallCrewSheet open={editing} onOpenChange={setEditing} />
    </>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{label}</dt>
      <dd className="text-sm text-foreground truncate">{value || <span className="text-muted-foreground">Not set</span>}</dd>
    </div>
  );
}
