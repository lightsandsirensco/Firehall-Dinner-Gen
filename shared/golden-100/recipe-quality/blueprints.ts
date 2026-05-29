/**
 * Editorial recipe blueprints — delegates to instruction engine + legacy slug packs.
 */

export {
  buildEditorialBlueprint,
  buildEditorialInstructions,
} from "./instruction-engine.js";
export { buildLegacySlugBlueprint } from "./blueprints-legacy-slugs.js";
