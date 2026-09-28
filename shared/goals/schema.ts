import { z } from "zod";
import { GOAL_TYPES } from "./types.js";

/** POST /api/goals body — target is validated server-side against the goal's real min/max too. */
export const setGoalSchema = z.object({
  goal_type: z.enum(GOAL_TYPES),
  target: z.number().int().min(1).max(100),
});
