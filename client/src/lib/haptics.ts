/** Light tactile feedback — safe no-op when unsupported or reduced motion */

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function hapticLight(): void {
  if (prefersReducedMotion() || !canVibrate()) return;
  navigator.vibrate(8);
}

export function hapticMedium(): void {
  if (prefersReducedMotion() || !canVibrate()) return;
  navigator.vibrate(14);
}

/** Meal landed, saved to favorites, wheel result */
export function hapticSuccess(): void {
  if (prefersReducedMotion() || !canVibrate()) return;
  navigator.vibrate([12, 40, 18]);
}

/** Error or no-match — subtle double tap */
export function hapticWarning(): void {
  if (prefersReducedMotion() || !canVibrate()) return;
  navigator.vibrate([10, 30, 10]);
}
