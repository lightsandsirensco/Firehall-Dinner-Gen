import { batch01 } from "./batch-01.js";
import { batch02 } from "./batch-02.js";
import { batch03 } from "./batch-03.js";
import { batch04 } from "./batch-04.js";
import { batch05 } from "./batch-05.js";
import { batch06 } from "./batch-06.js";
import { batch07 } from "./batch-07.js";

export const PERFORMANCE_ADAPTED_RECIPES = [
  ...batch01,
  ...batch02,
  ...batch03,
  ...batch04,
  ...batch05,
  ...batch06,
  ...batch07,
];

export { batch01, batch02, batch03, batch04, batch05, batch06, batch07 };

export function getPerformanceRecipeBySlug(slug: string) {
  return PERFORMANCE_ADAPTED_RECIPES.find((r) => r.manifest.slug === slug);
}
