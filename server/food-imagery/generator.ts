import { createHash } from "node:crypto";
import { createOpenAIClient } from "../openai-client.js";
import { log } from "../logger.js";
import { getFoodImageryConfig } from "./config.js";

export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 24);
}

export async function generateFoodImageBuffer(
  prompt: string,
  size?: "1024x1024" | "512x512",
): Promise<Buffer> {
  const cfg = getFoodImageryConfig();
  const client = createOpenAIClient();
  const outputSize = size ?? cfg.size;

  let response;
  try {
    response = await client.images.generate({
      model: cfg.model,
      prompt,
      size: outputSize,
      n: 1,
    });
  } catch (err: unknown) {
    const base = err instanceof Error ? err.message : String(err);
    const cause =
      err instanceof Error && err.cause instanceof Error
        ? ` (${err.cause.message})`
        : "";
    throw new Error(`OpenAI Images API failed: ${base}${cause}`);
  }

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("Image API returned no b64_json payload");
  }

  const buf = Buffer.from(b64, "base64");
  log(`[food-imagery] generated ${buf.length} bytes model=${cfg.model} size=${outputSize}`, "catalog");
  return buf;
}
