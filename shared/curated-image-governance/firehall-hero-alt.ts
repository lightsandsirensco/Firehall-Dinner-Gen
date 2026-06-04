/**
 * Default heroImageAlt text — satisfies meal-image completeness firehall framing checks.
 */

export function buildFirehallHeroImageAlt(title: string, spread?: string[]): string {
  const t = title.toLowerCase();

  if (/\b(tikka masala|butter chicken)\b/.test(t)) {
    const base = `Wide firehall platter: ${title} with basmati rice beside saucy chicken on a crew prep table, family-style`;
    return base.length > 160 ? `${base.slice(0, 157)}…` : base;
  }
  if (/\bcaesar\b/.test(t)) {
    const base = `Wide firehall bowl of ${title} with chopped romaine, diced grilled chicken mixed through, croutons, and parmesan on a prep table`;
    return base.length > 160 ? `${base.slice(0, 157)}…` : base;
  }
  if (/\bflank\b.*\bchimichurri\b|\bchimichurri\b.*\bflank\b/.test(t)) {
    const base = `Wide firehall crew platter: sliced flank steak with bright green chimichurri sauce beside roasted potatoes on a station prep table, family-style`;
    return base.length > 160 ? `${base.slice(0, 157)}…` : base;
  }
  if (/\bpasta\s+e\s+ceci\b|\bchickpea/i.test(t)) {
    const base = `Wide firehall hotel pan of creamy pasta e ceci with visible chickpeas and ditalini pasta on a crew prep table, family-style`;
    return base.length > 160 ? `${base.slice(0, 157)}…` : base;
  }
  if (/\bcajun\b.*\brice\b.*\bbowl\b|\bcajun chicken rice\b/.test(t)) {
    const base = `Wide firehall bowl line: blackened Cajun chicken over white rice with sautéed peppers on a station prep table, family-style`;
    return base.length > 160 ? `${base.slice(0, 157)}…` : base;
  }
  if (/\bshrimp\b.*\bquinoa\b|\bquinoa\b.*\bshrimp\b/.test(t)) {
    const base = `Wide firehall platter: grilled shrimp over fluffy quinoa with vegetables on a crew prep table, family-style`;
    return base.length > 160 ? `${base.slice(0, 157)}…` : base;
  }
  if (/\bpepper\s*steak\b/.test(t)) {
    const base = `Wide firehall platter: pepper steak with sliced onions and bell peppers on a crew prep table, family-style`;
    return base.length > 160 ? `${base.slice(0, 157)}…` : base;
  }
  if (/\bbagel\b.*\blox\b|\blox\b.*\bbagel\b/.test(t)) {
    const base = `Wide firehall breakfast board with bagels, cream cheese, smoked salmon lox, capers, and red onion on a crew prep table, family-style platter`;
    return base.length > 160 ? `${base.slice(0, 157)}…` : base;
  }
  if (/\bbaked\s+oatmeal\b/.test(t)) {
    const base = `Wide firehall tray of baked oatmeal with mixed berries on a station prep table, family-style breakfast spread for the crew`;
    return base.length > 160 ? `${base.slice(0, 157)}…` : base;
  }
  if (/\bcountry\s+fried\s+steak\b/.test(t)) {
    const base = `Wide firehall breakfast platter: country-fried steak cutlet with white gravy, fried-egg zone, and hash-brown zone on a crew prep table, family-style`;
    return base.length > 160 ? `${base.slice(0, 157)}…` : base;
  }
  if (/\bjohnnycake/.test(t)) {
    const base = `Wide firehall platter of golden johnnycakes with butter and maple syrup on a crew breakfast prep table, family-style`;
    return base.length > 160 ? `${base.slice(0, 157)}…` : base;
  }
  if (/\blumberjack\b.*\bbreakfast\b/.test(t)) {
    const base = `Wide firehall breakfast platter: pancake stack zone, scrambled-egg zone, bacon strips, sausage, and hash browns — each component separate on the crew line, family-style`;
    return base.length > 160 ? `${base.slice(0, 157)}…` : base;
  }
  if (/\bscrapple\b/.test(t)) {
    const base = `Wide firehall cast-iron skillet breakfast with crispy scrapple and fried eggs on a crew prep table, family-style platter`;
    return base.length > 160 ? `${base.slice(0, 157)}…` : base;
  }
  if (/\bshrimp\b.*\bgrits\b|\bgrits\b.*\bshrimp\b/.test(t)) {
    const base = `Wide firehall breakfast platter: creamy stone-ground grits with sautéed shrimp piled on top on a station prep table, family-style`;
    return base.length > 160 ? `${base.slice(0, 157)}…` : base;
  }

  const sideLine = (spread ?? []).find((l) => /^sides?:/i.test(l.trim()));
  const sideHint = sideLine
    ? sideLine.replace(/^sides?:\s*/i, "").split(/[,;]/)[0]?.trim()
    : "";
  const base = sideHint
    ? `Wide firehall crew platter of ${title} beside ${sideHint} on a station prep table, family-style`
    : `Wide firehall crew platter of ${title} on a station prep table, family-style serving`;
  return base.length > 160 ? `${base.slice(0, 157)}…` : base;
}
