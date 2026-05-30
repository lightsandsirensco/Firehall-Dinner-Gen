#!/usr/bin/env tsx
/**
 * Scan client/public (and optional dist/public) for broken static asset references.
 *
 *   npm run audit:public-assets
 *   npm run audit:public-assets -- --dist
 *   npm run audit:public-assets -- --fix-pdf
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import { resolveExistingSlugImage } from "../shared/explore-image-paths.js";
import { publicImageAbsolute } from "../shared/explore-image-paths.js";

const ROOT = process.cwd();
const PUBLIC_ROOT = path.join(ROOT, "client", "public");
const DIST_PUBLIC = path.join(ROOT, "dist", "public");
const SCAN_DIRS = [
  path.join(PUBLIC_ROOT, "catalog"),
  path.join(PUBLIC_ROOT, "content"),
  path.join(ROOT, "client", "src"),
];
const SCAN_FILES = [path.join(ROOT, "client", "index.html")];

const REQUIRED_ASSETS = [
  "/downloads/the-official-firehall-red-lead-recipe.html",
  "/downloads/the-official-firehall-red-lead-recipe.pdf",
] as const;

const PATH_RE =
  /\/(?:images|downloads)\/[a-zA-Z0-9._/-]+\.(?:jpg|jpeg|png|webp|gif|svg|ico|pdf|html)|\/favicon\.ico/g;

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
      walkFiles(full, acc);
    } else if (/\.(json|tsx?|jsx?|html|css|md|xml)$/i.test(ent.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function extractPublicPaths(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(PATH_RE)) {
    let p = m[0];
    if (p.endsWith(".") || p.endsWith(",")) p = p.slice(0, -1);
    found.add(p.split("?")[0]!);
  }
  return [...found];
}

function existsInPublic(publicPath: string, root = PUBLIC_ROOT): boolean {
  if (!publicPath.startsWith("/")) return false;
  const abs = publicImageAbsolute(publicPath, root);
  return fs.existsSync(abs);
}

function collectReferencedPaths(): Map<string, string[]> {
  const refs = new Map<string, string[]>();
  const add = (p: string, source: string) => {
    const list = refs.get(p) ?? [];
    list.push(source);
    refs.set(p, list);
  };

  for (const req of REQUIRED_ASSETS) add(req, "required:lead-magnet");

  for (const dir of SCAN_DIRS) {
    for (const file of walkFiles(dir)) {
      const rel = path.relative(ROOT, file);
      const text = fs.readFileSync(file, "utf8");
      for (const p of extractPublicPaths(text)) add(p, rel);
    }
  }

  for (const file of SCAN_FILES) {
    if (!fs.existsSync(file)) continue;
    const rel = path.relative(ROOT, file);
    for (const p of extractPublicPaths(fs.readFileSync(file, "utf8"))) add(p, rel);
  }

  // Catalog JSON image fields (heroImage, thumbImage, etc.)
  const catalogJsonWalk = walkFiles(path.join(PUBLIC_ROOT, "catalog"));
  for (const file of catalogJsonWalk) {
    if (!file.endsWith(".json")) continue;
    const rel = path.relative(ROOT, file);
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      const visit = (obj: unknown) => {
        if (typeof obj === "string" && obj.startsWith("/images/")) add(obj, rel);
        else if (Array.isArray(obj)) obj.forEach(visit);
        else if (obj && typeof obj === "object") Object.values(obj).forEach(visit);
      };
      visit(data);
    } catch {
      /* skip invalid json */
    }
  }

  return refs;
}

function auditApprovedCatalog(): string[] {
  const errors: string[] = [];
  const catalog = buildApprovedCatalog();
  for (const entry of catalog.recipes) {
    const resolved = resolveExistingSlugImage(entry.slug, entry.kind, PUBLIC_ROOT);
    if (!resolved.found) {
      errors.push(`approved catalog missing image: ${entry.slug} (${entry.kind})`);
    }
  }
  return errors;
}

