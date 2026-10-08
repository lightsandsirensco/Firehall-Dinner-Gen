import { z } from "zod";
import { SCHEDULE_LIMITS } from "../schedule/engine.js";

const shiftKey = z.string().trim().min(1).max(64);
const slotKey = z.string().trim().min(1).max(200);
const recipeSlug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{0,119}$/, "Invalid recipe");
const slugList = (max: number) => z.array(z.string().trim().toLowerCase().max(120)).max(max);

/** PATCH /api/shift-plan/slot — one slot's decision. Omitted fields are unchanged. */
export const shiftPlanSlotPatchSchema = z
  .object({
    shiftKey,
    slotKey,
    recipeSlug: recipeSlug.nullable().optional(),
    skipped: z.boolean().optional(),
    byo: z.boolean().optional(),
    locked: z.boolean().optional(),
    crewSizeOverride: z
      .number()
      .int()
      .min(SCHEDULE_LIMITS.minCrewSize)
      .max(SCHEDULE_LIMITS.maxCrewSize)
      .nullable()
      .optional(),
  })
  .strict();
export type ShiftPlanSlotPatchInput = z.infer<typeof shiftPlanSlotPatchSchema>;

/**
 * POST /api/shift-plan/fill — auto-fill the whole shift (no slotKeys), or
 * pick/swap specific slots. `base` is the user's personalized generator
 * request; it is re-validated and entitlement-gated server-side exactly like
 * /api/generate.
 */
export const shiftPlanFillSchema = z.object({
  shiftKey,
  mode: z.enum(["fill", "swap"]),
  slotKeys: z.array(slotKey).max(32).optional(),
  base: z.record(z.unknown()),
  /** Device-local recently cooked slugs (soft variety penalty, same as /api/generate). */
  recentSlugs: slugList(30).optional(),
  /** Slugs already shown for these slots this session — never re-served on swap. */
  excludeSlugs: slugList(40).optional(),
});
export type ShiftPlanFillInput = z.infer<typeof shiftPlanFillSchema>;

/** Device pantry (Personal + Hall) — validated again by restorePantryProfile server-side. */
const pantryProfile = z.object({ schemaVersion: z.number(), items: z.record(z.string()), updatedAt: z.string() }).passthrough();
const pantryContext = z
  .object({ personal: pantryProfile.optional(), hall: pantryProfile.optional() })
  .refine((p) => JSON.stringify(p).length <= 32_000, "Pantry too large");

/** POST /api/shift-plan/shopping-list — build (or bring up to date) the shift's list. */
export const shiftListOpenSchema = z.object({ shiftKey, pantry: pantryContext.optional() }).strict();
export type ShiftListOpenInput = z.infer<typeof shiftListOpenSchema>;

const itemId = z.string().trim().min(1).max(80);

/** POST /api/shift-plan/shopping-list/op — one list action. */
export const shiftListOpSchema = z
  .object({
    shiftKey,
    op: z.discriminatedUnion("type", [
      z.object({ type: z.literal("check"), itemId, checked: z.boolean() }).strict(),
      z
        .object({
          type: z.literal("add_manual"),
          name: z.string().trim().min(1).max(80),
          quantity: z.string().trim().max(40).optional(),
        })
        .strict(),
      z.object({ type: z.literal("remove"), itemId }).strict(),
      z.object({ type: z.literal("clear_checked") }).strict(),
      z.object({ type: z.literal("undo") }).strict(),
    ]),
  })
  .strict();
export type ShiftListOpInput = z.infer<typeof shiftListOpSchema>;
