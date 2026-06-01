#!/usr/bin/env tsx
/**
 * P0 title-side image rule unit tests + example fixtures.
 */
import assert from "node:assert/strict";
import {
  auditTitlePrimarySideAlignment,
  extractTitleVisualRequirements,
  hasImageTitleMismatch,
  buildRequiredVisibleSidesPromptLine,
} from "../shared/curated-image-governance/title-primary-side-rules.js";
import { normalizeSidePairingTitle } from "../shared/curated-image-governance/title-side-pairing-governance.js";

const barbacoaReq = extractTitleVisualRequirements("Crock Barbacoa Chicken With Potato Wedges");
assert.ok(barbacoaReq.primarySides.some((s) => /potato|wedge/i.test(s)), "potato wedges extracted");

const barbacoaFail = auditTitlePrimarySideAlignment({
  slug: "crock-barbacoa-chicken",
  title: "Crock Barbacoa Chicken With Potato Wedges",
  heroPath: "/images/golden-100/chicken-bowls.jpg",
});
assert.ok(hasImageTitleMismatch(barbacoaFail), "generic bowl fails barbacoa + wedges");

const barbacoaRiceFail = auditTitlePrimarySideAlignment({
  slug: "crock-barbacoa-chicken",
  title: "Crock Barbacoa Chicken With Potato Wedges",
  heroPath: "/images/golden-100/cajun-chicken-rice-bowl.jpg",
});
assert.ok(hasImageTitleMismatch(barbacoaRiceFail), "rice bowl fails barbacoa + wedges");

const barbacoaPass = auditTitlePrimarySideAlignment({
  slug: "crock-barbacoa-chicken",
  title: "Crock Barbacoa Chicken With Potato Wedges",
  heroPath: "/images/golden-100/crock-barbacoa-chicken.jpg",
  heroAlt: "barbacoa chicken with potato wedges on platter",
});
assert.equal(hasImageTitleMismatch(barbacoaPass), false, "wedge cues pass");

const caesarFail = auditTitlePrimarySideAlignment({
  slug: "chicken-caesar-salad",
  title: "Chicken Caesar Salad",
  heroPath: "/images/golden-100/chicken-bowls.jpg",
});
assert.ok(hasImageTitleMismatch(caesarFail), "bowl fails caesar salad");

const caesarWholeBreastFail = auditTitlePrimarySideAlignment({
  slug: "chicken-caesar",
  title: "Chicken Caesar Salad",
  heroPath: "/images/golden-100/chicken-caesar.jpg",
  heroAlt: "whole grilled chicken breast on caesar salad",
});
assert.ok(hasImageTitleMismatch(caesarWholeBreastFail), "whole breast alt fails caesar chicken pieces rule");

const caesarPass = auditTitlePrimarySideAlignment({
  slug: "chicken-caesar",
  title: "Chicken Caesar Salad",
  heroPath: "/images/golden-100/chicken-caesar.jpg",
  heroAlt: "chicken caesar salad with sliced grilled chicken pieces, romaine, parmesan",
});
assert.equal(hasImageTitleMismatch(caesarPass), false, "sliced chicken pieces pass caesar audit");

const caesarPrompt = buildRequiredVisibleSidesPromptLine("Chicken Caesar Salad");
assert.match(caesarPrompt, /diced pieces/i);

const jerkFail = auditTitlePrimarySideAlignment({
  slug: "jerk-chicken",
  title: "Jerk Chicken and Rice & Peas",
  heroPath: "/images/golden-100/greek-chicken-bowls.jpg",
});
assert.ok(hasImageTitleMismatch(jerkFail), "generic bowl fails jerk rice peas");

const macFail = auditTitlePrimarySideAlignment({
  slug: "pulled-pork-mac",
  title: "Pulled Pork Mac and Cheese",
  heroPath: "/images/golden-100/pulled-pork-sandwiches.jpg",
});
assert.ok(hasImageTitleMismatch(macFail), "sandwich without mac fails");

const prompt = buildRequiredVisibleSidesPromptLine("Pulled Pork Mac and Cheese");
assert.match(prompt, /mac and cheese/i);
assert.match(prompt, /clearly visible/i);

const shepherdNormalized = normalizeSidePairingTitle("Shepherd's Pie", "Quinoa", "Greek Salad");
assert.equal(shepherdNormalized, "Shepherd's Pie with Greek Salad");

const shepherdFail = auditTitlePrimarySideAlignment({
  slug: "shepherds-pie",
  title: "Shepherd's Pie with Greek Salad",
  heroPath: "/images/golden-100/shepherds-pie.jpg",
  heroAlt: "single bowl of mashed potatoes",
});
assert.ok(hasImageTitleMismatch(shepherdFail), "shepherd pie without salad cues fails");

const shepherdPass = auditTitlePrimarySideAlignment({
  slug: "shepherds-pie",
  title: "Shepherd's Pie with Greek Salad",
  heroPath: "/images/golden-100/shepherds-pie.jpg",
  heroAlt:
    "Shepherd's Pie with Greek Salad — large casserole with browned mashed potato topping and a bowl of Greek salad on a firehall table",
});
assert.equal(hasImageTitleMismatch(shepherdPass), false, "shepherd pie with salad alt passes");

console.log("[test-title-side-image-rules] OK");
