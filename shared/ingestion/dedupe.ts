import type { IngestRecipeDraft, TrendSignal } from "./recipe-ingest-schema.js";

export function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 64);
}

/** Stable dedupe key — prefer Spoonacular id, else title + publisher host */
export function recipeFingerprint(draft: Pick<IngestRecipeDraft, "title" | "spoonacularId" | "sourceUrl" | "curatedSlug">): string {
  if (draft.curatedSlug) return `curated:${draft.curatedSlug}`;
  if (draft.spoonacularId && draft.spoonacularId > 0) return `spoonacular:${draft.spoonacularId}`;

  let host = "";
  try {
    if (draft.sourceUrl) host = new URL(draft.sourceUrl).hostname.replace(/^www\./i, "");
  } catch {
    /* ignore */
  }
  return `title:${normalizeTitleKey(draft.title)}:${host}`;
}

export function trendSignalId(signal: Pick<TrendSignal, "source" | "keyword" | "destinationUrl">): string {
  const base = `${signal.source}:${signal.keyword}:${signal.destinationUrl || ""}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (Math.imul(31, h) + base.charCodeAt(i)) | 0;
  return `trend_${Math.abs(h).toString(36)}`;
}

function draftRank(d: IngestRecipeDraft): number {
  let r = d.qualityScore || 0;
  if (d.source === "publisher") r += 50;
  if (d.heroImage && !d.heroImage.includes("spoonacular.com")) r += 30;
  return r;
}

/** Dedupe by fingerprint — keep highest-quality draft (publisher beats Spoonacular). */
export function dedupeDrafts(drafts: IngestRecipeDraft[]): {
  unique: IngestRecipeDraft[];
  skipped: number;
} {
  const byFp = new Map<string, IngestRecipeDraft>();
  let skipped = 0;

  for (const d of drafts) {
    const fp = d.fingerprint || recipeFingerprint(d);
    const existing = byFp.get(fp);
    if (!existing) {
      byFp.set(fp, { ...d, fingerprint: fp });
      continue;
    }
    skipped++;
    if (draftRank(d) > draftRank(existing)) {
      byFp.set(fp, { ...d, fingerprint: fp });
    }
  }

  return { unique: [...byFp.values()], skipped };
}
