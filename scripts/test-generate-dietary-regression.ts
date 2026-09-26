#!/usr/bin/env tsx
/**
 * Regression test — "Pick Tonight's Meal" generator failing for every protein
 * whenever `dietary_restrictions` was non-empty.
 *
 * Root cause #1 (server/routes.ts `sendRecipeResponse`): the final-boundary
 * dietary post-check re-classified the ALREADY client-normalized recipe
 * (`{ name, qty, unit, category }`) but read the stale internal field name
 * `.item` (only valid on the pre-normalization `{ item, amount, notes }`
 * shape). Every ingredient's name resolved to `""`, so `classifyRecipeDietary`
 * always saw only unmatched ingredients, forcing `confidence: "low"` and every
 * flag to `false` — rejecting every otherwise-valid recipe. Since allergen
 * checkboxes (dairy/gluten/nuts/shellfish/eggs) AND the vegetarian/vegan/
 * pork-free diet toggles all populate `dietary_restrictions`, this affected
 * every protein as soon as any one of those was selected (including via a
 * persisted prior session), matching the reported "every protein" symptom.
 *
 * Root cause #2 (server/routes.ts emergency-fallback catch blocks): the
 * exception-path re-validation of `req.body` skipped the same
 * `coerceGenerateRequestBody()` normalization the primary path uses, so any
 * request needing that coercion (e.g. `firehall_category: null`) failed
 * `safeParse` there even though it succeeded originally — silently dropping
 * `dietary_restrictions` in the fallback request and letting the "impossible
 * constraint" path serve a recipe that VIOLATES the user's hard dietary
 * restriction instead of a compliant recipe or a clean "no match".
 *
 * This script boots the real HTTP app (registerRoutes) on an ephemeral port
 * and drives it exactly like the browser client: fetch a CSRF token, then
 * POST /api/generate with a realistic browser User-Agent (curl/node's
 * default UA is blocked by the bot gate) for each scenario below.
 *
 *   npx tsx scripts/test-generate-dietary-regression.ts
 */
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
import { buildGenerateRequestInput } from "../shared/generate-request-defaults.js";
import type { GenerateRequest } from "../shared/schema.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`\u2713 PASS: ${name}`);
  } else {
    failed++;
    console.error(`\u2717 FAIL: ${name}${detail ? `\n    ${detail}` : ""}`);
  }
}

interface CookieJar {
  csrf?: string;
  cookieHeader: string;
}

function extractCookie(setCookieHeaders: string[], name: string): string | undefined {
  for (const raw of setCookieHeaders) {
    const [pair] = raw.split(";");
    const [k, v] = pair.split("=");
    if (k === name) return v;
  }
  return undefined;
}

