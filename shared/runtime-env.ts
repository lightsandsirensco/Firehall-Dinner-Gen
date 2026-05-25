/**
 * Environment helpers for code shared by Node (CJS bundle) and Vite (ESM).
 * Avoid import.meta here — the server esbuild target is CJS and treats import.meta as empty.
 */

export function isProductionRuntime(): boolean {
  if (typeof process !== "undefined" && typeof process.env?.NODE_ENV === "string") {
    return process.env.NODE_ENV === "production";
  }
  return false;
}

/** True in local/dev server or Vite dev (via NODE_ENV !== production). */
export function isDevRuntime(): boolean {
  return !isProductionRuntime();
}
