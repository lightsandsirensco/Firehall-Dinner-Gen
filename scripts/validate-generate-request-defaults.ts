/**
 * CI guard: canonical GenerateRequest defaults must parse under generateRequestSchema.
 * Run via `npm run check`.
 */
import { generateRequestSchema } from "../shared/schema.js";
import {
  DEFAULT_GENERATE_REQUEST,
  GENERATE_REQUEST_REQUIRED_BASE,
} from "../shared/generate-request-defaults.js";

const required = generateRequestSchema.safeParse(GENERATE_REQUEST_REQUIRED_BASE);
if (!required.success) {
  console.error("[validate] GENERATE_REQUEST_REQUIRED_BASE failed:");
  console.error(required.error.format());
  process.exit(1);
}

const full = generateRequestSchema.safeParse(DEFAULT_GENERATE_REQUEST);
if (!full.success) {
  console.error("[validate] DEFAULT_GENERATE_REQUEST failed:");
  console.error(full.error.format());
  process.exit(1);
}

console.log("[validate] GenerateRequest defaults OK");
