/**
 * Shared OpenAI client — supports Replit integrations OR standard OPENAI_API_KEY.
 */

import OpenAI from "openai";

export function resolveOpenAIApiKey(): string | undefined {
  return (
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    undefined
  );
}

export function hasOpenAIKey(): boolean {
  return Boolean(resolveOpenAIApiKey());
}

export function createOpenAIClient(): OpenAI {
  const apiKey = resolveOpenAIApiKey();
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured (set OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY).");
  }
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim();
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}
