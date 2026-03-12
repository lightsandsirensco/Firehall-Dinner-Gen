import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";
import { log } from "./index";
import type { GenerateResponse, GenerateRequest } from "@shared/schema";

const DB_PATH = path.join(process.cwd(), "data", "cache.db");
let db: Database.Database;

export function initCacheStore() {
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS recipe_cache (
      cache_key TEXT PRIMARY KEY,
      template_id INTEGER NOT NULL,
      recipe_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      hit_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
    CREATE INDEX IF NOT EXISTS idx_rate_limits_ts ON rate_limits(timestamp);

    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      cache_key TEXT,
      template_id INTEGER,
      cache_hit INTEGER NOT NULL DEFAULT 0,
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      estimated_cost_usd REAL DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      ip_hash TEXT,
      session_id TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_spend (
      date TEXT PRIMARY KEY,
      total_cost_usd REAL NOT NULL DEFAULT 0,
      llm_calls INTEGER NOT NULL DEFAULT 0,
      cache_hits INTEGER NOT NULL DEFAULT 0
    );
  `);

  log("Cache store initialized", "cache");
}

export function buildCacheKey(templateId: string, request: GenerateRequest, chosenProtein?: string): string {
  const keyData = JSON.stringify({
    template_id: templateId,
    crew_size: request.crew_size,
    busy_level: request.busy_level,
    time_available: request.time_available,
    appliances: [...request.appliances].sort(),
    chosen_protein: chosenProtein || request.protein,
    healthiness_preference: request.healthiness_preference,
    allergens_to_avoid: [...request.allergens_to_avoid].sort(),
    vegetarian_swap_needed: !!request.vegetarian_swap_needed,
    budget_level: request.budget_level || "standard",
    cuisine_style: request.cuisine_style || "any",
    use_what_we_have: !!request.use_what_we_have,
    ingredients_on_hand: request.ingredients_on_hand ? [...request.ingredients_on_hand].sort() : [],
  });
  return crypto.createHash("sha256").update(keyData).digest("hex").substring(0, 32);
}

export function buildPizzaCacheKey(conceptId: string, request: any): string {
  const keyData = JSON.stringify({
    type: "pizza",
    concept: conceptId,
    crew_size: request.crew_size,
    time_available: request.time_available,
    dough_option: request.dough_option,
    style_preference: request.style_preference,
    heat_level: request.heat_level,
    allergens_to_avoid: [...(request.allergens_to_avoid || [])].sort(),
    vegetarian_swap_needed: !!request.vegetarian_swap_needed,
  });
  return crypto.createHash("sha256").update(keyData).digest("hex").substring(0, 32);
}

export function getCachedRecipe(cacheKey: string): GenerateResponse | null {
  const row = db.prepare("SELECT recipe_json FROM recipe_cache WHERE cache_key = ?").get(cacheKey) as any;
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.recipe_json);
    db.prepare("UPDATE recipe_cache SET hit_count = hit_count + 1 WHERE cache_key = ?").run(cacheKey);
    return parsed;
  } catch {
    db.prepare("DELETE FROM recipe_cache WHERE cache_key = ?").run(cacheKey);
    return null;
  }
}

export function getCachedPizzaRecipe(cacheKey: string): any | null {
  const row = db.prepare("SELECT recipe_json FROM recipe_cache WHERE cache_key = ?").get(cacheKey) as any;
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.recipe_json);
    const hasBadIngredients = parsed.ingredients?.sauce && Array.isArray(parsed.ingredients.sauce) && parsed.ingredients.sauce.length > 0 && typeof parsed.ingredients.sauce[0] === "string";
    const hasBadSafety = Array.isArray(parsed.protein_safety) && parsed.protein_safety.length > 0 && typeof parsed.protein_safety[0] === "string";
    if (hasBadIngredients || hasBadSafety) {
      db.prepare("DELETE FROM recipe_cache WHERE cache_key = ?").run(cacheKey);
      return null;
    }
    db.prepare("UPDATE recipe_cache SET hit_count = hit_count + 1 WHERE cache_key = ?").run(cacheKey);
    return parsed;
  } catch {
    db.prepare("DELETE FROM recipe_cache WHERE cache_key = ?").run(cacheKey);
    return null;
  }
}

export function setCachedRecipe(cacheKey: string, templateId: number, recipe: GenerateResponse) {
  db.prepare(`
    INSERT OR REPLACE INTO recipe_cache (cache_key, template_id, recipe_json, created_at, hit_count)
    VALUES (?, ?, ?, datetime('now'), 0)
  `).run(cacheKey, templateId, JSON.stringify(recipe));
}

export function setCachedPizzaRecipe(cacheKey: string, recipe: any) {
  db.prepare(`
    INSERT OR REPLACE INTO recipe_cache (cache_key, template_id, recipe_json, created_at, hit_count)
    VALUES (?, ?, ?, datetime('now'), 0)
  `).run(cacheKey, 0, JSON.stringify(recipe));
}

export function checkRateLimit(key: string, windowMs: number, maxRequests: number): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  const txn = db.transaction(() => {
    db.prepare("DELETE FROM rate_limits WHERE timestamp < ?").run(windowStart);

    const count = (db.prepare("SELECT COUNT(*) as cnt FROM rate_limits WHERE key = ? AND timestamp >= ?").get(key, windowStart) as any).cnt;

    if (count >= maxRequests) {
      const oldest = db.prepare("SELECT MIN(timestamp) as ts FROM rate_limits WHERE key = ? AND timestamp >= ?").get(key, windowStart) as any;
      const resetAt = oldest?.ts ? (oldest.ts + windowMs - now) : windowMs;
      return { allowed: false, remaining: 0, resetMs: Math.max(0, resetAt) };
    }

    return { allowed: true, remaining: maxRequests - count, resetMs: windowMs };
  });

  return txn() as { allowed: boolean; remaining: number; resetMs: number };
}

export function recordRateLimit(key: string): void {
  db.prepare("INSERT INTO rate_limits (key, timestamp) VALUES (?, ?)").run(key, Date.now());
}

const idempotencyStore = new Map<string, { requestIds: string[]; lastSignature: string; pendingIds: Set<string> }>();
const IDEMPOTENCY_MAX_IDS = 20;

export function checkAndReserveRequest(sessionKey: string, requestId: string): { isDuplicate: boolean; isInFlight: boolean } {
  let entry = idempotencyStore.get(sessionKey);
  if (!entry) {
    entry = { requestIds: [], lastSignature: "", pendingIds: new Set() };
    idempotencyStore.set(sessionKey, entry);
  }

  if (entry.requestIds.includes(requestId)) {
    return { isDuplicate: true, isInFlight: false };
  }

  if (entry.pendingIds.has(requestId)) {
    return { isDuplicate: false, isInFlight: true };
  }

  entry.pendingIds.add(requestId);
  return { isDuplicate: false, isInFlight: false };
}

export function finalizeRequest(sessionKey: string, requestId: string, signature: string): { sameSignature: boolean } {
  let entry = idempotencyStore.get(sessionKey);
  if (!entry) {
    entry = { requestIds: [], lastSignature: "", pendingIds: new Set() };
    idempotencyStore.set(sessionKey, entry);
  }

  entry.pendingIds.delete(requestId);

  const sameSignature = signature === entry.lastSignature && signature !== "";

  entry.requestIds.push(requestId);
  if (entry.requestIds.length > IDEMPOTENCY_MAX_IDS) {
    entry.requestIds.shift();
  }
  entry.lastSignature = signature;

  return { sameSignature };
}

export function cancelRequest(sessionKey: string, requestId: string): void {
  const entry = idempotencyStore.get(sessionKey);
  if (entry) {
    entry.pendingIds.delete(requestId);
  }
}

setInterval(() => {
  if (idempotencyStore.size > 10000) {
    const keys = Array.from(idempotencyStore.keys());
    for (let i = 0; i < keys.length - 5000; i++) {
      idempotencyStore.delete(keys[i]);
    }
  }
  if (sessionSignatureStore.size > 5000) {
    const keys = Array.from(sessionSignatureStore.keys());
    for (let i = 0; i < keys.length - 2500; i++) {
      sessionSignatureStore.delete(keys[i]);
    }
  }
}, 600_000);

const SESSION_MAX_SIGNATURES = 15;
const sessionSignatureStore = new Map<string, string[]>();

export function getSessionSignatures(sessionKey: string): string[] {
  return sessionSignatureStore.get(sessionKey) || [];
}

export function addSessionSignature(sessionKey: string, sig: string): void {
  let sigs = sessionSignatureStore.get(sessionKey);
  if (!sigs) {
    sigs = [];
    sessionSignatureStore.set(sessionKey, sigs);
  }
  if (!sigs.includes(sig)) {
    sigs.push(sig);
    if (sigs.length > SESSION_MAX_SIGNATURES) {
      sigs.shift();
    }
  }
}

export function isRecentSessionSignature(sessionKey: string, sig: string): boolean {
  const sigs = sessionSignatureStore.get(sessionKey) || [];
  return sigs.includes(sig);
}

export function getLastSessionSignature(sessionKey: string): string {
  const sigs = sessionSignatureStore.get(sessionKey) || [];
  return sigs.length > 0 ? sigs[sigs.length - 1] : "";
}

export function logUsage(entry: {
  cacheKey: string;
  templateId: number;
  cacheHit: boolean;
  tokensIn?: number;
  tokensOut?: number;
  estimatedCost?: number;
  latencyMs: number;
  ipHash: string;
  sessionId: string;
}) {
  db.prepare(`
    INSERT INTO usage_logs (cache_key, template_id, cache_hit, tokens_in, tokens_out, estimated_cost_usd, latency_ms, ip_hash, session_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.cacheKey,
    entry.templateId,
    entry.cacheHit ? 1 : 0,
    entry.tokensIn || 0,
    entry.tokensOut || 0,
    entry.estimatedCost || 0,
    entry.latencyMs,
    entry.ipHash,
    entry.sessionId
  );

  const today = new Date().toISOString().split("T")[0];
  db.prepare(`
    INSERT INTO daily_spend (date, total_cost_usd, llm_calls, cache_hits)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      total_cost_usd = daily_spend.total_cost_usd + excluded.total_cost_usd,
      llm_calls = daily_spend.llm_calls + excluded.llm_calls,
      cache_hits = daily_spend.cache_hits + excluded.cache_hits
  `).run(
    today,
    entry.estimatedCost || 0,
    entry.cacheHit ? 0 : 1,
    entry.cacheHit ? 1 : 0
  );
}

export function getDailySpend(): number {
  const today = new Date().toISOString().split("T")[0];
  const row = db.prepare("SELECT total_cost_usd FROM daily_spend WHERE date = ?").get(today) as any;
  return row?.total_cost_usd || 0;
}

export function getUsageStats() {
  const today = new Date().toISOString().split("T")[0];

  const todayStats = db.prepare("SELECT * FROM daily_spend WHERE date = ?").get(today) as any || {
    date: today, total_cost_usd: 0, llm_calls: 0, cache_hits: 0
  };

  const last7Days = db.prepare(`
    SELECT date, total_cost_usd, llm_calls, cache_hits
    FROM daily_spend
    ORDER BY date DESC
    LIMIT 7
  `).all();

  const cacheStats = db.prepare(`
    SELECT COUNT(*) as total_cached, SUM(hit_count) as total_hits
    FROM recipe_cache
  `).get() as any;

  const recentLogs = db.prepare(`
    SELECT * FROM usage_logs
    ORDER BY id DESC
    LIMIT 50
  `).all();

  const topIps = db.prepare(`
    SELECT ip_hash, COUNT(*) as request_count
    FROM usage_logs
    WHERE timestamp >= datetime('now', '-24 hours')
    GROUP BY ip_hash
    ORDER BY request_count DESC
    LIMIT 10
  `).all();

  const topSessions = db.prepare(`
    SELECT session_id, COUNT(*) as request_count
    FROM usage_logs
    WHERE timestamp >= datetime('now', '-24 hours')
    GROUP BY session_id
    ORDER BY request_count DESC
    LIMIT 10
  `).all();

  return {
    today: todayStats,
    last7Days,
    cache: {
      totalCached: cacheStats?.total_cached || 0,
      totalHits: cacheStats?.total_hits || 0,
    },
    recentLogs,
    topIps,
    topSessions,
  };
}

export function getCacheCount(): number {
  const row = db.prepare("SELECT COUNT(*) as cnt FROM recipe_cache").get() as any;
  return row?.cnt || 0;
}

export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + "lights-sirens-salt").digest("hex").substring(0, 12);
}

