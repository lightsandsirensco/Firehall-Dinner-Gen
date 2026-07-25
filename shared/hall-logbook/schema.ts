import { z } from "zod";

export const createLogbookEntrySchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(2000).nullable().optional(),
  category: z.string().max(40).optional(),
});
