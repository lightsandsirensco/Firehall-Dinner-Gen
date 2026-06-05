/**
 * Recipe temperature display — US (dual °F/°C) or Metric (°C only).
 */

import type { MeasurementSystem } from "./convert.js";

/** Common oven/smoker setpoints — kitchen-standard °C pairs. */
const STANDARD_OVEN_CELSIUS: Record<number, number> = {
  225: 107,
  250: 120,
  275: 135,
  300: 150,
  325: 165,
  350: 177,
  375: 190,
  400: 205,
  425: 220,
  450: 230,
  475: 245,
  500: 260,
};

/** Kitchen-friendly °C for paired display (Fahrenheit always shown first in US mode). */
export function fahrenheitToCelsius(f: number): number {
  const roundedF = Math.round(f);
  const preset = STANDARD_OVEN_CELSIUS[roundedF];
  if (preset !== undefined) return preset;

  const c = (roundedF - 32) * (5 / 9);
  if (c >= 100) return Math.round(c);
  return Math.round(c);
}

const MIN_DUAL_FAHRENHEIT = 100;

function formatCelsiusOnly(tempF: number): string {
  return `${fahrenheitToCelsius(tempF)}°C`;
}

export function formatDualTemperature(tempF: number): string {
  const f = Math.round(tempF);
  return `${f}°F (${fahrenheitToCelsius(tempF)}°C)`;
}

export function formatDualTemperatureRange(loF: number, hiF: number): string {
  const lo = Math.round(loF);
  const hi = Math.round(hiF);
  return `${lo}°F (${fahrenheitToCelsius(loF)}°C)–${hi}°F (${fahrenheitToCelsius(hiF)}°C)`;
}

function formatCelsiusRange(loF: number, hiF: number): string {
  return `${fahrenheitToCelsius(loF)}°C–${fahrenheitToCelsius(hiF)}°C`;
}

const TEMP_RANGE_RE =
  /(\d+(?:\.\d+)?)\s*([–\-])\s*(\d+(?:\.\d+)?)\s*(?:°\s*F|°F)/gi;

/** Skip values already in dual form 400°F (205°C) — not "(60 min)" after a temp. */
const TEMP_ALREADY_DUAL = /\(\s*\d+\s*°\s*C\s*\)/i;

const TEMP_SINGLE_RE = /(\d+(?:\.\d+)?)\s*(?:°\s*F|°F)/gi;

const TEMP_BARE_F_RE = /(\d+(?:\.\d+)?)\s+F\b/gi;

const TEMP_DEGREES_F_RE = /(\d+(?:\.\d+)?)\s*degrees?\s+F(?:ahrenheit)?/gi;

function replaceFahrenheitInText(text: string, system: MeasurementSystem): string {
  const useMetric = system === "metric";

  let out = text.replace(TEMP_RANGE_RE, (match, lo: string, _sep: string, hi: string) => {
    const loN = parseFloat(lo);
    const hiN = parseFloat(hi);
    if (!useMetric && (loN < MIN_DUAL_FAHRENHEIT || hiN < MIN_DUAL_FAHRENHEIT)) return match;
    return useMetric ? formatCelsiusRange(loN, hiN) : formatDualTemperatureRange(loN, hiN);
  });

  const singleReplacer = (match: string, f: string, offset: number, full: string) => {
    const after = full.slice(offset + match.length);
    if (TEMP_ALREADY_DUAL.test(after)) return match;
    const n = parseFloat(f);
    if (useMetric) return formatCelsiusOnly(n);
    if (n < MIN_DUAL_FAHRENHEIT) return match;
    return formatDualTemperature(n);
  };

  out = out.replace(TEMP_SINGLE_RE, singleReplacer);
  out = out.replace(TEMP_DEGREES_F_RE, singleReplacer);
  out = out.replace(TEMP_BARE_F_RE, singleReplacer);

  return out;
}

/**
 * Format temperatures in prose — US shows dual °F (°C); Metric shows °C only.
 */
export function formatTemperaturesInText(
  text: string,
  system: MeasurementSystem = "us",
): string {
  if (!text?.trim()) return text;
  if (system === "us" && /\d+°F\s*\(\d+°C\)/.test(text)) return text;
  return replaceFahrenheitInText(text, system);
}

/** Step badges and safety temps — respects US/Metric toggle. */
export function formatStepTemperature(tempF: number, system: MeasurementSystem = "us"): string {
  if (tempF < MIN_DUAL_FAHRENHEIT) return `${tempF}°F`;
  if (system === "metric") return formatCelsiusOnly(tempF);
  return formatDualTemperature(tempF);
}

/** @deprecated Alias — pass system explicitly. */
export function convertTemperaturesInText(
  text: string,
  system: MeasurementSystem = "us",
): string {
  return formatTemperaturesInText(text, system);
}
