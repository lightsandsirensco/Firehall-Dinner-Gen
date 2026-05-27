/**
 * In-memory engagement signals — future-ready for SQLite / analytics pipeline.
 */

export interface RecipeEngagementSignals {
  views: number;
  saves: number;
  generates: number;
  hallVoteWins: number;
  lastEventAt: number;
}

const engagementByKey = new Map<string, RecipeEngagementSignals>();

function keyForRecipe(recipeId: number, curatedRecipeId?: string): string {
  if (curatedRecipeId) return `curated:${curatedRecipeId}`;
  return `spoon:${recipeId}`;
}

function getOrCreate(key: string): RecipeEngagementSignals {
  let row = engagementByKey.get(key);
  if (!row) {
    row = { views: 0, saves: 0, generates: 0, hallVoteWins: 0, lastEventAt: Date.now() };
    engagementByKey.set(key, row);
  }
  return row;
}

export function recordRecipeView(recipeId: number, curatedRecipeId?: string): void {
  const row = getOrCreate(keyForRecipe(recipeId, curatedRecipeId));
  row.views += 1;
  row.lastEventAt = Date.now();
}

export function recordRecipeSave(recipeId: number, curatedRecipeId?: string): void {
  const row = getOrCreate(keyForRecipe(recipeId, curatedRecipeId));
  row.saves += 1;
  row.lastEventAt = Date.now();
}

export function recordRecipeGenerate(recipeId: number, curatedRecipeId?: string): void {
  const row = getOrCreate(keyForRecipe(recipeId, curatedRecipeId));
  row.generates += 1;
  row.lastEventAt = Date.now();
}

export function recordHallVoteWin(recipeId: number, curatedRecipeId?: string): void {
  const row = getOrCreate(keyForRecipe(recipeId, curatedRecipeId));
  row.hallVoteWins += 1;
  row.lastEventAt = Date.now();
}

export function getEngagementSignals(
  recipeId: number,
  curatedRecipeId?: string,
): RecipeEngagementSignals | undefined {
  return engagementByKey.get(keyForRecipe(recipeId, curatedRecipeId));
}
