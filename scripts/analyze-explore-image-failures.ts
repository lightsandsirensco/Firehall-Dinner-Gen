#!/usr/bin/env tsx
import fs from "node:fs";
const report = JSON.parse(
  fs.readFileSync("review/curated-image-governance-report.json", "utf8"),
) as {
  rows: Array<{
    source: string;
    pass: boolean;
    slug: string;
    title?: string;
    protein?: string;
    mealFormat?: string;
    heroImage?: string;
    mismatches: Array<{ code: string }>;
  }>;
};
const fail = report.rows.filter((r) => r.source === "explore_curated" && !r.pass);
const byCode: Record<string, number> = {};
for (const r of fail) {
  for (const m of r.mismatches) byCode[m.code] = (byCode[m.code] || 0) + 1;
}
console.log("explore fail", fail.length, byCode);
const critical = fail.filter((r) =>
  r.mismatches.some((m) =>
    ["external_image_forbidden", "path_title_conflict", "format_mismatch", "protein_mismatch"].includes(
      m.code,
    ),
  ),
);
console.log("critical subset", critical.length);
for (const r of critical.slice(0, 25)) {
  console.log(r.slug, r.mismatches.map((m) => m.code).join(","));
}
for (const code of ["path_title_conflict", "format_mismatch", "protein_mismatch"] as const) {
  console.log("\n==", code);
  for (const row of fail.filter((f) => f.mismatches.some((m) => m.code === code))) {
    const full = report.rows.find((x) => x.slug === row.slug && x.source === "explore_curated") as {
      title?: string;
      heroImage?: string;
      protein?: string;
      mealFormat?: string;
    };
    console.log(" ", row.slug, "|", full?.title, "|", full?.protein, full?.mealFormat);
  }
}
