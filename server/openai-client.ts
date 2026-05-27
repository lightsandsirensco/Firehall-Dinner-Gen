/**
 * Shared OpenAI client — local .env uses OPENAI_API_KEY; Replit may use integrations.
 */

import OpenAI from "openai";
import { validateOpenAIKeyFormat } from "./lib/load-project-env.js";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

export function resolveOpenAIApiKey(): string | undefined {
  const fromEnv = process.env.OPENAI_API_KEY?.trim();
  if (fromEnv && validateOpenAIKeyFormat(fromEnv).formatOk) {
    return fromEnv;
  }

  const integration = process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim();
  if (integration && !integration.includes("*")) {
    return integration;
  }

  return fromEnv || integration || undefined;
}

export function hasOpenAIKey(): boolean {
  return Boolean(resolveOpenAIApiKey());
}

export function resolveOpenAIBaseURL(): string | undefined {
  const custom = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim();
  return custom || DEFAULT_OPENAI_BASE_URL;
}

export function createOpenAIClient(): OpenAI {
  const apiKey = resolveOpenAIApiKey();
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured (set OPENAI_API_KEY in .env).");
  }
  return new OpenAI({
    apiKey,
    baseURL: resolveOpenAIBaseURL(),
  });
}
