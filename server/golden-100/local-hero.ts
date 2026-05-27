import { existsSync } from "node:fs";
import path from "node:path";

const GOLDEN_HERO_DIR = path.resolve(process.cwd(), "client/public/images/golden-100");

export function golden100HeroUrl(slug: string): string {
  return `/images/golden-100/${slug}.jpg`;
}

export function golden100HeroAvailable(slug: string): boolean {
  return existsSync(path.join(GOLDEN_HERO_DIR, `${slug}.jpg`));
}
