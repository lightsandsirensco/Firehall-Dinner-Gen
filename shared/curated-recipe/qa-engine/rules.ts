import { metadataQaIssues } from "../metadata/qa.js";
import type { EditorialQaCatalogPeer, EditorialQaFlag, EditorialQaInput } from "./types.js";
import {
  ingredientSimilarity,
  levenshteinRatio,
  structureKey,
  titleKey,
  tokenJaccard,
} from "./similarity.js";
import { scanRecipeForAiWording } from "./wording.js";
import { scanTextBlocksForSpacingIssues } from "../../recipe/spacing.js";
import { checkImageAvailability, isValidImageReference } from "./assets.js";
import {
  buildCuratedMealImageProfile,
  governanceFailsBuild,
  validateCuratedImageGovernance,
} from "../../curated-image-governance/index.js";
import { hasImpliedEquipment, inferEquipmentFromSteps } from "./equipment-infer.js";

const FILLER_STEP =
  /^(cook until done|serve and enjoy|plate and serve|enjoy|serve hot|garnish and serve)\.?$/i;
const WEAK_STEP = /^(cook|heat|prepare|make)\s+(the\s+)?(meal|food|dish)\.?$/i;
const MIN_STEP_CHARS = 60;
const MIN_STEP_WORDS = 18;
const COOK_VERBS = /\b(bake|roast|grill|broil|fry|sauté|saute|simmer|boil|sear|brown|reduce)\b/i;
const TEMP_SIGNAL =
  /\b(\d+\s*°|degrees?|fahrenheit|celsius|medium[- ]high|medium[- ]low|low heat|high heat|350|375|400|425|450|simmer|boil)\b/i;

export interface AssetCheckResult {
  heroProductionOk?: boolean;
  thumbProductionOk?: boolean;
}

export interface RuleContext {
  titleCounts: Map<string, number>;
  peers: EditorialQaCatalogPeer[];
  assetCheck?: (heroImage: string, thumbImage?: string) => AssetCheckResult;
  imageContext?: import("./assets.js").ImageCheckContext;
  variantNearDuplicates?: import("./types.js").EditorialQaVariantPair[];
}

function flag(
  code: EditorialQaFlag["code"],
  severity: EditorialQaFlag["severity"],
  message: string,
  field?: string,
  data?: EditorialQaFlag["data"],
): EditorialQaFlag {
  return { code, severity, message, field, data };
}

