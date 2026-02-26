import { log } from "./index";

export const STRUCTURE_TYPES = [
  "bowl",
  "wrap",
  "taco",
  "sandwich",
  "burger",
  "sheet-pan",
  "skillet",
  "stir-fry",
  "grill",
  "flatbread",
  "stuffed",
  "casserole",
  "bake",
  "soup-stew",
  "pasta",
  "rice-bake",
  "noodle-toss",
  "loaded-fries",
  "stuffed-bread",
  "one-pot",
  "breakfast-for-dinner",
] as const;

export type StructureType = (typeof STRUCTURE_TYPES)[number];

const APPLIANCE_COMPAT: Record<StructureType, string[]> = {
  "bowl": ["stove", "rice cooker", "instant pot", "oven", "grill", "air fryer", "microwave", "slow cooker"],
  "wrap": ["stove", "grill", "microwave", "oven", "air fryer"],
  "taco": ["stove", "grill", "oven", "air fryer"],
  "sandwich": ["stove", "grill", "oven", "air fryer", "microwave"],
  "burger": ["stove", "grill", "air fryer", "oven"],
  "sheet-pan": ["oven"],
  "skillet": ["stove"],
  "stir-fry": ["stove"],
  "grill": ["grill"],
  "flatbread": ["oven", "grill", "stove"],
  "stuffed": ["oven", "stove"],
  "casserole": ["oven"],
  "bake": ["oven"],
  "soup-stew": ["stove", "slow cooker", "instant pot"],
  "pasta": ["stove"],
  "rice-bake": ["oven", "stove", "rice cooker"],
  "noodle-toss": ["stove"],
  "loaded-fries": ["oven", "air fryer"],
  "stuffed-bread": ["oven"],
  "one-pot": ["stove", "instant pot", "slow cooker"],
  "breakfast-for-dinner": ["stove", "oven", "grill", "air fryer"],
};

const TIME_COMPAT: Record<StructureType, number> = {
  "bowl": 15,
  "wrap": 15,
  "taco": 15,
  "sandwich": 15,
  "burger": 20,
  "sheet-pan": 25,
  "skillet": 15,
  "stir-fry": 15,
  "grill": 20,
  "flatbread": 20,
  "stuffed": 30,
  "casserole": 30,
  "bake": 30,
  "soup-stew": 30,
  "pasta": 15,
  "rice-bake": 30,
  "noodle-toss": 15,
  "loaded-fries": 25,
  "stuffed-bread": 25,
  "one-pot": 20,
  "breakfast-for-dinner": 15,
};

const recentStructures: StructureType[] = [];
const MAX_RECENT = 5;

export function getRecentStructures(): StructureType[] {
  return [...recentStructures];
}

export function trackStructure(structure: StructureType) {
  const idx = recentStructures.indexOf(structure);
  if (idx !== -1) recentStructures.splice(idx, 1);
  recentStructures.unshift(structure);
  if (recentStructures.length > MAX_RECENT) {
    recentStructures.length = MAX_RECENT;
  }
}

function parseMaxTime(timeRange: string): number {
  const cleaned = timeRange.replace(/[^0-9\-]/g, "");
  const parts = cleaned.split("-").map(Number).filter(n => !isNaN(n));
  if (parts.length >= 2) return parts[1];
  if (parts.length === 1) return parts[0];
  return 60;
}

const STRUCTURE_WEIGHTS: Record<StructureType, number> = {
  "bowl": 1,
  "wrap": 3,
  "taco": 3,
  "sandwich": 3,
  "burger": 2,
  "sheet-pan": 3,
  "skillet": 3,
  "stir-fry": 3,
  "grill": 2,
  "flatbread": 2,
  "stuffed": 2,
  "casserole": 2,
  "bake": 2,
  "soup-stew": 2,
  "pasta": 3,
  "rice-bake": 2,
  "noodle-toss": 3,
  "loaded-fries": 2,
  "stuffed-bread": 2,
  "one-pot": 3,
  "breakfast-for-dinner": 2,
};

