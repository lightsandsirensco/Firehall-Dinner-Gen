/**
 * Production error monitoring — in-memory ring buffer + structured client reports.
 */
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { log, logError, formatLogFields } from "../logger.js";
import { requireAdmin } from "../admin-auth.js";

export interface ErrorEvent {
  id: string;
  at: string;
  source: "server" | "client";
  message: string;
  stack?: string;
  requestId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  componentStack?: string;
  userAgent?: string;
}

const MAX_EVENTS = 200;
const events: ErrorEvent[] = [];

function pushEvent(event: Omit<ErrorEvent, "id" | "at">): ErrorEvent {
  const full: ErrorEvent = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    ...event,
  };
  events.unshift(full);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  return full;
}

export function recordServerError(
  err: unknown,
  ctx: { requestId?: string; path?: string; method?: string; statusCode?: number },
): ErrorEvent {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  const event = pushEvent({
    source: "server",
    message,
    stack,
    requestId: ctx.requestId,
    path: ctx.path,
    method: ctx.method,
    statusCode: ctx.statusCode,
  });
  logError(
    "monitor",
    formatLogFields({
      rid: ctx.requestId,
      path: ctx.path,
      method: ctx.method,
      status: ctx.statusCode,
      msg: message.slice(0, 120),
    }),
    err,
  );
  return event;
}

export function getRecentErrors(limit = 50): ErrorEvent[] {
  return events.slice(0, Math.min(limit, events.length));
}

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: () => void): void {
  const incoming = req.headers["x-request-id"];
  const requestId =
    typeof incoming === "string" && incoming.trim()
      ? incoming.trim().slice(0, 64)
      : crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

export function registerMonitoringRoutes(app: Express): void {
  app.post("/api/client-errors", (req: Request, res: Response) => {
    const body = req.body as {
      message?: string;
      stack?: string;
      componentStack?: string;
      path?: string;
    };
    if (!body?.message || typeof body.message !== "string") {
      return res.status(400).json({ message: "message required" });
    }
    pushEvent({
      source: "client",
      message: body.message.slice(0, 2000),
      stack: typeof body.stack === "string" ? body.stack.slice(0, 8000) : undefined,
      componentStack:
        typeof body.componentStack === "string" ? body.componentStack.slice(0, 4000) : undefined,
      path: typeof body.path === "string" ? body.path.slice(0, 500) : undefined,
      requestId: req.requestId,
      userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
    });
    return res.status(204).end();
  });

  app.get("/api/admin/errors", requireAdmin, (req: Request, res: Response) => {
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
    return res.json({ errors: getRecentErrors(limit), total: events.length });
  });
}
