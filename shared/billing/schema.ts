import { z } from "zod";
import { BILLING_FEATURES, PLAN_IDS } from "./types.js";

export const selectPlanSchema = z.object({
  plan_id: z.enum(["personal"] as const),
});

export const hallBillingActionSchema = z.object({
  action: z.enum(["start_trial", "enable", "convert"]),
});

export const adminTogglePlanSchema = z.object({
  enabled: z.boolean(),
});

export const adminSetUserPlanSchema = z.object({
  plan_id: z.enum(PLAN_IDS),
  status: z.enum(["active", "trialing", "cancelled"]).optional(),
});

export const adminUserLookupSchema = z.object({
  email: z.string().trim().min(1).max(320),
});

export const adminToggleFeatureSchema = z.object({
  plan_id: z.enum(PLAN_IDS),
  feature_key: z.enum(BILLING_FEATURES),
  enabled: z.boolean(),
});

export const paywallViewSchema = z.object({
  feature: z.enum(BILLING_FEATURES).optional(),
  surface: z.string().max(80).optional(),
});

export const createCheckoutSessionSchema = z.object({
  billing_period: z.enum(["monthly", "annual"]),
  feature: z.string().max(80).optional(),
});

export const adminSetGlobalFlagSchema = z.object({
  enabled: z.boolean(),
});
