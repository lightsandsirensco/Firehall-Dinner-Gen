import { z } from "zod";

const postalCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(12)
  .regex(/^[A-Za-z0-9][A-Za-z0-9\s-]{2,11}$/, "Enter a valid postal code");

export const groceryCountrySchema = z.enum(["CA", "US"]);

export const saveGroceryPreferencesSchema = z.object({
  postal_code: postalCodeSchema,
  country: groceryCountrySchema.default("CA"),
  max_distance_km: z.number().min(1).max(100).default(15),
  default_store_id: z.string().trim().min(1).max(80).optional().nullable(),
  preferred_store_ids: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
});

export const nearbyStoresQuerySchema = z.object({
  postal_code: postalCodeSchema.optional(),
  country: groceryCountrySchema.optional(),
  radius_km: z.coerce.number().min(1).max(100).optional(),
});

export type SaveGroceryPreferencesInput = z.infer<typeof saveGroceryPreferencesSchema>;
