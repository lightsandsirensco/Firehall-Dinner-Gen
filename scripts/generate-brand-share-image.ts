#!/usr/bin/env tsx
/**
 * Renders the 1200×630 homepage social-share image
 * (`client/public/images/brand/firehall-meals-share.png`) from the vector
 * logo in `client/public/pwa/icon.svg` plus the brand wordmark.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  SEO_BRAND_SHARE_IMAGE_HEIGHT as H,
  SEO_BRAND_SHARE_IMAGE_PATH,
  SEO_BRAND_SHARE_IMAGE_WIDTH as W,
} from "../shared/seo/constants";

const ROOT = path.resolve(process.cwd());
const LOGO = path.join(ROOT, "client", "public", "pwa", "icon.svg");
const OUT = path.join(ROOT, "client", "public", SEO_BRAND_SHARE_IMAGE_PATH);

const CREAM = "#EFE7DC";
const RED = "#D63C20";
const BG = "#141414";

const logo = fs.readFileSync(LOGO, "utf8");
const viewBox = logo.match(/viewBox="([^"]+)"/)?.[1];
const logoInner = logo.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
if (!viewBox || !logoInner.trim()) throw new Error(`could not parse ${LOGO}`);

const LOGO_SIZE = 380;
const LOGO_X = 90;
const LOGO_Y = (H - LOGO_SIZE) / 2;
const TEXT_X = 530;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect x="0" y="${H - 14}" width="${W}" height="14" fill="${RED}"/>
  <svg x="${LOGO_X}" y="${LOGO_Y}" width="${LOGO_SIZE}" height="${LOGO_SIZE}" viewBox="${viewBox}">${logoInner}</svg>
  <g font-family="Impact, 'Arial Black', sans-serif" fill="${CREAM}">
    <text x="${TEXT_X}" y="268" font-size="150" letter-spacing="4">FIREHALL</text>
    <text x="${TEXT_X}" y="418" font-size="150" letter-spacing="4" fill="${RED}">MEALS</text>
  </g>
  <rect x="${TEXT_X + 4}" y="448" width="120" height="6" fill="${CREAM}"/>
  <text x="${TEXT_X + 4}" y="500" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="30" fill="${CREAM}" fill-opacity="0.85">Firefighter Recipes &amp; Crew Meal Ideas</text>
  <text x="${TEXT_X + 4}" y="548" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="${CREAM}" fill-opacity="0.6">firehallmeals.com</text>
</svg>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(OUT);
const meta = await sharp(OUT).metadata();
console.log(`wrote ${path.relative(ROOT, OUT)} (${meta.width}x${meta.height}, ${fs.statSync(OUT).size} bytes)`);
