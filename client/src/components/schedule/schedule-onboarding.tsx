import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ScheduleSetupFlow } from "@/components/schedule/schedule-setup-flow";
import {
  trackScheduleOnboardingAbandoned,
  trackScheduleOnboardingCompleted,
  trackScheduleOnboardingStarted,
  trackScheduleSaved,
  trackScheduleSetupStarted,
  type ScheduleOnboardingAbandonReason,
  type ScheduleOnboardingEntry,
} from "@/lib/analytics";
import {
  createScheduleOnboardingSession,
  type ScheduleOnboardingSession,
} from "@/lib/onboarding/schedule-onboarding";
import { saveSchedule, scheduleErrorMessage, scheduleQueryKey, upcomingShiftsQueryKey } from "@/lib/schedule-api";
import { cycleLengthMinutes } from "@shared/schedule/setup";
import type { PersonalSchedule } from "@shared/schedule/types";

/** Rotation → known shift → start time → crew size, then hand back to /shift to show the plan. */
export function ScheduleOnboarding({
  entry,
  suggestedCrewSize,
  onCompleted,
  onCancel,
}: {
  entry: ScheduleOnboardingEntry;
  suggestedCrewSize: number;
  onCompleted: (schedule: PersonalSchedule) => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);
  const sessionRef = useRef<ScheduleOnboardingSession | null>(null);

  const abandon = (reason: ScheduleOnboardingAbandonReason) => {
    const outcome = sessionRef.current?.abandon(reason);
    if (outcome?.type !== "abandoned") return;
    trackScheduleOnboardingAbandoned({
      entry,
      reason: outcome.reason,
      last_step: outcome.lastStep,
      duration_sec: outcome.durationSec,
    });
  };
  const abandonRef = useRef(abandon);
  abandonRef.current = abandon;

  useEffect(() => {
    const session = createScheduleOnboardingSession(entry);
    sessionRef.current = session;
    trackScheduleOnboardingStarted({ entry });
    trackScheduleSetupStarted({ mode: "create" });

    const onPageHide = () => abandonRef.current("page_hidden");
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      abandonRef.current("navigated_away");
    };
  }, [entry]);

  const saveMutation = useMutation({
    mutationFn: (next: PersonalSchedule) => saveSchedule(next),
    onSuccess: (saved, next) => {
      const outcome = sessionRef.current?.complete();
      trackScheduleSaved({
        created: true,
        preset_id: next.presetId ?? "custom",
        cycle_hours: cycleLengthMinutes(next.blocks) / 60,
        timezone: next.timezone,
      });
      if (outcome?.type === "completed") {
        trackScheduleOnboardingCompleted({
          entry,
          preset_id: next.presetId ?? "custom",
          crew_size: next.defaultCrewSize,
          duration_sec: outcome.durationSec,
        });
      }
      queryClient.setQueryData(scheduleQueryKey, { schedule: saved, overrides: [] });
      void queryClient.invalidateQueries({ queryKey: upcomingShiftsQueryKey });
      onCompleted(saved);
    },
    onError: (err) => setSaveError(scheduleErrorMessage(err, "Could not save your schedule. Try again.")),
  });

  return (
    <div className="space-y-3" data-testid="schedule-onboarding">
      <div className="px-0.5">
        <h1 className="font-heading text-2xl tracking-tight">Plan your next shift</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Four quick questions about your rotation. Food preferences can wait.
        </p>
      </div>
      <ScheduleSetupFlow
        quick
        initial={null}
        suggestedCrewSize={suggestedCrewSize}
        saving={saveMutation.isPending}
        error={saveError}
        onStepChange={(step) => sessionRef.current?.step(step)}
        onSave={(next) => {
          setSaveError(null);
          saveMutation.mutate(next);
        }}
        onCancel={() => {
          abandon("cancelled");
          onCancel();
        }}
      />
    </div>
  );
}
