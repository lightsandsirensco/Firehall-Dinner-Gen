/**
 * Server-side generation timeouts — prevents hung requests.
 */

const DEFAULT_GENERATE_MS = 50_000;
const DEFAULT_PIZZA_MS = 45_000;
const DEFAULT_LIVE_GENERATION_MS = 12_000;

export function generationTimeoutMs(crewSize = 4): number {
  const raw = parseInt(process.env.GENERATE_TIMEOUT_MS || "", 10);
  const base = Number.isFinite(raw) && raw >= 15_000 ? raw : DEFAULT_GENERATE_MS;
  if (crewSize >= 10) return Math.max(base, 60_000);
  return base;
}

export function pizzaTimeoutMs(): number {
  const raw = parseInt(process.env.PIZZA_TIMEOUT_MS || "", 10);
  return Number.isFinite(raw) && raw >= 10_000 ? raw : DEFAULT_PIZZA_MS;
}

/** Hard ceiling for Spoonacular / live API leg — then immediate local fallback. */
export function liveGenerationTimeoutMs(): number {
  const raw = parseInt(process.env.LIVE_GENERATION_TIMEOUT_MS || "", 10);
  return Number.isFinite(raw) && raw >= 3_000 ? raw : DEFAULT_LIVE_GENERATION_MS;
}

export async function withTimeout<T>(
  label: string,
  ms: number,
  fn: () => Promise<T>,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
