#!/usr/bin/env tsx
/**
 * One-time helper to emit governance copy — run via apply-breakfast-governance instead.
 * Kept for regeneration if catalog titles change.
 */
import fs from "node:fs";
import path from "node:path";
import { BREAKFAST_CATALOG_SLUGS } from "../shared/breakfast-catalog/slug-registry.js";

const PAGES_DIR = path.join(process.cwd(), "client/public/catalog/breakfast/pages");

type Entry = { slug: string; title: string; tags: string[]; subtitle: string };

const PERFORMANCE = new Set([
  "apple-cinnamon-baked-oatmeal",
  "big-pot-savory-oats",
  "high-protein-parfaits",
  "protein-french-toast",
  "protein-pancake-tray",
]);

const SUBTITLE_OVERRIDES: Record<string, string> = {
  "bacon-egg-hash-skillet": "Crispy bacon, golden hash, and eggs in one cast-iron pan.",
  "bacon-hash-burritos": "Loaded burritos with bacon, potatoes, and eggs for the line.",
  "bbq-breakfast-hash": "Leftover BBQ pulled into a cast-iron hash with eggs on top.",
  "breakfast-sandwich-trays": "English muffins, sausage, eggs, and cheese for ten.",
  "buttermilk-pancakes": "Fluffy griddle pancakes stacked for a hungry crew.",
  "cast-iron-breakfast-skillet": "Potatoes, sausage, and eggs with crispy cast-iron edges.",
  "chorizo-breakfast-burritos": "Spicy chorizo burritos built for wrap-and-run mornings.",
  "crew-french-toast-bake": "Cinnamon French toast baked in a 9x13 for clean slices.",
  "hall-breakfast-burritos": "Big-batch burritos that hold warm between waves of eaters.",
  "ham-cheddar-egg-bake": "Ham, cheddar, and eggs baked for easy portioning.",
  "ham-pepper-skillet": "Ham, peppers, and eggs in one fast cast-iron skillet.",
  "protein-pancake-tray": "Protein-forward pancakes for training-day mornings.",
  "quick-egg-tacos": "Fast egg tacos when the crew needs food in fifteen minutes.",
  "sausage-egg-cheese-sandwiches": "Classic sausage, egg, and cheese on toasted buns.",
  "sheet-pan-breakfast-hash": "Sheet-pan hash with eggs cracked over the top.",
  "southwest-egg-bake": "Peppers, salsa, and pepper jack in a crew-sized egg bake.",
  "steakhouse-hash-skillet": "Steak bites, potatoes, and eggs in one cast-iron pan.",
  "big-pot-savory-oats": "One pot of savory oats with cheese, eggs, and a topping bar.",
  "high-protein-parfaits": "Greek yogurt parfaits with granola and berries — no stove required.",
  "turkey-sausage-burritos": "Leaner burritos that still feel like a real hall breakfast.",
  "turkey-sausage-egg-bake": "Turkey sausage and spinach baked for a lighter hall option.",
  "veggie-egg-burritos": "Peppers, spinach, and eggs wrapped for the vegetarian on shift.",
};

function hook(tags: string[], title: string): string {
  const t = tags.join(" ").toLowerCase();
  if (t.includes("burrito")) return "Wrap the line and feed staggered eaters without a soggy tortilla.";
  if (t.includes("skillet") || t.includes("cast-iron")) return "One pan, crispy edges, and eggs finished under a lid.";
  if (t.includes("bake") || t.includes("9x13") || t.includes("strata")) return "Bake it once, slice it clean, and hold it warm between runs.";
  if (t.includes("sandwich")) return "Handheld breakfast that survives the ride to the table and back.";
  if (t.includes("pancake") || t.includes("griddle")) return "Stack them high on a sheet pan and keep syrup on the side.";
  if (t.includes("poutine")) return "Hall-style poutine with fries, gravy, and breakfast on top.";
  if (t.includes("pizza")) return "Breakfast pizza on a sheet pan — cut squares and serve from the middle of the table.";
  if (t.includes("bbq")) return "Leftover smokehouse flavor turned into a morning hash the crew will actually vote for.";
  if (t.includes("oat")) return "Batch oats with real toppings — built for crews who want fuel without the diner bill.";
  if (t.includes("parfait") || t.includes("yogurt")) return "No stove, no stress — build bowls fast when the hall is already moving.";
  if (title.toLowerCase().includes("red lead")) return "The hall's signature sauce meets breakfast hash — a crew favorite with real station cred.";
  return "Built for feeding a hungry crew after a busy night — practical timing, real portions, and hall kitchen workflow.";
}