function findOrphanDownloads(referenced: Set<string>): string[] {
  const dir = path.join(PUBLIC_ROOT, "downloads");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap((name) => {
    const pub = `/downloads/${name}`;
    if (referenced.has(pub)) return [];
    return [pub];
  });
}

function ensurePdf(): boolean {
  const pdfPath = path.join(PUBLIC_ROOT, "downloads", "the-official-firehall-red-lead-recipe.pdf");
  if (fs.existsSync(pdfPath)) {
    const buf = fs.readFileSync(pdfPath);
    if (buf.slice(0, 5).toString("ascii") === "%PDF-") return true;
  }
  console.log("[audit:public-assets] Regenerating Red Lead PDF…");
  const r = spawnSync("npm", ["run", "lead-magnet:red-lead-pdf"], {
    cwd: ROOT,
    shell: true,
    stdio: "inherit",
  });
  return r.status === 0 && fs.existsSync(pdfPath);
}

function main(): void {
  const checkDist = process.argv.includes("--dist");
  const fixPdf = process.argv.includes("--fix-pdf");

  if (fixPdf) {
    ensurePdf();
  }

  const referenced = collectReferencedPaths();
  const missing: Array<{ path: string; sources: string[] }> = [];

  for (const [pubPath, sources] of referenced) {
    if (!existsInPublic(pubPath, PUBLIC_ROOT)) {
      missing.push({ path: pubPath, sources: [...new Set(sources)].slice(0, 5) });
    }
  }

  const catalogErrors = auditApprovedCatalog();
  const orphans = findOrphanDownloads(new Set(referenced.keys()));

  let distMissing: string[] = [];
  if (checkDist && fs.existsSync(DIST_PUBLIC)) {
    for (const req of REQUIRED_ASSETS) {
      if (!existsInPublic(req, DIST_PUBLIC)) distMissing.push(req);
    }
  }

  const reportPath = path.join(ROOT, "review", "public-assets-audit.json");
  const report = {
    generatedAt: new Date().toISOString(),
    publicRoot: PUBLIC_ROOT,
    requiredAssets: REQUIRED_ASSETS.map((p) => ({
      path: p,
      exists: existsInPublic(p, PUBLIC_ROOT),
      bytes: existsInPublic(p, PUBLIC_ROOT)
        ? fs.statSync(publicImageAbsolute(p, PUBLIC_ROOT)).size
        : 0,
    })),
    referencedCount: referenced.size,
    missingCount: missing.length,
    missing,
    catalogImageErrors: catalogErrors,
    orphanDownloads: orphans,
    distMissing,
    pass: missing.length === 0 && catalogErrors.length === 0 && distMissing.length === 0,
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("[audit:public-assets] Public asset audit\n");
  for (const req of report.requiredAssets) {
    console.log(
      `  ${req.exists ? "✓" : "✗"} ${req.path}${req.exists ? ` (${req.bytes} bytes)` : ""}`,
    );
  }
  console.log(`\n  Referenced paths scanned: ${report.referencedCount}`);
  console.log(`  Missing on disk: ${report.missingCount}`);
  console.log(`  Approved catalog image errors: ${catalogErrors.length}`);
  if (orphans.length) console.log(`  Orphan downloads (unreferenced): ${orphans.length}`);
  if (distMissing.length) console.log(`  Missing in dist/public: ${distMissing.length}`);

  if (missing.length) {
    console.error("\n[audit:public-assets] Missing files:");
    for (const m of missing.slice(0, 30)) {
      console.error(`  - ${m.path} ← ${m.sources.join(", ")}`);
    }
    if (missing.length > 30) console.error(`  … and ${missing.length - 30} more`);
  }

  if (catalogErrors.length) {
    console.error("\n[audit:public-assets] Catalog image errors:");
    for (const e of catalogErrors.slice(0, 20)) console.error(`  - ${e}`);
  }

  console.log(`\n  Report → ${path.relative(ROOT, reportPath)}`);

  if (!report.pass) {
    console.error("\n[audit:public-assets] FAIL");
    process.exit(1);
  }
  console.log("\n[audit:public-assets] PASS — zero broken public assets");
}

main();
