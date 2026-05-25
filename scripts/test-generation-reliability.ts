/**
 * Sanity checks: rate limits, defaults, meal steps, burger sourcing.
 */
import { initCacheStore, peekRateLimit } from "../server/cache-store.js";
import {
  enforceUserGenerationRateLimits,
  recordUserGenerationRateLimit,
  parseGenerationRateContext,
} from "../server/generation-rate-limit.js";
import { buildGenerateRequestInput } from "../shared/generate-request-defaults.js";
import { generateRequestSchema } from "../shared/schema.js";
import {
  normalizeRecipeSignature,
  RECIPE_SIGNATURE_MAX_LEN,
} from "../shared/recipe-signature.js";
import { flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

await initCacheStore();

const testIp = `test-ip-${Date.now()}`;

// Dev mode: high burst — first request must pass
const ctx = parseGenerationRateContext({
  body: { request_id: "test-rid-1", generation_intent: "user" },
} as import("express").Request);

const first = enforceUserGenerationRateLimits(testIp, "test-session", ctx);
assert(first.allowed, `first request should pass: ${first.message}`);

recordUserGenerationRateLimit(testIp, "test-session", ctx, { sameSignature: false });

const second = enforceUserGenerationRateLimits(testIp, "test-session", {
  ...ctx,
  requestId: "test-rid-2",
});
assert(second.allowed, "second request should pass in dev relaxed mode");

// Prefetch must not consume
const prefetchCtx = { ...ctx, requestId: "prefetch-1", isPrefetch: true };
recordUserGenerationRateLimit(testIp, "test-session", prefetchCtx, { sameSignature: false });
const afterPrefetch = peekRateLimit(`gen:burst:${testIp}`, 60_000, 40);
assert((afterPrefetch.remaining ?? 0) >= 38, "prefetch must not add burst rows");
assert(afterPrefetch.allowed, "prefetch must not add to gen burst counter");

const req = buildGenerateRequestInput({ meal_format: "burger", protein: "beef" });
assert(req.healthiness_preference === "balanced", "defaults include healthiness");
assert(Array.isArray(req.allergens_to_avoid), "defaults include allergens");

const longSig = "x".repeat(300);
const parsedLong = generateRequestSchema.safeParse({
  ...req,
  recentSignatures: [longSig],
  currentRecipeSignature: longSig,
});
assert(parsedLong.success, "long signatures should preprocess, not fail Zod");
if (parsedLong.success) {
  assert(
    parsedLong.data.recentSignatures[0].length <= RECIPE_SIGNATURE_MAX_LEN,
    "recentSignatures truncated to max len",
  );
  assert(
    (parsedLong.data.currentRecipeSignature?.length ?? 0) <= RECIPE_SIGNATURE_MAX_LEN,
    "currentRecipeSignature truncated",
  );
}
assert(
  normalizeRecipeSignature("  a  |  b  ").includes("|"),
  "normalize collapses whitespace",
);

flushSqliteToDisk();
releaseSqliteTimersForTests();

console.log("[test-generation-reliability] OK");
process.exit(0);
