/**
 * Per-slug timing overrides — long cooks must not show 90-minute defaults.
 */

import type { GoldenRecipePageStep } from "../recipe-page-schema.js";
import type { GoldenRecipeDefinition } from "../types.js";

export const GOLDEN_SLUG_TIMING_OVERRIDES: Record<string, { prep: number; cook: number }> = {
  "smoked-brisket": { prep: 90, cook: 495 },
  "texas-beef-ribs": { prep: 45, cook: 420 },
  "memphis-dry-rub-ribs": { prep: 30, cook: 300 },
  "carolina-mustard-pork": { prep: 40, cook: 480 },
  "bbq-brisket-burnt-ends": { prep: 60, cook: 540 },
  "pulled-pork": { prep: 45, cook: 525 },
  "chicken-parm": { prep: 35, cook: 60 },
  "beef-stroganoff": { prep: 20, cook: 45 },
  "mac-and-cheese-bake": { prep: 20, cook: 45 },
  "bbq-chicken-mac-and-cheese": { prep: 20, cook: 45 },
  "chili-mac": { prep: 15, cook: 40 },
  "one-pot-chicken-rice": { prep: 15, cook: 35 },
  "breakfast-sausage-pizza": { prep: 20, cook: 35 },
  "detroit-style-pizza": { prep: 110, cook: 45 },
  "pepperoni-pizza-night": { prep: 30, cook: 145 },
  "bbq-chicken-pizza": { prep: 35, cook: 55 },
  "white-garlic-chicken-pizza": { prep: 30, cook: 55 },
  "meat-lovers-sheet-pizza": { prep: 25, cook: 45 },
  "margherita-pizza": { prep: 30, cook: 60 },
  "honey-soppressata-pizza": { prep: 30, cook: 55 },
  "buffalo-chicken-pizza": { prep: 35, cook: 55 },
  "firehall-supreme-pizza": { prep: 35, cook: 55 },
  "four-cheese-white-pizza": { prep: 25, cook: 50 },
  "hawaiian-pizza": { prep: 25, cook: 50 },
  "jalapeno-popper-pizza": { prep: 30, cook: 50 },
  "nashville-hot-chicken-pizza": { prep: 45, cook: 55 },
  "pesto-chicken-pizza": { prep: 30, cook: 55 },
  "philly-cheesesteak-pizza": { prep: 35, cook: 55 },
  "sicilian-sheet-pizza": { prep: 100, cook: 40 },
  "smoked-brisket-bbq-pizza": { prep: 30, cook: 45 },
  "taco-pizza": { prep: 30, cook: 50 },
  "veggie-supreme-pizza": { prep: 30, cook: 55 },
  "slider-bar": { prep: 30, cook: 25 },
  "baked-ziti": { prep: 25, cook: 50 },
  "pulled-pork-mac": { prep: 45, cook: 510 },
  "batch-lasagna": { prep: 35, cook: 65 },
  "chicken-alfredo-bake": { prep: 25, cook: 45 },
  "skillet-chicken-alfredo": { prep: 15, cook: 30 },
  "turkey-meatball-zoodles": { prep: 20, cook: 35 },
};

export function resolveGoldenSlugTiming(
  def: GoldenRecipeDefinition,
  steps: GoldenRecipePageStep[],
  existing?: { prep?: number; cook?: number },
  fallback?: { prep: number; cook: number; total: number },
): { prep: number; cook: number; total: number } {
  if (existing?.prep != null && existing?.cook != null) {
    return { prep: existing.prep, cook: existing.cook, total: existing.prep + existing.cook };
  }

  const override = GOLDEN_SLUG_TIMING_OVERRIDES[def.slug];
  if (override) {
    return { prep: override.prep, cook: override.cook, total: override.prep + override.cook };
  }

  const stepSum = steps.reduce((sum, step) => sum + (step.minutes ?? 0), 0);
  const longCook =
    def.masterCategoryId === "bbq_grill_nights" ||
    /\b(pulled|brisket|ribs|smoked)\b/i.test(def.slug) ||
    /\b(pulled|smoked|low.?and.?slow)\b/i.test(def.title);

  if (longCook && stepSum >= 180) {
    const prep = Math.min(90, Math.round(stepSum * 0.15));
    return { prep, cook: stepSum, total: prep + stepSum };
  }

  if (stepSum >= 90) {
    const prep = Math.round(stepSum * 0.25);
    return { prep, cook: stepSum, total: prep + stepSum };
  }

  if (fallback) return fallback;
  return { prep: 20, cook: 35, total: 55 };
}
