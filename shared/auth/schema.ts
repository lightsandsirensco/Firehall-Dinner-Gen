import { z } from "zod";
import {
  USERNAME_PATTERN,
  PROFILE_SPICE_OPTIONS,
  PROFILE_DIFFICULTY_OPTIONS,
  PROFILE_COOK_TIME_OPTIONS,
  PROFILE_NUTRITION_GOAL_OPTIONS,
} from "./constants.js";

export const magicLinkRequestSchema = z.object({
  email: z.string().email().max(254),
  return_to: z.string().max(500).optional(),
  /** Explicit, unchecked-by-default marketing opt-in — never inferred from account creation itself. */
  marketing_consent: z.boolean().optional(),
});

export const oauthTokenSchema = z.object({
  id_token: z.string().min(10).max(8192),
  /** Apple first-sign-in payload */
  user: z
    .object({
      name: z
        .object({
          firstName: z.string().max(80).optional(),
          lastName: z.string().max(80).optional(),
        })
        .optional(),
      email: z.string().email().max(254).optional(),
    })
    .optional(),
});

export const profileUpdateSchema = z.object({
  first_name: z.string().max(80).optional().nullable(),
  last_name: z.string().max(80).optional().nullable(),
  display_name: z.string().max(120).optional().nullable(),
  profile_photo_url: z.string().url().max(500).optional().nullable(),
  department: z.string().max(120).optional().nullable(),
  hall_name: z.string().max(120).optional().nullable(),
  shift_label: z.string().max(80).optional().nullable(),
  crew_size: z.number().int().min(1).max(200).optional().nullable(),
  /** Slug-safe, unique (case-insensitive). Empty string clears it back to null. */
  username: z
    .string()
    .trim()
    .toLowerCase()
    .max(24)
    .refine((v) => v === "" || USERNAME_PATTERN.test(v), {
      message: "Usernames are 3–24 lowercase letters, numbers, or underscores",
    })
    .optional()
    .nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  province_state: z.string().trim().max(80).optional().nullable(),
  postal_code: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().max(80).optional().nullable(),
  preferred_proteins: z.array(z.string().max(64)).max(20).optional(),
  dietary_restrictions: z.array(z.string().max(64)).max(20).optional(),
  appliance_preferences: z.array(z.string().max(64)).max(20).optional(),
  /** "Foods to Avoid" (Firehall Meals Pro) — canonical keys, sanitized/entitlement-checked server-side. */
  excluded_ingredients: z.array(z.string().max(64)).max(30).optional(),
  allergies: z.array(z.string().max(64)).max(20).optional(),
  favorite_cuisines: z.array(z.string().max(64)).max(20).optional(),
  spice_level: z
    .enum(PROFILE_SPICE_OPTIONS as unknown as [string, ...string[]])
    .optional()
    .nullable(),
  meal_difficulty: z
    .enum(PROFILE_DIFFICULTY_OPTIONS as unknown as [string, ...string[]])
    .optional()
    .nullable(),
  cook_time_preference: z
    .enum(PROFILE_COOK_TIME_OPTIONS as unknown as [string, ...string[]])
    .optional()
    .nullable(),
  nutrition_goal: z
    .enum(PROFILE_NUTRITION_GOAL_OPTIONS as unknown as [string, ...string[]])
    .optional()
    .nullable(),
  shift_reminders_enabled: z.boolean().optional(),
  shift_days: z.array(z.coerce.number().int().min(0).max(6)).max(7).optional(),
  shift_reminder_time: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/)
    .optional(),
  shift_reminder_timezone: z.string().min(3).max(80).optional(),
});

export const savedRecipesSyncSchema = z.object({
  recipes: z
    .array(
      z.object({
        recipe_key: z.string().min(1).max(200),
        recipe_json: z.unknown(),
        saved_at: z.string().max(40).optional(),
      }),
    )
    .max(500),
  /** When true, remove server saves not present in the payload. */
  replace: z.boolean().optional(),
});
