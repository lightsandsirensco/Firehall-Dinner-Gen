/** 0 = Sunday … 6 = Saturday (matches JavaScript Date.getDay()). */
export const SHIFT_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export type ShiftWeekday = (typeof SHIFT_WEEKDAYS)[number];

export const SHIFT_WEEKDAY_LABELS: Record<ShiftWeekday, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export const SHIFT_REMINDER_ACTIONS = ["generate", "wheel", "vote"] as const;
export type ShiftReminderAction = (typeof SHIFT_REMINDER_ACTIONS)[number];

export const SHIFT_REMINDER_ACTION_LABELS: Record<ShiftReminderAction, string> = {
  generate: "Generate Meal",
  wheel: "Spin Wheel",
  vote: "Start Vote",
};

export const SHIFT_REMINDER_ACTION_PATHS: Record<ShiftReminderAction, string> = {
  generate: "/generator",
  wheel: "/wheel",
  vote: "/hall",
};

export interface ShiftReminderSettings {
  shift_reminders_enabled: boolean;
  shift_days: ShiftWeekday[];
  shift_reminder_time: string;
  shift_reminder_timezone: string;
}

export const DEFAULT_SHIFT_REMINDER_TIME = "18:00";
export const DEFAULT_SHIFT_REMINDER_TIMEZONE = "America/New_York";
