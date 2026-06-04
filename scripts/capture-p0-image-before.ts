#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import { loadTrustAuditTargets } from "../shared/curated-image-governance/trust-audit-targets.js";

const SLUGS = fs
  .readFileSync(path.join(process.cwd(), "review", "p0-remaining-12-image-slugs.txt"), "utf8")
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const before = SLUGS.map((slug) => {
  const t = loadTrustAuditTargets().find((x) => x.slug === slug)!;
  return { slug, collection: t.collection, title: t.title, heroBefore: t.heroImage };
});
fs.writeFileSync(
  path.join(process.cwd(), "review", "p0-12-image-before.json"),
  JSON.stringify(before, null, 2),
);
console.log(JSON.stringify(before, null, 2));
