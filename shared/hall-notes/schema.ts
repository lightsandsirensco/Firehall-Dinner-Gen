import { z } from "zod";

export const createHallNoteSchema = z.object({
  message: z.string().min(1).max(500),
});

export const updateHallNoteSchema = z.object({
  message: z.string().min(1).max(500),
});
