/**
 * Safe concurrency limiter — works in dev (ESM) and production CJS bundle.
 * p-limit v7 is ESM-only; dynamic import + in-process fallback avoids startup crashes.
 */

export type ConcurrencyLimiter = <T>(fn: () => Promise<T>) => Promise<T>;

let cached: ConcurrencyLimiter | null = null;

function fallbackLimit(concurrency: number): ConcurrencyLimiter {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const run = queue.shift()!;
    run();
  };

  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      const run = () => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      };
      queue.push(run);
      next();
    });
}

export async function createConcurrencyLimiter(concurrency: number): Promise<ConcurrencyLimiter> {
  if (cached) return cached;

  try {
    const mod = await import("p-limit");
    const factory =
      typeof mod.default === "function"
        ? mod.default
        : typeof mod === "function"
          ? mod
          : null;
    if (factory) {
      cached = factory(Math.max(1, concurrency)) as ConcurrencyLimiter;
      return cached;
    }
  } catch {
    /* ESM/CJS interop or missing module */
  }

  cached = fallbackLimit(Math.max(1, concurrency));
  return cached;
}

export function resetConcurrencyLimiterCache(): void {
  cached = null;
}
