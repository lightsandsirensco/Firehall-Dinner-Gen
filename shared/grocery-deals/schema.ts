import { z } from "zod";

const postalCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(12)
  .regex(/^[A-Za-z0-9][A-Za-z0-9\s-]{2,11}$/, "Enter a valid postal code");

export const manualGroceryDealSchema = z.object({
  item_name: z.string().trim().min(2).max(200),
  store_name: z.string().trim().min(1).max(120),
  price: z.number().min(0).max(9999).optional().nullable(),
  unit: z.string().trim().max(40).optional().nullable(),
  valid_to: z.string().trim().max(40).optional().nullable(),
  flyer_url: z.string().url().max(500).optional().nullable(),
});

export const updateHallPostalCodeSchema = z.object({
  postal_code: postalCodeSchema.nullable(),
});

export type ManualGroceryDealInput = z.infer<typeof manualGroceryDealSchema>;
