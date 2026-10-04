/**
 * Published references cited by guides. Cooking and food-safety claims cite
 * food-safety agencies, university extension or nutrient databases; where USDA
 * and Health Canada differ, guides give both.
 */

import type { EditorialSource } from "./content-schema.js";

export const SRC = {
  usdaTemps: {
    label: "Safe Minimum Internal Temperature Chart",
    publisher: "USDA Food Safety and Inspection Service",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart",
  },
  hcTemps: {
    label: "Safe cooking temperatures",
    publisher: "Health Canada",
    url: "https://www.canada.ca/en/health-canada/services/general-food-safety-tips/safe-internal-cooking-temperatures.html",
  },
  usdaLeftovers: {
    label: "Leftovers and Food Safety",
    publisher: "USDA Food Safety and Inspection Service",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety",
  },
  hcLeftovers: {
    label: "Food safety tips for leftovers",
    publisher: "Health Canada",
    url: "https://www.canada.ca/en/health-canada/services/general-food-safety-tips/food-safety-tips-leftovers.html",
  },
  hcHome: {
    label: "Safe food handling in the home",
    publisher: "Health Canada",
    url: "https://www.canada.ca/en/health-canada/services/general-food-safety-tips/safe-food-handling-home.html",
  },
  hcPoultry: {
    label: "Poultry safety",
    publisher: "Health Canada",
    url: "https://www.canada.ca/en/health-canada/services/meat-poultry-fish-seafood-safety/poultry-safety.html",
  },
  usdaSlowCooker: {
    label: "Slow Cookers and Food Safety",
    publisher: "USDA Food Safety and Inspection Service",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/slow-cookers-and-food-safety",
  },
  usdaThaw: {
    label: "The Big Thaw: Safe Defrosting Methods",
    publisher: "USDA Food Safety and Inspection Service",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/big-thaw-safe-defrosting-methods",
  },
  foodCodeCooling: {
    label: "Food Code Fact Sheet #31: Cooling (FDA Food Code §3-501.14)",
    publisher: "Oregon Health Authority",
    url: "https://www.oregon.gov/oha/PH/HEALTHYENVIRONMENTS/FOODSAFETY/Documents/FactSheet31Cooling.pdf",
  },
  kidneyBeans: {
    label: "Cooking Dry Beans Safely (summarizing FDA guidance on kidney bean lectin)",
    publisher: "Kansas State University Research and Extension",
    url: "https://enewsletters.k-state.edu/youaskedit/2017/10/13/cooking-dry-beans-safely/",
  },
  usdaDangerZone: {
    label: '"Danger Zone" (40°F - 140°F)',
    publisher: "USDA Food Safety and Inspection Service",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/danger-zone-40f-140f",
  },
  usdaKeepFoodSafe: {
    label: "Keep Food Safe! Food Safety Basics",
    publisher: "USDA Food Safety and Inspection Service",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/steps-keep-food-safe",
  },
  usdaFreezing: {
    label: "Freezing and Food Safety",
    publisher: "USDA Food Safety and Inspection Service",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/freezing-and-food-safety",
  },
  usdaEggs: {
    label: "Shell Eggs from Farm to Table",
    publisher: "USDA Food Safety and Inspection Service",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/eggs/shell-eggs-farm-table",
  },
  usdaWashing: {
    label: "Washing Food: Does it Promote Food Safety?",
    publisher: "USDA Food Safety and Inspection Service",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/washing-food-does-it-promote-food-safety",
  },
  usdaCuttingBoards: {
    label: "Cutting Boards and Food Safety",
    publisher: "USDA Food Safety and Inspection Service",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/cutting-boards",
  },
  fdaAllergies: {
    label: "Food Allergies: What You Need to Know",
    publisher: "U.S. Food and Drug Administration",
    url: "https://www.fda.gov/food/buy-store-serve-safe-food/food-allergies-what-you-need-know",
  },
  hcAllergies: {
    label: "Food allergies",
    publisher: "Health Canada",
    url: "https://www.canada.ca/en/health-canada/services/food-allergies-intolerances/food-allergies.html",
  },
  usdaFoodData: {
    label: "FoodData Central",
    publisher: "U.S. Department of Agriculture, Agricultural Research Service",
    url: "https://fdc.nal.usda.gov/",
  },
} satisfies Record<string, EditorialSource>;
