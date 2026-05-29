export function parseNutritionHighlights(text: string): {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
} {
  const calMatch = text.match(/~?\s*(\d+)\s*cal/i);
  const proteinMatch = text.match(/~?\s*(\d+)\s*g\s*protein/i);
  const carbsMatch = text.match(/~?\s*(\d+)\s*g\s*carb/i);
  const fatsMatch = text.match(/~?\s*(\d+)\s*g\s*fat/i);
  const fiberMatch = text.match(/fiber/i) ? text.match(/(\d+)\s*g\s*fiber/i) : null;

  return {
    calories: calMatch ? Number(calMatch[1]) : 220,
    protein: proteinMatch ? Number(proteinMatch[1]) : 15,
    carbs: carbsMatch ? Number(carbsMatch[1]) : 32,
    fats: fatsMatch ? Number(fatsMatch[1]) : 8,
    fiber: fiberMatch ? Number(fiberMatch[1]) : undefined,
  };
}
