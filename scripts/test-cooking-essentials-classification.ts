/**
 * Cooking essentials (oils, butter, spray, fresh garlic/ginger) are never plated
 * or listed as side dishes — in recipe data, in both meal-plate builders, or in
 * shopping aisles — and real side dishes still plate as sides.
 */
import fs from "node:fs";
import path from "node:path";
import { classifyComponentRole, isCookingEssential, isValidPlateSide, inferShoppingCategory } from "../shared/meal-semantics.js";
import { classifyDepartment } from "../shared/shopping/departments.js";
import { buildMealPlate } from "../server/meal-plate.js";
import { resolveMealPlate } from "../client/src/lib/meal-plate-ui.js";
import { inferIngredientCategory } from "../server/labelAudit.js";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${label}${!ok && detail ? ` — ${detail}` : ""}`);
}

console.log("Identity is by head noun, not notes");
for (const n of ["olive oil", "Extra-virgin olive oil, divided", "vegetable oil (for frying)", "Peanut or vegetable oil", "nonstick cooking spray", "unsalted butter, melted", "garlic butter", "ghee", "garlic cloves", "fresh ginger", "shortening"]) {
  check(`"${n}" is a cooking essential`, isCookingEssential(n));
}
for (const n of ["garlic bread", "garlic bread loaves", "butter beans", "peanut butter", "butternut squash", "butter lettuce", "buttermilk", "garlic knots", "bell peppers", "baby potatoes", "oil-packed sun-dried tomatoes"]) {
  check(`"${n}" is not a cooking essential`, !isCookingEssential(n));
}

console.log("Role follows intended use");
check("oil noted for the potatoes stays a cooking essential", classifyComponentRole("olive oil", "for the potatoes") === "cooking_essential");
check("oil noted for roasting vegetables stays a cooking essential", classifyComponentRole("olive oil", "for roasting the vegetables") === "cooking_essential");
check("oil for drizzling at serving is a sauce/topping", classifyComponentRole("extra-virgin olive oil", "for drizzling at serving") === "sauce");
check("butter for the table is a sauce/topping", classifyComponentRole("butter", "softened, for serving with rolls") === "sauce");
check("oil is never a valid plate side", !isValidPlateSide("olive oil", "for the potatoes"));
check("real sides stay sides", ["baby potatoes", "green beans", "garlic bread", "coleslaw mix", "jasmine rice"].every((n) => isValidPlateSide(n)));

console.log("Meal-plate builders");
const tricky = [
  { item: "pork tenderloin", amount: "3 lb", notes: "" },
  { item: "baby potatoes", amount: "2.5 lb", notes: "halved" },
  { item: "green beans", amount: "2 lb", notes: "" },
  { item: "olive oil", amount: "3 tbsp", notes: "for the potatoes" },
  { item: "vegetable oil", amount: "2 tbsp", notes: "for the veg" },
  { item: "butter", amount: "2 tbsp", notes: "for toasting the buns — starch" },
  { item: "cooking spray", amount: "", notes: "" },
  { item: "garlic", amount: "6 cloves", notes: "minced" },
  { item: "extra-virgin olive oil", amount: "2 tbsp", notes: "for drizzling at serving" },
];
const plate = buildMealPlate({ ingredients: tricky } as never, { cuisine: "american", protein: "pork", mealFormat: "plate", originalTitle: "Pork Medallions" });
check("server plate sides hold no cooking essentials", !plate.sides.some((s) => isCookingEssential(s.name)), plate.sides.map((s) => s.name).join(", "));
check("server plate keeps potatoes and green beans as sides", ["Baby Potatoes", "Green Beans"].every((n) => plate.sides.some((s) => s.name === n)), plate.sides.map((s) => s.name).join(", "));
check("server plate main is the protein, not oil", !plate.main.some((m) => isCookingEssential(m.name)), plate.main.map((m) => m.name).join(", "));

console.log("Shopping aisles");
for (const n of ["olive oil", "vegetable oil", "Peanut or vegetable oil", "cooking spray", "sesame oil", "shortening", "lard"]) {
  check(`"${n}" shops under Condiments, Sauces & Oils`, classifyDepartment(n, "for the potatoes") === "Condiments, Sauces & Oils", classifyDepartment(n));
  check(`"${n}" legacy aisle is Condiments & Sauces`, inferShoppingCategory(n, "for the vegetables") === "Condiments & Sauces", inferShoppingCategory(n));
}

console.log("Catalog");
const ROOT = "client/public/catalog";
let pages = 0;
const sideGroupHits: string[] = [];
const serverHits: string[] = [];
const clientHits: string[] = [];
const unreferenced: string[] = [];
for (const c of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, c, "pages");
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const page = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const ings = (page.ingredients ?? []) as { name: string; notes?: string; quantity?: string; unit?: string; group?: string; optional?: boolean }[];
    if (!ings.length) continue;
    pages++;
    const where = `${c}/${page.slug}`;
    for (const i of ings) {
      if (/^sides?$/i.test(i.group ?? "") && isCookingEssential(i.name)) sideGroupHits.push(`${where}: ${i.name}`);
    }
    const sp = buildMealPlate(
      { ingredients: ings.map((i) => ({ item: i.name, amount: `${i.quantity ?? ""} ${i.unit ?? ""}`.trim(), notes: i.notes ?? "" })) } as never,
      { cuisine: "american", protein: "any", mealFormat: "plate", originalTitle: page.title },
    );
    for (const s of sp.sides) if (isCookingEssential(s.name)) serverHits.push(`${where}: ${s.name}`);
    const cp = resolveMealPlate({
      title: page.title,
      ingredients: ings.map((i) => ({ name: i.name, qty: Number(i.quantity) || 0, unit: i.unit ?? "", category: inferIngredientCategory(i.name) })),
    } as never);
    for (const s of cp?.sides ?? []) if (isCookingEssential(s.name)) clientHits.push(`${where}: ${s.name}`);

    const steps = (page.steps ?? []).map((s: { title?: string; instruction?: string }) => `${s.title ?? ""} ${s.instruction ?? ""}`).join(" ").toLowerCase();
    for (const i of ings) {
      if (i.optional || !isCookingEssential(i.name) || /garlic|ginger/i.test(i.name)) continue;
      const n = i.name.toLowerCase();
      const word = /spray/.test(n) ? /spray|grease|oil/ : /butter|ghee|margarine|drippings/.test(n) ? /butter|ghee|margarine|drippings/ : /shortening|lard/.test(n) ? /shortening|lard|fat/ : /\boil\b|oiled/;
      if (!word.test(steps)) unreferenced.push(`${where}: ${i.name}`);
    }
  }
}
check(`no cooking essential sits in a "Side(s)" ingredient group (${pages} recipes)`, sideGroupHits.length === 0, sideGroupHits.slice(0, 5).join("; "));
check("server meal plate never shows a cooking essential as a side", serverHits.length === 0, `${serverHits.length}: ${serverHits.slice(0, 5).join("; ")}`);
check("client meal plate never shows a cooking essential as a side", clientHits.length === 0, `${clientHits.length}: ${clientHits.slice(0, 5).join("; ")}`);
check("every cooking fat is used in the steps", unreferenced.length === 0, unreferenced.slice(0, 5).join("; "));

if (failures) {
  console.error(`\n${failures} cooking-essentials check(s) failed`);
  process.exit(1);
}
console.log("\nAll cooking-essentials checks passed");
process.exit(0);
