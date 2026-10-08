import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Plus } from "lucide-react";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { ScheduleSetupFlow } from "@/components/schedule/schedule-setup-flow";
import { CycleStrip } from "@/components/schedule/cycle-strip";
import { ExtraShiftSheet, ShiftActionSheet } from "@/components/schedule/shift-sheets";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { useToast } from "@/hooks/use-toast";
import { trackScheduleSaved, trackScheduleSetupStarted } from "@/lib/analytics";
import {
  fetchSchedule,
  fetchUpcomingShifts,
  saveSchedule,
  scheduleErrorMessage,
  scheduleQueryKey,
  upcomingShiftsQueryKey,
} from "@/lib/schedule-api";
import { deviceTimeZone, formatShiftTimes, shiftDayParts, timeZoneLabel } from "@/lib/schedule-format";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { cycleLengthMinutes, describeCycle, formatHours, matchPreset, upcomingShifts } from "@shared/schedule/setup";
import type { PersonalSchedule, ShiftInstance } from "@shared/schedule/types";

const UPCOMING_COUNT = 8;
const DEFAULT_CREW_SUGGESTION = 4;

function ShiftRow({ shift, onSelect }: { shift: ShiftInstance; onSelect: () => void }) {
  const day = shiftDayParts(shift.startLocal);
  const cancelled = shift.status === "cancelled";
  const badge =
    shift.source === "extra" ? "Extra" : cancelled ? "Not working" : shift.status === "modified" ? "Changed" : null;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          app.cardSurface,
          "flex w-full items-center gap-3 px-3 py-2.5 text-left hover-elevate touch-manipulation min-h-11",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        data-testid={`shift-row-${shift.key}`}
      >
        <span
          className={cn(
            "flex w-12 shrink-0 flex-col items-center rounded-xl py-1",
            cancelled ? "bg-muted/40 text-muted-foreground" : "bg-primary/10 text-primary",
          )}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide">{day.weekday}</span>
          <span className="text-lg font-bold leading-none tabular-nums">{day.day}</span>
          <span className="text-[10px]">{day.month}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm font-medium tabular-nums", cancelled && "text-muted-foreground line-through")}>
            {formatShiftTimes(shift.startLocal, shift.endLocal)}
          </span>
          <span className="block text-xs text-muted-foreground">
            {formatHours(shift.scheduledMinutes)} · crew of {shift.crewSize}
          </span>
        </span>
        {badge ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
              cancelled ? "bg-muted text-muted-foreground" : "bg-amber-400/15 text-amber-300",
            )}
          >
            {badge}
          </span>
        ) : null}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </li>
  );
}

