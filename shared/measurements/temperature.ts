/**
 * Dual Fahrenheit + Celsius display for all recipe temperatures.
 * Format: 400°F (205°C) — Fahrenheit always first.
 */

/** Common oven/smoker setpoints — kitchen-standard °C pairs. */
const STANDARD_OVEN_CELSIUS: Record<number, number> = {
  225: 107,
  250: 120,
  275: 135,
  300: 150,
  325: 165,
  350: 175,
  375: 190,
  400: 205,
  425: 220,
  450: 230,
  475: 245,
  500: 260,
};

/** Kitchen-friendly °C for paired display (Fahrenheit always shown first). */
export function fahrenheitToCelsius(f: number): number {
  const roundedF = Math.round(f);
  const preset = STANDARD_OVEN_CELSIUS[roundedF];
  if (preset !== undefined) return preset;

  const c = (roundedF - 32) * (5 / 9);
  if (c >= 100) return Math.round(c / 5) * 5;
  return Math.round(c);
}

/** Minimum absolute oven/internal temp we pair with Celsius (skip "5°F early" deltas). */
const MIN_DUAL_FAHRENHEIT = 100;

function dualOrOriginal(match: string, f: number): string {
  if (f < MIN_DUAL_FAHRENHEIT) return match;
  return formatDualTemperature(f);
}

export function formatDualTemperature(tempF: number): string {
  const f = Math.round(tempF);
  return `${f}°F (${fahrenheitToCelsius(tempF)}°C)`;
}

function dualRangeOrOriginal(match: string, lo: number, hi: number): string {
  if (lo < MIN_DUAL_FAHRENHEIT || hi < MIN_DUAL_FAHRENHEIT) return match;
  return formatDualTemperatureRange(lo, hi);
}

export function formatDualTemperatureRange(loF: number, hiF: number): string {
  const lo = Math.round(loF);
  const hi = Math.round(hiF);
  return `${lo}°F (${fahrenheitToCelsius(loF)}°C)–${hi}°F (${fahrenheitToCelsius(hiF)}°C)`;
}

const TEMP_RANGE_RE =
  /(\d+(?:\.\d+)?)\s*([–\-])\s*(\d+(?:\.\d+)?)\s*(?:°\s*F|°F)(?!\s*\()/gi;

const TEMP_SINGLE_RE = /(\d+(?:\.\d+)?)\s*(?:°\s*F|°F)(?!\s*\()/gi;

const TEMP_BARE_F_RE = /(\d+(?:\.\d+)?)\s+F\b(?!\s*\()/gi;

const TEMP_DEGREES_F_RE =
  /(\d+(?:\.\d+)?)\s*degrees?\s+F(?:ahrenheit)?(?!\s*\()/gi;

/**
 * Expand bare °F references to dual display. Idempotent — skips values already paired.
 */
export function formatTemperaturesInText(text: string): string {
  if (!text?.trim()) return text;

  let out = text.replace(TEMP_RANGE_RE, (match, lo: string, _sep: string, hi: string) =>
    dualRangeOrOriginal(match, parseFloat(lo), parseFloat(hi)),
  );

  out = out.replace(TEMP_SINGLE_RE, (match, f: string) =>
    dualOrOriginal(match, parseFloat(f)),
  );

  out = out.replace(TEMP_DEGREES_F_RE, (match, f: string) =>
    dualOrOriginal(match, parseFloat(f)),
  );

  out = out.replace(TEMP_BARE_F_RE, (match, f: string) =>
    dualOrOriginal(match, parseFloat(f)),
  );

  return out;
}

/** @deprecated Use formatTemperaturesInText — temperatures always show both units. */
export function convertTemperaturesInText(text: string, _system?: string): string {
  return formatTemperaturesInText(text);
}

/** Always returns dual format for step badges when temp is a real setpoint (≥100°F). */
export function formatStepTemperature(tempF: number, _system?: string): string {
  if (tempF < MIN_DUAL_FAHRENHEIT) return `${tempF}°F`;
  return formatDualTemperature(tempF);
}
