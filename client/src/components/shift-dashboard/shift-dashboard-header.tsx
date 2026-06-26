import { Link } from "wouter";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SHIFT_DASHBOARD } from "@/lib/brand-copy";
import type { HallMemberRecord } from "@shared/hall-membership/types";
import { cn } from "@/lib/utils";

function memberInitials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

interface ShiftDashboardHeaderProps {
  hallName: string;
  shiftName: string;
  crewSize: number;
  members: HallMemberRecord[];
  hallId: string;
  className?: string;
}

export function ShiftDashboardHeader({
  hallName,
  shiftName,
  crewSize,
  members,
  hallId,
  className,
}: ShiftDashboardHeaderProps) {
  const preview = members.slice(0, 6);

  return (
    <header
      className={cn(
        "rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/60 to-card/40",
        "px-4 pt-4 pb-4 sm:px-5 shadow-sm",
        className,
      )}
      data-testid="shift-dashboard-header"
    >
      <div className="flex items-center gap-2 mb-3">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2 -ml-2 text-muted-foreground">
          <Link href="/hall">
            <ArrowLeft className="w-4 h-4 mr-1" aria-hidden />
            {SHIFT_DASHBOARD.backToHall}
          </Link>
        </Button>
      </div>

      <p className="text-xs font-medium text-muted-foreground truncate">{hallName}</p>
      <h1 className="font-heading text-2xl sm:text-[1.75rem] tracking-wide text-foreground leading-tight mt-0.5">
        {shiftName}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">{SHIFT_DASHBOARD.tagline}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="rounded-xl border border-border/40 bg-background/60 px-3 py-2 min-w-[100px]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {SHIFT_DASHBOARD.crewSize}
          </p>
          <p className="text-xl font-semibold tabular-nums mt-0.5">{crewSize}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/60 px-3 py-2 min-w-[100px]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {SHIFT_DASHBOARD.members}
          </p>
          <p className="text-xl font-semibold tabular-nums mt-0.5">{members.length}</p>
        </div>
      </div>

      {preview.length > 0 ? (
        <div className="mt-4">
          <ul className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 snap-x">
            {preview.map((member) => {
              const label = member.display_name?.trim() || member.email?.split("@")[0] || "Crew";
              return (
                <li key={member.user_id} className="snap-start shrink-0">
                  <div
                    className="flex items-center gap-2 rounded-full border border-border/50 bg-background/70 pl-1 pr-3 py-1"
                    title={label}
                  >
                    <span
                      className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0"
                      aria-hidden
                    >
                      {memberInitials(member.display_name, member.email)}
                    </span>
                    <span className="text-xs font-medium truncate max-w-[72px]">{label}</span>
                  </div>
                </li>
              );
            })}
            {members.length > preview.length ? (
              <li className="snap-start shrink-0 flex items-center">
                <span className="text-xs font-medium text-muted-foreground px-2 py-1 rounded-full border border-dashed border-border/50">
                  +{members.length - preview.length}
                </span>
              </li>
            ) : null}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground inline-flex items-center gap-1.5">
          <Users className="w-4 h-4 shrink-0" aria-hidden />
          No crew assigned to this shift yet.
        </p>
      )}

      <div className="mt-3">
        <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs text-muted-foreground">
          <Link href={`/halls/${hallId}`}>{SHIFT_DASHBOARD.hallSettings}</Link>
        </Button>
      </div>
    </header>
  );
}
