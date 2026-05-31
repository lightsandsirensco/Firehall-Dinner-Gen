#!/usr/bin/env tsx
/**
 * Batch firehall photo replacements — processes queue in chunks, tracks progress,
 * re-audits after each batch.
 *
 * Usage:
 *   npm run batch:firehall-photo-replacements -- --batch-size=10 --priority=p0
 *   npm run batch:firehall-photo-replacements -- --batch-size=5 --collection=golden_100
 *   npm run batch:firehall-photo-replacements -- --resume
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadProjectEnv } from "../server/lib/load-project-env.js";
import { hasOpenAIKey } from "../server/openai-client.js";

loadProjectEnv();

const REVIEW = path.join(process.cwd(), "review");
const QUEUE_PATH = path.join(REVIEW, "firehall-photo-replacement-queue.json");
const PROGRESS_PATH = path.join(REVIEW, "firehall-photo-batch-progress.json");

type QueueItem = {
  collection: string;
  slug: string;
  title: string;
  priority: "p0" | "p1";
};

type ProgressFile = {
  startedAt: string;
  updatedAt: string;
  completed: Array<{ collection: string; slug: string; completedAt: string }>;
  failed: Array<{ collection: string; slug: string; error: string; failedAt: string }>;
  batchesRun: number;
};

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  return {
    batchSize: parseInt(args.find((a) => a.startsWith("--batch-size="))?.split("=")[1] || "10", 10),
    priority:
      (args.find((a) => a.startsWith("--priority="))?.split("=")[1] as "p0" | "p1" | undefined) ??
      "p0",
    collection: args.find((a) => a.startsWith("--collection="))?.split("=")[1],
    resume: args.includes("--resume"),
    dryRun: args.includes("--dry-run"),
    maxBatches: parseInt(args.find((a) => a.startsWith("--max-batches="))?.split("=")[1] || "1", 10),
  };
}

function loadProgress(): ProgressFile {
  if (!fs.existsSync(PROGRESS_PATH)) {
    return {
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completed: [],
      failed: [],
      batchesRun: 0,
    };
  }
  return JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf8")) as ProgressFile;
}

function saveProgress(progress: ProgressFile): void {
  progress.updatedAt = new Date().toISOString();
  fs.mkdirSync(REVIEW, { recursive: true });
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

function loadQueue(): QueueItem[] {
  if (!fs.existsSync(QUEUE_PATH)) {
    throw new Error(`Missing ${QUEUE_PATH}. Run: npm run audit:firehall-photo-standard`);
  }
  const raw = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8")) as { queue: QueueItem[] };
  return raw.queue || [];
}

function isCompleted(progress: ProgressFile, item: QueueItem): boolean {
  return progress.completed.some((c) => c.collection === item.collection && c.slug === item.slug);
}

function main(): void {
  const args = parseArgs(process.argv);

  if (!args.dryRun && !hasOpenAIKey()) {
    console.error("[batch:firehall-photo-replacements] OPENAI_API_KEY required — set in .env then re-run");
    process.exit(1);
  }

  const progress = loadProgress();

  let queue = loadQueue().filter((q) => q.priority === args.priority);
  if (args.collection) queue = queue.filter((q) => q.collection === args.collection);
  if (args.resume) queue = queue.filter((q) => !isCompleted(progress, q));

  if (queue.length === 0) {
    console.log("[batch:firehall-photo-replacements] queue empty — nothing to do");
    return;
  }

  console.log(
    `[batch:firehall-photo-replacements] pending=${queue.length} batchSize=${args.batchSize} priority=${args.priority} maxBatches=${args.maxBatches}`,
  );

  for (let batch = 0; batch < args.maxBatches; batch += 1) {
    const pending = queue.filter((q) => !isCompleted(progress, q));
    if (pending.length === 0) {
      console.log("[batch:firehall-photo-replacements] all items completed");
      break;
    }

    const slice = pending.slice(0, args.batchSize);
    const only = slice.map((q) => q.slug).join(",");

    console.log(
      `[batch:firehall-photo-replacements] batch ${progress.batchesRun + 1}: ${slice.map((q) => q.slug).join(", ")}`,
    );

    const cmdParts = [
      "npm run generate:firehall-photo-replacements --",
      `--only=${only}`,
      `--priority=${args.priority}`,
      "--force",
    ];
    if (args.collection) cmdParts.push(`--collection=${args.collection}`);
    if (args.dryRun) cmdParts.push("--dry-run");

    try {
      execSync(cmdParts.join(" "), { stdio: "inherit", cwd: process.cwd() });
      for (const item of slice) {
        if (!isCompleted(progress, item)) {
          progress.completed.push({
            collection: item.collection,
            slug: item.slug,
            completedAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      for (const item of slice) {
        progress.failed.push({
          collection: item.collection,
          slug: item.slug,
          error: msg.slice(0, 200),
          failedAt: new Date().toISOString(),
        });
      }
      saveProgress(progress);
      throw err;
    }

    progress.batchesRun += 1;
    saveProgress(progress);

    if (!args.dryRun) {
      console.log("[batch:firehall-photo-replacements] re-auditing…");
      execSync("npm run audit:firehall-photo-standard", { stdio: "inherit", cwd: process.cwd() });
    }
  }

  console.log(
    `[batch:firehall-photo-replacements] done completed=${progress.completed.length} failed=${progress.failed.length} batches=${progress.batchesRun}`,
  );
}

main();
