import { z } from "zod";
import { HALL_SUPPLY_CATEGORIES, HALL_SUPPLY_STATUSES } from "./types.js";

export const updateHallSupplyStatusSchema = z.object({
  status: z.enum(HALL_SUPPLY_STATUSES),
});

export const addHallSupplySchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(HALL_SUPPLY_CATEGORIES),
});
