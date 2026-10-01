#!/usr/bin/env tsx
/**
 * Generate review candidates for hero images that misrepresent their recipe,
 * then (separately, after a human/visual check) assign an approved candidate.
 *
 *   npx tsx scripts/generate-hero-replacement-candidates.ts --only=beef-birria-with-consomme --count=2
 *   npx tsx scripts/generate-hero-replacement-candidates.ts --assign=beef-birria-with-consomme:review/hero-candidates/beef-birria-with-consomme-1.jpg
 *
 * Candidates go to review/hero-candidates/ and never touch live assets.
 */
import { loadProjectEnv, logOpenAIKeyDiagnostics } from "../server/lib/load-project-env.js";
import { applyDevOpenAiTlsIfAllowed } from "./dev-tls.js";

loadProjectEnv();
applyDevOpenAiTlsIfAllowed();

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { TITLE_LOCKED_IMAGE_PROMPTS } from "../shared/food-imagery/title-locked-prompts.js";
import { buildMasterNegativePrompt } from "../shared/food-imagery/negative-prompt.js";
import { generateFoodImageBuffer } from "../server/food-imagery/generator.js";
import { validateImageBufferHeuristic } from "../server/food-imagery/validate-output.js";
import { getFoodImageryConfig } from "../server/food-imagery/config.js";
import { DEFAULT_HERO_GENERATION_SIZE } from "../server/lib/image-sizes.js";
import { writeBreakfastCatalogImageVariants, writeEditorialImageVariants } from "../server/imagery/variants.js";
import { writeFileAtomicSync } from "../server/lib/write-file-atomic.js";

type Target = { slug: string; assign: (buf: Buffer) => Promise<unknown> };

const TARGETS: Record<string, Target> = {
  "beef-birria-with-consomme": {
    slug: "beef-birria-with-consomme",
    assign: (buf) => writeEditorialImageVariants("beef-birria-with-consomme", buf, "comfort_firehall", 2, "golden100"),
  },
  "johnnycakes-with-syrup": {
    slug: "johnnycakes-with-syrup",
    assign: (buf) => writeBreakfastCatalogImageVariants("johnnycakes-with-syrup", buf, 2),
  },
};

const STYLE = [
  "Realistic editorial food photography, appetizing but natural, shot at a 3/4 angle on a stainless steel prep table",
  "in a softly blurred commercial station kitchen. Warm practical lighting, matte surfaces, food is the clear subject",
  "and fills most of the square frame. Firehall-friendly, crew-sized family-style presentation.",
  "No people or hands anywhere in frame. No text, labels or logos. Restrained garnish.",
].join(" ");

const NEGATIVE = buildMasterNegativePrompt([
  "people",
  "faces",
  "hands",
  "people in background",
  "turnout gear",
  "helmets",
  "fire trucks",
  "fire-service props",
  "excessive garnish",
]);

const OUT_DIR = path.join(process.cwd(), "review", "hero-candidates");

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
}

async function toJpeg(buf: Buffer): Promise<Buffer> {
  return sharp(buf).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

async function generate(slugs: string[], count: number): Promise<void> {
  logOpenAIKeyDiagnostics("[hero-candidates]");
  if (!getFoodImageryConfig().enabled) {
    console.error("[hero-candidates] Set OPENAI_API_KEY and FOOD_IMAGERY_ENABLED=true");
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const slug of slugs) {
    const locked = TITLE_LOCKED_IMAGE_PROMPTS[slug];
    if (!TARGETS[slug] || !locked) throw new Error(`no target/locked prompt for ${slug}`);
    const prompt = `${locked}\n\n${STYLE}\n\nAvoid: ${NEGATIVE}`;
    writeFileAtomicSync(path.join(OUT_DIR, `${slug}.prompt.txt`), prompt);
    for (let i = 1; i <= count; i++) {
      const raw = await generateFoodImageBuffer(prompt, DEFAULT_HERO_GENERATION_SIZE);
      const check = validateImageBufferHeuristic(raw);
      if (!check.ok) {
        console.warn(`  ✗ ${slug} #${i}: ${check.reason}`);
        continue;
      }
      const out = path.join(OUT_DIR, `${slug}-${i}.jpg`);
      writeFileAtomicSync(out, await toJpeg(raw));
      console.log(`  ✓ ${path.relative(process.cwd(), out)}`);
    }
  }
}

async function assign(spec: string): Promise<void> {
  const [slug, file] = spec.split(":");
  const target = slug ? TARGETS[slug] : undefined;
  if (!target || !file || !fs.existsSync(file)) throw new Error(`bad --assign=${spec}`);
  const result = await target.assign(await toJpeg(fs.readFileSync(file)));
  console.log(`[hero-candidates] assigned ${file} → ${slug}`, result);
}

const assignSpec = arg("assign");
if (assignSpec) {
  await assign(assignSpec);
} else {
  const only = (arg("only") ?? Object.keys(TARGETS).join(",")).split(",").filter(Boolean);
  await generate(only, Math.max(1, parseInt(arg("count") ?? "2", 10)));
}
