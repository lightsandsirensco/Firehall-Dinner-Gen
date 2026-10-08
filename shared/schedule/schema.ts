import { z } from "zod";
import { SCHEDULE_LIMITS, validatePersonalSchedule } from "./engine.js";
import { parseLocalDateTime, parseLocalTime } from "./timezone.js";

const localDateTime = z
  .string()
  .refine((v) => parseLocalDateTime(v) != null, "Expected local date-time YYYY-MM-DDTHH:MM");

const crewSize = z.number().int().min(SCHEDULE_LIMITS.minCrewSize).max(SCHEDULE_LIMITS.maxCrewSize);

export const scheduleBlockSchema = z.object({
  kind: z.enum(["on", "off"]),
  minutes: z.number().int().min(SCHEDULE_LIMITS.minBlockMinutes).max(SCHEDULE_LIMITS.maxBlockMinutes),
});

/** PUT /api/schedule body. */
export const personalScheduleInputSchema = z
  .object({
    timezone: z.string().min(1).max(64),
    anchorDate: z.string().min(10).max(10),
    startTime: z.string().min(5).max(5),
    blocks: z.array(scheduleBlockSchema).min(2).max(SCHEDULE_LIMITS.maxBlocks),
    defaultCrewSize: crewSize,
    presetId: z.string().trim().max(64).nullish(),
  })
  .superRefine((value, ctx) => {
    for (const message of validatePersonalSchedule(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }
  });

/** POST /api/schedule/overrides body. */
export const scheduleOverrideInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("extra"),
    startLocal: localDateTime,
    endLocal: localDateTime,
    crewSize: crewSize.nullish(),
    note: z.string().trim().max(200).nullish(),
  }),
  z.object({
    kind: z.literal("cancel"),
    shiftKey: localDateTime,
    note: z.string().trim().max(200).nullish(),
  }),
  z.object({
    kind: z.literal("modify"),
    shiftKey: localDateTime,
    startLocal: localDateTime.nullish(),
    endLocal: localDateTime.nullish(),
    crewSize: crewSize.nullish(),
    note: z.string().trim().max(200).nullish(),
  }),
]);

export type ScheduleOverrideInput = z.infer<typeof scheduleOverrideInputSchema>;

const localTime = z.string().refine((v) => parseLocalTime(v) != null, "Expected HH:MM (24h)");

const mealTypePreferenceSchema = z
  .object({
    mode: z.enum(["auto", "required", "optional", "off"]).optional(),
    windowStart: localTime.optional(),
    defaultTime: localTime.optional(),
    windowEnd: localTime.optional(),
  })
  .strict();

/** PUT /api/schedule/meal-preferences body — the only persisted meal-slot data. */
export const mealSlotPreferencesSchema = z
  .object({
    meals: z
      .object({
        breakfast: mealTypePreferenceSchema.optional(),
        lunch: mealTypePreferenceSchema.optional(),
        dinner: mealTypePreferenceSchema.optional(),
        late_night: mealTypePreferenceSchema.optional(),
      })
      .strict()
      .optional(),
    custom: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
            label: z.string().trim().min(1).max(40),
            time: localTime,
            optional: z.boolean().optional(),
          })
          .strict(),
      )
      .max(6)
      .refine((list) => new Set(list.map((c) => c.id)).size === list.length, "Custom meal ids must be unique")
      .optional(),
    arrivalGraceMinutes: z.number().int().min(0).max(180).optional(),
    departureBufferMinutes: z.number().int().min(0).max(240).optional(),
  })
  .strict();

/** GET /api/schedule/shifts query. */
export const SHIFT_QUERY_MAX_DAYS = 400;
