import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { trackExtraShiftAdded, trackShiftOverrideCreated } from "@/lib/analytics";
import { createScheduleOverride, deleteScheduleOverride, scheduleErrorMessage } from "@/lib/schedule-api";
import { formatLocalDay, formatShiftTimes, localDateInZone } from "@/lib/schedule-format";
import { extraShiftInput, formatHours, modifyShiftInput } from "@shared/schedule/setup";
import { SCHEDULE_LIMITS } from "@shared/schedule/engine";
import type { ShiftInstance } from "@shared/schedule/types";

const SHEET_CLASS = "max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:mx-auto sm:max-w-lg";

function ShiftFields({
  idPrefix,
  date,
  setDate,
  time,
  setTime,
  hours,
  setHours,
  crew,
  setCrew,
}: {
  idPrefix: string;
  date: string;
  setDate: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  hours: number;
  setHours: (v: number) => void;
  crew: number;
  setCrew: (v: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-date`}>Starts</Label>
          <Input id={`${idPrefix}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-11" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-time`}>At</Label>
          <Input id={`${idPrefix}-time`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="min-h-11" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-hours`}>Length (hours)</Label>
          <Input
            id={`${idPrefix}-hours`}
            type="number"
            inputMode="decimal"
            min={0.25}
            max={168}
            step={0.25}
            value={Number.isFinite(hours) ? hours : ""}
            onChange={(e) => setHours(e.target.value === "" ? NaN : Number(e.target.value))}
            className="min-h-11"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-crew`}>Crew size</Label>
          <Input
            id={`${idPrefix}-crew`}
            type="number"
            inputMode="numeric"
            min={SCHEDULE_LIMITS.minCrewSize}
            max={SCHEDULE_LIMITS.maxCrewSize}
            value={Number.isFinite(crew) ? crew : ""}
            onChange={(e) => setCrew(e.target.value === "" ? NaN : Math.trunc(Number(e.target.value)))}
            className="min-h-11"
            required
          />
        </div>
      </div>
    </div>
  );
}

const validHours = (h: number) => Number.isFinite(h) && h > 0 && h <= 168;
const validCrew = (n: number) =>
  Number.isInteger(n) && n >= SCHEDULE_LIMITS.minCrewSize && n <= SCHEDULE_LIMITS.maxCrewSize;

/** Actions for one shift. One-off only — the rotation itself is never touched. */
export function ShiftActionSheet({
  shift,
  onOpenChange,
  onChanged,
}: {
  shift: ShiftInstance | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"menu" | "edit">("menu");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [hours, setHours] = useState(24);
  const [crew, setCrew] = useState(1);

  useEffect(() => {
    if (!shift) return;
    setMode("menu");
    setError(null);
    setDate(shift.startLocal.slice(0, 10));
    setTime(shift.startLocal.slice(11, 16));
    setHours(shift.scheduledMinutes / 60);
    setCrew(shift.crewSize);
  }, [shift]);

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      toast({ title: success, variant: "success" });
      onChanged();
      onOpenChange(false);
    } catch (err) {
      setError(scheduleErrorMessage(err, "Could not save that change. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const notWorking = () =>
    run(async () => {
      await createScheduleOverride({ kind: "cancel", shiftKey: shift!.key });
      trackShiftOverrideCreated({ kind: "cancel" });
    }, "Marked as not working");

  const undo = (success: string) =>
    run(async () => {
      await deleteScheduleOverride(shift!.overrideId!);
    }, success);

  const saveEdit = () => {
    const body = modifyShiftInput(shift!, { startLocal: `${date}T${time}`, hours, crewSize: crew });
    if (!body) {
      setError("Nothing changed.");
      return;
    }
    void run(async () => {
      await createScheduleOverride(body);
      trackShiftOverrideCreated({ kind: "modify" });
    }, "Shift updated");
  };

  const isExtra = shift?.source === "extra";
  const isCancelled = shift?.status === "cancelled";
  const isModified = shift?.status === "modified";

  return (
    <Sheet open={!!shift} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={SHEET_CLASS} data-testid="shift-action-sheet">
        {shift ? (
          <>
            <SheetHeader>
              <SheetTitle>{formatLocalDay(shift.startLocal)}</SheetTitle>
              <SheetDescription>
                {formatShiftTimes(shift.startLocal, shift.endLocal)} · {formatHours(shift.scheduledMinutes)} · crew of{" "}
                {shift.crewSize}
              </SheetDescription>
            </SheetHeader>

            {mode === "menu" ? (
              <div className="space-y-2 py-4">
                {isExtra ? (
                  <Button
                    variant="outline"
                    className="w-full min-h-11 justify-start"
                    disabled={busy}
                    onClick={() => undo("Extra shift removed")}
                    data-testid="shift-remove-extra"
                  >
                    Remove this extra shift
                  </Button>
                ) : isCancelled ? (
                  <Button
                    variant="outline"
                    className="w-full min-h-11 justify-start"
                    disabled={busy}
                    onClick={() => undo("Back on the schedule")}
                    data-testid="shift-restore"
                  >
                    I'm working this shift after all
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full min-h-11 justify-start"
                      disabled={busy}
                      onClick={notWorking}
                      data-testid="shift-not-working"
                    >
                      Not working this shift
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full min-h-11 justify-start"
                      disabled={busy}
                      onClick={() => setMode("edit")}
                      data-testid="shift-edit"
                    >
                      Change this shift
                    </Button>
                    {isModified ? (
                      <Button
                        variant="ghost"
                        className="w-full min-h-11 justify-start"
                        disabled={busy}
                        onClick={() => undo("Change undone")}
                        data-testid="shift-undo"
                      >
                        Undo my change
                      </Button>
                    ) : null}
                  </>
                )}
                <p className="pt-2 text-xs text-muted-foreground">Only this shift changes. Your rotation stays the same.</p>
                {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Saving" /> : null}
              </div>
            ) : (
              <form
                className="space-y-4 py-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveEdit();
                }}
              >
                <ShiftFields
                  idPrefix="edit-shift"
                  date={date}
                  setDate={setDate}
                  time={time}
                  setTime={setTime}
                  hours={hours}
                  setHours={setHours}
                  crew={crew}
                  setCrew={setCrew}
                />
                <p className="text-xs text-muted-foreground">Only this shift changes. Your rotation stays the same.</p>
                {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
                <SheetFooter className="gap-2">
                  <Button type="button" variant="ghost" className="min-h-11" onClick={() => setMode("menu")}>
                    Back
                  </Button>
                  <Button type="submit" className="min-h-11" disabled={busy || !validHours(hours) || !validCrew(crew) || !date || !time}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save this shift
                  </Button>
                </SheetFooter>
              </form>
            )}
            {mode === "menu" && error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function ExtraShiftSheet({
  open,
  onOpenChange,
  timezone,
  defaultStartTime,
  defaultHours,
  defaultCrewSize,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timezone: string;
  defaultStartTime: string;
  defaultHours: number;
  defaultCrewSize: number;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState(defaultStartTime);
  const [hours, setHours] = useState(defaultHours);
  const [crew, setCrew] = useState(defaultCrewSize);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDate(localDateInZone(timezone, 0));
    setTime(defaultStartTime);
    setHours(defaultHours);
    setCrew(defaultCrewSize);
  }, [open, timezone, defaultStartTime, defaultHours, defaultCrewSize]);

  const save = async () => {
    const body = extraShiftInput({ date, startTime: time, hours, crewSize: crew === defaultCrewSize ? null : crew });
    if (!body) {
      setError("Check the date, time and length.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createScheduleOverride(body);
      trackExtraShiftAdded({ hours });
      toast({ title: "Extra shift added", variant: "success" });
      onChanged();
      onOpenChange(false);
    } catch (err) {
      setError(scheduleErrorMessage(err, "Could not add that shift. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={SHEET_CLASS} data-testid="extra-shift-sheet">
        <SheetHeader>
          <SheetTitle>Add extra shift</SheetTitle>
          <SheetDescription>Overtime, a swap, or a callback. Your rotation stays the same.</SheetDescription>
        </SheetHeader>
        <form
          className="space-y-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <ShiftFields
            idPrefix="extra-shift"
            date={date}
            setDate={setDate}
            time={time}
            setTime={setTime}
            hours={hours}
            setHours={setHours}
            crew={crew}
            setCrew={setCrew}
          />
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <SheetFooter className="gap-2">
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="min-h-11"
              disabled={busy || !validHours(hours) || !validCrew(crew) || !date || !time}
              data-testid="extra-shift-save"
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add shift
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
