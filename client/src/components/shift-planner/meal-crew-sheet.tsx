import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SCHEDULE_LIMITS } from "@shared/schedule/engine";
import type { PlannedMealSlot } from "@shared/shift-plan/types";

const SHEET_CLASS = "max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:mx-auto sm:max-w-lg";

/** One meal's crew size — e.g. fewer people at a late-night meal. */
export function MealCrewSheet({
  slot,
  onClose,
  onSave,
}: {
  slot: PlannedMealSlot | null;
  onClose: () => void;
  onSave: (slot: PlannedMealSlot, crewSizeOverride: number | null) => void;
}) {
  const [value, setValue] = useState(slot?.crewSize ?? 4);
  useEffect(() => {
    if (slot) setValue(slot.crewSize);
  }, [slot]);

  const clamp = (n: number) => Math.min(SCHEDULE_LIMITS.maxCrewSize, Math.max(SCHEDULE_LIMITS.minCrewSize, n));

  return (
    <Sheet open={slot != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className={SHEET_CLASS} data-testid="sheet-meal-crew">
        <SheetHeader>
          <SheetTitle>Crew for {slot?.label.toLowerCase()}</SheetTitle>
          <SheetDescription>
            Only changes this meal. The shift's crew is {slot?.shiftCrewSize}.
          </SheetDescription>
        </SheetHeader>
        <div className="flex items-center justify-center gap-6 py-6">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => setValue((v) => clamp(v - 1))}
            disabled={value <= SCHEDULE_LIMITS.minCrewSize}
            aria-label="Fewer people"
            data-testid="button-crew-minus"
          >
            <Minus className="h-5 w-5" aria-hidden />
          </Button>
          <span className="w-16 text-center text-4xl font-bold tabular-nums" data-testid="text-crew-value">
            {value}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => setValue((v) => clamp(v + 1))}
            disabled={value >= SCHEDULE_LIMITS.maxCrewSize}
            aria-label="More people"
            data-testid="button-crew-plus"
          >
            <Plus className="h-5 w-5" aria-hidden />
          </Button>
        </div>
        <SheetFooter className="gap-2 sm:gap-2">
          {slot?.crewSizeOverride != null ? (
            <Button
              variant="ghost"
              className="min-h-11"
              onClick={() => slot && onSave(slot, null)}
              data-testid="button-crew-reset"
            >
              Use shift crew ({slot.shiftCrewSize})
            </Button>
          ) : null}
          <Button className="min-h-11" onClick={() => slot && onSave(slot, value)} data-testid="button-crew-save">
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
