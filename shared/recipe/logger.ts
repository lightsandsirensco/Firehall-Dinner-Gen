/**
 * Structured trust-pipeline logging — internal only, never shown to users.
 */

export type RecipeTrustLogEvent =
  | "normalize"
  | "sanitize"
  | "repair"
  | "validate_fail"
  | "validate_warn"
  | "quality_low"
  | "title_repair"
  | "ingredient_repair"
  | "instruction_warn"
  | "image_mismatch"
  | "rejected"
  | "sendable";

export interface RecipeTrustLogEntry {
  event: RecipeTrustLogEvent;
  detail: string;
  at: string;
}

export type RecipeTrustLogSink = (entry: RecipeTrustLogEntry) => void;

export function createTrustLogBuffer(): {
  entries: RecipeTrustLogEntry[];
  sink: RecipeTrustLogSink;
} {
  const entries: RecipeTrustLogEntry[] = [];
  const sink: RecipeTrustLogSink = (entry) => {
    entries.push(entry);
  };
  return { entries, sink };
}

export function trustLog(
  sink: RecipeTrustLogSink | undefined,
  event: RecipeTrustLogEvent,
  detail: string,
): void {
  if (!sink) return;
  sink({
    event,
    detail: detail.slice(0, 500),
    at: new Date().toISOString(),
  });
}
