import { z } from "zod";

export const magicLinkRequestSchema = z.object({
  email: z.string().email().max(254),
  return_to: z.string().max(500).optional(),
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
  preferred_proteins: z.array(z.string().max(64)).max(20).optional(),
  dietary_restrictions: z.array(z.string().max(64)).max(20).optional(),
  appliance_preferences: z.array(z.string().max(64)).max(20).optional(),
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
