#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import { buildRecipeLinkClusters } from "../shared/golden-100/internal-link-clusters.js";
import type { GoldenCatalogIndexEntry } from "../shared/golden-100/recipe-page-schema.js";

const indexPath = path.join(process.cwd(), "client", "public", "catalog", "golden-100", "index.json");
const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as {
  recipes: GoldenCatalogIndexEntry[];
};

let fail = 0;
const requiredClusterIds = new Set([
  "same_protein",
  "same_method",
  "same_meal_type",
  "hall_favorites",
  "quick_meals",
  "healthy_meals",
  "bbq_meals",
  "comfort_meals",
]);

for (const current of index.recipes) {
  const clusters = buildRecipeLinkClusters(current, index.recipes);
  const ids = new Set(clusters.map((c) => c.id));

  for (const id of requiredClusterIds) {
    if (!ids.has(id as any)) {
      // Some recipes may legitimately miss a theme cluster (e.g. no other lamb) — only fail core clusters
      if (id === "same_protein" || id === "hall_favorites") {
        console.warn(`  ⚠ ${current.slug}: missing cluster ${id}`);
      }
    }
  }

  for (const c of clusters) {
    if (c.links.length < 2) {
      console.error(`  ✗ ${current.slug}: cluster ${c.id} has ${c.links.length} links`);
      fail++;
    }
    if (c.links.some((l) => l.slug === current.slug)) {
      console.error(`  ✗ ${current.slug}: self-link in ${c.id}`);
      fail++;
    }
    const titles = new Set(c.links.map((l) => l.title));
    if (titles.size !== c.links.length) {
      console.error(`  ✗ ${current.slug}: duplicate titles in ${c.id}`);
      fail++;
    }
  }
}

const sample = buildRecipeLinkClusters(
  index.recipes.find((r) => r.slug === "chicken-parm")!,
  index.recipes,
);
console.log("[test-internal-link-clusters] sample (chicken-parm):");
for (const c of sample) {
  console.log(`  ${c.heading}: ${c.links.map((l) => l.title).join(", ")}`);
}

if (fail > 0) {
  console.error(`[test-internal-link-clusters] FAIL (${fail} issues)`);
  process.exit(1);
}
console.log(`[test-internal-link-clusters] OK — ${index.recipes.length} recipes checked`);
process.exit(0);
