import type { CorrectionCollection, CorrectionOp, RecipeCorrection } from "../types.js";
import { step, stepTitle, text } from "./helpers.js";

const REF = "USDA FSIS Safe Minimum Internal Temperature Chart: whole cuts of beef and lamb 145°F + 3-minute rest; fish 145°F or opaque and flaking; ground beef 160°F";
const RISK = "not for anyone pregnant, older, or immunocompromised";
const PREF = `a preference below the USDA safe minimum, ${RISK}`;

const done = (
  slug: string, collection: CorrectionCollection, summary: string, ops: CorrectionOp[],
  rationale = "Policy: the USDA safe minimum is the default instruction; medium-rare or medium stays available as a clearly labeled preference with a short safety note.",
): RecipeCorrection => ({
  slug, collection, batch: "B7-doneness-01", category: "food_safety", findings: ["below_usda_doneness"],
  summary, rationale, reference: REF, ops,
});

export const B7_DONENESS: RecipeCorrection[] = [
  done("cast-iron-steak-fajita-sizzlers", "bbq", "Steak defaults to 145°F; medium-rare offered as a preference", [
    step(5, "Pull at 130–135°F on an instant-read at the thickest point for medium-rare — USDA's whole-muscle number is 145°F, and carryover plus the hot sizzle plates closes that gap on every slice you send.", `Pull at 145°F (63°C) on an instant-read at the thickest point and rest 3 minutes. For medium-rare, pull at 130–135°F instead — ${PREF}.`),
    text("proTips.2", "Pull at 130–135°F, always — the roaring sizzle plate keeps cooking every slice you send out.", "Don't overshoot 145°F — the roaring sizzle plate keeps cooking every slice you send out."),
    text("mealPrepNotes", "pull at 130–135°F, rest", "pull at 145°F, rest"),
  ]),
  done("mixed-lamb-chop-grill-board", "bbq", "Lamb defaults to 145°F; medium-rare offered as a preference", [
    text("description", "pulled at 135°F", "cooked to 145°F"),
    step(3, "Pull them at 135°F on an instant-read thermometer; carryover during the rest walks them toward the 145°F safe mark while the centers stay rosy.", `Pull them at 145°F (63°C) on an instant-read thermometer and rest 3 minutes — the centers stay pink. For medium-rare, pull at 135°F; that's ${PREF}.`),
  ]),
  done("reverse-seared-ribeye-crew", "bbq", "Reverse sear retargeted to 130°F smoke / 145°F finish; medium-rare offered as a preference", [
    text("description", "smoke low at 225°F to 115°F, rest, then sear hard to 130°F medium-rare", "smoke low at 225°F to 130°F, rest, then sear hard to 145°F"),
    step(1, "Smoke steaks at 225°F until internal temp reaches 115°F for medium-rare, about 35–45 minutes.", "Smoke steaks at 225°F until internal temp reaches 130°F, about 45–55 minutes (115°F if the crew wants medium-rare)."),
    step(3, "until crust forms and internal hits 130°F medium-rare.", `until crust forms and internal hits 145°F (63°C); rest 3 minutes. Medium-rare (130°F) is ${PREF}.`),
    step(6, "Call temps: 130°F medium-rare pull.", "Call temps: 145°F pull (130°F for medium-rare on request)."),
    text("proTips.0", "115°F off the smoker + hard sear lands medium-rare—adjust to 120°F for medium.", "130°F off the smoker + hard sear lands at 145°F; pull at 115°F instead for medium-rare."),
  ]),
  done("santa-maria-tri-tip-roast", "bbq", "Tri-tip finishes at 145°F; medium-rare offered as a preference", [
    text("description", "then sears and slices", "then sears to 145°F and slices"),
    step(1, "until internal temp reaches 125–130°F for medium-rare, about 45–55 minutes.", "until internal temp reaches 130°F, about 45–55 minutes (125°F if the crew wants medium-rare)."),
    step(2, "until crust forms and internal temp reaches 135°F for medium.", `until crust forms and internal temp reaches 145°F (63°C); rest 3 minutes. Medium-rare (135°F) is ${PREF}.`),
    step(6, "Call temps: pulled at 135°F medium, held at 170°F.", "Call temps: pulled at 145°F, held at 170°F."),
    text("proTips.1", "125°F off smoke + sear gets you medium-rare; push to 130°F before sear for medium.", "130°F off smoke + sear lands at 145°F; pull at 125°F before the sear for medium-rare."),
    text("mealPrepNotes", "Smoke to 130°F, sear hot, rest 10 minutes", "Smoke to 130°F, sear to 145°F, rest 10 minutes"),
  ]),
  done("smoked-picanha-steak-platter", "bbq", "Picanha finishes at 145°F; medium-rare offered as a preference", [
    text("description", "smoke at 275°F to 125°F, sear fat-side down", "smoke at 275°F to 130°F, sear fat-side down to 145°F"),
    step(1, "until internal temp reaches 120–125°F, about 35–45 minutes.", "until internal temp reaches 130°F, about 40–50 minutes (120–125°F if the crew wants medium-rare)."),
    step(3, "until fat crisps and internal hits 130°F medium-rare.", `until fat crisps and internal hits 145°F (63°C); rest 3 minutes. Medium-rare (130°F) is ${PREF}.`),
  ]),
  done("tandoori-lamb-chop-platter", "bbq", "Lamb chops default to 145°F; medium-rare offered as a preference", [
    text("description", "grill over high heat to 135°F", "grill over high heat to 145°F"),
    step(4, "until 130–135°F internal for medium-rare.", `until 145°F (63°C) internal; rest 3 minutes. Medium-rare (130–135°F) is ${PREF}.`),
    step(7, "Call temps: pull at 135°F, hold at 170°F max.", "Call temps: pull at 145°F, hold at 170°F max."),
    text("proTips.1", "135°F pull with rest hits perfect pink for lamb loin.", "145°F pull with a 3-minute rest keeps lamb loin pink and juicy."),
    text("mealPrepNotes", "4 minutes per side for medium-rare.", "4 minutes per side to 145°F."),
  ]),
  done("red-lead-skillet", "breakfast", "Steak strips default to 145°F", [
    step(1, "until deeply browned and internal temperature reaches 130°F for medium-rare strips.", `until deeply browned and internal temperature reaches 145°F (63°C); pull at 130°F only if the crew wants medium-rare (${RISK}).`),
  ]),
  done("flank-chimichurri", "golden-100", "Flank steak defaults to 145°F; medium-rare offered as a preference", [
    step(2, "Grill 4–5 minutes per side to 125–130°F. Rest 8 minutes — carryover hits medium-rare.", `Grill 5–6 minutes per side to 145°F (63°C) and rest 8 minutes. For medium-rare, pull at 125–130°F — ${PREF}.`),
  ]),
  done("ginger-salmon-bowls", "golden-100", "Salmon defaults to 145°F; medium offered as a preference", [
    step(1, "Flip; cook 2–3 minutes until center is 125°F for medium or 145°F if the crew prefers well-done.", `Flip; cook 3–4 minutes until the center reads 145°F (63°C) and flakes easily. Medium salmon (125°F) is ${PREF}.`),
  ]),
  done("hall-taco-bar", "golden-100", "Steak defaults to 145°F", [
    step(1, "(chicken 165°F, steak 130°F then rest)", "(chicken 165°F, steak 145°F then rest)"),
  ]),
  done("ny-strip-herb-butter", "golden-100", "Strip and flank default to 145°F; medium-rare offered as a preference", [
    step(1, "3–5 minutes per side for strip to 130°F medium-rare. Flank: sear 4 minutes per side, then medium until 125°F;", `4–6 minutes per side until strip reads 145°F (63°C), then rest 3 minutes; pull at 130°F for medium-rare (${PREF}). Flank: sear 4 minutes per side, then medium heat until 145°F;`),
  ]),
  done("steak-tacos", "golden-100", "Steak defaults to 145°F; medium-rare offered as a preference", [
    step(3, "Skirt: 3–4 min per side for medium-rare. Flank: 4–5 min per side. Pull at an internal temp of 125–130°F for a pink center — carryover adds about 5°F while resting; cook to 145°F if the hall wants zero pink.", `Skirt: 4–5 min per side. Flank: 5–6 min per side. Pull at 145°F (63°C) and rest 3 minutes — skirt stays rosy in the center. For medium-rare, pull at 125–130°F; that's ${PREF}.`),
  ]),
  done("teriyaki-salmon-grill", "golden-100", "Salmon defaults to 145°F; medium offered as a preference", [
    step(1, "until salmon flakes at 125–130°F in the thickest part (medium).", `until salmon reads 145°F (63°C) in the thickest part and flakes easily (pull at 125–130°F for medium — ${PREF}).`),
  ]),
  done("blackened-salmon-sweet-potato-bowls", "hall-expansion", "Salmon defaults to 145°F; medium offered as a preference", [
    step(2, "cook 3 more minutes to 130–135°F for medium.", `cook 3–4 more minutes to 145°F (63°C), until it flakes easily (130–135°F for medium if the crew prefers — ${RISK}).`),
  ]),
  done("build-your-own-pho-bar", "hall-expansion", "Beef slices cooked through in the broth by default; traditional rare pho offered as a preference", [
    step(3, "top with raw beef slices, and ladle boiling broth over top—the hot broth cooks beef to medium-rare in the bowl. Verify broth reads 190°F when ladled.", `dip the thin beef slices in the simmering broth with a strainer 30–60 seconds until no longer pink, lay them over the noodles, and ladle boiling broth on top. For traditional rare pho, lay raw slices on the noodles and let the boiling broth cook them in the bowl — ${PREF}.`),
  ]),
  done("garlic-steak-broccoli-cottage-cheese-bowls", "hall-expansion", "Steak strips cooked to 145°F", [
    step(3, "until browned outside and medium-rare to medium inside.", "until browned outside and 145°F (63°C) inside."),
  ]),
  done("maple-cured-salmon-plank", "hall-expansion", "Salmon defaults to 145°F; medium offered as a preference", [
    step(3, "until centers reach 125°F for medium or 140°F for well-done.", `until centers reach 145°F (63°C) and flake easily (pull at 125°F for medium if the crew prefers — ${RISK}).`),
  ]),
  done("mushroom-swiss-steak-pan", "hall-expansion", "Seared strips finish to 145°F in the sauce", [
    step(4, "Return beef and any juices to sauce and warm 2 minutes—do not boil.", "Return beef and any juices to sauce and warm 2–3 minutes over gentle heat until the beef reads 145°F (63°C)—do not boil."),
  ], "The strips are seared pink and only warmed in the sauce, so they never reached the USDA 145°F minimum."),
  done("smoked-tri-tip", "hall-expansion", "Tri-tip finishes at 145°F; medium-rare offered as a preference", [
    text("description", "smoked to medium-rare, then seared over high heat", "smoked low, then seared over high heat to 145°F"),
    stepTitle(1, "Smoke to medium-rare", "Smoke low and slow"),
    step(1, "Smoke roasts until internal temperature reaches 120°F in the thickest part, about 45–60 minutes depending on size.", "Smoke roasts until internal temperature reaches 130°F in the thickest part, about 60–75 minutes depending on size (120°F if the crew wants medium-rare)."),
    step(2, "Pull when internal temp hits 130°F for medium-rare.", `Pull when internal temp hits 145°F (63°C). For medium-rare, pull at 130°F — ${PREF}.`),
    step(3, "Internal temp will climb to about 135°F—do not skip rest", "Internal temp will climb a few degrees—do not skip rest"),
    text("proTips.0", "130°F pull gives medium-rare after rest—push to 140°F only if the crew prefers no pink.", "145°F pull stays pink in the center after the rest; pull at 130°F for medium-rare on request."),
  ]),
  done("southwest-steak-bowls", "hall-expansion", "Medium-rare preference carries the safety note", [
    step(3, "Pull at 145°F for medium (135°F for medium-rare).", `Pull at 145°F for medium (135°F for medium-rare — ${RISK}).`),
  ]),
  done("herb-marinated-flank-steak-chimichurri-farro", "performance-meals", "Flank steak defaults to 145°F; medium-rare offered as a preference", [
    step(4, "until internal temp reads 130–135°F for medium.", `until internal temp reads 145°F (63°C) (130–135°F for medium-rare — ${PREF}).`),
  ]),
  done("lemon-salmon-orzo-skillet", "performance-meals", "Salmon finishes to 145°F on the orzo", [
    step(4, "Nest salmon on orzo, cover 2 minutes to reheat. Salmon should flake at 125°F center,", "Nest salmon on orzo, cover 3–4 minutes to finish cooking. Salmon should reach 145°F (63°C) in the center and flake easily,"),
  ]),
  done("maple-mustard-salmon-tray", "performance-meals", "Salmon cooked to 145°F", [
    step(3, "until salmon reads 125–130°F and sprouts", "until salmon reads 145°F (63°C) and flakes easily and sprouts"),
  ]),
  done("maple-soy-salmon-bowls", "performance-meals", "Salmon cooked to 145°F", [
    step(2, "finish 2–4 minutes until 125–130°F at center.", "finish 2–4 minutes until 145°F (63°C) at center and the flesh flakes easily."),
  ]),
  done("smash-burgers", "golden-100", "Ground beef patties checked to 160°F; second-patty technique corrected", [
    step(5, "Add a fresh beef ball on the cheese, smash again, season, and cook second crust 90 seconds. Flip once more, add second cheese slice, and stack both patties cheese-side-in so you get a molten core.", "Cook the second side 30–60 seconds until the patty reads 160°F (71°C) — thin patties get there fast, but check one per batch. Stack two cheesed patties per burger for a molten core."),
  ], "Ground beef needs 160°F and the recipe never said so. The step also had cooks smashing a raw beef ball on top of melted cheese, which can't crust or cook evenly."),
];
