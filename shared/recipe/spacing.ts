/**
 * Editorial punctuation / spacing normalization for user-facing recipe copy.
 * Safe for temperatures, decimals, URLs, and common abbreviations.
 */

export type RecipeSpacingIssueKind =
  | "no_space_after_punct"
  | "double_space"
  | "numbered_step"
  | "punctuation_collision";

export interface RecipeSpacingIssue {
  kind: RecipeSpacingIssueKind;
  /** Short matched fragment for QA / logging */
  sample: string;
  field?: string;
}

const PRIVATE_USE = "\uE000";
const PRIVATE_END = "\uE001";

interface ProtectedSpan {
  placeholder: string;
  value: string;
}

function protectSpans(text: string): { text: string; spans: ProtectedSpan[] } {
  const spans: ProtectedSpan[] = [];
  let n = 0;
  const protect = (match: string): string => {
    const placeholder = `${PRIVATE_USE}${n++}${PRIVATE_END}`;
    spans.push({ placeholder, value: match });
    return placeholder;
  };

  let t = text;
  t = t.replace(/https?:\/\/[^\s<>"']+/gi, protect);
  t = t.replace(/\bwww\.[^\s<>"']+/gi, protect);
  t = t.replace(/\d+\s*°\s*[FC]?\b/gi, protect);
  t = t.replace(/\b\d+\s*(?:degrees?\s*)?(?:F|C)\b/gi, protect);
  t = t.replace(/\d+\.\d+/g, protect);
  t = t.replace(/\d{1,3}(?:,\d{3})+(?:\.\d+)?/g, protect);
  t = t.replace(/\b(?:Mr|Mrs|Ms|Dr|Jr|Sr|vs|etc|approx|min|max|No)\./gi, protect);
  return { text: t, spans };
}

function restoreSpans(text: string, spans: ProtectedSpan[]): string {
  let out = text;
  for (const span of spans) {
    out = out.split(span.placeholder).join(span.value);
  }
  return out;
}

/**
 * Normalize spacing after punctuation so recipe copy reads like professionally edited prose.
 */
export function normalizeRecipeSpacing(text: string): string {
  const raw = text ?? "";
  if (!raw.trim()) return raw;

  const { text: protectedText, spans } = protectSpans(raw);
  let t = protectedText;

  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.replace(/(\.\)|\.\]|\.\})(?=[A-Za-z])/g, "$1 ");
  t = t.replace(/([\)\]\}])(?=[A-Za-z])/g, "$1 ");
  t = t.replace(/([,;:])(?=[A-Za-z])/g, "$1 ");
  t = t.replace(/(^|[\s(])(\d+)([.)])(?=[A-Za-z])/g, "$1$2$3 ");
  t = t.replace(/([a-z\)\]"'])\.([A-Z])/g, "$1. $2");
  t = t.replace(/\.{3,}/g, "...");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");

  return restoreSpans(t.trim(), spans);
}

const DETECTION_PATTERNS: Array<{ kind: RecipeSpacingIssueKind; re: RegExp }> = [
  { kind: "no_space_after_punct", re: /\.\)[A-Za-z]/ },
  { kind: "no_space_after_punct", re: /\.\][A-Za-z]/ },
  { kind: "no_space_after_punct", re: /\.\}[A-Za-z]/ },
  { kind: "no_space_after_punct", re: /[,;:][A-Za-z]/ },
  { kind: "numbered_step", re: /(?:^|\s)\d+[.)][A-Za-z]/ },
  { kind: "double_space", re: / {2,}/ },
  { kind: "punctuation_collision", re: /\.[A-Z]/ },
];

/**
 * Detect malformed spacing without mutating text (used by editorial QA).
 */
export function detectRecipeSpacingIssues(text: string, field?: string): RecipeSpacingIssue[] {
  const raw = (text || "").trim();
  if (!raw) return [];

  const { text: scanText } = protectSpans(raw);
  const issues: RecipeSpacingIssue[] = [];
  for (const { kind, re } of DETECTION_PATTERNS) {
    const m = scanText.match(re);
    if (!m) continue;
    if (kind === "punctuation_collision") {
      const idx = scanText.search(re);
      const before = scanText[idx - 1];
      if (before && /[a-z\)\]"']/.test(before)) {
        issues.push({ kind, sample: m[0], field });
      }
      continue;
    }
    if (kind === "no_space_after_punct" && /,\d/.test(m[0])) continue;
    issues.push({ kind, sample: m[0], field });
  }
  return issues;
}

export function scanTextBlocksForSpacingIssues(
  blocks: Array<{ text: string; field: string }>,
): RecipeSpacingIssue[] {
  const out: RecipeSpacingIssue[] = [];
  for (const { text, field } of blocks) {
    out.push(...detectRecipeSpacingIssues(text, field));
  }
  return out;
}

