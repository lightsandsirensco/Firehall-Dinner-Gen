/**
 * Single source of truth for loading .env — overrides stale shell vars on Windows.
 * Import this FIRST in scripts and server entry (before other env reads).
 */

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

let loaded = false;

export interface OpenAIKeyDiagnostics {
  present: boolean;
  length: number;
  masked: string;
  formatOk: boolean;
  issues: string[];
  source: "dotenv" | "missing";
}

function findProjectRoot(start = process.cwd()): string {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

function parseEnvFileKeys(envPath: string): Record<string, string> {
  if (!fs.existsSync(envPath)) return {};
  return dotenv.parse(fs.readFileSync(envPath));
}

/**
 * Load .env from project root with override:true so PowerShell stale exports do not win.
 * Strips integration keys not present in .env (prevents accidental shell overrides).
 */
export function loadProjectEnv(): { envPath: string; loadedKeys: string[] } {
  if (loaded) {
    return { envPath: path.join(findProjectRoot(), ".env"), loadedKeys: [] };
  }

  const root = findProjectRoot();
  const envPath = path.join(root, ".env");
  const fileKeys = parseEnvFileKeys(envPath);

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true, quiet: true });
  }

  // Only use keys that exist in .env file — not stale session exports
  if (!fileKeys.AI_INTEGRATIONS_OPENAI_API_KEY) {
    delete process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  }
  if (!fileKeys.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    delete process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  }

  // Never inherit ad-hoc TLS bypass from an old shell unless declared in .env
  if (!fileKeys.OPENAI_INSECURE_TLS) {
    if (process.env.SPOONACULAR_INSECURE_TLS !== "true") {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    }
  }

  loaded = true;
  return { envPath, loadedKeys: Object.keys(fileKeys) };
}

export function maskSecret(value: string): string {
  const v = value.trim();
  if (v.length <= 8) return "***";
  return `${v.slice(0, 7)}…${v.slice(-4)}`;
}

export function validateOpenAIKeyFormat(raw: string | undefined): OpenAIKeyDiagnostics {
  if (!raw?.trim()) {
    return {
      present: false,
      length: 0,
      masked: "(missing)",
      formatOk: false,
      issues: ["OPENAI_API_KEY is not set after loading .env"],
      source: "missing",
    };
  }

  const key = raw.trim();
  const issues: string[] = [];

  if (key.startsWith('"') || key.startsWith("'") || key.endsWith('"') || key.endsWith("'")) {
    issues.push("key has surrounding quotes — remove quotes in .env");
  }
  if (/\s/.test(key)) {
    issues.push("key contains whitespace");
  }
  if (key.includes("*")) {
    issues.push("key contains asterisks — likely a masked/copy-paste error, not a real key");
  }
  if (!key.startsWith("sk-")) {
    issues.push('key should start with "sk-"');
  }
  if (key.length < 40) {
    issues.push("key is unusually short");
  }
  if (key.length > 220) {
    issues.push("key is unusually long — possible concatenation or corruption");
  }

  const formatOk = issues.length === 0 && key.startsWith("sk-") && key.length >= 40;

  return {
    present: true,
    length: key.length,
    masked: maskSecret(key),
    formatOk,
    issues,
    source: "dotenv",
  };
}

/** Log safe auth diagnostics (never prints full key). */
export function logOpenAIKeyDiagnostics(prefix = "[env]"): OpenAIKeyDiagnostics {
  const diag = validateOpenAIKeyFormat(process.env.OPENAI_API_KEY);
  console.log(`${prefix} OPENAI_API_KEY present=${diag.present} length=${diag.length} masked=${diag.masked} formatOk=${diag.formatOk}`);
  if (diag.issues.length) {
    for (const issue of diag.issues) {
      console.warn(`${prefix} issue: ${issue}`);
    }
  }
  const integrations = process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim();
  if (integrations) {
    console.warn(
      `${prefix} AI_INTEGRATIONS_OPENAI_API_KEY is set (${maskSecret(integrations)}) — may override OPENAI_API_KEY in createOpenAIClient()`,
    );
  }
  return diag;
}

export function requireValidOpenAIKey(): string {
  const diag = validateOpenAIKeyFormat(process.env.OPENAI_API_KEY);
  if (!diag.present || !diag.formatOk) {
    throw new Error(
      `Invalid OPENAI_API_KEY: ${diag.issues.join("; ") || "missing or malformed"}. Fix .env and re-run.`,
    );
  }
  return process.env.OPENAI_API_KEY!.trim();
}
