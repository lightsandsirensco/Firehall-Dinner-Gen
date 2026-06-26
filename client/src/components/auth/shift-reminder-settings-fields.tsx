import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SHIFT_REMINDER_TIME,
  DEFAULT_SHIFT_REMINDER_TIMEZONE,
  SHIFT_WEEKDAYS,
  SHIFT_WEEKDAY_LABELS,
  type ShiftWeekday,
} from "@shared/shift-reminder/types";

const TIMEZONE_OPTIONS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Toronto",
  "America/Vancouver",
  "Pacific/Honolulu",
];

export interface ShiftReminderSettingsValue {
  shift_reminders_enabled: boolean;
  shift_days: ShiftWeekday[];
  shift_reminder_time: string;
  shift_reminder_timezone: string;
}

interface ShiftReminderSettingsFieldsProps {
  value: ShiftReminderSettingsValue;
  onChange: (next: ShiftReminderSettingsValue) => void;
  className?: string;
}

function DayToggle({
  day,
  selected,
  onToggle,
}: {
  day: ShiftWeekday;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "rounded-lg border px-3 py-2 text-xs font-semibold min-w-[3rem] min-h-10 transition-colors",
        selected
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border/60 text-muted-foreground hover:border-border",
      )}
      data-testid={`shift-day-${day}`}
    >
      {SHIFT_WEEKDAY_LABELS[day]}
    </button>
  );
}

export function ShiftReminderSettingsFields({
  value,
  onChange,
  className,
}: ShiftReminderSettingsFieldsProps) {
  const toggleDay = (day: ShiftWeekday) => {
    const next = value.shift_days.includes(day)
      ? value.shift_days.filter((d) => d !== day)
      : [...value.shift_days, day].sort((a, b) => a - b);
    onChange({ ...value, shift_days: next as ShiftWeekday[] });
  };

  return (
    <div className={cn("space-y-4 rounded-xl border border-border/40 px-4 py-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Shift reminders</p>
          <p className="text-xs text-muted-foreground">
            Email the evening before shift day — pick tonight&apos;s meal or start a vote.
          </p>
        </div>
        <Switch
          checked={value.shift_reminders_enabled}
          onCheckedChange={(shift_reminders_enabled) =>
            onChange({ ...value, shift_reminders_enabled })
          }
          data-testid="shift-reminders-enabled"
        />
      </div>

      {value.shift_reminders_enabled ? (
        <>
          <div className="space-y-2">
            <Label>Shift days</Label>
            <div className="flex flex-wrap gap-2">
              {SHIFT_WEEKDAYS.map((day) => (
                <DayToggle
                  key={day}
                  day={day}
                  selected={value.shift_days.includes(day)}
                  onToggle={() => toggleDay(day)}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shift-reminder-time">Reminder time</Label>
              <Input
                id="shift-reminder-time"
                type="time"
                value={value.shift_reminder_time}
                onChange={(e) => onChange({ ...value, shift_reminder_time: e.target.value })}
                data-testid="shift-reminder-time"
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={value.shift_reminder_timezone}
                onValueChange={(shift_reminder_timezone) =>
                  onChange({ ...value, shift_reminder_timezone })
                }
              >
                <SelectTrigger data-testid="shift-reminder-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function useShiftReminderSettingsFromPreferences(
  preferences: {
    shift_reminders_enabled?: boolean;
    shift_days?: number[];
    shift_reminder_time?: string;
    shift_reminder_timezone?: string;
  } | null,
): ShiftReminderSettingsValue {
  return {
    shift_reminders_enabled: preferences?.shift_reminders_enabled ?? false,
    shift_days: (preferences?.shift_days ?? []) as ShiftWeekday[],
    shift_reminder_time: preferences?.shift_reminder_time ?? DEFAULT_SHIFT_REMINDER_TIME,
    shift_reminder_timezone:
      preferences?.shift_reminder_timezone ?? DEFAULT_SHIFT_REMINDER_TIMEZONE,
  };
}

export function ShiftReminderSettingsFieldsControlled({
  preferences,
  onChange,
}: {
  preferences: ShiftReminderSettingsValue;
  onChange: (next: ShiftReminderSettingsValue) => void;
}) {
  return <ShiftReminderSettingsFields value={preferences} onChange={onChange} />;
}

export function useSyncedShiftReminderSettings(
  preferences: {
    shift_reminders_enabled?: boolean;
    shift_days?: number[];
    shift_reminder_time?: string;
    shift_reminder_timezone?: string;
  } | null,
) {
  const [settings, setSettings] = useState<ShiftReminderSettingsValue>(() => ({
    shift_reminders_enabled: preferences?.shift_reminders_enabled ?? false,
    shift_days: (preferences?.shift_days ?? []) as ShiftWeekday[],
    shift_reminder_time: preferences?.shift_reminder_time ?? DEFAULT_SHIFT_REMINDER_TIME,
    shift_reminder_timezone:
      preferences?.shift_reminder_timezone ?? DEFAULT_SHIFT_REMINDER_TIMEZONE,
  }));

  useEffect(() => {
    setSettings({
      shift_reminders_enabled: preferences?.shift_reminders_enabled ?? false,
      shift_days: (preferences?.shift_days ?? []) as ShiftWeekday[],
      shift_reminder_time: preferences?.shift_reminder_time ?? DEFAULT_SHIFT_REMINDER_TIME,
      shift_reminder_timezone:
        preferences?.shift_reminder_timezone ?? DEFAULT_SHIFT_REMINDER_TIMEZONE,
    });
  }, [preferences]);

  return [settings, setSettings] as const;
}