export function runRecipeQaRules(input: EditorialQaInput, ctx: RuleContext): EditorialQaFlag[] {
  const flags: EditorialQaFlag[] = [];
  const tk = titleKey(input.title);

  // 1. Duplicate titles
  const dupCount = ctx.titleCounts.get(tk) ?? 1;
  if (dupCount > 1) {
    flags.push(
      flag("duplicate_title", "critical", `duplicate title key (${dupCount} recipes)`, "title", {
        titleKey: tk,
        count: dupCount,
      }),
    );
  }

  // Near-duplicate titles in catalog
  for (const peer of ctx.peers) {
    if (peer.recipeId === input.recipeId) continue;
    if (peer.titleKey === tk) continue;
    const sim = tokenJaccard(input.title, peer.title);
    if (sim >= 0.85) {
      flags.push(
        flag("near_duplicate_title", "warning", `title similar to "${peer.title}"`, "title", {
          peerSlug: peer.slug,
          similarity: Math.round(sim * 100),
        }),
      );
      break;
    }
  }

  // Missing core content (publish blockers)
  const ingNames = input.ingredients.map((i) => i.name.trim()).filter(Boolean);
  if (ingNames.length === 0) {
    flags.push(flag("ingredients_empty", "critical", "no ingredients listed", "ingredients"));
  }
  if (input.steps.length === 0) {
    flags.push(flag("steps_missing", "critical", "no instruction steps", "steps"));
  } else if (input.steps.length < 2) {
    flags.push(flag("steps_missing", "critical", "fewer than 2 instruction steps", "steps"));
  }

  // 2–3. Ingredients: exact dup + near-dup + thin list
  const seenExact = new Set<string>();
  if (ingNames.length > 0 && ingNames.length < 6) {
    flags.push(flag("thin_ingredient_list", "warning", `only ${ingNames.length} ingredients`, "ingredients"));
  }
  for (let i = 0; i < ingNames.length; i++) {
    const a = ingNames[i];
    const key = a.toLowerCase();
    if (seenExact.has(key)) {
      flags.push(flag("duplicate_ingredient", "warning", `duplicate ingredient: ${a}`, "ingredients"));
    }
    seenExact.add(key);
    for (let j = i + 1; j < ingNames.length; j++) {
      const sim = ingredientSimilarity(a, ingNames[j]);
      if (sim >= 0.88 && sim < 1) {
        flags.push(
          flag(
            "near_duplicate_ingredient",
            "warning",
            `near-duplicate ingredients: "${a}" / "${ingNames[j]}"`,
            "ingredients",
            { similarity: Math.round(sim * 100) },
          ),
        );
      }
    }
  }

  // 3. Similar recipe structure (catalog peers)
  const myStruct = structureKey({
    stepCount: input.steps.length,
    ingredientCount: ingNames.length,
    headings: input.steps.map((s) => s.heading || ""),
    mealFormat: input.mealFormat,
  });
  for (const peer of ctx.peers) {
    if (peer.recipeId === input.recipeId) continue;
    if (peer.structureKey !== myStruct) continue;
    const titleSim = levenshteinRatio(titleKey(input.title), peer.titleKey);
    if (titleSim < 0.5) continue;
    flags.push(
      flag("similar_recipe_structure", "warning", `structure matches "${peer.slug}"`, "steps", {
        peerSlug: peer.slug,
        structureKey: myStruct,
      }),
    );
    break;
  }

  // 4–5. Steps: repeated, weak, thin
  if (input.steps.length < 4) {
    flags.push(flag("thin_step_count", "warning", `only ${input.steps.length} steps`, "steps"));
  }
  const bodies = input.steps.map((s) => s.body.trim().toLowerCase()).filter(Boolean);
  const bodySet = new Set<string>();
  let repeated = false;
  for (const b of bodies) {
    if (bodySet.has(b)) repeated = true;
    bodySet.add(b);
  }
  if (repeated) flags.push(flag("repeated_step_text", "warning", "repeated step instructions", "steps"));

  let weakCount = 0;
  let thinCount = 0;
  let fillerCount = 0;
  for (let i = 0; i < input.steps.length; i++) {
    const body = (input.steps[i].body || "").trim();
    const words = body.split(/\s+/).filter(Boolean).length;
    if (FILLER_STEP.test(body) || WEAK_STEP.test(body)) {
      fillerCount++;
      flags.push(flag("step_filler", "warning", `step ${i + 1} is generic filler`, "steps"));
    } else if (body.length < MIN_STEP_CHARS || words < MIN_STEP_WORDS) {
      thinCount++;
      flags.push(flag("thin_step", "warning", `step ${i + 1} is very short`, "steps"));
    }
    if (WEAK_STEP.test(body)) weakCount++;
  }
  if (weakCount > 0) flags.push(flag("weak_step", "warning", `${weakCount} weak step(s)`, "steps"));
  const shortRatio = thinCount / Math.max(1, input.steps.length);
  if (shortRatio >= 0.4) {
    flags.push(flag("thin_step", "warning", "many steps lack cooking detail", "steps", { thinCount }));
  }
  if (fillerCount >= Math.ceil(input.steps.length * 0.4)) {
    flags.push(flag("step_filler", "warning", "too many placeholder steps", "steps"));
  }

  // 6. Metadata
  const metaIssues = metadataQaIssues(input.metadata, {
    forPublish: input.status === "published",
  });
  const inferredEquip = inferEquipmentFromSteps(input.steps);
  const impliedEquipment = hasImpliedEquipment(input.steps, input.metadata?.equipment);
  const publishGate = input.status === "published" || input.status === "approved";
  if (!input.metadata && publishGate) {
    flags.push(flag("missing_metadata", "critical", "missing recipe metadata required for publish", "metadata"));
  }
  for (const issue of metaIssues) {
    if (issue.field === "equipment" && impliedEquipment) continue;
    if (issue.severity === "error") {
      if (publishGate) {
        flags.push(flag("missing_metadata", "critical", issue.message, "metadata", { field: issue.field }));
      } else {
        flags.push(flag("metadata_incomplete", "info", issue.message, "metadata", { field: issue.field }));
      }
      continue;
    }
    flags.push(flag("metadata_incomplete", "info", issue.message, "metadata", { field: issue.field }));
  }
  const completeness = input.metadataCompleteness ?? 0;
  if (completeness > 0 && completeness < 70) {
    flags.push(
      flag("metadata_incomplete", "info", `metadata ${completeness}% complete`, "metadata", {
        completeness,
      }),
    );
  }
  if (inferredEquip.length > 0) {
    flags.push(
      flag("metadata_incomplete", "info", `equipment implied by steps: ${inferredEquip.join(", ")}`, "equipment", {
        equipment: inferredEquip,
      }),
    );
  }

  // 7. Unrealistic cook times
  const prep = input.prepMinutes || 0;
  const cook = input.cookMinutes || 0;
  const total = input.totalMinutes || 0;
  if (total > 0 && total < prep + cook - 10) {
    flags.push(
      flag("unrealistic_prep_cook_split", "warning", "total time less than prep + cook", "timing"),
    );
  }
  if (total > 0 && total < 10 && input.steps.length >= 4) {
    flags.push(flag("unrealistic_total_time", "warning", "total time under 10 min for multi-step recipe", "timing"));
  }
  if (total > 480) {
    flags.push(flag("unrealistic_total_time", "warning", "total time over 8 hours", "timing"));
  }
  if (cook === 0 && COOK_VERBS.test(input.steps.map((s) => s.body).join(" "))) {
    flags.push(flag("unrealistic_total_time", "warning", "cook time 0 but steps imply heat", "timing"));
  }
  const impliedActive = input.steps.filter((s) => COOK_VERBS.test(s.body)).length;
  if (total > 0 && impliedActive >= 3 && total / impliedActive < 3) {
    flags.push(
      flag("unrealistic_total_time", "warning", "very little time per cooking step", "timing", {
        impliedActive,
      }),
    );
  }

  // 8. Missing temperatures
  const heatSteps = input.steps.filter((s) => COOK_VERBS.test(s.body));
  const missingTemp = heatSteps.filter((s) => !TEMP_SIGNAL.test(s.body));
  if (missingTemp.length >= Math.max(2, Math.ceil(heatSteps.length * 0.5))) {
    flags.push(
      flag("missing_cook_temperature", "warning", `${missingTemp.length} heat step(s) without temperature cue`, "steps"),
    );
  }

  // 9. Ingredients referenced in steps but not in list
  const ingTokens = new Set<string>();
  for (const name of ingNames) {
    for (const w of name.toLowerCase().split(/\s+/)) {
      if (w.length >= 4) ingTokens.add(w);
    }
    ingTokens.add(name.toLowerCase());
  }
  const stepText = input.steps.map((s) => `${s.heading || ""} ${s.body}`).join(" ").toLowerCase();
  const PROTEIN_WORDS = [
    "chicken",
    "beef",
    "pork",
    "turkey",
    "salmon",
    "shrimp",
    "tofu",
    "sausage",
    "bacon",
    "ground beef",
    "ground turkey",
  ];
  for (const word of PROTEIN_WORDS) {
    if (!stepText.includes(word)) continue;
    const inList = [...ingTokens].some((t) => t.includes(word) || word.includes(t));
    if (!inList) {
      flags.push(
        flag("ingredient_missing_in_steps", "warning", `steps mention "${word}" but not in ingredient list`, "ingredients"),
      );
    }
  }

  // 10–11. Images — only block when production hero truly won't render
  const hero = (input.heroImage || "").trim();
  const thumb = (input.thumbImage || "").trim();
  if (hero && !isValidImageReference(hero)) {
    flags.push(flag("invalid_image_path", "critical", "invalid hero image path", "media"));
  }
  const availability = checkImageAvailability(hero, thumb, ctx.imageContext);
  const heroProdOk = availability.heroProductionOk;
  const thumbProdOk = availability.thumbProductionOk;

  if (hero.startsWith("/images/") && heroProdOk === false) {
    const sev = publishGate ? "critical" : "info";
    flags.push(
      flag(
        "missing_local_image",
        sev,
        publishGate
          ? "hero missing from app image roots (won't render in production)"
          : "hero file not on disk yet (draft)",
        "media",
      ),
    );
  } else if (hero.startsWith("assets/") && ctx.imageContext?.reviewAssetsDir && !availability.heroReviewOk) {
    flags.push(flag("missing_local_image", "info", "cached review asset missing (online URL may still work)", "media"));
  }
  if (thumb.startsWith("/images/") && thumbProdOk === false) {
    flags.push(flag("missing_local_image", "info", "thumbnail not on disk (hero may still render)", "media"));
  }

  if (hero) {
    const profile = buildCuratedMealImageProfile({
      slug: input.slug,
      title: input.title,
      protein: input.protein,
      cuisine: input.cuisine,
      mealFormat: input.mealFormat,
    });
    const gov = validateCuratedImageGovernance({
      profile,
      heroImage: hero,
      thumbImage: thumb,
      publishGate,
    });
    for (const m of gov.mismatches) {
      const sev =
        m.severity === "critical" && publishGate
          ? "critical"
          : m.severity === "critical"
            ? "warning"
            : m.severity;
      flags.push(flag("image_governance", sev, m.message, "media", { code: m.code, confidence: m.confidence }));
    }
    if (publishGate && governanceFailsBuild(gov)) {
      flags.push(
        flag(
          "image_governance",
          "critical",
          `image fails curated governance (confidence ${gov.mismatchConfidence})`,
          "media",
        ),
      );
    }
  }

  // 12. Short description
  const summary = (input.summary || "").trim();
  if (!summary || summary.length < 10) {
    flags.push(flag("short_description", "warning", "missing or unusable description", "summary"));
  } else if (summary.length < 40) {
    flags.push(flag("short_description", "info", "description is brief (acceptable)", "summary"));
  }

  // 12b. Punctuation / spacing formatting
  const spacingBlocks: Array<{ text: string; field: string }> = [];
  if (summary) spacingBlocks.push({ text: summary, field: "summary" });
  for (const s of input.steps) {
    if (s.heading) spacingBlocks.push({ text: s.heading, field: `step-${s.n}-heading` });
    if (s.body) spacingBlocks.push({ text: s.body, field: `step-${s.n}-body` });
  }
  for (const block of input.extraCopy || []) {
    if (block.trim()) spacingBlocks.push({ text: block, field: "copy" });
  }
  const spacingIssues = scanTextBlocksForSpacingIssues(spacingBlocks);
  if (spacingIssues.length > 0) {
    const samples = [...new Set(spacingIssues.map((i) => i.sample))].slice(0, 4);
    const sev = spacingIssues.some((i) => i.kind === "no_space_after_punct" || i.kind === "numbered_step")
      ? "warning"
      : "info";
    flags.push(
      flag(
        "formatting_spacing_issue",
        sev,
        `spacing: ${samples.join(", ")}`,
        "copy",
        { kinds: [...new Set(spacingIssues.map((i) => i.kind))], samples },
      ),
    );
  }

  // 13. Generic AI wording
  const wording = scanRecipeForAiWording({
    title: input.title,
    summary: input.summary,
    steps: input.steps,
  });
  if (wording.roboticTitle) {
    flags.push(flag("robotic_title", "critical", "title reads like system metadata", "title"));
  }
  if (wording.hits.length >= 3) {
    flags.push(
      flag("generic_ai_wording", "warning", `generic phrasing: ${wording.hits.slice(0, 5).join(", ")}`, "copy", {
        phrases: wording.hits.slice(0, 8),
      }),
    );
  } else if (wording.hits.length > 0) {
    flags.push(
      flag("generic_ai_wording", "info", `minor generic phrasing: ${wording.hits.join(", ")}`, "copy"),
    );
  }

  if (!input.tags?.length) {
    flags.push(flag("missing_tags", "info", "no tags", "tags"));
  }

  // Family / variant integrity
  if (!input.archetypeId) {
    flags.push(flag("family_missing_archetype", "info", "recipe not linked to archetype family", "family"));
  }
  if (input.recipeRole === "variant" && !input.parentRecipeId) {
    flags.push(flag("variant_missing_parent", "warning", "variant missing parent recipe", "family"));
  }
  if (input.parentRecipeId) {
    const parent = ctx.peers.find((p) => p.recipeId === input.parentRecipeId);
    if (!parent) {
      flags.push(flag("family_orphan_variant", "warning", "parent recipe not in catalog", "family"));
    }
  }

  for (const pair of ctx.variantNearDuplicates || []) {
    if (pair.recipeIdA !== input.recipeId && pair.recipeIdB !== input.recipeId) continue;
    if (pair.similarity < 82) continue;
    const otherSlug = pair.recipeIdA === input.recipeId ? pair.slugB : pair.slugA;
    flags.push(
      flag("variant_near_duplicate", "critical", `near-duplicate variant vs "${otherSlug}" (${pair.similarity}%)`, "family", {
        similarity: pair.similarity,
        peerSlug: otherSlug,
      }),
    );
  }

  return dedupeFlags(flags);
}

function dedupeFlags(flags: EditorialQaFlag[]): EditorialQaFlag[] {
  const seen = new Set<string>();
  const out: EditorialQaFlag[] = [];
  for (const f of flags) {
    const key = `${f.code}:${f.field || ""}:${f.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

export function buildCatalogContext(
  recipes: EditorialQaInput[],
): { titleCounts: Map<string, number>; peers: EditorialQaCatalogPeer[] } {
  const titleCounts = new Map<string, number>();
  const peers: EditorialQaCatalogPeer[] = [];
  for (const r of recipes) {
    const tk = titleKey(r.title);
    titleCounts.set(tk, (titleCounts.get(tk) ?? 0) + 1);
    peers.push({
      recipeId: r.recipeId,
      slug: r.slug,
      title: r.title,
      titleKey: tk,
      structureKey: structureKey({
        stepCount: r.steps.length,
        ingredientCount: r.ingredients.length,
        headings: r.steps.map((s) => s.heading || ""),
        mealFormat: r.mealFormat,
      }),
      archetypeId: r.archetypeId,
      recipeRole: r.recipeRole,
      parentRecipeId: r.parentRecipeId,
    });
  }
  return { titleCounts, peers };
}
