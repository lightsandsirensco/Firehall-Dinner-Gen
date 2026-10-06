import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const RETRY_DELAYS_MS = [400, 1200];

/**
 * `React.lazy` that retries a failed chunk import before giving up. A single
 * dropped chunk request (flaky station Wi-Fi, a crawler's renderer skipping a
 * fetch) would otherwise reject the lazy component and unmount the page into
 * the nearest error boundary.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await factory();
      } catch (err) {
        const delay = RETRY_DELAYS_MS[attempt];
        if (delay === undefined) throw err;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  });
}
