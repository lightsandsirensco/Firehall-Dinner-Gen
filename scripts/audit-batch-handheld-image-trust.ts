#!/usr/bin/env tsx
/**
 * Handheld batch image trust — unique heroes, no donors, surface path checks.
 *
 *   npx tsx scripts/audit-batch-handheld-image-trust.ts
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TITLE_LOCKED_IMAGE_PROMPTS } from "../shared/food-imagery/title-locked-prompts.js";
import { auditMealImageCompleteness } from "../shared/curated-image-governance/meal-image-completeness.js";
import {
  auditTitlePathKeywords,
  auditCategoryMealFormat,
} from "../shared/curated-image-governance/image-accuracy-rules.js";
import { auditTitlePrimarySideAlignment } from "../shared/curated-image-governance/title-primary-side-rules.js";

type Verdict = "PASS" | "FIX BEFORE PUSH" | "BLOCKER";

const BATCH = [
  { slug: "chicken-caesar-wraps", collection: "hall_expansion" as const, title: "Chicken Caesar Wraps", donors: ["chicken-caesar"] },
  { slug: "buffalo-chicken-wraps", collection: "hall_expansion" as const, title: "Buffalo Chicken Wraps", donors: ["buffalo-chicken-dip"] },
  { slug: "greek-chicken-pitas", collection: "hall_expansion" as const, title: "Greek Chicken Pitas", donors: ["chicken-souvlaki", "greek-chicken-bowls"] },
  { slug: "beef-gyros-for-the-hall", collection: "hall_expansion" as const, title: "Beef Gyros", donors: ["steak-sandwiches", "philly-cheesesteak-skillet"] },
  { slug: "chicken-shawarma-pitas", collection: "hall_expansion" as const, title: "Chicken Shawarma Pitas", donors: ["shawarma-bar-night", "shawarma-chicken-rice-bowls"] },
  { slug: "sausage-peppers-on-buns", collection: "hall_expansion" as const, title: "Sausage & Peppers on Buns", donors: ["meatball-hoagies", "sausage-peppers-onions"] },
  { slug: "chicken-dumpling-soup", collection: "golden_100" as const, title: "Chicken and Dumplings", donors: ["chicken-pot-pie", "beef-barley-soup"] },
] as const;

const PUBLIC = path.join(process.cwd(), "client/public");

function heroDisk(collection: string, slug: string): string {
  if (collection === "hall_expansion") {
    return path.join(PUBLIC, "images/hall-expansion", `${slug}.jpg`);
  }
  return path.join(PUBLIC, "images/golden-100", `${slug}.jpg`);
}

function thumbDisk(collection: string, slug: string): string {
  if (collection === "hall_expansion") {
    return path.join(PUBLIC, "images/thumbs/hall-expansion", `${slug}.jpg`);
  }
  return path.join(PUBLIC, "images/thumbs", `${slug}.jpg`);
}

function mobileDisk(collection: string, slug: string): string {
  if (collection === "hall_expansion") {
    return path.join(PUBLIC, "images/mobile/hall-expansion", `${slug}.jpg`);
  }
  return path.join(PUBLIC, "images/mobile", `${slug}.jpg`);
}

function sha256(file: string): string | null {
  if (!fs.existsSync(file)) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function loadPage(collection: string, slug: string): Record<string, unknown> | null {
  const rel =
    collection === "hall_expansion"
      ? `catalog/hall-expansion/pages/${slug}.json`
      : `catalog/golden-100/pages/${slug}.json`;
  const p = path.join(PUBLIC, rel);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
}

function lockedPromptPresent(slug: string): boolean {
  return Boolean(TITLE_LOCKED_IMAGE_PROMPTS[slug]?.trim());
}

type Row = {
  slug: string;
  imageTrust: Verdict;
  duplicateHero: Verdict;
  donorReuse: Verdict;
  placeholder: Verdict;
  exploreCard: Verdict;
  mobileCard: Verdict;
  homepageRail: Verdict;
  recentlyAdded: Verdict;
  overall: Verdict;
  notes: string[];
};

const rows: Row[] = [];
const batchHashes = new Map<string, string>();

for (const item of BATCH) {
  const notes: string[] = [];
  let duplicateHero: Verdict = "PASS";
  let donorReuse: Verdict = "PASS";
  let placeholder: Verdict = "PASS";
  let imageTrust: Verdict = "PASS";
  let exploreCard: Verdict = "PASS";
  let mobileCard: Verdict = "PASS";
  let homepageRail: Verdict = "PASS";
  let recentlyAdded: Verdict = "PASS";

  const hero = heroDisk(item.collection, item.slug);
  const thumb = thumbDisk(item.collection, item.slug);
  const mobile = mobileDisk(item.collection, item.slug);

  if (!fs.existsSync(hero)) {
    placeholder = "BLOCKER";
    notes.push("hero missing");
  }
  if (!fs.existsSync(thumb)) {
    mobileCard = "BLOCKER";
    notes.push("thumb/card missing");
  }
  if (!fs.existsSync(mobile)) {
    exploreCard = "FIX BEFORE PUSH";
    notes.push("mobile variant missing");
  }

  const h = sha256(hero);
  if (!h) {
    placeholder = "BLOCKER";
  } else {
    const prior = [...batchHashes.entries()].find(([, v]) => v === h);
    if (prior) {
      duplicateHero = "BLOCKER";
      notes.push(`same bytes as batch ${prior[0]}`);
    } else {
      batchHashes.set(item.slug, h);
    }

    for (const donor of item.donors) {
      const donorCol = fs.existsSync(path.join(PUBLIC, "images/hall-expansion", `${donor}.jpg`))
        ? "hall_expansion"
        : "golden_100";
      const dh = sha256(heroDisk(donorCol, donor));
      if (dh && dh === h) {
        donorReuse = "BLOCKER";
        notes.push(`identical to donor ${donor}`);
      }
    }
  }

  if (!lockedPromptPresent(item.slug)) {
    imageTrust = "FIX BEFORE PUSH";
    notes.push("no title-locked prompt");
  }

  const page = loadPage(item.collection, item.slug);
  if (!page) {
    imageTrust = "BLOCKER";
    notes.push("page JSON missing");
  } else {
    const colPath = item.collection === "hall_expansion" ? "hall-expansion" : "golden-100";
    const expectedHero = `/images/${colPath}/${item.slug}.jpg`;
    if (String(page.heroImage) !== expectedHero) {
      imageTrust = "BLOCKER";
      notes.push(`heroImage mismatch: ${page.heroImage}`);
    }
    const expectedThumb =
      item.collection === "hall_expansion"
        ? `/images/thumbs/hall-expansion/${item.slug}.jpg`
        : `/images/thumbs/${item.slug}.jpg`;
    if (String(page.thumbImage) !== expectedThumb) {
      exploreCard = "BLOCKER";
      notes.push(`thumbImage mismatch: ${page.thumbImage}`);
    }

    const ingredients = ((page.ingredients as Array<{ name: string }>) ?? []).map((i) => ({
      name: i.name,
      quantity: "",
      unit: "",
    }));
    const heroPath = String(page.heroImage ?? "");
    const heroAlt = String(page.heroImageAlt ?? item.title);
    const mealFormat = String((page.tags as string[])?.find((t) => t.startsWith("format:"))?.split(":")[1] ?? "handheld");
    const criticalIssues = [
      ...auditTitlePathKeywords(item.title, heroPath, heroAlt),
      ...auditCategoryMealFormat(item.title, mealFormat, item.collection, heroPath),
      ...auditTitlePrimarySideAlignment({
        slug: item.slug,
        title: item.title,
        mealFormat,
        heroPath,
        heroAlt,
      }),
      ...auditMealImageCompleteness({
        slug: item.slug,
        title: item.title,
        mealFormat,
        heroPath,
        heroAlt,
        ingredients,
        tonightSpread: Array.isArray(page.tonightSpread) ? (page.tonightSpread as string[]) : [],
      }),
    ].filter((i) => i.severity === "critical");
    if (criticalIssues.length) {
      imageTrust = "BLOCKER";
      notes.push(...criticalIssues.slice(0, 3).map((i) => i.message));
    }
  }

  // Hall index / explore eligibility
  if (item.collection === "hall_expansion") {
    const indexPath = path.join(PUBLIC, "catalog/hall-expansion/index.json");
    if (fs.existsSync(indexPath)) {
      const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as {
        recipes?: Array<{ slug: string; thumbImage?: string; heroImage?: string }>;
      };
      const entry = (index.recipes ?? []).find((r) => r.slug === item.slug);
      if (!entry) {
        exploreCard = "BLOCKER";
        notes.push("not in hall-expansion index");
      } else if (entry.thumbImage && !entry.thumbImage.includes(item.slug)) {
        exploreCard = "BLOCKER";
        notes.push("index thumb not slug-specific");
      }
    }
  }

  const overall: Verdict =
    placeholder === "BLOCKER" ||
    donorReuse === "BLOCKER" ||
    duplicateHero === "BLOCKER" ||
    imageTrust === "BLOCKER" ||
    exploreCard === "BLOCKER" ||
    mobileCard === "BLOCKER"
      ? "BLOCKER"
      : imageTrust === "FIX BEFORE PUSH" ||
          exploreCard === "FIX BEFORE PUSH" ||
          mobileCard === "FIX BEFORE PUSH" ||
          homepageRail === "FIX BEFORE PUSH" ||
          recentlyAdded === "FIX BEFORE PUSH"
        ? "FIX BEFORE PUSH"
        : "PASS";

  rows.push({
    slug: item.slug,
    imageTrust,
    duplicateHero,
    donorReuse,
    placeholder,
    exploreCard,
    mobileCard,
    homepageRail,
    recentlyAdded,
    overall,
    notes,
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  rows,
  summary: {
    pass: rows.filter((r) => r.overall === "PASS").length,
    fix: rows.filter((r) => r.overall === "FIX BEFORE PUSH").length,
    blocker: rows.filter((r) => r.overall === "BLOCKER").length,
  },
};

const outDir = path.join(process.cwd(), "review");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "batch-handheld-image-trust-audit.json"), JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
process.exit(rows.some((r) => r.overall !== "PASS") ? 1 : 0);
