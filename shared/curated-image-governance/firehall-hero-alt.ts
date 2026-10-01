/**
 * Default heroImageAlt text — names the dish and its visible sides. Alt text is read by
 * screen readers and search engines, so it must not carry image-prompt framing.
 */

const DISH_ALTS: Array<[RegExp, (title: string) => string]> = [
  [/\b(tikka masala|butter chicken)\b/, (title) => `${title} with basmati rice`],
  [/\bcaesar\b/, (title) => `${title} with chopped romaine, grilled chicken, croutons, and parmesan`],
  [/\bflank\b.*\bchimichurri\b|\bchimichurri\b.*\bflank\b/, () => "Sliced flank steak with bright green chimichurri sauce and roasted potatoes"],
  [/\bpasta\s+e\s+ceci\b|\bchickpea/, () => "Creamy pasta e ceci with chickpeas and ditalini pasta"],
  [/\bcajun\b.*\brice\b.*\bbowl\b|\bcajun chicken rice\b/, () => "Blackened Cajun chicken over white rice with sautéed peppers"],
  [/\bshrimp\b.*\bquinoa\b|\bquinoa\b.*\bshrimp\b/, () => "Grilled shrimp over fluffy quinoa with vegetables"],
  [/\bpepper\s*steak\b/, () => "Pepper steak with sliced onions and bell peppers"],
  [/\bbagel\b.*\blox\b|\blox\b.*\bbagel\b/, () => "Bagels with cream cheese, smoked salmon lox, capers, and red onion"],
  [/\bbaked\s+oatmeal\b/, () => "Baked oatmeal with mixed berries"],
  [/\bcountry\s+fried\s+steak\b/, () => "Country-fried steak with white gravy, fried eggs, and hash browns"],
  [/\bjohnnycake/, () => "Golden johnnycakes with butter and maple syrup"],
  [/\blumberjack\b.*\bbreakfast\b/, () => "Pancakes, scrambled eggs, bacon strips, sausage, and hash browns"],
  [/\bscrapple\b/, () => "Crispy scrapple and fried eggs in a cast-iron skillet"],
  [/\bshrimp\b.*\bgrits\b|\bgrits\b.*\bshrimp\b/, () => "Creamy stone-ground grits topped with sautéed shrimp"],
];

export function buildFirehallHeroImageAlt(title: string, spread?: string[]): string {
  const t = title.toLowerCase();
  const dish = DISH_ALTS.find(([re]) => re.test(t));

  let alt: string;
  if (dish) {
    alt = dish[1](title);
  } else {
    const sideLine = (spread ?? []).find((l) => /^sides?:/i.test(l.trim()));
    const sideHint = sideLine?.replace(/^sides?:\s*/i, "").split(/[,;]/)[0]?.trim();
    alt = sideHint ? `${title} with ${sideHint}` : title;
  }
  return alt.length > 160 ? `${alt.slice(0, 157)}…` : alt;
}
