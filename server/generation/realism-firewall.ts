/**
 * Server wrapper — realism firewall enforcement + logging.
 */

import type { GenerateResponse } from "@shared/schema";
import {
  evaluateMealRealismFirewall,
  formatFirewallRejectionLog,
  requiresRealismFirewall,
  type MealRealismFirewallResult,
} from "../../shared/meal-realism-firewall.js";
import { log } from "../logger.js";
import { recordReliabilityEvent } from "../generation-reliability.js";

export type { MealRealismFirewallResult };

export function runRealismFirewall(
  recipe: GenerateResponse,
  extras: Record<string, unknown>,
): MealRealismFirewallResult | null {
  const source = String(extras._source || "");
  if (!requiresRealismFirewall(source, extras)) {
    return null;
  }

  const result = evaluateMealRealismFirewall(recipe);
  if (!result.pass) {
    log(
      `[realism-firewall] ${formatFirewallRejectionLog(result, recipe.title || "")} source=${source}`,
      "generate",
    );
    for (const tag of result.logTags) {
      recordReliabilityEvent("realism_rejected", tag);
    }
    if (result.rejections.length) {
      recordReliabilityEvent("realism_rejected", result.rejections.join(","));
    }
  }
  return result;
}

export function realismFirewallBlocksSend(
  recipe: GenerateResponse,
  extras: Record<string, unknown>,
): { blocked: boolean; result: MealRealismFirewallResult | null; reasons: string[] } {
  const result = runRealismFirewall(recipe, extras);
  if (!result) {
    return { blocked: false, result: null, reasons: [] };
  }
  if (result.pass) {
    return { blocked: false, result, reasons: [] };
  }
  const reasons = result.rejections.map((r) => `realism_firewall:${r}`);
  return { blocked: true, result, reasons };
}
