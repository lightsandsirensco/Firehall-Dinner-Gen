import { EDITORIAL_QA_ENGINE_VERSION } from "./flags.js";
import { buildCatalogContext, runRecipeQaRules, type RuleContext } from "./rules.js";
import { scoreEditorialQa } from "./scoring.js";
import type {
  EditorialQaInput,
  EditorialQaOverrides,
  EditorialQaReport,
  EditorialQaFlag,
} from "./types.js";

export interface RunEditorialQaOptions {
  catalog?: EditorialQaInput[];
  assetCheck?: RuleContext["assetCheck"];
  imageContext?: RuleContext["imageContext"];
  variantNearDuplicates?: RuleContext["variantNearDuplicates"];
  includeSuppressed?: boolean;
}

function applyOverrides(
  flags: EditorialQaFlag[],
  overrides?: EditorialQaOverrides,
): { active: EditorialQaFlag[]; suppressed: EditorialQaFlag[] } {
  const suppress = new Set(overrides?.suppressFlags || []);
  if (suppress.size === 0) return { active: flags, suppressed: [] };
  const active: EditorialQaFlag[] = [];
  const suppressed: EditorialQaFlag[] = [];
  for (const f of flags) {
    if (suppress.has(f.code)) suppressed.push(f);
    else active.push(f);
  }
  return { active, suppressed };
}

/** Run QA for one recipe (requires catalog context for duplicate/structure checks). */
export function runEditorialQa(
  input: EditorialQaInput,
  ctx: Pick<RuleContext, "titleCounts" | "peers" | "variantNearDuplicates" | "imageContext"> & {
    assetCheck?: RuleContext["assetCheck"];
  },
): EditorialQaReport {
  const flags = runRecipeQaRules(input, {
    titleCounts: ctx.titleCounts,
    peers: ctx.peers,
    assetCheck: ctx.assetCheck,
    imageContext: ctx.imageContext,
    variantNearDuplicates: ctx.variantNearDuplicates,
  });
  const { active, suppressed } = applyOverrides(flags, input.qaOverrides);
  const scored = scoreEditorialQa(active);

  return {
    engineVersion: EDITORIAL_QA_ENGINE_VERSION,
    recipeId: input.recipeId,
    slug: input.slug,
    overallScore: scored.overallScore,
    dimensionScores: scored.dimensionScores,
    publishReady: scored.publishReady,
    flags,
    activeFlags: active,
    suppressedFlags: suppressed,
    criticalCount: scored.criticalCount,
    warningCount: scored.warningCount,
    infoCount: scored.infoCount,
    blockedReasons: scored.blockedReasons,
    overrides: input.qaOverrides,
  };
}

/** Batch QA across a catalog slice */
export function runEditorialQaBatch(
  recipes: EditorialQaInput[],
  opts: RunEditorialQaOptions = {},
): EditorialQaReport[] {
  const catalog = opts.catalog ?? recipes;
  const { titleCounts, peers } = buildCatalogContext(catalog);
  return recipes.map((r) =>
    runEditorialQa(r, {
      titleCounts,
      peers,
      assetCheck: opts.assetCheck,
      imageContext: opts.imageContext,
      variantNearDuplicates: opts.variantNearDuplicates,
    }),
  );
}
