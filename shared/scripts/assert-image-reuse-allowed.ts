import { isImageReuseAndFallbacksDisabled } from "../image-reuse-policy.js";

/** Exit remediation scripts when cross-recipe image reuse is temporarily disabled. */
export function assertImageReuseAllowed(scriptName: string): void {
  if (!isImageReuseAndFallbacksDisabled()) return;
  console.log(`[${scriptName}] Skipped — IMAGE_REUSE_AND_FALLBACKS_DISABLED is true.`);
  process.exit(0);
}
