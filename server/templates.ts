import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import type { TemplateRow, GenerateRequest } from "@shared/schema";

let cachedTemplates: TemplateRow[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000;

export async function loadTemplates(): Promise<TemplateRow[]> {
  const now = Date.now();
  if (cachedTemplates && now - cacheTimestamp < CACHE_TTL) {
    return cachedTemplates;
  }

  const csvPath = path.join(process.cwd(), "data", "firehall_templates_v1.csv");
  const content = fs.readFileSync(csvPath, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as TemplateRow[];

  cachedTemplates = records;
  cacheTimestamp = now;
  return records;
}

function parseTimeRange(range: string): [number, number] {
  const parts = range.split("-").map(Number);
  return [parts[0], parts[1]];
}

function timeRangesOverlap(requestRange: string, templateRange: string): boolean {
  const [reqMin, reqMax] = parseTimeRange(requestRange);
  const [tplMin, tplMax] = parseTimeRange(templateRange);
  return reqMin <= tplMax && tplMin <= reqMax;
}

export function filterTemplates(templates: TemplateRow[], request: GenerateRequest): TemplateRow[] {
  return templates.filter((t) => {
    const busyLevels = t.busy_level_fit.split("|").map((s) => s.trim().toLowerCase());
    if (!busyLevels.includes(request.busy_level.toLowerCase())) {
      return false;
    }

    if (!timeRangesOverlap(request.time_available, t.time_range_minutes)) {
      return false;
    }

    const templateAppliances = t.appliances_needed.split("|").map((s) => s.trim().toLowerCase());
    const requestAppliances = request.appliances.map((s) => s.toLowerCase());
    const hasAppliance = templateAppliances.some((a) => requestAppliances.includes(a));
    if (!hasAppliance) {
      return false;
    }

    const templateProteins = t.proteins_allowed.split("|").map((s) => s.trim().toLowerCase());
    const requestProteins = request.proteins.map((s) => s.toLowerCase());
    const resolvedTemplateProteins = templateProteins.flatMap((p) => {
      if (p === "pork sausage") return ["pork"];
      if (p === "chicken sausage") return ["chicken"];
      if (p === "turkey sausage") return ["turkey"];
      if (p === "beef sausage") return ["beef"];
      if (p === "sausage") return ["pork"];
      return [p];
    });
    const hasProtein = resolvedTemplateProteins.some((p) => requestProteins.includes(p));
    if (!hasProtein) {
      return false;
    }

    if (request.allergens_to_avoid.length > 0) {
      const templateAllergens = t.allergens_possible
        .split("|")
        .map((s) => s.trim().toLowerCase());
      const avoidSet = request.allergens_to_avoid.map((s) => s.toLowerCase());
      const hasAllergen = templateAllergens.some(
        (a) => a !== "none" && avoidSet.includes(a)
      );
      if (hasAllergen) {
        return false;
      }
    }

    return true;
  });
}

function resolveTemplateProteins(raw: string): string[] {
  return raw.split("|").map((s) => s.trim().toLowerCase());
}

function resolveToBase(protein: string): string {
  const p = protein.toLowerCase();
  if (p.includes("sausage")) {
    if (p.includes("chicken")) return "chicken";
    if (p.includes("turkey")) return "turkey";
    if (p.includes("beef")) return "beef";
    return "pork";
  }
  return p;
}

const LEAN_ORDER = ["chicken", "turkey", "fish", "shrimp", "tofu", "beans", "pork", "beef", "lamb"];

export function chooseProtein(
  template: TemplateRow,
  userProteins: string[],
  healthiness: string
): string {
  const templateProteins = resolveTemplateProteins(template.proteins_allowed);
  const userLower = userProteins.map((p) => p.toLowerCase());

  const compatible = userLower.filter((up) =>
    templateProteins.some((tp) => resolveToBase(tp) === up || tp === up)
  );

  if (compatible.length === 0) {
    const fallback = templateProteins.find((tp) => userLower.includes(resolveToBase(tp)));
    return fallback ? resolveToBase(fallback) : userLower[0];
  }

  if (compatible.length === 1) return compatible[0];

  if (healthiness === "lean") {
    const sorted = [...compatible].sort(
      (a, b) => (LEAN_ORDER.indexOf(a) === -1 ? 99 : LEAN_ORDER.indexOf(a)) -
                (LEAN_ORDER.indexOf(b) === -1 ? 99 : LEAN_ORDER.indexOf(b))
    );
    return sorted[0];
  }

  return compatible[Math.floor(Math.random() * compatible.length)];
}

export function pickTemplate(candidates: TemplateRow[], lastTemplateId?: number): TemplateRow {
  if (lastTemplateId !== undefined && candidates.length > 1) {
    const filtered = candidates.filter(
      (t) => parseInt(t.template_id) !== lastTemplateId
    );
    if (filtered.length > 0) {
      return filtered[Math.floor(Math.random() * filtered.length)];
    }
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}
