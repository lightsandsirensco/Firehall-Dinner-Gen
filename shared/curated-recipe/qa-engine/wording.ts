/**
 * Detect generic / AI-sounding editorial phrasing in titles, summaries, and steps.
 */

import { isRoboticTitle } from "../../generation-reliability.js";

const AI_BODY_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bperfect for\b/i, label: "perfect for" },
  { re: /\bideal for\b/i, label: "ideal for" },
  { re: /\bno heat\b/i, label: "no heat" },
  { re: /\bset up the station\b/i, label: "set up the station" },
  { re: /\brun the line\b/i, label: "run the line" },
  { re: /\bwhy it fits tonight\b/i, label: "why it fits tonight" },
  { re: /\bcrew-pleasing\b/i, label: "crew-pleasing" },
  { re: /\bhearty portions\b/i, label: "hearty portions" },
  { re: /\bcomforting and satisfying\b/i, label: "comforting and satisfying" },
  { re: /\belevate(s|d)?\b/i, label: "elevate" },
  { re: /\bculinary\b/i, label: "culinary" },
  { re: /\bgourmet\b/i, label: "gourmet" },
  { re: /\bmouth-?watering\b/i, label: "mouth-watering" },
  { re: /\bdeliciously\b/i, label: "deliciously" },
  { re: /\brestaurant-?quality\b/i, label: "restaurant-quality" },
  { re: /\bto perfection\b/i, label: "to perfection" },
  { re: /\buntil done\b/i, label: "until done" },
  { re: /\bserve and enjoy\b/i, label: "serve and enjoy" },
  { re: /\bplate and serve\b/i, label: "plate and serve" },
];

export function detectGenericAiWording(text: string): string[] {
  const hits: string[] = [];
  for (const { re, label } of AI_BODY_PATTERNS) {
    if (re.test(text)) hits.push(label);
  }
  return [...new Set(hits)];
}

export function scanRecipeForAiWording(input: {
  title: string;
  summary?: string;
  steps: Array<{ heading?: string; body: string }>;
}): { hits: string[]; roboticTitle: boolean } {
  const hits: string[] = [];
  const roboticTitle = isRoboticTitle(input.title);
  if (roboticTitle) hits.push("robotic_title_pattern");

  if (input.summary) hits.push(...detectGenericAiWording(input.summary));
  for (const step of input.steps) {
    const blob = `${step.heading || ""} ${step.body}`;
    hits.push(...detectGenericAiWording(blob));
  }
  return { hits: [...new Set(hits)], roboticTitle };
}
