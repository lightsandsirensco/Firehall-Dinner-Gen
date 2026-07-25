import { z } from "zod";

export const updateBoardTonightSchema = z.object({
  dinner_title: z.string().max(120).nullable().optional(),
  dinner_slug: z.string().max(160).nullable().optional(),
  status: z.enum(["empty", "voting", "locked", "on_hold", "fed"]).optional(),
  hold_note: z.string().max(200).nullable().optional(),
  cook_user_id: z.string().max(64).nullable().optional(),
  runner_user_id: z.string().max(64).nullable().optional(),
});

export const createBoardNoteSchema = z.object({
  intent: z.enum(["broken", "reminder", "announcement", "event"]),
  title: z.string().min(1).max(120),
  body: z.string().max(400).nullable().optional(),
  pinned: z.boolean().optional(),
  event_at: z.string().max(40).nullable().optional(),
  expires_at: z.string().max(40).nullable().optional(),
});
