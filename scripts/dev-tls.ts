/** Dev-only TLS bypass for Spoonacular on restrictive networks. */
export function applyDevInsecureTlsIfAllowed(): void {
  if (process.env.SPOONACULAR_INSECURE_TLS !== "true") return;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SPOONACULAR_INSECURE_TLS is not allowed in production");
  }
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
