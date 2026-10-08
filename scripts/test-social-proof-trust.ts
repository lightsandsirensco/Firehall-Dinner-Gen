#!/usr/bin/env tsx
/**
 * Social proof trust — only explicitly approved testimonials reach a public
 * surface, and internal consent fields never do.
 *
 *   npx tsx scripts/test-social-proof-trust.ts
 */
import fs from "node:fs";
import path from "node:path";
import { getPublishedTestimonials, TESTIMONIAL_RECORDS } from "../server/social-proof/testimonial-records.js";
import type { TestimonialRecord } from "../shared/social-proof/types.js";

let failures = 0;
function check(name: string, ok: boolean): void {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`  FAIL ${name}`);
  }
}

const published = getPublishedTestimonials();
const publishedIds = new Set(published.map((t) => t.id));

console.log("Approval gate");
check("records are retained", TESTIMONIAL_RECORDS.length > 0);
check(
  "every published testimonial is an approved record",
  published.every((p) => TESTIMONIAL_RECORDS.some((r) => r.id === p.id && r.approved === true)),
);
check(
  "no unapproved record is published (by id or quote)",
  TESTIMONIAL_RECORDS.filter((r) => r.approved !== true).every(
    (r) => !publishedIds.has(r.id) && !published.some((p) => p.quote === r.quote),
  ),
);
check(
  "approved records carry an approval date",
  TESTIMONIAL_RECORDS.filter((r) => r.approved === true).every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.approvedAt ?? "")),
);

const fixture: TestimonialRecord[] = [
  { id: "a", quote: "Approved.", attribution: { name: "A.", role: "Firefighter" }, approved: true, approvedAt: "2026-10-07", consentNote: "SECRET-NOTE" },
  { id: "b", quote: "Pending.", attribution: { name: "B." }, approved: false, consentNote: "pending" },
  { id: "c", quote: "Truthy only.", attribution: { name: "C." }, approved: "yes" as unknown as boolean },
];
const fixtureOut = getPublishedTestimonials(fixture);
check("only approved === true publishes", fixtureOut.length === 1 && fixtureOut[0]!.id === "a");
check(
  "internal fields are stripped from public output",
  !JSON.stringify(fixtureOut).includes("SECRET-NOTE") &&
    fixtureOut.every((t) => !("approved" in t) && !("approvedAt" in t) && !("consentNote" in t)),
);
check(
  "public output keeps verbatim quote, name and role",
  fixtureOut[0]!.quote === "Approved." && fixtureOut[0]!.attribution.name === "A." && fixtureOut[0]!.attribution.role === "Firefighter",
);

console.log("Client exposure");
const sharedData = fs.readFileSync(path.join(process.cwd(), "shared/social-proof/testimonials-data.ts"), "utf8");
check(
  "client-bundled shared module contains no testimonial records",
  TESTIMONIAL_RECORDS.every((r) => !sharedData.includes(r.quote)) && !/consentNote|approved/.test(sharedData.replace(/\/\*[\s\S]*?\*\//g, "")),
);
const clientSrc = path.join(process.cwd(), "client/src");
const clientImportsRecords = (function walk(dir: string): boolean {
  return fs.readdirSync(dir, { withFileTypes: true }).some((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.(tsx?|jsx?)$/.test(e.name) && fs.readFileSync(p, "utf8").includes("testimonial-records");
  });
})(clientSrc);
check("client never imports server testimonial records", !clientImportsRecords);

if (failures > 0) {
  console.error(`\n${failures} social proof trust check(s) failed`);
  process.exit(1);
}
console.log("\nAll social proof trust checks passed");
