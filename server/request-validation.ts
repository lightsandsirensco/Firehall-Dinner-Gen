import type { ZodError } from "zod";
import {
  normalizeRecipeSignature,
  sanitizeRecipeSignatureList,
  RECIPE_SIGNATURE_MAX_LEN,
} from "../shared/recipe-signature.js";
import { recipeSignatureFingerprint } from "./recipe-signature-hash.js";
import { generationError, type GenerationErrorCode } from "../shared/generation-errors.js";
import { log } from "./logger.js";

function signatureField(path: (string | number)[]): boolean {
  const last = path[path.length - 1];
  return (
    last === "recentSignatures" ||
    last === "currentRecipeSignature" ||
    last === "exclude_signatures"
  );
}

export function logGenerateValidationFailure(error: ZodError, body: unknown): void {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const recent = sanitizeRecipeSignatureList(b.recentSignatures ?? b.exclude_signatures);
  const current = normalizeRecipeSignature(b.currentRecipeSignature);
  const maxLen = Math.max(
    0,
    ...recent.map((s) => s.length),
    current.length,
  );
  const paths = error.issues.map((i) => i.path.join(".")).join(", ");
  log(
    `[validate] generate failed paths=${paths} sig_count=${recent.length} max_sig_len=${maxLen} limit=${RECIPE_SIGNATURE_MAX_LEN} current_fp=${recipeSignatureFingerprint(current)}`,
    "generate",
  );
}

export function formatZodValidationForClient(error: ZodError): {
  status: number;
  body: ReturnType<typeof generationError>;
} {
  const sigIssue = error.issues.some((i) => signatureField(i.path));
  const message = sigIssue
    ? "Generator temporarily failed. Retrying with a simplified request…"
    : "Generator temporarily failed. Check your filters and try again.";

  const code: GenerationErrorCode = "validation_error";
  return {
    status: 400,
    body: generationError(code, message),
  };
}

export function formatPizzaZodValidationForClient(error: ZodError): {
  status: number;
  body: ReturnType<typeof generationError>;
} {
  log(`[validate] pizza failed: ${error.issues.map((i) => i.message).join("; ")}`, "pizza");
  return {
    status: 400,
    body: generationError(
      "validation_error",
      "Pizza generator temporarily failed. Check your filters and try again.",
    ),
  };
}