export default function MeSchedulePage() {
  const { authenticated, loading: authLoading, openSignIn, profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ShiftInstance | null>(null);
  const [extraOpen, setExtraOpen] = useState(false);
  const setupTracked = useRef(false);

  const scheduleQuery = useQuery({
    queryKey: scheduleQueryKey,
    queryFn: fetchSchedule,
    enabled: authenticated,
    staleTime: 60_000,
  });
  const schedule = scheduleQuery.data?.schedule ?? null;

  const shiftsQuery = useQuery({
    queryKey: [...upcomingShiftsQueryKey, schedule?.updatedAt ?? ""],
    queryFn: () => fetchUpcomingShifts(),
    enabled: authenticated && !!schedule,
    staleTime: 60_000,
  });
  const shifts = useMemo(
    () => upcomingShifts(shiftsQuery.data ?? [], new Date(), UPCOMING_COUNT),
    [shiftsQuery.data],
  );

  const refreshShifts = () => {
    void queryClient.invalidateQueries({ queryKey: upcomingShiftsQueryKey });
    void queryClient.invalidateQueries({ queryKey: scheduleQueryKey });
  };

  const startSetup = (mode: "create" | "edit") => {
    if (!setupTracked.current) {
      trackScheduleSetupStarted({ mode });
      setupTracked.current = true;
    }
    setSaveError(null);
    setEditing(true);
  };

  const saveMutation = useMutation({
    mutationFn: (next: PersonalSchedule) => saveSchedule(next),
    onSuccess: (saved, next) => {
      const created = !schedule;
      trackScheduleSaved({
        created,
        preset_id: next.presetId ?? "custom",
        cycle_hours: cycleLengthMinutes(next.blocks) / 60,
        timezone: next.timezone,
      });
      queryClient.setQueryData(scheduleQueryKey, {
        schedule: saved,
        overrides: scheduleQuery.data?.overrides ?? [],
      });
      refreshShifts();
      setEditing(false);
      setupTracked.current = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast({ title: created ? "Schedule saved" : "Schedule updated", variant: "success" });
    },
    onError: (err) => setSaveError(scheduleErrorMessage(err, "Could not save your schedule. Try again.")),
  });

  const preset = schedule ? matchPreset(schedule.blocks, schedule.presetId) : null;
  const firstOnMinutes = schedule?.blocks.find((b) => b.kind === "on")?.minutes ?? 24 * 60;
  const showsOtherZone = schedule && schedule.timezone !== deviceTimeZone();

  return (
    <MeSubpageShell
      title="My Schedule"
      subtitle="Set your rotation once and we'll know when you're on shift. Free — takes about 30 seconds."
      testId="me-schedule-page"
    >
      {authLoading || (authenticated && scheduleQuery.isLoading) ? (
        <div className="space-y-2" aria-hidden>
          <div className="h-24 rounded-2xl skeleton-shimmer" />
          <div className="h-14 rounded-2xl skeleton-shimmer" />
        </div>
      ) : !authenticated ? (
        <section className={cn(app.panel, "space-y-3 p-4 sm:p-5")} data-testid="schedule-signed-out">
          <p className="text-sm text-muted-foreground">
            Sign in (free) so your schedule is saved and available on every device.
          </p>
          <Button className="w-full min-h-11" onClick={() => openSignIn()} data-testid="schedule-sign-in">
            Sign in to set your schedule
          </Button>
        </section>
      ) : scheduleQuery.isError ? (
        <section className={cn(app.panel, "space-y-3 p-4")}>
          <p className="text-sm text-muted-foreground">We couldn't load your schedule.</p>
          <Button variant="outline" className="min-h-11" onClick={() => void scheduleQuery.refetch()}>
            Try again
          </Button>
        </section>
      ) : editing ? (
        <ScheduleSetupFlow
          initial={schedule}
          suggestedCrewSize={profile?.crew_size ?? DEFAULT_CREW_SUGGESTION}
          saving={saveMutation.isPending}
          error={saveError}
          hasShiftChanges={(scheduleQuery.data?.overrides ?? []).some((o) => o.kind !== "extra")}
          onSave={(next) => saveMutation.mutate(next)}
          onCancel={() => setEditing(false)}
        />
      ) : !schedule ? (
        <section className={cn(app.panel, "space-y-4 p-4 sm:p-5 text-center")} data-testid="schedule-empty">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/12">
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden />
          </span>
          <div className="space-y-1">
            <h2 className={app.titleCard}>No schedule yet</h2>
            <p className={app.subtitle}>Pick your rotation and one day you're working — we'll work out the rest.</p>
          </div>
          <Button className="w-full min-h-11" onClick={() => startSetup("create")} data-testid="schedule-start">
            Set up my schedule
          </Button>
        </section>
      ) : (
        <>
          <section className={cn(app.panel, "space-y-3 p-4 sm:p-5")} data-testid="schedule-summary">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={app.eyebrowMuted}>Your rotation</p>
                <h2 className={cn(app.titleCard, "mt-0.5")}>{preset?.label ?? "Custom rotation"}</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 shrink-0"
                onClick={() => startSetup("edit")}
                data-testid="schedule-edit"
              >
                Edit
              </Button>
            </div>
            <CycleStrip blocks={schedule.blocks} />
            <p className="text-xs text-muted-foreground">{describeCycle(schedule.blocks)}</p>
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Starts</dt>
                <dd className="font-medium text-foreground tabular-nums">{schedule.startTime}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Time zone</dt>
                <dd className="truncate font-medium text-foreground" title={schedule.timezone}>
                  {timeZoneLabel(schedule.timezone.split("/").pop() ?? schedule.timezone)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Crew</dt>
                <dd className="font-medium text-foreground tabular-nums">{schedule.defaultCrewSize}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-2" aria-labelledby="schedule-next-heading">
            <div className="flex items-center justify-between gap-3 px-0.5">
              <h2 id="schedule-next-heading" className={app.eyebrowMuted}>
                Next shifts
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11 -mr-2"
                onClick={() => setExtraOpen(true)}
                data-testid="schedule-add-extra"
              >
                <Plus className="mr-1 h-4 w-4" /> Add extra shift
              </Button>
            </div>
            {shiftsQuery.isLoading ? (
              <div className="h-40 rounded-2xl skeleton-shimmer" aria-hidden />
            ) : shifts.length ? (
              <ul className={cn("space-y-1.5", app.stagger)} data-testid="schedule-upcoming">
                {shifts.map((s) => (
                  <ShiftRow key={s.key} shift={s} onSelect={() => setSelected(s)} />
                ))}
              </ul>
            ) : (
              <p className="px-0.5 text-sm text-muted-foreground">No shifts in the next 60 days.</p>
            )}
            <p className={cn(app.caption, "px-0.5")}>
              Tap a shift to mark it as not working or change it. One-off changes never change your rotation.
              {showsOtherZone ? ` Times are in ${timeZoneLabel(schedule.timezone)}.` : ""}
            </p>
          </section>

          <ShiftActionSheet
            shift={selected}
            onOpenChange={(open) => !open && setSelected(null)}
            onChanged={refreshShifts}
          />
          <ExtraShiftSheet
            open={extraOpen}
            onOpenChange={setExtraOpen}
            timezone={schedule.timezone}
            defaultStartTime={schedule.startTime}
            defaultHours={firstOnMinutes / 60}
            defaultCrewSize={schedule.defaultCrewSize}
            onChanged={refreshShifts}
          />
        </>
      )}
    </MeSubpageShell>
  );
}
