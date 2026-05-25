import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { log, logError, summarizeJsonBody, shouldLogHttpRequest } from "./logger";
import { configureTrustProxy } from "./client-ip.js";

export {
  log,
  logVerbose,
  logError,
  isDebugLogs,
  isProductionEnv,
  formatLogFields,
  clip,
  clipReasons,
  maskEmail,
  summarizeJsonBody,
} from "./logger";

const app = express();
const httpServer = createServer(app);

configureTrustProxy(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const isProduction = process.env.NODE_ENV === "production";

app.use(
  helmet({
    contentSecurityPolicy: isProduction,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

const jsonBodyLimit = process.env.JSON_BODY_LIMIT || "256kb";

app.use(
  express.json({
    limit: jsonBodyLimit,
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: jsonBodyLimit }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    if (bodyJson && typeof bodyJson === "object" && !Array.isArray(bodyJson)) {
      capturedJsonResponse = bodyJson as Record<string, unknown>;
    }
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (!shouldLogHttpRequest(path, res.statusCode, duration)) return;
    const summary = capturedJsonResponse
      ? summarizeJsonBody(path, capturedJsonResponse)
      : "";
    const line = summary
      ? `${req.method} ${path} ${res.statusCode} ${duration}ms ${summary}`
      : `${req.method} ${path} ${res.statusCode} ${duration}ms`;
    log(line, "http");
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as { status?: number; statusCode?: number; message?: string; type?: string };
    if (error.type === "entity.too.large") {
      return res.status(413).json({ message: "Request body is too large." });
    }
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    logError("express", "Internal Server Error", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });

  const shutdown = (signal: string) => {
    log(`${signal} received. Shutting down gracefully...`, "system");
    httpServer.close(() => {
      log("HTTP server closed.", "system");
      process.exit(0);
    });
    setTimeout(() => {
      log("Forcefully shutting down after 10s timeout.", "system");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