export interface TrendingRecipeRow {
  title: string;
  chosen_protein: string;
  hit_count: number;
  recipe_json: string;
}

export function getTopCachedRecipes(limit: number = 20): TrendingRecipeRow[] {
  const rows = db.prepare(`
    SELECT recipe_json, hit_count
    FROM recipe_cache
    WHERE hit_count >= 2
    ORDER BY hit_count DESC
    LIMIT ?
  `).all(limit) as { recipe_json: string; hit_count: number }[];
  return rows.map(row => {
    try {
      const parsed = JSON.parse(row.recipe_json);
      return {
        title: parsed.title || "",
        chosen_protein: parsed.chosen_protein || "",
        hit_count: row.hit_count,
        recipe_json: row.recipe_json,
      };
    } catch {
      return { title: "", chosen_protein: "", hit_count: row.hit_count, recipe_json: row.recipe_json };
    }
  }).filter(r => r.title);
}

export interface VotedRecipe {
  name: string;
  votes: number;
}

export function getVotedRecipeNames(): VotedRecipe[] {
  try {
    const rows = db.prepare(`
      SELECT options_json, total_votes
      FROM hall_votes
      WHERE total_votes > 0
      ORDER BY total_votes DESC
      LIMIT 10
    `).all() as { options_json: string; total_votes: number }[];
    const results: VotedRecipe[] = [];
    for (const row of rows) {
      try {
        const opts = JSON.parse(row.options_json);
        const perOption = Math.max(1, Math.ceil(row.total_votes / opts.length));
        for (const opt of opts) {
          if (opt.name) results.push({ name: opt.name, votes: perOption });
        }
      } catch {}
    }
    return results;
  } catch {
    return [];
  }
}
