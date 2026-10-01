#!/usr/bin/env tsx
/**
 * Regression tests for audit:hero-images verdict rules.
 *
 *   npm run test:hero-image-validation
 *
 * Wording heuristics must never hard-fail a correct image; missing/broken files and bad alt
 * text must still fail; semantic pass/fail comes only from vision.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { TrustAuditTarget } from "../shared/curated-image-governance/trust-audit-targets.js";
import {
  auditHeroAltText,
  auditHeroFile,
  auditHeroFileFormat,
  buildGlobalHeroMd5Index,
  buildGlobalHeroPeerLookup,
  buildHeroImageValidationReport,
  finalizeHeroValidationRow,
  validateHeroImageTarget,
  type HeroImageValidationRow,
  type HeroVisionResult,
} from "../shared/hero-image-validation.js";

const fixture = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "fixtures", "hero-image-false-positives.json"), "utf8"),
) as { targets: TrustAuditTarget[] };

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "hero-validation-"));
const NOT_RUN: HeroVisionResult = { pass: null, skipped: true, reasons: ["vision check not run"] };
const VISION_PASS: HeroVisionResult = { pass: true, skipped: false, reasons: [] };
const VISION_FAIL: HeroVisionResult = { pass: false, skipped: false, reasons: ["shows pasta, not a sandwich"] };

const jpeg = (seed: string) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(seed)]);
const png = (seed: string) => Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.from(seed)]);
const webp = (seed: string) => Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.from(seed)]);

function writePublic(publicPath: string, bytes: Buffer): void {
  const abs = path.join(ROOT, publicPath.replace(/^\//, ""));
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, bytes);
}

function evaluate(targets: TrustAuditTarget[], vision: HeroVisionResult = NOT_RUN): HeroImageValidationRow[] {
  const context = buildGlobalHeroMd5Index(targets, ROOT);
  const peers = buildGlobalHeroPeerLookup(targets);
  return targets.map((t) => finalizeHeroValidationRow(validateHeroImageTarget(t, context, peers, ROOT), vision));
}

const base = fixture.targets.find((t) => t.slug === "best-tuna-melt-for-the-hall")!;
const variant = (over: Partial<TrustAuditTarget>): TrustAuditTarget => ({ ...base, ...over });
const reasons = (row: HeroImageValidationRow) => row.hardFailures.join("; ");

try {
  // ── 1. Known false positives: correct images flagged only by title/alt wording ──
  assert.equal(fixture.targets.length, 11);
  for (const t of fixture.targets) writePublic(t.heroImage, jpeg(t.slug));

  const wordingRows = evaluate(fixture.targets);
  assert.ok(
    wordingRows.some((row) => row.semanticWarnings.length > 0),
    "fixture no longer exercises the wording heuristics",
  );
  for (const row of wordingRows) {
    assert.equal(row.pass, true, `${row.slug} hard-failed on wording: ${reasons(row)}`);
    assert.deepEqual(row.hardFailures, [], row.slug);
    assert.equal(row.semanticStatus, "not_verified", row.slug);
    assert.equal(row.needsNewImage, false, row.slug);
  }

  // Vision pass is direct evidence: wording warnings are cleared.
  for (const row of evaluate(fixture.targets, VISION_PASS)) {
    assert.equal(row.semanticStatus, "pass");
    assert.deepEqual(row.semanticWarnings, []);
    assert.equal(row.pass, true);
  }

  // Vision fail is independent evidence of a wrong picture.
  const [visionFailed] = evaluate([base], VISION_FAIL);
  assert.equal(visionFailed!.semanticStatus, "fail");
  assert.equal(visionFailed!.pass, false);
  assert.equal(visionFailed!.needsNewImage, true);
  assert.ok(visionFailed!.hardFailures.some((r) => r.includes("shows pasta")));

  // Vision unavailable is "not verified", never a failure.
  const [unavailable] = evaluate([base], { pass: null, skipped: true, reasons: ["vision unavailable: no OpenAI API key"] });
  assert.equal(unavailable!.semanticStatus, "not_verified");
  assert.deepEqual(unavailable!.semanticReasons, ["vision unavailable: no OpenAI API key"]);
  assert.equal(unavailable!.pass, true);

  // ── 2. Deterministic file checks stay hard failures ──
  const fileCase = (heroImage: string, bytes?: Buffer) => {
    if (bytes) writePublic(heroImage, bytes);
    return evaluate([variant({ slug: "file-case", heroImage })])[0]!;
  };

  const missing = fileCase("/images/test/missing.jpg");
  assert.equal(missing.pass, false);
  assert.equal(missing.needsNewImage, true);
  assert.ok(missing.hardFailures.includes("hero image file missing"));

  const empty = fileCase("/images/test/empty.jpg", Buffer.alloc(0));
  assert.equal(empty.pass, false);
  assert.ok(empty.hardFailures.some((r) => r.includes("empty (0 bytes)")));

  const notImage = fileCase("/images/test/not-image.jpg", Buffer.from("<html>404 Not Found</html>"));
  assert.equal(notImage.pass, false);
  assert.equal(notImage.needsNewImage, true);
  assert.ok(notImage.hardFailures.some((r) => r.includes("not a valid JPEG, PNG or WebP")));

  assert.match(auditHeroFile("images/no-leading-slash.jpg", ROOT)[0]!, /malformed/);
  assert.match(auditHeroFile("/images/../secrets.jpg", ROOT)[0]!, /malformed/);
  assert.match(auditHeroFile("/images/test/hero.gif", ROOT)[0]!, /malformed/);
  assert.match(auditHeroFile("", ROOT)[0]!, /empty/);

  // Format is sniffed from bytes: PNG data under .jpg still renders, so it is a warning, not a failure.
  assert.deepEqual(auditHeroFile((writePublic("/images/test/png-in-jpg.jpg", png("a")), "/images/test/png-in-jpg.jpg"), ROOT), []);
  assert.deepEqual(auditHeroFile((writePublic("/images/test/real.webp", webp("b")), "/images/test/real.webp"), ROOT), []);
  assert.match(auditHeroFileFormat("/images/test/png-in-jpg.jpg", ROOT)[0]!, /\.jpg file contains PNG data/);
  assert.deepEqual(auditHeroFileFormat("/images/test/real.webp", ROOT), []);
  assert.deepEqual(auditHeroFileFormat((writePublic("/images/test/real.jpg", jpeg("c")), "/images/test/real.jpg"), ROOT), []);
  const mislabeled = fileCase("/images/test/png-in-jpg.jpg");
  assert.equal(mislabeled.pass, true);
  assert.equal(mislabeled.needsNewImage, false);
  assert.ok(mislabeled.metadataWarnings.some((w) => w.includes("contains PNG data")));

  // ── 3. Deterministic alt-text checks ──
  const altRow = (heroAlt: string | undefined, title = base.title) =>
    evaluate([variant({ slug: "alt-case", heroImage: "/images/test/alt-case.jpg", heroAlt, title })])[0]!;
  writePublic("/images/test/alt-case.jpg", jpeg("alt-case"));

  for (const placeholder of ["image", "Placeholder", "undefined", "alt-case"]) {
    const row = altRow(placeholder);
    assert.equal(row.pass, false, `alt "${placeholder}" should fail`);
    assert.equal(row.needsNewImage, false, "bad alt text is a metadata fix, not a new image");
    assert.ok(row.hardFailures.some((r) => r.includes("placeholder")));
  }

  const blank = altRow("   ", "  ");
  assert.equal(blank.pass, false);
  assert.ok(blank.hardFailures.some((r) => r.includes("alt text is empty")));

  const contradiction = altRow("Chicken parm sandwiches on a sheet pan", "Best Tuna Melt for the Hall");
  assert.equal(contradiction.pass, false);
  assert.ok(contradiction.hardFailures.some((r) => r.includes("title claims tuna")));

  const cheese = altRow("Turkey Zoodle Bolognese — lean ground turkey, zucchini, and parmesan cheese", "Turkey Zoodle Bolognese");
  assert.equal(cheese.pass, true, "parmesan cheese is not a chicken parm claim");

  const fallback = altRow(undefined);
  assert.equal(fallback.pass, true);
  assert.equal(fallback.heroAlt, base.title);
  assert.ok(fallback.metadataWarnings.some((w) => w.includes("falls back to the recipe title")));

  const taxonomy = auditHeroAltText({
    configuredAlt: "Loaded Potato Skins — american sheet_pan plated for a firehall crew",
    title: "Loaded Potato Skins",
    slug: "loaded-potato-skins",
    heroImage: "/images/golden-100/loaded-potato-skins.jpg",
  });
  assert.deepEqual(taxonomy.failures, []);
  assert.ok(taxonomy.warnings.some((w) => w.includes('"sheet_pan"')));
  assert.ok(taxonomy.warnings.some((w) => w.includes("template wording")));

  for (const configuredAlt of [
    "Beef Dip Sandwiches — crew-sized BBQ spread with visible smoke and bark",
    "Wide firehall crew platter of Beef Dip Sandwiches beside crispy fries on a station prep table, family-style",
  ]) {
    const templated = auditHeroAltText({ configuredAlt, title: "Beef Dip Sandwiches", slug: "beef-dip", heroImage: "/images/x.jpg" });
    assert.deepEqual(templated.failures, []);
    assert.ok(templated.warnings.some((w) => w.includes("template wording")), configuredAlt);
  }
  assert.deepEqual(
    auditHeroAltText({ configuredAlt: "Beef Dip Sandwiches — shaved roast beef on toasted rolls with au jus", title: "Beef Dip Sandwiches", slug: "beef-dip", heroImage: "/images/x.jpg" }).warnings,
    [],
  );

  // Wording that merely lacks "platter"/"crew"/title tokens is not an alt failure.
  assert.deepEqual(
    auditHeroAltText({ configuredAlt: "Scrambled eggs and turkey sausage", title: "Lumberjack Breakfast Platter", slug: "x", heroImage: "/images/x.jpg" }).failures,
    [],
  );

  // ── 4. Conflicting duplicate bytes remain hard evidence ──
  const shared = jpeg("same-bytes");
  writePublic("/images/golden-100/pork-carnitas-tacos.jpg", shared);
  writePublic("/images/golden-100/five-ingredient-pasta.jpg", shared);
  const dupRows = evaluate([
    variant({ collection: "golden_100", slug: "pork-carnitas-tacos", title: "Pork Carnitas Tacos", mealFormat: "tacos", heroImage: "/images/golden-100/pork-carnitas-tacos.jpg", heroAlt: "Pork carnitas tacos" }),
    variant({ collection: "golden_100", slug: "five-ingredient-pasta", title: "Five Ingredient Pasta", mealFormat: "pasta", heroImage: "/images/golden-100/five-ingredient-pasta.jpg", heroAlt: "Five ingredient pasta" }),
  ]);
  for (const row of dupRows) {
    assert.equal(row.needsNewImage, true, `${row.slug}: conflicting duplicate bytes must need a new image`);
    assert.ok(row.metadataIssues.some((i) => i.code === "duplicate_hero_hash" && i.severity === "critical"));
  }

  // ── 5. Report totals separate the categories ──
  const report = buildHeroImageValidationReport([...evaluate(fixture.targets), missing, contradiction]);
  assert.equal(report.totals.recipes, 13);
  assert.equal(report.totals.fail, 2);
  assert.equal(report.totals.fileFailures, 1);
  assert.equal(report.totals.metadataFailures, 1);
  assert.equal(report.totals.semanticWarnings >= 3, true);
  assert.equal(report.totals.semanticNotVerified, 13);
  assert.equal(report.totals.semanticFail, 0);
  assert.equal(report.totals.needsNewImage, 1);

  console.log("[test-hero-image-validation] OK");
} finally {
  fs.rmSync(ROOT, { recursive: true, force: true });
}
