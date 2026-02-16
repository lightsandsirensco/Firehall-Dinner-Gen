import { loadTemplates, filterTemplates, chooseProtein } from "../server/templates";
import { generateRecipe } from "../server/ai";
import { initCacheStore, buildCacheKey, getCachedRecipe, setCachedRecipe } from "../server/cache-store";
import type { GenerateRequest } from "../shared/schema";

const CREW_SIZES = [4, 6, 8];
const BUSY_LEVELS = ["quiet", "average", "busy", "slammed"] as const;
const TIMES = ["25-40", "30-45", "45-60"] as const;
const APPLIANCE_COMBOS = [
  ["stove", "oven"],
  ["stove", "oven", "grill"],
  ["stove"],
];
const PROTEIN_COMBOS = [
  ["chicken", "beef"],
  ["chicken"],
  ["beef"],
  ["pork"],
  ["turkey"],
  ["fish"],
];
const HEALTHINESS = ["balanced"] as const;

async function main() {
  initCacheStore();
  const templates = await loadTemplates();

  let generated = 0;
  let cached = 0;
  let skipped = 0;
  let errors = 0;

  for (const crewSize of CREW_SIZES) {
    for (const busy of BUSY_LEVELS) {
      for (const time of TIMES) {
        for (const appliances of APPLIANCE_COMBOS) {
          for (const proteins of PROTEIN_COMBOS) {
            for (const health of HEALTHINESS) {
              const request: GenerateRequest = {
                crew_size: crewSize,
                busy_level: busy,
                time_available: time,
                appliances,
                proteins,
                healthiness_preference: health,
                allergens_to_avoid: [],
              };

              const candidates = filterTemplates(templates, request);
              if (candidates.length === 0) {
                skipped++;
                continue;
              }

              const template = candidates[0];
              const protein = chooseProtein(template, proteins, health);
              const cacheKey = buildCacheKey(template.template_id, request, protein);

              if (getCachedRecipe(cacheKey)) {
                cached++;
                continue;
              }

              try {
                console.log(`Generating: crew=${crewSize} busy=${busy} time=${time} protein=${protein} template=${template.template_name}`);
                const { recipe } = await generateRecipe(template, request, protein);
                setCachedRecipe(cacheKey, parseInt(template.template_id), recipe);
                generated++;
                console.log(`  -> Cached: ${recipe.title}`);

                await new Promise((r) => setTimeout(r, 2000));
              } catch (err: any) {
                errors++;
                console.error(`  -> Error: ${err.message}`);
              }
            }
          }
        }
      }
    }
  }

  console.log(`\nPre-generation complete:`);
  console.log(`  Generated: ${generated}`);
  console.log(`  Already cached: ${cached}`);
  console.log(`  Skipped (no match): ${skipped}`);
  console.log(`  Errors: ${errors}`);
}

main().catch(console.error);
