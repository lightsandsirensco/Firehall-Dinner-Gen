#!/usr/bin/env tsx
/** Raw fetch auth check — bypasses OpenAI SDK (detects IDE proxy vs direct API). */
import { loadProjectEnv, logOpenAIKeyDiagnostics, requireValidOpenAIKey } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();
logOpenAIKeyDiagnostics("[raw-auth]");

const key = requireValidOpenAIKey();

async function main(): Promise<void> {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  console.log("[raw-auth] status:", res.status);
  const body = await res.text();
  console.log("[raw-auth] body preview:", body.slice(0, 300));
  process.exit(res.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
