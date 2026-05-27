#!/usr/bin/env tsx
/**
 * Isolated OpenAI Images API connectivity diagnostic.
 * No Firehall pipeline — SDK, auth, fetch, and endpoint only.
 *
 *   npx tsx scripts/test-openai-image.ts
 */
import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import OpenAI from "openai";
import { GPT_IMAGE_SIZE_SQUARE } from "../shared/openai-image-sizes.js";
import {
  loadProjectEnv,
  logOpenAIKeyDiagnostics,
  requireValidOpenAIKey,
} from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

const MODEL = "gpt-image-1";
const PROMPT = "a cheeseburger on a dark table";
const SIZE = GPT_IMAGE_SIZE_SQUARE;
const OUT_DIR = path.join(process.cwd(), "temp");
const OUT_FILE = path.join(OUT_DIR, "test-image.png");
const API_BASE = "https://api.openai.com/v1";

function readSdkVersion(): string {
  try {
    const pkgPath = path.join(process.cwd(), "node_modules", "openai", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown (could not read node_modules/openai/package.json)";
  }
}

function printRawError(label: string, err: unknown): void {
  console.error(`\n--- RAW ERROR: ${label} ---`);
  console.error(util.inspect(err, { depth: 12, colors: false, maxArrayLength: 50 }));

  if (err instanceof Error) {
    console.error("\nError.name:", err.name);
    console.error("Error.message:", err.message);
    if (err.stack) console.error("Error.stack:\n", err.stack);
    if (err.cause !== undefined) {
      console.error("Error.cause:", util.inspect(err.cause, { depth: 8, colors: false }));
    }
  }

  const api = err as {
    status?: number;
    code?: string;
    type?: string;
    param?: string;
    request_id?: string;
    headers?: unknown;
    error?: unknown;
  };
  if (api && typeof api === "object") {
    if (api.status != null) console.error("API status:", api.status);
    if (api.code) console.error("API code:", api.code);
    if (api.type) console.error("API type:", api.type);
    if (api.param) console.error("API param:", api.param);
    if (api.request_id) console.error("request_id:", api.request_id);
    if (api.error) console.error("API error body:", util.inspect(api.error, { depth: 8, colors: false }));
    if (api.headers) console.error("headers:", util.inspect(api.headers, { depth: 4, colors: false }));
  }
}

async function main(): Promise<void> {
  const started = Date.now();

  console.log("=== OpenAI Image Connectivity Diagnostic ===\n");

  console.log("[runtime]");
  console.log("  Node version:", process.version);
  console.log("  Platform:", process.platform, process.arch);
  console.log("  CWD:", process.cwd());
  console.log("  NODE_ENV:", process.env.NODE_ENV ?? "(unset)");
  console.log(
    "  NODE_TLS_REJECT_UNAUTHORIZED:",
    process.env.NODE_TLS_REJECT_UNAUTHORIZED ?? "(unset)",
  );
  console.log("  OPENAI_INSECURE_TLS:", process.env.OPENAI_INSECURE_TLS ?? "(unset)");

  console.log("\n[openai sdk]");
  console.log("  Package version:", readSdkVersion());

  console.log("\n[fetch]");
  const hasFetch = typeof globalThis.fetch === "function";
  console.log("  globalThis.fetch:", hasFetch ? "available" : "MISSING");

  console.log("\n[auth]");
  const diag = logOpenAIKeyDiagnostics("[test-openai-image]");
  if (!diag.formatOk) {
    process.exit(1);
  }

  const apiKey = requireValidOpenAIKey();

  console.log("\n[request]");
  console.log("  baseURL:", API_BASE, "(direct — not IDE proxy)");
  console.log("  model:", MODEL);
  console.log("  size:", SIZE);
  console.log("  prompt:", JSON.stringify(PROMPT));
  console.log("  n: 1");

  const client = new OpenAI({ apiKey, baseURL: API_BASE });

  try {
    const t0 = Date.now();
    const response = await client.images.generate({
      model: MODEL,
      prompt: PROMPT,
      size: SIZE,
      n: 1,
    });
    const elapsedMs = Date.now() - t0;

    const item = response.data?.[0];
    const b64 = item?.b64_json;
    const revisedPrompt = item?.revised_prompt;

    console.log("\n[response]");
    console.log("  HTTP OK (SDK did not throw)");
    console.log("  elapsed_ms:", elapsedMs);
    console.log("  created:", response.created ?? "(n/a)");
    console.log("  data.length:", response.data?.length ?? 0);
    console.log("  revised_prompt:", revisedPrompt ?? "(none)");
    console.log("  b64_json present:", Boolean(b64));
    console.log("  b64 length:", b64?.length ?? 0);

    if (!b64) {
      console.error("\nFAIL: No b64_json in response.");
      console.error(util.inspect(response, { depth: 6, colors: false }));
      process.exit(1);
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const buffer = Buffer.from(b64, "base64");
    fs.writeFileSync(OUT_FILE, buffer);

    console.log("\n[output file]");
    console.log("  path:", OUT_FILE);
    console.log("  bytes:", buffer.length);
    console.log("  magic:", buffer.slice(0, 4).toString("hex"));

    console.log("\n=== SUCCESS ===");
    console.log(`Image saved to ${OUT_FILE}`);
    console.log("Total diagnostic time:", `${Date.now() - started}ms`);
    process.exit(0);
  } catch (err: unknown) {
    printRawError("images.generate", err);
    const status = (err as { status?: number }).status;
    if (status === 401) {
      console.error(
        "\n[hint] OpenAI rejected this API key (401). Create a new key at https://platform.openai.com/api-keys",
      );
      console.error(
        "      Paste into .env as OPENAI_API_KEY=sk-... with no quotes, spaces, or masked asterisks.",
      );
      console.error(
        "      Run: npx tsx scripts/test-openai-auth-raw.ts  (raw fetch, no SDK) to verify before imagery.",
      );
    }
    console.error("\n=== FAILED ===");
    console.error("Total diagnostic time:", `${Date.now() - started}ms`);
    if (process.env.OPENAI_INSECURE_TLS !== "true") {
      console.error(
        "\nIf you see UNABLE_TO_VERIFY_LEAF_SIGNATURE, add OPENAI_INSECURE_TLS=true to .env for local dev only.",
      );
    }
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  printRawError("unhandled", err);
  process.exit(1);
});
