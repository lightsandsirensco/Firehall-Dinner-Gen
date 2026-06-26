export type GroceryDealsMode = "disabled" | "demo" | "provider" | "admin_seeded";
export type ProteinDealsMode = GroceryDealsMode;

const VALID_MODES: GroceryDealsMode[] = ["disabled", "demo", "provider", "admin_seeded"];

export function resolveProteinDealsMode(): ProteinDealsMode {
  const raw =
    process.env.PROTEIN_DEALS_MODE?.trim().toLowerCase() ??
    process.env.GROCERY_DEALS_MODE?.trim().toLowerCase();
  if (raw && VALID_MODES.includes(raw as GroceryDealsMode)) {
    return raw as GroceryDealsMode;
  }
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  if (nodeEnv === "development" || nodeEnv === "test") return "demo";
  return "disabled";
}

export function resolveGroceryDealsMode(): GroceryDealsMode {
  return resolveProteinDealsMode();
}

export function isDemoMode(): boolean {
  return resolveGroceryDealsMode() === "demo";
}

export function isProviderMode(): boolean {
  return resolveGroceryDealsMode() === "provider";
}

export function isAdminSeededMode(): boolean {
  return resolveGroceryDealsMode() === "admin_seeded";
}

export function isDealsModeDisabled(): boolean {
  return resolveGroceryDealsMode() === "disabled";
}

export function shouldSyncDemoDeals(): boolean {
  const mode = resolveGroceryDealsMode();
  return mode === "demo" || mode === "admin_seeded";
}

export function shouldSyncProviderDeals(): boolean {
  return resolveGroceryDealsMode() === "provider";
}

export function dealsModeLabel(mode: GroceryDealsMode = resolveGroceryDealsMode()): string {
  switch (mode) {
    case "disabled":
      return "Disabled";
    case "demo":
      return "Demo";
    case "provider":
      return "Provider API";
    case "admin_seeded":
      return "Admin seeded";
  }
}
