#!/usr/bin/env tsx
import { buildPizzaTemplate } from "../server/pizza-templates.js";
import { finalizePizzaRecipe } from "../server/pizza-finalize.js";

const req = {
  crew_size: 6,
  time_available: "45-60" as const,
  dough_option: "premade" as const,
  style_preference: "creative" as const,
  heat_level: "mild" as const,
  allergens_to_avoid: [] as string[],
  vegetarian_swap_needed: false,
};

const BANNED = /watch for visual cues|work over medium heat|spread evenly|spread sauce thinly; cover with mozzarella/i;

for (const id of ["big_mac_pizza", "pepperoni_classic", "taco_pizza", "meat_lovers", "margherita"]) {
  const r = finalizePizzaRecipe(buildPizzaTemplate(id, req), req, id, "template");
  const text = r.build_steps.map((s) => `${s.heading} ${s.body}`).join(" ");
  const bad = BANNED.test(text);
  console.log(`\n=== ${id} (${r.build_steps.length} steps, banned=${bad}) ===`);
  for (const s of r.build_steps) {
    console.log(`- ${s.heading}`);
  }
  if (id === "big_mac_pizza") {
    const beef = r.build_steps.find((s) => /beef/i.test(s.heading));
    console.log("beef step ok:", Boolean(beef?.body.includes("160°F")));
  }
}
