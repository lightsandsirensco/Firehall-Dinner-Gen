import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_SHIFT_NAMES,
  HALL_SHIFT_KEYS,
  type HallShiftInput,
} from "@shared/hall-identity/shifts";
import { cn } from "@/lib/utils";

interface HallShiftsEditorProps {
  shifts: HallShiftInput[];
  onChange: (shifts: HallShiftInput[]) => void;
  disabled?: boolean;
  className?: string;
}

export function defaultShiftInputs(): HallShiftInput[] {
  return HALL_SHIFT_KEYS.map((shift_key) => ({
    shift_key,
    name: DEFAULT_SHIFT_NAMES[shift_key],
    enabled: true,
  }));
}

export function HallShiftsEditor({
  shifts,
  onChange,
  disabled = false,
  className,
}: HallShiftsEditorProps) {
  const updateShift = (shiftKey: HallShiftInput["shift_key"], patch: Partial<HallShiftInput>) => {
    onChange(
      shifts.map((shift) =>
        shift.shift_key === shiftKey ? { ...shift, ...patch } : shift,
      ),
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <Label>Shifts</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Every hall has A–D shifts. Rename them or disable shifts your department does not use.
        </p>
      </div>
      <div className="space-y-2">
        {shifts.map((shift) => (
          <div
            key={shift.shift_key}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border/40 px-3 py-2"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground w-6">
              {shift.shift_key.toUpperCase()}
            </span>
            <Input
              value={shift.name}
              disabled={disabled || !shift.enabled}
              onChange={(e) => updateShift(shift.shift_key, { name: e.target.value })}
              className="flex-1 min-w-[140px] h-9"
              aria-label={`${shift.shift_key.toUpperCase()} shift name`}
            />
            <div className="flex items-center gap-2 ml-auto">
              <Label htmlFor={`shift-enabled-${shift.shift_key}`} className="text-xs text-muted-foreground">
                Active
              </Label>
              <Switch
                id={`shift-enabled-${shift.shift_key}`}
                checked={shift.enabled}
                disabled={disabled}
                onCheckedChange={(enabled) => updateShift(shift.shift_key, { enabled })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