function displayToInternal(display: string): StructureType | null {
  const lower = display.toLowerCase().trim();
  for (const [key, val] of Object.entries(STRUCTURE_DISPLAY)) {
    if (val.toLowerCase() === lower || key === lower) return key as StructureType;
  }
  const fuzzy: Record<string, StructureType> = {
    "bowl": "bowl", "wrap": "wrap", "burrito": "wrap", "taco": "taco",
    "sandwich": "sandwich", "sub": "sandwich", "burger": "burger",
    "sheet pan": "sheet-pan", "skillet": "skillet", "stir fry": "stir-fry",
    "grill": "grill", "grilled": "grill", "flatbread": "flatbread",
    "stuffed": "stuffed", "casserole": "casserole", "bake": "bake",
    "soup": "soup-stew", "stew": "soup-stew", "soup/stew": "soup-stew",
    "pasta": "pasta", "one-pot": "one-pot", "one pot": "one-pot",
    "rice bake": "rice-bake", "noodle toss": "noodle-toss",
    "loaded fries": "loaded-fries", "stuffed bread": "stuffed-bread",
    "breakfast-for-dinner": "breakfast-for-dinner", "breakfast for dinner": "breakfast-for-dinner",
    "pizza night": "flatbread",
  };
  return fuzzy[lower] || null;
}

function weightedPick(pool: StructureType[]): StructureType {
  const totalWeight = pool.reduce((sum, s) => sum + STRUCTURE_WEIGHTS[s], 0);
  let rand = Math.random() * totalWeight;
  for (const s of pool) {
    rand -= STRUCTURE_WEIGHTS[s];
    if (rand <= 0) return s;
  }
  return pool[pool.length - 1];
}

export function pickStructure(
  appliances: string[],
  timeRange: string,
  clientRecentStyles: string[] = [],
  preferDifferentStyle: boolean = false,
  currentStyle?: string,
): StructureType {
  const maxTime = parseMaxTime(timeRange);
  const appLower = appliances.map(a => a.toLowerCase());

  const compatible = STRUCTURE_TYPES.filter(s => {
    if (TIME_COMPAT[s] > maxTime) return false;
    const allowed = APPLIANCE_COMPAT[s];
    return allowed.some(a => appLower.includes(a));
  });

  if (compatible.length === 0) {
    return "skillet";
  }

  const clientRecent: StructureType[] = clientRecentStyles
    .map(displayToInternal)
    .filter((s): s is StructureType => s !== null);

  const allRecent = new Set([...recentStructures, ...clientRecent]);

  let backToBack: StructureType | null = null;
  if (preferDifferentStyle && currentStyle) {
    backToBack = displayToInternal(currentStyle);
  } else if (allRecent.size > 0) {
    backToBack = clientRecent[0] || recentStructures[0] || null;
  }

  const last3 = [...new Set([...clientRecent.slice(0, 3), ...recentStructures.slice(0, 3)])].slice(0, 3);

  let pool = compatible.filter(s => s !== backToBack);
  if (pool.length === 0) pool = [...compatible];

  let narrower = pool.filter(s => !last3.includes(s));
  if (narrower.length > 0) pool = narrower;

  const pick = weightedPick(pool);
  log(`[structure] Picked "${pick}" from ${pool.length} options (${compatible.length} compatible, recent=[${[...allRecent].join(",")}], backToBack=${backToBack || "none"}, preferDiff=${preferDifferentStyle})`, "variety");
  return pick;
}

export const STRUCTURE_DISPLAY: Record<StructureType, string> = {
  "bowl": "Bowl",
  "wrap": "Wrap / Burrito",
  "taco": "Taco",
  "sandwich": "Sandwich / Sub",
  "burger": "Burger",
  "sheet-pan": "Sheet Pan",
  "skillet": "Skillet",
  "stir-fry": "Stir Fry",
  "grill": "Grilled",
  "flatbread": "Flatbread",
  "stuffed": "Stuffed",
  "casserole": "Casserole",
  "bake": "Bake",
  "soup-stew": "Soup / Stew",
  "pasta": "Pasta",
  "rice-bake": "Rice Bake",
  "noodle-toss": "Noodle Toss",
  "loaded-fries": "Loaded Fries",
  "stuffed-bread": "Stuffed Bread",
  "one-pot": "One-Pot",
  "breakfast-for-dinner": "Breakfast-for-Dinner",
};
