export const HALL_PROGRAM_HEADLINE = "Built For Fire Halls.";

export const HALL_PROGRAM_SUBHEADLINE =
  'End the "what\'s for dinner?" debate for every shift.';

export const HALL_PROGRAM_HOW_IT_WORKS = [
  {
    step: 1,
    title: "Create a linked hall",
    body: "Captains set up station identity — shifts, crew size, and appliances. Hall membership is free.",
  },
  {
    step: 2,
    title: "Cook and vote together",
    body: "Basic Hall Vote is free when connected. Personal meal tools stay on your own account.",
  },
  {
    step: 3,
    title: "Unlock Hall Pro for the crew",
    body: "Shared shopping list, meal history, staples, advanced vote, and grocery planning — billed per hall.",
  },
] as const;

export const HALL_PROGRAM_ROLE_SECTIONS = [
  {
    id: "cooks",
    title: "For cooks",
    body: "Pick tonight's meal in seconds, repeat crew favorites, and stop re-explaining the same recipes every shift.",
  },
  {
    id: "canteen_managers",
    title: "For canteen managers",
    body: "Track pantry staples, build shared shopping lists, and see what shifts actually cook — without spreadsheet chaos.",
  },
  {
    id: "captains",
    title: "For captains",
    body: "Manage members, assign roles, enable Hall Pro for your station, and give every shift a shared meal history.",
  },
] as const;

export const HALL_PROGRAM_BENEFITS = [
  "Shared Shopping List",
  "Hall Meal History",
  "Hall Staples",
  "Advanced Hall Vote",
  "Hall grocery planning",
] as const;

export const HALL_PROGRAM_PRICING_TIERS = [
  {
    plan_id: "guest" as const,
    name: "Free",
    tagline: "Cook tonight — no account needed",
    price_label: "Free",
  },
  {
    plan_id: "personal" as const,
    name: "Personal",
    tagline: "Your meals, synced across devices",
    price_label: "Free during preview",
  },
  {
    plan_id: "hall_pro" as const,
    name: "Hall Pro",
    tagline: "Crew collaboration — shared list, history, staples, vote, and grocery planning",
    price_label: "Per hall",
  },
] as const;
