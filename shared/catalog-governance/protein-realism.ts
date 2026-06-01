/**
 * Firehall protein realism — every curated recipe must use grocery-store staples.
 * Walmart / No Frills / Food Basics / Costco / Sobeys — no special-trip proteins.
 */

export type ProteinRealismHit = {
  term: string;
  field: string;
  excerpt: string;
};

export type ProteinReplacement = {
  removedSlug: string;
  removedTitle: string;
  removedProtein: string;
  replacementSlug: string;
  replacementTitle: string;
  replacementProtein: string;
  collection: string;
};

/** Primary proteins that fail the firehall grocery-store test. */
export const FORBIDDEN_PROTEIN_PATTERNS: Array<{ term: string; re: RegExp }> = [
  { term: "catfish", re: /\bcatfish\b/i },
  { term: "swordfish", re: /\bswordfish\b/i },
  { term: "mahi-mahi", re: /\bmahi[\s-]?mahi\b/i },
  { term: "mahi", re: /\bmahi\b/i },
  { term: "halibut", re: /\bhalibut\b/i },
  { term: "barramundi", re: /\bbarramundi\b/i },
  { term: "grouper", re: /\bgrouper\b/i },
  { term: "octopus", re: /\boctopus\b/i },
  { term: "squid", re: /\b(squid|calamari)\b/i },
  { term: "mussels", re: /\bmussels?\b/i },
  { term: "clams", re: /\bclams?\b/i },
  { term: "oysters", re: /\boysters?\b/i },
  { term: "scallops", re: /\bscallops?\b/i },
  { term: "lobster", re: /\blobster\b/i },
  { term: "rabbit", re: /\brabbit\b/i },
  { term: "duck breast", re: /\bduck\s+breast\b/i },
  { term: "duck confit", re: /\bduck\s+confit\b/i },
  { term: "venison", re: /\bvenison\b/i },
  { term: "elk", re: /\belk\b/i },
  { term: "bison", re: /\bbison\b/i },
];

/** Pantry / false-positive phrases — not whole-protein removals. */
const FALSE_POSITIVE_RES: RegExp[] = [
  /\boyster\s+sauce\b/i,
  /\bduck\s+sauce\b/i,
  /\bgoat\s+cheese\b/i,
  /\blamb'?s?\s+lettuce\b/i,
  /\bchickpea\b/i,
];

export const PROTEIN_REPLACEMENTS: ProteinReplacement[] = [
  {
    removedSlug: "cajun-grilled-catfish-crew",
    removedTitle: "Black Iron Remoulade Catfish Plates",
    removedProtein: "catfish",
    replacementSlug: "cajun-grilled-cod-crew",
    replacementTitle: "Black Iron Remoulade Cod Plates",
    replacementProtein: "cod",
    collection: "bbq",
  },
  {
    removedSlug: "grilled-halibut-lemon-packets",
    removedTitle: "Caper-Butter Halibut Foil Packets",
    removedProtein: "halibut",
    replacementSlug: "grilled-cod-lemon-packets",
    replacementTitle: "Caper-Butter Cod Foil Packets",
    replacementProtein: "cod",
    collection: "bbq",
  },
  {
    removedSlug: "garlic-butter-scallop-skewers",
    removedTitle: "Champagne Tarragon Scallop Skewers",
    removedProtein: "scallops",
    replacementSlug: "garlic-butter-shrimp-skewers",
    replacementTitle: "Garlic Tarragon Shrimp Skewers",
    replacementProtein: "shrimp",
    collection: "bbq",
  },
  {
    removedSlug: "mediterranean-baked-fish-tray",
    removedTitle: "Mediterranean Baked Fish Tray",
    removedProtein: "halibut (ingredient option)",
    replacementSlug: "mediterranean-baked-fish-tray",
    replacementTitle: "Mediterranean Baked Cod Tray",
    replacementProtein: "cod",
    collection: "performance_meals",
  },
];

const APPROVED_STAPLE_PROTEINS = [
  "chicken",
  "beef",
  "pork",
  "turkey",
  "salmon",
  "cod",
  "shrimp",
  "tilapia",
  "fish",
  "seafood",
] as const;

function isFalsePositive(text: string, matchIndex: number, matched: string): boolean {
  const windowStart = Math.max(0, matchIndex - 20);
  const windowEnd = Math.min(text.length, matchIndex + matched.length + 20);
  const window = text.slice(windowStart, windowEnd);
  return FALSE_POSITIVE_RES.some((re) => re.test(window));
}

export function scanTextForForbiddenProteins(
  text: string,
  field: string,
): ProteinRealismHit[] {
  const hits: ProteinRealismHit[] = [];
  const t = text || "";
  for (const { term, re } of FORBIDDEN_PROTEIN_PATTERNS) {
    const m = re.exec(t);
    if (!m) continue;
    if (isFalsePositive(t, m.index, m[0]!)) continue;
    hits.push({
      term,
      field,
      excerpt: t.slice(Math.max(0, m.index - 30), m.index + m[0]!.length + 30).trim(),
    });
  }
  return hits;
}

export function auditRecipeProteinRealism(input: {
  slug: string;
  collection: string;
  title: string;
  fields: Record<string, string>;
}): ProteinRealismHit[] {
  const hits: ProteinRealismHit[] = [];
  for (const [field, text] of Object.entries(input.fields)) {
    hits.push(...scanTextForForbiddenProteins(text, field));
  }
  return hits;
}

export function approvedStapleProteins(): readonly string[] {
  return APPROVED_STAPLE_PROTEINS;
}
