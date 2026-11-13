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

export const adminPremiumGrantSchema = z.object({
  expires_at: z.string().datetime({ offset: true }),
  reason: z.string().trim().min(3).max(500),
  granted_by: z.string().trim().min(2).max(120),
});

export const adminPremiumRevokeSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  revoked_by: z.string().trim().min(2).max(120),
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

export const startProTrialSchema = z.object({
  /** Paywall surface the trial was started from (analytics only). */
  paywall_source: z.string().trim().max(64).optional(),
});

export const proTrialNoticeSchema = z.object({
  notice: z.enum(["ending", "expired"]),
});

export const adminSetGlobalFlagSchema = z.object({
  enabled: z.boolean(),
});
