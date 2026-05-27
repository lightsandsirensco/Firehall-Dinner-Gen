#!/usr/bin/env tsx
/**
 * Golden 100 catalog image generation — wraps editorial imagery pipeline.
 *
 *   npx tsx scripts/catalog-generate-images.ts --dry-run
 *   npx tsx scripts/catalog-generate-images.ts --limit=5
 *   npx tsx scripts/catalog-generate-images.ts --only=smash-burgers
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imageryScript = path.join(__dirname, "generate-golden-100-imagery.ts");

const forwardArgs = process.argv.slice(2);
const result = spawnSync("npx", ["tsx", imageryScript, ...forwardArgs], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
