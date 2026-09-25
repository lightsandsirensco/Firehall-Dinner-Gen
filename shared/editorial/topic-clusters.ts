/**
 * `/guides/topic/:clusterId` classification — maps every guide to exactly
 * one of the 4 marketing topic clusters, using each guide's own canonical
 * `topic` field (`EditorialTopic`, assigned at authoring time — see
 * `content-schema.ts`) as the source of truth, NOT keyword/regex matching
 * against free-text title/subtitle/description (the previous approach in
 * `guides-cluster.tsx`, which matched near-every guide against near-every
 * cluster because the whole catalog shares vocabulary like "firefighter",
 * "crew", "station", and "dinner").
 *
 * There are 6 canonical `topic` values but only 4 cluster pages, so this
 * is a deliberate many-to-one mapping, not a 1:1 rename:
 *   - `nutrition_performance` -> "firefighter-nutrition"   (clean 1:1)
 *   - `station_cooking`      -> "station-cooking"          (clean 1:1)
 *   - `meal_planning`        -> "firefighter-meals"         (clean 1:1 —
 *     the broad "what to cook" bucket matches this cluster's own "practical
 *     crew dinners" framing)
 *   - `crew_culture` + `shift_operations` -> "firehall-dinners" (every guide
 *     in both buckets is about dinner logistics/comfort food — confirmed
 *     against each guide's own title/keywords, e.g. `organize-firehall-dinners`
 *     keywords include "firehall dinner planning"; `comfort-food-after-a-long-shift`
 *     keywords include "station dinner")
 *
 * `station_lifestyle` (9 guides) is the one bucket that does NOT map
 * cleanly to a single cluster — it genuinely spans two different
 * intents ("classic/legendary dinners crews cook" vs. "station kitchen
 * culture/workflow"). Rather than guessing or dumping the whole bucket
 * into one cluster, each guide's OWN title/keywords were inspected
 * individually (see `STATION_LIFESTYLE_DINNER_SLUGS` below) and the split
 * is called out explicitly in the Phase 3 report as the one ambiguous
 * classification in this catalog.
 */
import type { EditorialTopic } from "./content-schema.js";
import type { GuidesClusterId } from "../seo/metadata.js";

/** Topics that map cleanly to exactly one cluster. */
const TOPIC_TO_CLUSTER: Record<Exclude<EditorialTopic, "station_lifestyle">, GuidesClusterId> = {
  meal_planning: "firefighter-meals",
  nutrition_performance: "firefighter-nutrition",
  station_cooking: "station-cooking",
  crew_culture: "firehall-dinners",
  shift_operations: "firehall-dinners",
};

/**
 * `station_lifestyle` guides whose OWN title/subtitle/keywords are about a
 * specific dinner, a crowd-sized feed, or hall dinner tradition/classics —
 * these go to "firehall-dinners" (dinner ideas, comfort, big feeds).
 * Every other `station_lifestyle` guide's own copy is about kitchen/station
 * *culture* or *workflow* (grocery splitting, rookie mistakes, food
 * culture) — those go to "station-cooking" instead (see
 * `STATION_LIFESTYLE_CULTURE_SLUGS` — everything in `station_lifestyle`
 * NOT listed here).
 */
export const STATION_LIFESTYLE_DINNER_SLUGS = new Set<string>([
  "10-classic-firehall-meals", // keywords include "firefighter dinner ideas"
  "legendary-firehall-meals", // "the dishes halls still talk about"
  "meals-every-firefighter-knows", // "the short list — chili, burgers, tacos, pasta"
  "feeding-ten-firefighters", // keywords include "large crew dinner"
  "busy-shift-dinner-strategies", // "dinner when the board will not cooperate"
]);

/** Remaining `station_lifestyle` guides — station/kitchen culture & workflow. */
export const STATION_LIFESTYLE_CULTURE_SLUGS = new Set<string>([
  "firehall-kitchen-culture",
  "how-crews-split-groceries",
  "rookie-cooking-mistakes",
  "better-station-food-culture",
]);

export interface ClusterableGuide {
  slug: string;
  topic: EditorialTopic;
}

/** Resolve the one cluster a given guide genuinely belongs to. */
export function resolveGuideClusterId(article: ClusterableGuide): GuidesClusterId {
  if (article.topic === "station_lifestyle") {
    return STATION_LIFESTYLE_DINNER_SLUGS.has(article.slug) ? "firehall-dinners" : "station-cooking";
  }
  return TOPIC_TO_CLUSTER[article.topic];
}

/** Filter a guide list down to only the guides genuinely in `clusterId`. */
export function guidesInCluster<T extends ClusterableGuide>(
  articles: T[],
  clusterId: GuidesClusterId,
): T[] {
  return articles.filter((a) => resolveGuideClusterId(a) === clusterId);
}
