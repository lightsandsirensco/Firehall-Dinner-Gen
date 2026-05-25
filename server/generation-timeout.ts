/**
 * Server-side generation timeouts — prevents hung requests.
 */

const DEFAULT_GENERATE_MS = 50_000;
const DEFAULT_PIZZA_MS = 45_000;

export function generationTimeoutMs(): number {
  const raw = parseInt(process.env.GENERATE_TIMEOUT_MS || "", 10);
  return Number.isFinite(raw) && raw >= 15_000 ? raw : DEFAULT_GENERATE_MS;
}

export function pizzaTimeoutMs(): number {
  const raw = parseInt(process.env.PIZZA_TIMEOUT_MS || "", 10);
  return Number.isFinite(raw) && raw >= 10_000 ? raw : DEFAULT_PIZZA_MS;
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
