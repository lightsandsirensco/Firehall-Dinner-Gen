import { z } from "zod";
import { CANTEEN_PAYMENT_FREQUENCIES } from "./types.js";

export const updateCanteenDuesMemberSchema = z.object({
  frequency: z.enum(CANTEEN_PAYMENT_FREQUENCIES),
});

export const canteenDuesStatusFilterSchema = z.enum(["all", "paid", "due", "overdue"]);
