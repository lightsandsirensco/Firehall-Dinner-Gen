import { z } from "zod";
import { HALL_ACTIVITY_TYPES } from "./types.js";

export const hallActivitySyncEntrySchema = z.object({
  external_id: z.string().min(1).max(120),
  event_type: z.enum(HALL_ACTIVITY_TYPES),
  title: z.string().max(200).optional().default(""),
  recipe_slug: z.string().max(120).optional(),
  cuisine: z.string().max(80).optional(),
  category: z.string().max(80).optional(),
  shift_label: z.string().max(80).optional(),
  occurred_at: z.string().max(40),
});

export const hallActivitySyncSchema = z.object({
  entries: z.array(hallActivitySyncEntrySchema).max(500).optional().default([]),
  wheel_spin_days: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(400).optional().default([]),
});
