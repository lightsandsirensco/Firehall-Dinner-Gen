import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(
  path.join(process.cwd(), "shared/editorial/smoothie-guide-article.ts"),
  "utf8",
);
const m = src.match(
  /const EMBEDDED_SMOOTHIES: EditorialEmbeddedRecipe\[\] = (\[[\s\S]*?\n\]);/,
);
if (!m) {
  console.error("Could not extract EMBEDDED_SMOOTHIES");
  process.exit(1);
}

const dest = path.join(process.cwd(), "shared/fuel-catalog/smoothies/recipes-source.ts");
const header = `/**
 * Smoothie catalog source — fuel section only (not dinner).
 */
import type { EditorialEmbeddedRecipe } from "../../editorial/content-schema.js";

function ing(
  name: string,
  quantity: string,
  unit?: string,
  notes?: string,
): EditorialEmbeddedRecipe["ingredients"][number] {
  return { name, quantity, unit, notes };
}

const SMOOTHIE_IMAGE = (id: string) => \`/images/editorial/smoothies/\${id}.webp\`;

export const SMOOTHIE_RECIPES_SOURCE: EditorialEmbeddedRecipe[] = `;

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, `${header}${m[1]};\n`, "utf8");
console.log(`Wrote ${dest}`);
