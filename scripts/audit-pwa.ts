#!/usr/bin/env tsx
/**
 * PWA readiness audit — manifest, icons, service worker, install prompt wiring.
 *
 *   npm run audit:pwa
 *   npm run audit:pwa -- --dist   # also verify production build output
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CLIENT_PUBLIC = path.join(ROOT, "client", "public");
const CLIENT_SRC = path.join(ROOT, "client", "src");
const DIST_PUBLIC = path.join(ROOT, "dist", "public");
const VITE_CONFIG = path.join(ROOT, "vite.config.ts");
const INDEX_HTML = path.join(ROOT, "client", "index.html");
const MD_OUT = path.join(ROOT, "review", "pwa-audit-report.md");

const useDist = process.argv.includes("--dist");

interface AuditIssue {
  severity: "error" | "warn";
  message: string;
}

const issues: AuditIssue[] = [];

function fail(message: string): void {
  issues.push({ severity: "error", message });
}

function warn(message: string): void {
  issues.push({ severity: "warn", message });
}

function fileExists(abs: string): boolean {
  return fs.existsSync(abs);
}

function readText(abs: string): string {
  return fs.readFileSync(abs, "utf8");
}

function auditSourceAssets(): void {
  const required = [
    "pwa/icon.svg",
    "pwa/icon-192.png",
    "pwa/icon-512.png",
    "pwa/icon-maskable-512.png",
    "pwa/apple-touch-icon.png",
    "favicon.ico",
  ];

  for (const rel of required) {
    if (!fileExists(path.join(CLIENT_PUBLIC, rel))) {
      fail(`Missing PWA asset: client/public/${rel}`);
    }
  }

  const indexHtml = readText(INDEX_HTML);
  if (!indexHtml.includes('name="theme-color"')) fail("index.html missing theme-color meta");
  if (!indexHtml.includes("apple-mobile-web-app-capable")) fail("index.html missing apple-mobile-web-app-capable");
  if (!indexHtml.includes("apple-touch-icon")) fail("index.html missing apple-touch-icon link");

  const vite = readText(VITE_CONFIG);
  if (!vite.includes("vite-plugin-pwa")) fail("vite.config.ts missing vite-plugin-pwa");
  if (!vite.includes('display: "standalone"')) fail("vite.config.ts manifest missing standalone display");
  if (!vite.includes("navigateFallback")) fail("vite.config.ts workbox missing offline shell fallback");

  const installPrompt = path.join(CLIENT_SRC, "lib", "pwa", "install-prompt.ts");
  if (!fileExists(installPrompt)) fail("Missing install-prompt module");
  else if (!readText(installPrompt).includes("beforeinstallprompt")) {
    fail("Install prompt not wired to beforeinstallprompt handler");
  }

  const installUi = path.join(CLIENT_SRC, "components", "pwa", "pwa-install-prompt.tsx");
  if (!fileExists(installUi)) fail("Missing PwaInstallPrompt component");

  const constants = path.join(ROOT, "shared", "pwa", "constants.ts");
  if (!fileExists(constants)) fail("Missing shared/pwa/constants.ts");
  else {
    const src = readText(constants);
    if (!src.includes("PWA_INSTALL_PROMPT_MIN_VISITS = 2")) {
      fail("Install prompt should show after second visit (min visits = 2)");
    }
  }

  const analytics = path.join(CLIENT_SRC, "lib", "analytics.ts");
  const events = path.join(ROOT, "shared", "analytics", "events.ts");
  for (const [label, file, token] of [
    ["analytics", analytics, "trackPwaPromptShown"],
    ["analytics", analytics, "trackPwaInstalled"],
    ["events", events, '"pwa_prompt_shown"'],
    ["events", events, '"pwa_installed"'],
  ] as const) {
    if (!fileExists(file)) fail(`Missing ${label} file: ${path.relative(ROOT, file)}`);
    else if (!readText(file).includes(token)) fail(`${label} missing ${token}`);
  }
}

function auditDistOutput(): void {
  if (!fileExists(DIST_PUBLIC)) {
    warn("dist/public missing — run npm run build or omit --dist");
    return;
  }

  const manifestCandidates = ["manifest.webmanifest", "site.webmanifest"];
  const manifestName = manifestCandidates.find((name) => fileExists(path.join(DIST_PUBLIC, name)));
  if (!manifestName) {
    fail("dist/public missing manifest.webmanifest");
    return;
  }

  const manifest = JSON.parse(readText(path.join(DIST_PUBLIC, manifestName))) as {
    name?: string;
    short_name?: string;
    display?: string;
    start_url?: string;
    icons?: Array<{ src: string; sizes: string }>;
  };

  if (!manifest.name) fail("Manifest missing name");
  if (manifest.display !== "standalone") fail(`Manifest display should be standalone (got ${manifest.display})`);
  if (!manifest.icons?.some((i) => i.sizes === "512x512")) fail("Manifest missing 512x512 icon");

  const swExists =
    fileExists(path.join(DIST_PUBLIC, "sw.js")) ||
    fs.readdirSync(DIST_PUBLIC).some((f) => f.startsWith("sw") && f.endsWith(".js"));
  if (!swExists) fail("dist/public missing service worker (sw.js)");

  const indexHtml = readText(path.join(DIST_PUBLIC, "index.html"));
  if (!indexHtml.includes("manifest")) fail("Built index.html missing manifest link");
}

function writeReport(): void {
  const errors = issues.filter((i) => i.severity === "error");
  const warns = issues.filter((i) => i.severity === "warn");
  const md = `# PWA Audit — Firehall Meals

**Generated:** ${new Date().toISOString()}  
**Result:** ${errors.length === 0 ? "PASS" : "FAIL"} (${errors.length} errors, ${warns.length} warnings)

## Checks
- Manifest + standalone display + theme/background colors
- PWA icons (192, 512, maskable, apple-touch)
- Service worker + offline shell fallback
- Install prompt after 2nd visit
- Analytics: \`pwa_prompt_shown\`, \`pwa_installed\`

## Issues
${issues.length === 0 ? "_None_" : issues.map((i) => `- **${i.severity.toUpperCase()}:** ${i.message}`).join("\n")}
`;
  fs.mkdirSync(path.dirname(MD_OUT), { recursive: true });
  fs.writeFileSync(MD_OUT, md);
}

function main(): void {
  auditSourceAssets();
  if (useDist) auditDistOutput();

  writeReport();

  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length > 0) {
    console.error("[audit:pwa] FAIL");
    for (const e of errors) console.error(`  - ${e.message}`);
    process.exit(1);
  }

  console.log("[audit:pwa] OK", {
    warnings: issues.filter((i) => i.severity === "warn").length,
    distChecked: useDist,
    report: path.relative(ROOT, MD_OUT),
  });
}

main();
