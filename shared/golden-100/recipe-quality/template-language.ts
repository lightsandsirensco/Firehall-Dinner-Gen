/**
 * Detect generic template wording in curated recipe content.
 */

export const TEMPLATE_PHRASE_PATTERNS: Array<{ id: string; pattern: RegExp; message: string }> = [
  { id: "sear_protein", pattern: /\bsear protein\b/i, message: 'uses generic "sear protein"' },
  { id: "cook_protein", pattern: /\bcook protein\b/i, message: 'uses generic "cook protein"' },
  { id: "pat_protein", pattern: /\bpat protein dry\b/i, message: 'uses generic "pat protein dry"' },
  { id: "protein_and_veg", pattern: /\bprotein and veg\b/i, message: 'uses generic "protein and veg"' },
  { id: "rice_protein_veg", pattern: /\brice, protein, veg\b/i, message: "uses bowl assembly template" },
  { id: "assembly_line_step", pattern: /\bassembly line\b/i, message: 'uses "assembly line" template wording' },
  { id: "build_bowls_base", pattern: /build bowls base/i, message: "uses generic bowl spread template" },
  { id: "protein_of_choice", pattern: /protein of choice|favourite protein|favorite protein/i, message: "uses protein-of-choice placeholder" },
  { id: "your_choice", pattern: /\byour choice\b/i, message: 'uses "your choice" placeholder' },
  { id: "generic_salmon_chicken", pattern: /165°F chicken, 125°F salmon/i, message: "mentions salmon/chicken temps unrelated to recipe" },
  { id: "cook_the_main", pattern: /\bcook the main\b/i, message: 'uses "cook the main" template' },
  { id: "finish_and_serve", pattern: /\bfinish and serve\b/i, message: 'uses "finish and serve" template' },
];

export const TEMPLATE_STEP_TITLES = new Set([
  "sear protein and veg",
  "assembly line",
  "sear and finish",
  "cook the main",
  "finish and serve",
  "set the line",
  "build flavor",
]);

export function findTemplateLanguageInText(text: string): string[] {
  const hits: string[] = [];
  for (const { id, pattern, message } of TEMPLATE_PHRASE_PATTERNS) {
    if (pattern.test(text)) hits.push(`${id}: ${message}`);
  }
  return hits;
}

export function hasTemplateLanguage(text: string): boolean {
  return findTemplateLanguageInText(text).length > 0;
}
