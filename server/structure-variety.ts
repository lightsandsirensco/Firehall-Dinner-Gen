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

export function pickStructure(
  appliances: string[],
  timeRange: string,
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

  const notRecent = compatible.filter(s => !recentStructures.includes(s));
  const pool = notRecent.length > 0 ? notRecent : compatible;

  const pick = pool[Math.floor(Math.random() * pool.length)];
  log(`[structure] Picked "${pick}" from ${pool.length} options (${compatible.length} compatible, ${recentStructures.length} recent excluded)`, "variety");
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
