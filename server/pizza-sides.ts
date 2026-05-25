import type { PizzaRequest } from "../shared/schema.js";
import type { PizzaConceptMeta } from "../shared/pizza-concepts.js";

/** Hall sides are optional — only when the client explicitly requests them. */
export function resolvePizzaRecommendedSides(
  request: PizzaRequest,
  meta?: PizzaConceptMeta | null,
): string[] | undefined {
  if (!request.include_hall_side) return undefined;
  const pref = request.hall_side_preference?.trim();
  if (pref) return [pref];
  const fromMeta = meta?.recommendedSides?.filter(Boolean);
  return fromMeta?.length ? fromMeta : undefined;
}
