/**
 * @deprecated Import from master-style.ts / negative-prompt.ts directly.
 * Re-exports preserved for existing imports.
 */
export {
  FOOD_IMAGERY_STYLE_VERSION,
  FIREHALL_MASTER_EDITORIAL_STYLE,
  FIREHALL_FOOD_BRAND,
  getMasterStylePromptLines,
} from "./master-style.js";

export { buildMasterNegativePrompt, FIREHALL_NEGATIVE_PROMPT } from "./negative-prompt.js";
