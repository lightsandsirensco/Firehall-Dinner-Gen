import { z } from "zod";

export const generateRequestSchema = z.object({
  crew_size: z.number().min(2).max(20),
  busy_level: z.enum(["quiet", "average", "busy", "slammed"]),
  time_available: z.enum(["15-25", "20-30", "25-40", "30-45", "45-60", "60-90"]),
  appliances: z.array(z.string()).min(1),
  proteins: z.array(z.string()).min(1),
  healthiness_preference: z.enum(["lean", "balanced", "comfort"]),
  allergens_to_avoid: z.array(z.string()),
  last_template_id: z.number().optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export interface IngredientItem {
  item: string;
  amount: string;
  notes: string;
}

export interface MacrosPerServing {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface RecipeTiming {
  prep_minutes: number;
  cook_minutes: number;
  total_minutes: number;
}

export interface ProteinSafetyItem {
  protein: string;
  target_temp_f: number;
  target_temp_c: number;
  rest_minutes: number;
  probe_where: string;
  notes: string;
}

export interface GenerateResponse {
  template_id: number;
  title: string;
  why_it_fits_tonight: string;
  timing: RecipeTiming;
  protein_safety: ProteinSafetyItem[];
  ingredients: IngredientItem[];
  steps: string[];
  cleanup_tip: string;
  macros_per_serving: MacrosPerServing;
}

export interface TemplateRow {
  template_id: string;
  template_name: string;
  style: string;
  base_idea_description: string;
  appliances_needed: string;
  time_range_minutes: string;
  busy_level_fit: string;
  healthiness_level: string;
  proteins_allowed: string;
  allergens_possible: string;
  mess_level: string;
  reheat_friendly: string;
}
