import { useState } from "react";
import { AlertTriangle, Lock, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { formatLocalDay } from "@/lib/schedule-format";
import { formatHours } from "@shared/schedule/setup";
import type { RunItBackPreview, RunItBackSummary } from "@shared/shift-plan/types";

export type RunItBackMode = "copy" | "refresh";

function sourceLine(preview: RunItBackPreview, targetMinutes: number): string {
  const day = formatLocalDay(preview.sourceStartLocal);
  const meals = `${preview.decidedCount} meal${preview.decidedCount === 1 ? "" : "s"}`;
  if (preview.match === "different_length") {
    return `From your ${formatHours(preview.sourceScheduledMinutes)} shift on ${day} · adapted to this ${formatHours(targetMinutes)} shift`;
  }
  return `Same as your ${day} shift · ${meals}`;
}

/** Run It Back (Pro): reuse the previous comparable shift plan. Free users see a Pro lock. */
export function RunItBackCard({
  preview,
  targetMinutes,
  canUse,
  primary,
  plannedCount,
  busy,
  disabled,
  onRun,
  onLocked,
}: {
  preview: RunItBackPreview;
  targetMinutes: number;
  canUse: boolean;
  /** Lead action (nothing planned yet). */
  primary: boolean;
  /** Meals already decided in this shift — replacing them asks first. */
  plannedCount: number;
  busy: boolean;
  disabled: boolean;
  onRun: (mode: RunItBackMode) => void;
  onLocked: () => void;
}) {
  const [confirm, setConfirm] = useState<RunItBackMode | null>(null);

  const start = (mode: RunItBackMode) => {
    if (!canUse) return onLocked();
    if (plannedCount > 0) return setConfirm(mode);
    onRun(mode);
  };

  return (
    <div className="space-y-1.5" data-testid="run-it-back">
      <Button
        size="lg"
        variant={primary && canUse ? "default" : "outline"}
        className="min-h-12 w-full touch-manipulation"
        onClick={() => start("copy")}
        disabled={disabled}
        data-testid="button-run-it-back"
        data-locked={canUse ? undefined : "true"}
      >
        <RotateCcw className={cn("mr-2 h-4 w-4", busy && "animate-spin")} aria-hidden />
        {busy ? "Running it back…" : "Run it back"}
        {!canUse ? (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-current/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">
            <Lock className="h-2.5 w-2.5" aria-hidden />
            Pro
          </span>
        ) : null}
      </Button>
      <p className="text-center text-xs text-muted-foreground" data-testid="text-run-it-back-source">
        {sourceLine(preview, targetMinutes)}
        {canUse ? (
          <>
            {" · "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
              onClick={() => start("refresh")}
              disabled={disabled}
              data-testid="button-run-it-back-refresh"
            >
              + refresh meals
            </button>
          </>
        ) : null}
      </p>

      <AlertDialog open={confirm != null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace this shift's plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {plannedCount} meal{plannedCount === 1 ? " is" : "s are"} already planned. Running it back replaces them with
              your {formatLocalDay(preview.sourceStartLocal)} plan
              {confirm === "refresh" ? ", then refreshes every unlocked meal" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my plan</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const mode = confirm ?? "copy";
                setConfirm(null);
                onRun(mode);
              }}
              data-testid="button-run-it-back-confirm"
            >
              Run it back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** What Run It Back changed — only shown when something needs the user's attention. */
export function RunItBackNotice({ summary, onDismiss }: { summary: RunItBackSummary; onDismiss: () => void }) {
  const lines: string[] = [];
  const newCount = summary.newSlotKeys.length;
  if (summary.mode === "copy" && newCount > 0) {
    lines.push(`${newCount} meal${newCount === 1 ? " is" : "s are"} new to this shift — Auto-fill or Browse to fill ${newCount === 1 ? "it" : "them"}.`);
  }
  if (summary.droppedMeals > 0) {
    lines.push(`${summary.droppedMeals} meal${summary.droppedMeals === 1 ? "" : "s"} didn't fit this shorter shift.`);
  }
  if (summary.crewOverridesReset > 0) {
    lines.push(`Crew size reset to the shift crew on ${summary.crewOverridesReset} meal${summary.crewOverridesReset === 1 ? "" : "s"}.`);
  }
  if (summary.refreshFailed > 0) {
    lines.push(`${summary.refreshFailed} meal${summary.refreshFailed === 1 ? "" : "s"} couldn't be refreshed with your filters — try Browse.`);
  }
  if (summary.flagged.length === 0 && lines.length === 0) return null;

  return (
    <section
      className={cn(app.cardSurface, "relative space-y-2 border-amber-400/30 p-4 pr-10 text-sm")}
      role="status"
      data-testid="run-it-back-notice"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      {summary.flagged.length > 0 ? (
        <div className="space-y-1" data-testid="run-it-back-flagged">
          <p className="flex items-center gap-1.5 font-medium text-amber-300">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {summary.flagged.length === 1 ? "1 meal wasn't copied" : `${summary.flagged.length} meals weren't copied`}
          </p>
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {summary.flagged.map((f) => (
              <li key={f.slotKey}>
                <span className="text-foreground">{f.label}:</span> {f.recipeTitle ?? f.recipeSlug} — {f.reason}
                {summary.mode === "refresh" ? " (replaced)" : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {lines.length > 0 ? (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
