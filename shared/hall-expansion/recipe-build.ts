import type { GoldenRecipePageStep } from "../golden-100/recipe-page-schema.js";
import type { ExpansionRecipeDef } from "./types.js";

export function step(
  n: number,
  title: string,
  instruction: string,
  opts?: { minutes?: number; heatLevel?: GoldenRecipePageStep["heatLevel"]; tempF?: number },
): GoldenRecipePageStep {
  const tempNote = opts?.tempF ? ` Target oven/smoker temperature: ${opts.tempF}°F.` : "";
  return {
    stepNumber: n,
    title,
    instruction: instruction.endsWith(".") ? instruction + tempNote : instruction + "." + tempNote,
    minutes: opts?.minutes,
    heatLevel: opts?.heatLevel ?? "",
  };
}

export function ing(
  name: string,
  quantity: string,
  opts?: { unit?: string; notes?: string; group?: string; optional?: boolean },
) {
  return {
    name,
    quantity,
    unit: opts?.unit,
    notes: opts?.notes,
    group: opts?.group,
    optional: opts?.optional,
  };
}

export function def(partial: ExpansionRecipeDef): ExpansionRecipeDef {
  return partial;
}
