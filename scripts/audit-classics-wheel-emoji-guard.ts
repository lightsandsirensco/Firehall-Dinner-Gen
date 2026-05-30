#!/usr/bin/env tsx
/**
 * Classics Wheel emoji + imagery guard audit.
 *
 *   npm run audit:classics-wheel-emoji
 *
 * Verifies:
 * - Every wheel classic has an approved owned hero on disk
 * - Component source keeps emojis in spinning-only paths (static grep)
 */
import fs from "node:fs";
import path from "node:path";
import { CLASSIC_HALL_MEALS } from "../shared/classic-hall-meals.js";
import { resolveClassicWheelImagery } from "../shared/classic-wheel-imagery.js";
import { validateWheelClassicImage } from "../shared/classic-wheel-image-guard.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");

function fileExists(publicPath: string): boolean {
  if (!publicPath.startsWith("/")) return false;
  return fs.existsSync(path.join(PUBLIC, publicPath.replace(/^\//, "")));
}

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function main(): void {
  console.log("=== Classics Wheel Emoji + Imagery Guard ===\n");

  const imageErrors: string[] = [];
  let approved = 0;

  for (const meal of CLASSIC_HALL_MEALS) {
    const imagery = resolveClassicWheelImagery(meal);
    const validation = validateWheelClassicImage({
      slug: meal.slug,
      title: meal.title,
      heroImage: imagery.heroImage,
      imageApproved: imagery.imageApproved,
      imageryStatus: imagery.imageryStatus,
    });

    const onDisk = imagery.heroImage ? fileExists(imagery.heroImage) : false;
    if (!validation.ok || !onDisk) {
      imageErrors.push(`${meal.slug}: ${validation.reason ?? "hero_missing_on_disk"}`);
    } else {
      approved++;
    }
  }

  console.log(`Wheel classics with approved on-disk heroes: ${approved}/${CLASSIC_HALL_MEALS.length}`);

  const classicsWheelSrc = readFile("client/src/components/classics-wheel.tsx");
  const sourceChecks: { name: string; ok: boolean; detail: string }[] = [];

  sourceChecks.push({
    name: "spin_emojis_testid",
    ok: classicsWheelSrc.includes('data-testid="classics-wheel-spin-emojis"'),
    detail: "Spinning-only emoji burst marker present",
  });

  sourceChecks.push({
    name: "segment_emoji_always_visible",
    ok:
      classicsWheelSrc.includes("{classic.emoji}") &&
      !classicsWheelSrc.includes("shortLabel.slice(0, 2)"),
    detail: "Segment labels always show food emoji + meal name (no initials)",
  });

  sourceChecks.push({
    name: "reveal_uses_meal_hero_image",
    ok: classicsWheelSrc.includes("<MealHeroImage") && classicsWheelSrc.includes("validateWheelClassicImage"),
    detail: "Reveal uses real hero + validation guard",
  });

  sourceChecks.push({
    name: "wheel_reveal_no_emoji_hero",
    ok: !/WheelReveal[\s\S]*classic\.emoji/.test(classicsWheelSrc),
    detail: "WheelReveal does not render classic.emoji as imagery",
  });

  const pizzaCardSrc = readFile("client/src/components/pizza-card.tsx");
  sourceChecks.push({
    name: "pizza_card_no_emoji_fallback",
    ok: !pizzaCardSrc.includes("heroEmoji") && pizzaCardSrc.includes("ExploreHeldImageryPlaceholder"),
    detail: "Pizza card uses held placeholder instead of emoji hero",
  });

  const exploreImageSrc = readFile("client/src/components/explore-recipe-image.tsx");
  sourceChecks.push({
    name: "explore_recipe_no_emoji",
    ok: !/emoji|🍕|🍔/.test(exploreImageSrc),
    detail: "Explore recipe image component has no emoji fallback",
  });

  console.log("\nSource guard checks:");
  let sourceFail = 0;
  for (const check of sourceChecks) {
    const mark = check.ok ? "✓" : "✗";
    console.log(`  ${mark} ${check.name} — ${check.detail}`);
    if (!check.ok) sourceFail++;
  }

  if (imageErrors.length) {
    console.error("\nImage validation failures:");
    for (const e of imageErrors) console.error(`  ✗ ${e}`);
  }

  const pass = imageErrors.length === 0 && sourceFail === 0;
  console.log(`\n${pass ? "Audit passed." : "Audit FAILED."}`);
  process.exit(pass ? 0 : 1);
}

main();
