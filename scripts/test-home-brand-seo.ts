#!/usr/bin/env tsx
/**
 * Homepage + brand metadata guard.
 *
 * Static (always): the homepage description, brand name and share image in
 * `client/index.html`, the PWA manifest (`vite.config.ts`) and the shared SEO
 * constants agree, and every favicon/PWA icon referenced exists at its
 * declared size.
 *
 * Live (when TARGET_BASE_URL is set): the server-rendered homepage has exactly
 * one of each head tag, one H1, correct brand names in Organization/WebSite
 * schema, no duplicate JSON-LD types, and is indexable.
 *
 *   npx tsx scripts/test-home-brand-seo.ts
 *   TARGET_BASE_URL=http://localhost:5051 npx tsx scripts/test-home-brand-seo.ts
 */
import fs from "node:fs";
import path from "node:path";
import {
  SEO_BRAND,
  SEO_BRAND_SHARE_IMAGE_HEIGHT,
  SEO_BRAND_SHARE_IMAGE_PATH,
  SEO_BRAND_SHARE_IMAGE_READY,
  SEO_BRAND_SHARE_IMAGE_WIDTH,
  SEO_CANONICAL_ORIGIN,
  SEO_DEFAULT_DESCRIPTION,
  SEO_DEFAULT_TITLE,
  SEO_HOME_H1,
  SEO_SITE_NAME,
  SEO_SITE_SHARE_IMAGE_PATH,
} from "../shared/seo/constants.js";