/** Collect user-facing copy from a generate-response blob (does not mutate). */
export function collectGenerateResponseCopy(gr: Record<string, unknown> | null | undefined): string[] {
  if (!gr || typeof gr !== "object") return [];
  const lines: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string" && v.trim()) lines.push(v);
  };
  push(gr.title);
  push(gr.why_it_fits_tonight);
  push(gr.cleanup_tip);
  if (Array.isArray(gr.pro_tips)) gr.pro_tips.forEach(push);
  if (Array.isArray(gr.budget_tips)) gr.budget_tips.forEach(push);
  if (Array.isArray(gr.steps)) {
    for (const s of gr.steps) {
      if (!s || typeof s !== "object") continue;
      const step = s as Record<string, unknown>;
      push(step.heading);
      push(step.body);
      push(step.title);
      push(step.instruction);
    }
  }
  const plating = gr.plating as Record<string, unknown> | undefined;
  if (plating) {
    push(plating.leftovers);
    push(plating.assembly_instructions);
    if (Array.isArray(plating.optional_toppings)) plating.optional_toppings.forEach(push);
  }
  if (Array.isArray(gr.protein_safety)) {
    for (const ps of gr.protein_safety) {
      if (!ps || typeof ps !== "object") continue;
      push((ps as Record<string, unknown>).notes);
      push((ps as Record<string, unknown>).probe_where);
    }
  }
  return lines;
}

/** Apply spacing normalization to known text fields on a generate-response object. */
export function normalizeGenerateResponseCopy(gr: Record<string, unknown>): Record<string, unknown> {
  if (!gr || typeof gr !== "object") return gr;
  const out: Record<string, unknown> = { ...gr };

  const norm = (v: unknown) => (typeof v === "string" ? normalizeRecipeSpacing(v) : v);

  if (typeof out["title"] === "string") out["title"] = norm(out["title"]);
  if (typeof out["why_it_fits_tonight"] === "string") out["why_it_fits_tonight"] = norm(out["why_it_fits_tonight"]);
  if (typeof out["cleanup_tip"] === "string") out["cleanup_tip"] = norm(out["cleanup_tip"]);
  if (Array.isArray(out["pro_tips"])) out["pro_tips"] = (out["pro_tips"] as unknown[]).map(norm);
  if (Array.isArray(out["budget_tips"])) out["budget_tips"] = (out["budget_tips"] as unknown[]).map(norm);
  if (Array.isArray(out["steps"])) {
    out["steps"] = (out["steps"] as unknown[]).map((s) => {
      if (!s || typeof s !== "object") return s;
      const step = { ...(s as Record<string, unknown>) };
      if (typeof step.heading === "string") step.heading = norm(step.heading);
      if (typeof step.body === "string") step.body = norm(step.body);
      if (typeof step.title === "string") step.title = norm(step.title);
      if (typeof step.instruction === "string") step.instruction = norm(step.instruction);
      return step;
    });
  }
  if (out["plating"] && typeof out["plating"] === "object") {
    const plating = { ...(out["plating"] as Record<string, unknown>) };
    if (typeof plating.leftovers === "string") plating.leftovers = norm(plating.leftovers);
    if (typeof plating.assembly_instructions === "string") {
      plating.assembly_instructions = norm(plating.assembly_instructions);
    }
    if (Array.isArray(plating.optional_toppings)) {
      plating.optional_toppings = plating.optional_toppings.map(norm);
    }
    out["plating"] = plating;
  }
  if (Array.isArray(out["protein_safety"])) {
    out["protein_safety"] = (out["protein_safety"] as unknown[]).map((ps) => {
      if (!ps || typeof ps !== "object") return ps;
      const row = { ...(ps as Record<string, unknown>) };
      if (typeof row.notes === "string") row.notes = norm(row.notes);
      if (typeof row.probe_where === "string") row.probe_where = norm(row.probe_where);
      return row;
    });
  }
  return out;
}

/** Golden 100 static page — normalize editorial text fields only. */
export function normalizeGoldenRecipePageCopy(page: Record<string, unknown>): Record<string, unknown> {
  const out = { ...page };
  const norm = (v: unknown) => (typeof v === "string" ? normalizeRecipeSpacing(v) : v);
  if (typeof out.title === "string") out.title = norm(out.title);
  if (typeof out.subtitle === "string") out.subtitle = norm(out.subtitle);
  if (typeof out.description === "string") out.description = norm(out.description);
  for (const key of ["proTips", "tonightSpread", "leftovers"] as const) {
    if (Array.isArray(out[key])) out[key] = out[key].map(norm);
  }
  if (Array.isArray(out.steps)) {
    out.steps = out.steps.map((s) => {
      if (!s || typeof s !== "object") return s;
      const step = { ...(s as Record<string, unknown>) };
      if (typeof step.title === "string") step.title = norm(step.title);
      if (typeof step.instruction === "string") step.instruction = norm(step.instruction);
      return step;
    });
  }
  return out;
}
