#!/usr/bin/env tsx
/**
 * HTTP smoke test for POST /api/generate (guest, CSRF, common payloads).
 * Usage: npx tsx scripts/http-generate-smoke.ts [baseUrl]
 */
import { inferBusyLevelFromTime } from "../shared/busy-level.js";

const base = process.argv[2] || "http://127.0.0.1:5000";

type Case = { label: string; patch?: Record<string, unknown> };

const cases: Case[] = [
  { label: "default" },
  { label: "healthy_options", patch: { firehall_category: "healthy_options" } },
  { label: "bbq_smoker", patch: { firehall_category: "bbq_smoker" } },
  { label: "crew_10", patch: { crew_size: 10 } },
  { label: "bad_healthy_alias", patch: { firehall_category: "healthy" } },
  { label: "bad_all_alias", patch: { firehall_category: "all" } },
  { label: "empty_appliances", patch: { appliances: [] } },
];

function parseSetCookie(res: Response, jar: Map<string, string>): void {
  const headers = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();
  if (headers?.length) {
    for (const line of headers) {
      const [pair] = line.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
    return;
  }
  const single = res.headers.get("set-cookie");
  if (!single) return;
  for (const part of single.split(/,(?=[^;]+?=)/)) {
    const [pair] = part.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function runCase(test: Case): Promise<void> {
  const jar = new Map<string, string>();
  const csrfRes = await fetch(`${base}/api/csrf-token`, {
    headers: { cookie: cookieHeader(jar), "User-Agent": "Mozilla/5.0 FirehallHttpSmoke" },
  });
  parseSetCookie(csrfRes, jar);
  const csrf = jar.get("csrf_token") || "";
  const json = (await csrfRes.json()) as { token?: string };
  const token = csrf || json.token || "";

  const body = {
    crew_size: 6,
    busy_level: inferBusyLevelFromTime("25-40"),
    time_available: "25-40",
    appliances: ["stove", "oven"],
    protein: "any",
    healthiness_preference: "balanced",
    budget_level: "standard",
    cuisine_style: "any",
    meal_format: "random",
    allergens_to_avoid: [],
    vegetarian_swap_needed: false,
    use_what_we_have: false,
    ingredients_on_hand: [],
    recent_meal_styles: [],
    prefer_different_style: false,
    recentSignatures: [],
    request_id: `smoke-${test.label}-${Date.now()}`,
    generation_intent: "user",
    ...test.patch,
  };

  const res = await fetch(`${base}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
      cookie: cookieHeader(jar),
      "User-Agent": "Mozilla/5.0 FirehallHttpSmoke",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* ignore */
  }

  const steps = data?.steps;
  const stepCount = Array.isArray(steps) ? steps.length : -1;
  const title = typeof data?.title === "string" ? data.title : "";
  const code = typeof data?.code === "string" ? data.code : "";
  const message = typeof data?.message === "string" ? data.message.slice(0, 100) : "";

  console.log(
    `[http-generate-smoke] ${test.label}: status=${res.status} title=${title ? `"${title.slice(0, 40)}"` : "—"} steps=${stepCount} code=${code || "—"} ${message}`,
  );

  if (res.status !== 200) {
    throw new Error(`${test.label}: expected 200, got ${res.status} (${code || message})`);
  }
  if (!title || stepCount <= 0) {
    throw new Error(`${test.label}: 200 but incomplete recipe`);
  }
}

let failed = 0;
for (const test of cases) {
  try {
    await runCase(test);
  } catch (err) {
    failed++;
    console.error(`[http-generate-smoke] ${test.label} FAILED:`, err);
  }
}

if (failed > 0) process.exit(1);
console.log("[http-generate-smoke] OK");