const root = process.cwd();
const publicDir = path.join(root, "client", "public");
const problems: string[] = [];
const fail = (msg: string) => problems.push(msg);

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function pngSize(file: string): { width: number; height: number } | null {
  const buf = fs.readFileSync(file);
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function metaContents(html: string, attr: "name" | "property", key: string): string[] {
  const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`, "g");
  return [...html.matchAll(re)].map((m) => decodeEntities(m[1]!));
}

function jsonLdNodes(html: string): Array<Record<string, unknown>> {
  const stripped = html.replace(/<!--[\s\S]*?-->/g, "");
  const nodes: Array<Record<string, unknown>> = [];
  for (const m of stripped.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    const parsed = JSON.parse(m[1]!);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    for (const block of list) {
      const graph = (block as { "@graph"?: unknown[] })["@graph"];
      nodes.push(...((graph ?? [block]) as Array<Record<string, unknown>>));
    }
  }
  return nodes;
}

function checkBrandSchema(nodes: Array<Record<string, unknown>>, where: string): void {
  for (const type of ["Organization", "WebSite"]) {
    const matches = nodes.filter((n) => n["@type"] === type);
    if (matches.length !== 1) fail(`${where}: expected 1 ${type} schema, got ${matches.length}`);
    for (const n of matches) {
      if (n.name !== SEO_SITE_NAME) fail(`${where}: ${type} name "${String(n.name)}"`);
      if (n.description !== SEO_DEFAULT_DESCRIPTION) fail(`${where}: ${type} description is stale`);
    }
  }
}

// ── Static checks ────────────────────────────────────────────────────────
const indexHtml = fs.readFileSync(path.join(root, "client", "index.html"), "utf8");
const shareUrl = `${SEO_CANONICAL_ORIGIN}${SEO_SITE_SHARE_IMAGE_PATH}`;

const staticTags: Array<[string, string[], string]> = [
  ["meta description", metaContents(indexHtml, "name", "description"), SEO_DEFAULT_DESCRIPTION],
  ["og:description", metaContents(indexHtml, "property", "og:description"), SEO_DEFAULT_DESCRIPTION],
  ["twitter:description", metaContents(indexHtml, "name", "twitter:description"), SEO_DEFAULT_DESCRIPTION],
  ["og:title", metaContents(indexHtml, "property", "og:title"), SEO_DEFAULT_TITLE],
  ["twitter:title", metaContents(indexHtml, "name", "twitter:title"), SEO_DEFAULT_TITLE],
  ["og:site_name", metaContents(indexHtml, "property", "og:site_name"), SEO_SITE_NAME],
  ["og:image", metaContents(indexHtml, "property", "og:image"), shareUrl],
  ["twitter:image", metaContents(indexHtml, "name", "twitter:image"), shareUrl],
];
for (const [label, values, expected] of staticTags) {
  if (values.length !== 1 || values[0] !== expected) {
    fail(`index.html ${label}: expected 1 × "${expected}", got ${JSON.stringify(values)}`);
  }
}
const staticTitle = indexHtml.match(/<title>([\s\S]*?)<\/title>/)?.[1];
if (decodeEntities(staticTitle ?? "") !== SEO_DEFAULT_TITLE) fail(`index.html <title> "${staticTitle}"`);
checkBrandSchema(jsonLdNodes(indexHtml), "index.html fallback JSON-LD");

const viteConfig = fs.readFileSync(path.join(root, "vite.config.ts"), "utf8");
const manifestBlock = viteConfig.match(/manifest:\s*\{([\s\S]*?)\n\s{6}\},/)?.[1] ?? "";
if (!manifestBlock) fail("vite.config.ts: manifest block not found");
if (!manifestBlock.includes(`name: "${SEO_SITE_NAME}"`)) fail("manifest name is not the public brand name");
if (!manifestBlock.includes(`"${SEO_DEFAULT_DESCRIPTION}"`)) fail("manifest description is stale");

const brandFile = path.join(publicDir, SEO_BRAND_SHARE_IMAGE_PATH);
if (SEO_BRAND_SHARE_IMAGE_READY) {
  if (!fs.existsSync(brandFile)) fail(`brand share image missing: ${brandFile}`);
  else {
    const size = pngSize(brandFile);
    if (size?.width !== SEO_BRAND_SHARE_IMAGE_WIDTH || size?.height !== SEO_BRAND_SHARE_IMAGE_HEIGHT) {
      fail(`brand share image is ${size?.width}x${size?.height}, expected 1200x630`);
    }
  }
} else if (fs.existsSync(brandFile)) {
  fail(`brand share image now exists — set SEO_BRAND_SHARE_IMAGE_READY = true and update index.html og/twitter:image`);
} else if (!fs.existsSync(path.join(publicDir, SEO_SITE_SHARE_IMAGE_PATH))) {
  fail(`fallback share image missing: ${SEO_SITE_SHARE_IMAGE_PATH}`);
}

const expectedIcons: Array<[string, number | null]> = [
  ["/favicon.ico", null],
  ["/pwa/icon.svg", null],
  ["/pwa/icon-192.png", 192],
  ["/pwa/icon-512.png", 512],
  ["/pwa/icon-maskable-512.png", 512],
  ["/pwa/apple-touch-icon.png", 180],
];
for (const [href, size] of expectedIcons) {
  const file = path.join(publicDir, href);
  if (!fs.existsSync(file)) {
    fail(`icon missing: client/public${href}`);
    continue;
  }
  if (size !== null) {
    const dims = pngSize(file);
    if (dims?.width !== size || dims?.height !== size) fail(`${href} is ${dims?.width}x${dims?.height}, expected ${size}x${size}`);
  }
  const rel = href.slice(1);
  const referenced = indexHtml.includes(`href="${href}"`) || manifestBlock.includes(`"${rel}"`);
  if (!referenced) fail(`${href} is not referenced by index.html or the manifest`);
  if (!viteConfig.includes(`"${rel}"`)) fail(`${href} missing from VitePWA includeAssets`);
}
if (!/src: "pwa\/icon-maskable-512\.png",\s*sizes: "512x512",\s*type: "image\/png",\s*purpose: "maskable"/.test(manifestBlock)) {
  fail("manifest maskable icon declaration is wrong");
}

// ── Live checks ──────────────────────────────────────────────────────────
const base = process.env.TARGET_BASE_URL?.replace(/\/+$/, "");
if (base) {
  const res = await fetch(`${base}/`);
  const html = await res.text();
  if (res.status !== 200) fail(`GET / returned ${res.status}`);

  const count = (re: RegExp) => [...html.matchAll(re)].length;
  const exactlyOne: Array<[string, number]> = [
    ["<title>", count(/<title>/g)],
    ["meta description", count(/<meta\s+name="description"/g)],
    ["canonical", count(/<link\s+rel="canonical"/g)],
    ["og:title", count(/<meta\s+property="og:title"/g)],
    ["og:description", count(/<meta\s+property="og:description"/g)],
    ["og:url", count(/<meta\s+property="og:url"/g)],
    ["og:image", count(/<meta\s+property="og:image"/g)],
    ["twitter:title", count(/<meta\s+name="twitter:title"/g)],
    ["twitter:description", count(/<meta\s+name="twitter:description"/g)],
    ["twitter:image", count(/<meta\s+name="twitter:image"/g)],
    ["<h1", count(/<h1[\s>]/g)],
  ];
  for (const [label, n] of exactlyOne) if (n !== 1) fail(`live /: expected 1 ${label}, got ${n}`);

  const title = decodeEntities(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
  if (title !== SEO_DEFAULT_TITLE) fail(`live / title "${title}"`);
  for (const [label, values] of [
    ["meta description", metaContents(html, "name", "description")],
    ["og:description", metaContents(html, "property", "og:description")],
    ["twitter:description", metaContents(html, "name", "twitter:description")],
  ] as const) {
    if (values[0] !== SEO_DEFAULT_DESCRIPTION) fail(`live / ${label} "${values[0]}"`);
  }
  if (metaContents(html, "name", "twitter:title")[0] !== SEO_DEFAULT_TITLE) fail("live / twitter:title");
  if (!metaContents(html, "property", "og:image")[0]?.endsWith(SEO_SITE_SHARE_IMAGE_PATH)) fail("live / og:image");
  if (!metaContents(html, "property", "og:url")[0]?.endsWith("/")) fail("live / og:url");

  const h1 = decodeEntities(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "");
  if (h1 !== SEO_HOME_H1) fail(`live / H1 "${h1}"`);

  const robots = metaContents(html, "name", "robots");
  if (robots.length !== 1 || /noindex/i.test(robots[0]!)) fail(`live / robots ${JSON.stringify(robots)}`);
  if (/noindex/i.test(res.headers.get("x-robots-tag") ?? "")) fail("live / X-Robots-Tag noindex");

  const nodes = jsonLdNodes(html);
  checkBrandSchema(nodes, "live /");
  const types = nodes.map((n) => String(n["@type"]));
  const dupes = types.filter((t, i) => types.indexOf(t) !== i);
  if (dupes.length) fail(`live /: duplicate JSON-LD types ${[...new Set(dupes)].join(", ")}`);
  const schemaNames: string[] = [];
  const collectNames = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(collectNames);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.name === "string") schemaNames.push(o.name);
      Object.values(o).forEach(collectNames);
    }
  };
  collectNames(nodes);
  if (schemaNames.includes(SEO_BRAND)) fail(`live /: "${SEO_BRAND}" used as a schema name`);

  const manifestRes = await fetch(`${base}/manifest.webmanifest`);
  if (manifestRes.ok) {
    const manifest = (await manifestRes.json()) as { name?: string; description?: string; icons?: Array<{ src: string }> };
    if (manifest.name !== SEO_SITE_NAME) fail(`live manifest name "${manifest.name}"`);
    if (manifest.description !== SEO_DEFAULT_DESCRIPTION) fail("live manifest description is stale");
    for (const icon of manifest.icons ?? []) {
      const r = await fetch(`${base}/${icon.src.replace(/^\//, "")}`);
      if (!r.ok) fail(`live manifest icon ${icon.src} returned ${r.status}`);
    }
    if (!/<link\s+rel="manifest"\s+href="\/manifest\.webmanifest"/.test(html)) fail("live /: no manifest link");
  } else {
    fail(`live /manifest.webmanifest returned ${manifestRes.status}`);
  }
  for (const [href] of expectedIcons) {
    const r = await fetch(`${base}${href}`);
    if (!r.ok) fail(`live ${href} returned ${r.status}`);
  }
}

console.log(
  `[test-home-brand-seo] ${base ? "static + live" : "static only"}; share image: ${
    SEO_BRAND_SHARE_IMAGE_READY ? "brand" : "fallback"
  } (${SEO_SITE_SHARE_IMAGE_PATH}); ${problems.length} problem(s)`,
);
for (const p of problems) console.log(`  - ${p}`);
process.exit(problems.length ? 1 : 0);
