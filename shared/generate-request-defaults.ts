/**
 * Canonical defaults for GenerateRequest — single source for tests, pool, ingestion, routes, prefetch.
 *
 * All exports are produced via `generateRequestSchema.parse()` so Zod defaults apply and
 * schema drift fails fast at import time (see `assertGenerateRequestDefaultsValid`).
 *
 * When adding a new **required** field to `generateRequestSchema` (no `.default()`):
 * 1. Add it to `GENERATE_REQUEST_REQUIRED_BASE` below.
 * 2. Run `npm run check` — boot/assert will fail until updated.
 */

import { generateRequestSchema, type GenerateRequest } from "./schema.js";

/**
 * Explicit values for schema fields without a Zod `.default()`.
 * Optional fields with `.default()` are filled by parse — do not duplicate here.
 */
export const GENERATE_REQUEST_REQUIRED_BASE = {
  crew_size: 6,
  busy_level: "average" as const,
  time_available: "30-45" as const,
  appliances: ["stove", "oven"] as const,
  protein: "any" as const,
  healthiness_preference: "balanced" as const,
  allergens_to_avoid: [] as const,
} satisfies Pick<
  GenerateRequest,
  | "crew_size"
  | "busy_level"
  | "time_available"
  | "appliances"
  | "protein"
  | "healthiness_preference"
  | "allergens_to_avoid"
>;

export type GenerateRequestRequiredBase = typeof GENERATE_REQUEST_REQUIRED_BASE;

/** Merge partial input and return a schema-valid GenerateRequest. */
export function buildGenerateRequestInput(
  overrides: Partial<GenerateRequest> = {},
): GenerateRequest {
  return generateRequestSchema.parse({
    ...GENERATE_REQUEST_REQUIRED_BASE,
    ...overrides,
  });
}

function assertGenerateRequestDefaultsValid(): void {
  const result = generateRequestSchema.safeParse(GENERATE_REQUEST_REQUIRED_BASE);
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(
      `[generate-request-defaults] GENERATE_REQUEST_REQUIRED_BASE is invalid (${fields}). ` +
        "Update GENERATE_REQUEST_REQUIRED_BASE to match generateRequestSchema.",
    );
  }
}

assertGenerateRequestDefaultsValid();

/** Full GenerateRequest with every field populated per schema defaults. */
export const DEFAULT_GENERATE_REQUEST: GenerateRequest = buildGenerateRequestInput();

/** @deprecated Prefer `buildGenerateRequestInput` — alias kept for existing imports. */
export function createDefaultGenerateRequest(
  overrides: Partial<GenerateRequest> = {},
): GenerateRequest {
  return buildGenerateRequestInput(overrides);
}
