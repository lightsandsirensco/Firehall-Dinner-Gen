/** Distinguishes user-initiated generation from background prefetch (must not consume user rate limits). */
export type GenerationIntent = "user" | "prefetch";

export const GENERATION_INTENT_USER: GenerationIntent = "user";
export const GENERATION_INTENT_PREFETCH: GenerationIntent = "prefetch";
