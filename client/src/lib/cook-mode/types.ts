export interface CookModeIngredient {
  name: string;
  amount?: string;
  notes?: string;
  group?: string;
}

export interface CookModeStep {
  stepNumber: number;
  title: string;
  instruction: string;
  minutes?: number;
  heatLevel?: string;
}

export interface CookModeRecipe {
  title: string;
  crewSize?: number;
  /** Recipe photo for the Cook Mode header band — never rendered behind instruction text. */
  imageUrl?: string;
  imageAlt?: string;
  ingredients: CookModeIngredient[];
  steps: CookModeStep[];
  /** Recipe-specific + extracted hold / interruption notes */
  holdingGuidance?: string[];
  proTips?: string[];
}
