/** Canonical Firehall Meals GA4 property — override via VITE_GA_MEASUREMENT_ID at build time. */
export const DEFAULT_GA_MEASUREMENT_ID = "G-LYT598M5KT";

const GA4_ID_RE = /^G-[A-Z0-9]+$/;

export function isValidGa4MeasurementId(value: string | undefined): value is string {
  return Boolean(value && GA4_ID_RE.test(value.trim()));
}

/** Resolve GA4 ID: env wins; production falls back to default property. */
export function resolveGaMeasurementId(): string | undefined {
  const fromEnv = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  if (isValidGa4MeasurementId(fromEnv)) return fromEnv;
  if (import.meta.env.PROD) return DEFAULT_GA_MEASUREMENT_ID;
  return undefined;
}

/** Dev-only diagnostic — never logs the full measurement ID. */
export function logGaMeasurementIdLoaded(loaded: boolean): void {
  if (!import.meta.env.DEV) return;
  console.info(`GA measurement ID loaded: ${loaded}`);
}
