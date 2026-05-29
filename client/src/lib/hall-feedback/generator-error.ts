import type { ParsedApiError } from "@/lib/parse-api-error";

/** Generic generator failures → smoked copy + feedback CTA (not category-specific errors). */
export function shouldShowGeneratorSmokedError(opts: {
  errorMsg: string;
  title?: string;
  parsed: ParsedApiError;
  isGameDay: boolean;
}): boolean {
  const { errorMsg, title, parsed, isGameDay } = opts;
  if (errorMsg === "no_match") return false;
  if (title) return false;
  if (parsed.code === "rate_limited" || parsed.status === 429) return false;
  if (parsed.code === "in_flight" || parsed.code === "duplicate_request" || parsed.status === 409) {
    return false;
  }
  if (parsed.status === 403) return false;
  if (
    isGameDay &&
    (parsed.code === "category_thinned" ||
      parsed.status === 503 ||
      parsed.code === "generation_failed")
  ) {
    return false;
  }
  return true;
}