function describe(entry: Entry): string {
  const slug = entry.slug;
  const title = entry.title;
  const isPerf = PERFORMANCE.has(slug);

  const EXPLICIT: Record<string, string> = {
    "apple-cinnamon-baked-oatmeal":
      "Warm oat squares with apple and cinnamon — portioned from a 9x13 so ten firefighters get the same bowl without standing over a pot. Holds in a low oven between eaters.",
    "bacon-egg-hash-skillet":
      "A firehall favorite built for feeding a hungry crew. Crispy bacon, golden hash browns, and eggs in one cast-iron pan — dependable breakfast after a busy night.",
    "bacon-hash-burritos":
      "Bacon, potatoes, and scrambled eggs rolled tight in flour tortillas. Wrap a tray for the line, hold warm in the oven, and let the crew grab one between radio checks.",
    "bagel-lox-breakfast-board":
      "Toasted bagels with lox, cream cheese, capers, and fixings laid out for self-serve. A lighter hall breakfast that still feels like a treat when the budget allows.",
    "bbq-breakfast-hash":
      "Pulled pork or brisket folded into crispy potato hash with eggs cracked on top. Leftover BBQ becomes a breakfast the crew votes for — extra sauce on the side.",
    "belgian-waffle-platter":
      "Crisp Belgian waffles stacked on a platter with butter and syrup. Griddle in batches, hold warm, and let the crew build their own plate.",
    "big-pot-savory-oats":
      "One big pot of savory oats with a topping bar — cheese, green onion, hot sauce, and soft eggs. Performance-minded shift fuel for crews tracking macros.",
    "biscuit-french-toast-sliders":
      "Buttermilk biscuits dipped in custard, baked golden, and sandwiched with sausage and maple glaze. Handheld, sweet-savory, and built for a tray on the table.",
    "breakfast-crunchwraps":
      "Griddled wraps with eggs, sausage, hash, and cheese folded tight so nothing falls out on the way to the couch. Batch-build and hold under foil.",
    "breakfast-enchiladas":
      "Corn tortillas rolled with scrambled eggs and sausage, smothered in enchilada sauce and cheese, baked until bubbling. Cut squares from a casserole dish — pure hall comfort.",
    "breakfast-fried-rice-crew":
      "Day-old rice, bacon, eggs, and soy in a wok or flat-top — fast, salty, and perfect for using up leftovers after a big dinner cook.",
    "breakfast-nachos-supreme":
      "Tortilla chips loaded with scrambled eggs, sausage, cheese, and salsa on a sheet pan. Messy in the best way — serve with hot sauce and let the crew dig in.",
    "breakfast-poutine":
      "Crispy fries, rich gravy, cheese curds, and a fried egg on top. Canadian firehall comfort that hits after an overnight.",
    "breakfast-quesadillas":
      "Flour tortillas stuffed with eggs, cheese, and peppers, griddled crisp and cut into wedges. Stack on a tray and serve with salsa and sour cream.",
    "breakfast-sandwich-trays":
      "English muffins toasted, sausage cooked, eggs scrambled — assemble a full tray of breakfast sandwiches so ten people eat at once without waiting on one griddle.",
    "breakfast-sliders":
      "Mini brioche buns with sausage, egg, and cheese — slider format for crews who want variety without cooking ten different things.",
    "breakfast-stromboli-roll":
      "Pizza dough rolled with scrambled eggs, ham, and cheese, baked golden and sliced into rings. One big roll feeds the hall and reheats clean.",
    "buttermilk-pancakes":
      "Fluffy buttermilk pancakes from a big batch of batter — griddle in waves, stack on sheet pans in a warm oven, and pass the syrup.",
    "cast-iron-breakfast-skillet":
      "Potatoes par-cooked then crisped in cast iron with sausage, onions, and eggs cracked on top under a lid. The skillet breakfast every hall knows.",
    "chicken-and-waffles-crew":
      "Crispy chicken tenders with Belgian waffles on a platter — sweet, salty, and big enough for a crew that earned a splurge breakfast.",
    "chilaquiles-verde-bake":
      "Tortilla chips baked in green salsa with eggs and cheese — Mexican breakfast casserole style that feeds ten from one pan.",
    "chorizo-breakfast-burritos":
      "Spicy chorizo, potatoes, and eggs rolled in warm tortillas. Bold flavor, line-friendly wraps, and hot sauce within arm's reach.",
    "chorizo-breakfast-hash":
      "Chorizo, potatoes, and eggs in cast iron with a hit of cumin and paprika. Crispy edges, runny yolks optional, serve straight from the pan.",
    "club-sandwich-breakfast-bake":
      "Layers of bread, turkey, bacon, tomato, and egg custard baked like a strata. Slice into squares — club sandwich energy without stacking ten sandwiches by hand.",
    "corned-beef-hash-breakfast":
      "Corned beef and potatoes crisped in a skillet with eggs on top. Diner classic scaled for the firehall — especially good after St. Patrick's or leftover corned beef.",
    "country-fried-steak-eggs":
      "Crispy country-fried steak with gravy, eggs, and hash browns on a platter. A heavy breakfast for days off or when the crew needs real comfort food.",
    "cowboy-breakfast-skillet":
      "Black beans, peppers, potatoes, and eggs with cheddar in cast iron — Southwest cowboy breakfast that fills the hall.",
    "crew-french-toast-bake":
      "Day-old bread soaked in cinnamon custard, baked in a 9x13, and sliced into squares. Maple syrup on the side — easier than standing at the griddle for an hour.",
    "denver-breakfast-casserole":
      "Ham, bell peppers, onion, and cheddar baked with eggs — the Denver omelette in casserole form for ten hungry firefighters.",
    "eggs-benedict-hall-style":
      "Poached eggs, Canadian bacon, and hollandaise on English muffins — hall-style benedict with a workflow that doesn't stall the whole kitchen.",
    "farmers-breakfast-casserole":
      "Sausage, hash browns, and cheese under a blanket of eggs in a deep pan. The farmhouse breakfast casserole every crew recognizes.",
    "fire-captain-omelette-bar":
      "Set up an omelette bar with beaten eggs, diced ham, peppers, cheese, and hot sauce. Everyone builds their own — lighter option that still feels like a real hall cook.",
    "firehall-breakfast-pizza":
      "Breakfast pizza on a sheet pan — eggs, sausage, cheese, and hash browns on dough. Cut squares, serve from the middle of the table, done.",
    "german-potato-breakfast-skillet":
      "German-style fried potatoes with bacon and eggs in one pan. Simple, crispy, and exactly what you'd expect on a European-influenced hall menu.",
    "green-chile-breakfast-burritos":
      "Green chile, potatoes, eggs, and cheese in flour tortillas — Southwest hall breakfast with real heat.",
    "hall-breakfast-burritos":
      "The standard hall burrito line: potatoes, sausage, eggs, and cheese in warm tortillas. Batch-build, hold warm, feed staggered eaters without remaking plates.",
    "hall-breakfast-wraps":
      "Flour wraps with scrambled eggs, turkey sausage, spinach, and cheese — lighter than a burrito but still handheld and line-friendly.",
    "hall-sausage-biscuits-gravy":
      "Flaky biscuits split open and smothered in peppery sausage gravy. A firehall classic that needs no introduction — make extra gravy.",
    "ham-cheddar-egg-bake":
      "Diced ham and cheddar baked into a custardy egg base — slice into squares and hold warm for crews eating in shifts.",
    "ham-pepper-skillet":
      "Diced ham, bell peppers, and eggs in cast iron. Fast one-pan breakfast when you need food on the table in under thirty minutes.",
    "high-protein-parfaits":
      "Greek yogurt, granola, and berries layered in bowls — no stove required. Performance breakfast for crews tracking protein between training and shift.",
    "huevos-rancheros-crew":
      "Corn tortillas, fried eggs, ranchero sauce, and beans on a platter — Mexican breakfast classic scaled for ten with cilantro and lime on the side.",
    "irish-breakfast-fry-up":
      "Bacon, sausage, eggs, beans, tomatoes, and toast on a full English-Irish spread. Weekend breakfast when the hall has time to cook everything at once.",
    "johnnycakes-with-syrup":
      "Cornmeal johnnycakes griddled golden and stacked with butter and maple syrup. Old-school Northeast hall breakfast — simple and satisfying.",
    "lumberjack-breakfast-platter":
      "Eggs, bacon, sausage, pancakes, and hash browns on one big platter. The lumberjack spread for crews with big appetites after a long night.",
    "maple-sausage-pinwheels":
      "Puff pastry spirals with maple sausage and cheese, baked and sliced into rounds. Sweet-savory handhelds that disappear fast from the tray.",
    "migas-for-the-crew":
      "Crispy tortilla strips scrambled with eggs, peppers, and cheese — Texas migas scaled for the whole hall with salsa on the side.",
    "monte-cristo-sandwiches":
      "Ham and cheese sandwiches dipped in egg batter, griddled golden, dusted with powdered sugar. Serve with jam — sweet-savory hall brunch energy.",
    "overnight-french-toast-bake":
      "Assemble the night before, bake in the morning — custard-soaked bread with cinnamon that feeds ten without anyone standing at the stove at 0600.",
    "overnight-sausage-strata":
      "Sausage, bread, and cheese layered overnight with egg custard, baked until puffed and golden. Make-ahead hall breakfast for early shift change.",
    "protein-french-toast":
      "French toast built with extra protein — egg-heavy batter and Greek yogurt in the mix. Training-day breakfast that still tastes like weekend French toast.",
    "protein-pancake-tray":
      "Pancakes boosted with Greek yogurt or protein powder, griddled in batches and held warm. For crews who want muscle fuel without skipping breakfast.",
    "quick-egg-tacos":
      "Scrambled eggs, cheese, and salsa in warm tortillas — fifteen-minute breakfast when the tones drop and the crew still needs to eat.",
    "red-lead-skillet":
      "The official Red Lead sauce folded into a breakfast hash with potatoes, sausage, and eggs. Station signature flavor — crew-approved and hall-authentic.",
    "sausage-egg-cheese-sandwiches":
      "Sausage patty, folded egg, and melted cheese on a toasted bun — the breakfast sandwich every firefighter knows. Batch on a griddle and wrap in foil for the line.",
    "scrapple-and-eggs-skillet":
      "Mid-Atlantic scrapple crisped in cast iron with eggs on top. Regional hall classic for crews who grew up on it.",
    "sheet-pan-breakfast-hash":
      "Potatoes, sausage, and peppers roasted on a sheet pan with eggs cracked over the top in the oven. One pan, easy cleanup, feeds ten.",
    "sheet-pan-breakfast-sandwiches":
      "Eggs baked on a sheet pan, cut into squares, and layered on toasted buns with sausage and cheese. Ten sandwiches without flipping eggs one at a time.",
    "sheet-pan-full-english":
      "Bacon, sausage, tomatoes, mushrooms, and eggs roasted on sheet pans — full English breakfast without ten pans on the stove.",
    "shrimp-and-grits-breakfast":
      "Creamy grits with sautéed shrimp and andouille — coastal hall breakfast that feels special without being fussy.",
    "smoked-salmon-benedit":
      "Poached eggs and smoked salmon with hollandaise on English muffins — lighter benedict for crews who want fish instead of Canadian bacon.",
    "southwest-egg-bake":
      "Pepper jack, salsa, and bell peppers baked into a Southwest egg casserole — slice, serve, and pass the hot sauce.",
    "steakhouse-hash-skillet":
      "Bite-size steak, crispy potatoes, and eggs in cast iron. Steakhouse breakfast hash for crews who want protein and potatoes in one pan.",
    "tater-tot-breakfast-casserole":
      "Tater tots, sausage, and cheese under baked eggs — tater tot hot dish meets breakfast casserole. Crowd-pleaser every time.",
    "turkey-sausage-burritos":
      "Turkey sausage, potatoes, and eggs in warm tortillas — leaner burritos that still taste like a real hall breakfast, not diet food.",
    "turkey-sausage-egg-bake":
      "Turkey sausage and spinach baked with eggs and cheese — lighter egg bake for crews watching fat without giving up a hot breakfast.",
    "veggie-egg-burritos":
      "Peppers, spinach, and scrambled eggs in flour tortillas — vegetarian option that still feeds the line with real flavor and hot sauce.",
  };

  if (EXPLICIT[slug]) return EXPLICIT[slug];
  const lead = isPerf
    ? `${title} — performance-minded shift fuel.`
    : `A firehall favorite built for feeding a hungry crew.`;
  return `${lead} ${hook(entry.tags, title)}`;
}

