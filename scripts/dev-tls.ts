/**
 * Dev-only TLS bypass — isolated flags, never enabled in production.
 */

/**
 * SPOONACULAR TLS fallback (dev only).
 *
 * Prefer the scoped undici agent in server/spoonacular.ts. This function exists ONLY
 * as an emergency fallback when a corporate proxy breaks Node's trust store.
 *
 * Enable by setting BOTH:
 * - SPOONACULAR_INSECURE_TLS=true
 * - SPOONACULAR_TLS_FALLBACK_GLOBAL=true
 */
export function applyDevInsecureTlsIfAllowed(): void {
  if (process.env.SPOONACULAR_INSECURE_TLS !== "true") return;
  if (process.env.SPOONACULAR_TLS_FALLBACK_GLOBAL !== "true") return;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SPOONACULAR TLS fallback is not allowed in production");
  }
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.warn(
    "[dev-tls] SPOONACULAR_TLS_FALLBACK_GLOBAL=true — TLS verification disabled globally (dev only). Prefer scoped agent.",
  );
}

/**
 * OpenAI / image API connectivity on restrictive Windows networks.
 * Set OPENAI_INSECURE_TLS=true in .env for local dev only.
 */
export function applyDevOpenAiTlsIfAllowed(): void {
  if (process.env.OPENAI_INSECURE_TLS !== "true") return;
  if (process.env.NODE_ENV === "production") {
    throw new Error("OPENAI_INSECURE_TLS is not allowed in production");
  }
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.warn("[dev-tls] OPENAI_INSECURE_TLS=true — TLS verification disabled for OpenAI requests (dev only)");
}
