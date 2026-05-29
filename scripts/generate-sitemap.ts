#!/usr/bin/env tsx
/**
 * Write static sitemap.xml + robots.txt to client/public (also served dynamically in production).
 *
 *   npx tsx scripts/generate-sitemap.ts
 *   PUBLIC_SITE_URL=https://example.com npx tsx scripts/generate-sitemap.ts
 */
import fs from "node:fs";
import path from "node:path";
import { buildRobotsTxt, buildSitemapXml, resolvePublicSiteOrigin } from "../server/seo/sitemap.js";

const outDir = path.join(process.cwd(), "client", "public");
const origin = resolvePublicSiteOrigin();

fs.mkdirSync(outDir, { recursive: true });

const sitemap = buildSitemapXml(origin);
const robots = buildRobotsTxt(origin);

fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap, "utf8");
fs.writeFileSync(path.join(outDir, "robots.txt"), robots, "utf8");

const urlCount = (sitemap.match(/<loc>/g) ?? []).length;
console.log(`[sitemap] wrote client/public/sitemap.xml (${urlCount} URLs, origin=${origin})`);
console.log(`[sitemap] wrote client/public/robots.txt`);