async function getCsrf(baseUrl: string, jar: CookieJar): Promise<void> {
  const res = await fetch(`${baseUrl}/api/csrf-token`, {
    headers: { "User-Agent": UA, cookie: jar.cookieHeader },
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const csrfCookie = extractCookie(setCookie, "csrf_token");
  if (csrfCookie) {
    jar.cookieHeader = jar.cookieHeader
      ? `${jar.cookieHeader}; csrf_token=${csrfCookie}`
      : `csrf_token=${csrfCookie}`;
    jar.csrf = csrfCookie;
  }
  const body = (await res.json()) as { token: string };
  jar.csrf = jar.csrf || body.token;
}

interface GenResult {
  status: number;
  body: any;
}

async function callGenerate(
  baseUrl: string,
  jar: CookieJar,
  overrides: Partial<GenerateRequest>,
): Promise<GenResult> {
  await getCsrf(baseUrl, jar);
  const payload = {
    ...buildGenerateRequestInput(overrides),
    request_id: `regress-${Math.random().toString(36).slice(2)}`,
    generation_intent: "user",
    exclude_signatures: [],
    recentSignatures: [],
    recentSlugs: [],
    currentRecipeSignature: "",
  };
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      cookie: jar.cookieHeader,
      "X-CSRF-Token": jar.csrf || "",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * `spawn(..., { shell: true })` on Windows creates a cmd.exe -> npx -> node(tsx)
 * -> node(server) process chain. A plain `child.kill()` only signals the
 * immediate cmd.exe shell and leaves the actual dev server (and its own child
 * processes) running in the background. `taskkill /T` kills the whole tree.
 */
async function killProcessTree(child: ChildProcess): Promise<void> {
  if (!child.pid) return;
  if (process.platform === "win32") {
    await execFileAsync("taskkill", ["/PID", String(child.pid), "/T", "/F"]).catch(() => {});
  } else {
    child.kill("SIGTERM");
  }
  await new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    child.once("exit", () => resolve());
    setTimeout(resolve, 5000);
  });
}

function toFsPath(url: URL): string {
  return url.pathname.replace(/^\/([A-Za-z]:)/, "$1");
}

/** Boots the real dev server (identical to `npm run dev`) on an isolated port. */
async function startServer(port: number): Promise<ChildProcess> {
  const cwd = toFsPath(new URL("..", import.meta.url));
  const child = spawn("npx", ["tsx", "server/index.ts"], {
    cwd,
    env: { ...process.env, NODE_ENV: "development", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  await new Promise<void>((resolve, reject) => {
    let out = "";
    const onData = (chunk: Buffer) => {
      out += chunk.toString();
      if (out.includes("serving on port")) {
        child.stdout?.off("data", onData);
        child.stderr?.off("data", onData);
        resolve();
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.once("exit", (code) => {
      if (!out.includes("serving on port")) {
        reject(new Error(`Server exited early (code=${code}). Output:\n${out}`));
      }
    });
    setTimeout(() => reject(new Error(`Server did not start within 30s. Output so far:\n${out}`)), 30_000);
  });

  return child;
}

async function main() {
  const port = 5799 + Math.floor(Math.random() * 100);
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[test-generate-dietary-regression] Starting dev server on ${baseUrl} ...`);
  const server = await startServer(port);
  console.log(`[test-generate-dietary-regression] Server ready.\n`);

  try {
    // --- 1. Every protein, no dietary restriction (baseline — must never fail) ---
    const proteins: GenerateRequest["protein"][] = [
      "chicken",
      "beef",
      "pork",
      "turkey",
      "seafood",
      "vegetarian",
      "any",
    ];
    for (const protein of proteins) {
      const jar: CookieJar = { cookieHeader: "" };
      const isVeg = protein === "vegetarian";
      const { status, body } = await callGenerate(baseUrl, jar, {
        protein,
        crew_size: 8,
        time_available: "45-60",
        appliances: ["stove", "oven", "grill", "slow cooker", "air fryer", "smoker", "instant pot"],
        dietary_restrictions: isVeg ? ["vegetarian"] : [],
        vegetarian_swap_needed: isVeg,
      });
      check(
        `protein="${protein}" (no restrictions) generates a real recipe`,
        status === 200 && typeof body?.title === "string" && Array.isArray(body?.steps) && body.steps.length > 0,
        `status=${status} body=${JSON.stringify(body).slice(0, 200)}`,
      );
    }

    // --- 2. Guest session, chicken + a single allergen (regression case: this
    //        alone used to 503 for EVERY protein once any allergen/diet toggle
    //        was active, matching the reported "every protein" symptom). ---
    {
      const jar: CookieJar = { cookieHeader: "" };
      const { status, body } = await callGenerate(baseUrl, jar, {
        protein: "chicken",
        allergens_to_avoid: ["dairy"],
        dietary_restrictions: ["dairyFree"],
      });
      check(
        'guest + chicken + dairy-free allergen returns a valid recipe (not 503 generation_failed)',
        status === 200 && typeof body?.title === "string",
        `status=${status} body=${JSON.stringify(body).slice(0, 200)}`,
      );
    }

    // --- 3. Vegetarian + vegan diet toggle together ---
    {
      const jar: CookieJar = { cookieHeader: "" };
      const { status, body } = await callGenerate(baseUrl, jar, {
        protein: "vegetarian",
        dietary_restrictions: ["vegetarian", "vegan"],
        vegetarian_swap_needed: true,
      });
      check(
        "vegetarian + vegan diet returns a valid recipe",
        status === 200 && typeof body?.title === "string",
        `status=${status} body=${JSON.stringify(body).slice(0, 200)}`,
      );
    }

    // --- 4. Pork-free diet on a non-pork protein ---
    {
      const jar: CookieJar = { cookieHeader: "" };
      const { status, body } = await callGenerate(baseUrl, jar, {
        protein: "chicken",
        dietary_restrictions: ["porkFree"],
      });
      check(
        "chicken + pork-free diet returns a valid recipe",
        status === 200 && typeof body?.title === "string",
        `status=${status} body=${JSON.stringify(body).slice(0, 200)}`,
      );
    }

    // --- 5. Multiple stacked allergens on seafood ---
    {
      const jar: CookieJar = { cookieHeader: "" };
      const { status, body } = await callGenerate(baseUrl, jar, {
        protein: "seafood",
        allergens_to_avoid: ["dairy", "gluten", "eggs"],
        dietary_restrictions: ["dairyFree", "glutenFree", "eggFree"],
      });
      check(
        "seafood + dairy/gluten/egg-free stacked allergens returns a valid recipe",
        status === 200 && typeof body?.title === "string",
        `status=${status} body=${JSON.stringify(body).slice(0, 200)}`,
      );
    }

    // --- 6. Deliberately impossible constraint: vegan + tight time + multiple
    //        allergens. Must NEVER crash (5xx) and must NEVER violate the
    //        stated dietary restriction — either a genuinely compliant
    //        recipe, or a clean "no match", but never a diet-violating dish
    //        (regression check for root cause #2: the emergency-fallback
    //        path silently dropping dietary_restrictions). ---
    {
      const jar: CookieJar = { cookieHeader: "" };
      const { status, body } = await callGenerate(baseUrl, jar, {
        protein: "vegetarian",
        dietary_restrictions: ["vegetarian", "vegan"],
        allergens_to_avoid: ["shellfish", "nuts"],
        time_available: "15-25",
        vegetarian_swap_needed: true,
      });
      const isCleanNoMatch = status === 404 || body?.code === "no_match";
      const isServerCrash = status >= 500 && body?.code !== "generation_failed";
      check(
        "impossible vegan+tight-time+allergen combo never hard-crashes (5xx without a handled code)",
        !isServerCrash,
        `status=${status} body=${JSON.stringify(body).slice(0, 200)}`,
      );
      if (status === 200 && Array.isArray(body?.ingredients)) {
        const names: string[] = body.ingredients.map((i: any) => String(i?.name || "").toLowerCase());
        const joined = names.join(" | ");
        const meatWords = /\b(chicken|beef|pork|turkey|bacon|sausage|shrimp|salmon|fish|tuna|shellfish)\b/;
        const dairyWords = /\b(cheese|cream cheese|butter|milk|yogurt|sour cream)\b/;
        check(
          "when a recipe IS served for the impossible combo, it does not contain meat/fish (hard vegetarian/vegan violation)",
          !meatWords.test(joined),
          `ingredients=${joined}`,
        );
        check(
          "when a recipe IS served for the impossible combo, it does not contain dairy (hard vegan violation)",
          !dairyWords.test(joined),
          `ingredients=${joined}`,
        );
      } else {
        console.log(`    (impossible combo returned status=${status}, code=${body?.code} — no ingredient list to check)`);
      }
    }

    // --- 7. Contradictory protein/diet combo (seafood is never vegan) still
    //        resolves safely — either relaxes the soft protein pick or
    //        returns "no match", but never serves seafood while vegan was
    //        requested. ---
    {
      const jar: CookieJar = { cookieHeader: "" };
      const { status, body } = await callGenerate(baseUrl, jar, {
        protein: "seafood",
        dietary_restrictions: ["vegan"],
      });
      const isCrash = status >= 500 && body?.code !== "generation_failed";
      check(
        "contradictory seafood+vegan combo never hard-crashes",
        !isCrash,
        `status=${status} body=${JSON.stringify(body).slice(0, 200)}`,
      );
      if (status === 200 && Array.isArray(body?.ingredients)) {
        const names: string[] = body.ingredients.map((i: any) => String(i?.name || "").toLowerCase());
        const joined = names.join(" | ");
        const animalWords = /\b(chicken|beef|pork|turkey|bacon|sausage|shrimp|salmon|fish|tuna|shellfish|cheese|butter|milk|egg|honey)\b/;
        check(
          "contradictory seafood+vegan combo never serves a non-vegan recipe",
          !animalWords.test(joined),
          `ingredients=${joined}`,
        );
      }
    }
  } finally {
    await killProcessTree(server);
  }

  console.log(`\n${failed === 0 ? "ALL CHECKS PASSED" : `${failed} CHECK(S) FAILED`}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[test-generate-dietary-regression] Fatal error:", err);
  process.exit(1);
});
