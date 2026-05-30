import type { Express, Request, Response, NextFunction } from "express";
import { SEO_CANONICAL_ORIGIN } from "../shared/seo/constants.js";

const CANONICAL_HOST = new URL(SEO_CANONICAL_ORIGIN).hostname.toLowerCase();
const APEX_HOST = CANONICAL_HOST.replace(/^www\./, "");

/** 301 redirect bare domain and HTTP to https://www.firehallmeals.com (production only). */
export function enforceCanonicalHostRedirect(app: Express): void {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV !== "production") {
      return next();
    }

    const forwardedHost = req.headers["x-forwarded-host"];
    const hostHeader =
      (typeof forwardedHost === "string" ? forwardedHost.split(",")[0]?.trim() : undefined) ||
      req.headers.host ||
      "";
    const hostname = hostHeader.split(":")[0]?.toLowerCase() ?? "";

    if (!hostname.endsWith(APEX_HOST)) {
      return next();
    }

    const forwardedProto = req.headers["x-forwarded-proto"];
    const proto =
      (typeof forwardedProto === "string" ? forwardedProto.split(",")[0]?.trim().toLowerCase() : undefined) ||
      req.protocol;

    const needsHttps = proto !== "https";
    const needsWww = hostname === APEX_HOST;

    if (!needsHttps && !needsWww) {
      return next();
    }

    const targetHost = needsWww ? CANONICAL_HOST : hostname;
    const path = req.originalUrl || "/";
    return res.redirect(301, `https://${targetHost}${path}`);
  });
}
