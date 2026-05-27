/**
 * Infer equipment from steps + optional metadata equipment list (read-only QA).
 */

const EQUIPMENT_TERMS: Array<{ re: RegExp; canonical: string }> = [
  { re: /\bskillet\b|\bfrying pan\b|\bcast[- ]iron\b/i, canonical: "skillet" },
  { re: /\bgrill\b|\bbbq\b|\bbarbecue\b/i, canonical: "grill" },
  { re: /\bsmoker\b/i, canonical: "smoker" },
  { re: /\boven\b/i, canonical: "oven" },
  { re: /\bsheet pan\b|\bsheetpan\b|\bbaking sheet\b/i, canonical: "sheet_pan" },
  { re: /\bsaucepan\b/i, canonical: "saucepan" },
  { re: /\bgriddle\b/i, canonical: "griddle" },
  { re: /\bdutch oven\b/i, canonical: "dutch_oven" },
  { re: /\bair fryer\b|\bair-fryer\b/i, canonical: "air_fryer" },
  { re: /\bslow cooker\b|\bcrock[- ]?pot\b/i, canonical: "slow_cooker" },
  { re: /\bstock ?pot\b|\blarge pot\b|\b(?:heavy|big) pot\b/i, canonical: "pot" },
  { re: /\bpot\b/i, canonical: "pot" },
];

export function inferEquipmentFromSteps(
  steps: Array<{ heading?: string; body: string }>,
): string[] {
  const blob = steps.map((s) => `${s.heading || ""} ${s.body}`).join(" ");
  const hits = new Set<string>();
  for (const t of EQUIPMENT_TERMS) {
    if (t.re.test(blob)) hits.add(t.canonical);
  }
  return [...hits];
}

export function hasImpliedEquipment(
  steps: Array<{ heading?: string; body: string }>,
  metadataEquipment?: string[],
): boolean {
  if (metadataEquipment?.length && !(metadataEquipment.length === 1 && metadataEquipment[0] === "none")) {
    return true;
  }
  return inferEquipmentFromSteps(steps).length > 0;
}