function subtitle(entry: Entry): string | undefined {
  if (SUBTITLE_OVERRIDES[entry.slug]) return SUBTITLE_OVERRIDES[entry.slug];
  const sub = entry.subtitle.trim();
  if (/A practical station breakfast|scales from 4 to 12/i.test(sub)) return undefined;
  return sub.length >= 10 ? sub : undefined;
}

function readEntry(slug: string): Entry {
  const pagePath = path.join(PAGES_DIR, `${slug}.json`);
  const page = JSON.parse(fs.readFileSync(pagePath, "utf8")) as Entry & { title: string };
  return {
    slug,
    title: page.title,
    tags: page.tags ?? [],
    subtitle: page.subtitle ?? "",
  };
}

const copy: Record<string, { description: string; subtitle?: string }> = {};
for (const slug of BREAKFAST_CATALOG_SLUGS) {
  const entry = readEntry(slug);
  copy[slug] = { description: describe(entry), subtitle: subtitle(entry) };
}

const out = path.join(process.cwd(), "shared/breakfast-catalog/governance-copy.ts");
const body = `/** Auto-built firefighter-voice breakfast copy — do not hand-edit; regenerate via apply-breakfast-governance. */\nexport const BREAKFAST_GOVERNANCE_COPY: Record<string, { description: string; subtitle?: string }> = ${JSON.stringify(copy, null, 2)};\n`;
fs.writeFileSync(out, body, "utf8");
console.log(`Wrote ${Object.keys(copy).length} entries → ${out}`);
