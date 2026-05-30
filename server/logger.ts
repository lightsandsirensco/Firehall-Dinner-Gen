/**
 * S10 — structured production logging.
 * Set DEBUG_LOGS=true for verbose diagnostics (full filter dumps, raw AI snippets).
 */

export function isDebugLogs(): boolean {
  const v = (process.env.DEBUG_LOGS || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

const HTTP_SLOW_MS = parseInt(process.env.HTTP_SLOW_MS || "800", 10);

/** Production: log slow API calls, errors, and generate — skip noisy hero polls */
export function shouldLogHttpRequest(
  path: string,
  statusCode: number,
  durationMs: number,
): boolean {
  if (!isProductionEnv()) return path.startsWith("/api");
  if (statusCode >= 400) return true;
  if (durationMs >= HTTP_SLOW_MS) return true;
  if (path.startsWith("/api/recipe-hero/")) return false;
  if (path.startsWith("/api/generate") || path.startsWith("/api/generate-pizza")) return true;
  if (path.startsWith("/api/explore/sections")) return durationMs >= 400;
  return durationMs >= HTTP_SLOW_MS;
}

/** key=value pairs for concise structured lines */
export function formatLogFields(
  fields: Record<string, string | number | boolean | null | undefined>,
): string {
  return Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => {
      const s = String(v).replace(/"/g, "'");
      if (s.includes(" ") || s.includes("=")) return `${k}="${s}"`;
      return `${k}=${s}`;
    })
    .join(" ");
}

function formatTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function log(message: string, source = "express"): void {
  console.log(`${formatTime()} [${source}] ${message}`);
}

/** Only emitted when DEBUG_LOGS is enabled */
export function logVerbose(message: string, source = "debug"): void {
  if (isDebugLogs()) log(message, source);
}

export function logError(
  source: string,
  message: string,
  err?: unknown,
): void {
  const errMsg =
    err instanceof Error
      ? err.message
      : err != null
        ? String(err)
        : "";
  const line = errMsg ? `${message} err=${errMsg}` : message;
  console.error(`${formatTime()} [${source}] ${line}`);
}

/** Truncate user/API text for safe log inclusion */
export function clip(text: string, max = 80): string {
  if (!text) return "";
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/** Redact email local-part for production-safe logs */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  if (at === 1) return `*${email.slice(at)}`;
  return `${email[0]}***${email.slice(at)}`;
}

/** Cap validation / error reason lists in log lines */
export function clipReasons(reasons: string[], maxItems = 5, maxLen = 120): string {
  if (reasons.length === 0) return "";
  const head = reasons.slice(0, maxItems);
  let s = head.join(", ");
  if (reasons.length > maxItems) s += ` +${reasons.length - maxItems} more`;
  return clip(s, maxLen);
}

export function summarizeJsonBody(
  path: string,
  body: Record<string, unknown>,
): string {
  if (path.includes("/api/generate")) {
    return formatLogFields({
      title: clip(String(body.title || ""), 60),
      template_id: body.template_id as number | undefined,
      source: body._source as string | undefined,
      fallback: body._fallback === true,
      sig: body._signature
        ? clip(String(body._signature), 12)
        : undefined,
    });
  }
  if (path.includes("/api/generate-pizza")) {
    return formatLogFields({
      title: clip(String(body.title || body.pizza_style_id || ""), 40),
      style: body.pizza_style_id as string | undefined,
    });
  }
  if (path.includes("/explore") || path.includes("/search")) {
    const results = body.results;
    return formatLogFields({
      count: Array.isArray(results) ? results.length : undefined,
      total: body.totalResults as number | undefined,
      source: body._source as string | undefined,
    });
  }
  if (path.includes("/hall-vote")) {
    return formatLogFields({
      voteId: clip(String(body.voteId || body.id || ""), 24),
      status: body.status as string | undefined,
    });
  }
  if (path.includes("/email-shopping-list")) {
    const sections = body.shopping_list_sections;
    return formatLogFields({
      title: clip(String(body.recipe_title || ""), 50),
      sections: Array.isArray(sections) ? sections.length : undefined,
      ok: body.success === true,
    });
  }
  if (path.includes("/email-recipe")) {
    const ings = body.ingredients;
    const steps = body.steps;
    return formatLogFields({
      title: clip(String(body.recipe_title || ""), 50),
      ingredients: Array.isArray(ings) ? ings.length : undefined,
      steps: Array.isArray(steps) ? steps.length : undefined,
      ok: body.success === true,
    });
  }
  if (path.includes("/lead-magnet/red-lead")) {
    return formatLogFields({
      magnet: "red-lead-recipe",
      ok: body.success === true,
    });
  }
  if (typeof body.message === "string") {
    return formatLogFields({ message: clip(body.message, 120) });
  }
  if (typeof body.status === "string") {
    return formatLogFields({ status: body.status });
  }
  const keys = Object.keys(body);
  if (keys.length <= 6) {
    return formatLogFields(
      Object.fromEntries(keys.map((k) => [k, typeof body[k]])),
    );
  }
  return formatLogFields({ keys: keys.length });
}
