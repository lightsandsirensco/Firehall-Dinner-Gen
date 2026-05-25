/**
 * Weighted pizza concept selection — variety scoring, pools, modes, anti-repeat.
 */

import type { PizzaRequest } from "../shared/schema.js";
import {
  PIZZA_CONCEPT_REGISTRY,
  getPizzaConceptMeta,
  type PizzaConceptMeta,
} from "../shared/pizza-concepts.js";
import { log } from "./logger.js";

const RECENT_PENALTY = 0.12;
const FEATURED_BOOST = 1.35;
const SEASONAL_BOOST = 1.5;
const QUICK_SHIFT_BOOST = 1.2;

function monthNow(): number {
  return new Date().getMonth() + 1;
}

function matchesSaucePref(meta: PizzaConceptMeta, pref?: string): boolean {
  if (!pref || pref === "surprise") return true;
  const s = meta.sauceStyle.toLowerCase();
  if (pref === "tomato") return s.includes("tomato") || s.includes("marinara");
  if (pref === "white") return s.includes("white") || s.includes("alfredo") || s.includes("garlic") || s.includes("ranch") || s.includes("cream");
  if (pref === "bbq") return s.includes("bbq");
  if (pref === "buffalo") return s.includes("buffalo");
  if (pref === "pesto") return s.includes("pesto");
  return true;
}

function matchesCrustPref(_meta: PizzaConceptMeta, _pref?: string): boolean {
  return true;
}

function filterEligible(request: PizzaRequest): PizzaConceptMeta[] {
  const recent = new Set([
    request.last_pizza_style_id,
    ...(request.last_pizza_style_ids ?? []),
  ].filter(Boolean));

  return PIZZA_CONCEPT_REGISTRY.filter((c) => {
    if (recent.has(c.id)) return false;
    if (!c.styles.includes(request.style_preference)) return false;
    if (!c.heat.includes(request.heat_level)) return false;
    for (const a of request.allergens_to_avoid) {
      if (c.excludesAllergens?.includes(a)) return false;
    }
    if (!matchesSaucePref(c, request.sauce_preference)) return false;
    if (!matchesCrustPref(c, request.crust_preference)) return false;
    return true;
  });
}

function scoreConcept(c: PizzaConceptMeta, request: PizzaRequest): number {
  let w = c.weight;
  const recent = new Set([
    request.last_pizza_style_id,
    ...(request.last_pizza_style_ids ?? []),
  ].filter(Boolean));
  if (recent.has(c.id)) w *= RECENT_PENALTY;
  if (c.featured) w *= FEATURED_BOOST;
  if (c.seasonalMonth === monthNow()) w *= SEASONAL_BOOST;
  if (request.time_available === "30-45" && c.quickShift) w *= QUICK_SHIFT_BOOST;
  if (request.style_preference === "healthier" && c.category === "healthy") w *= 1.4;
  if (request.style_preference === "comfort" && (c.category === "firehall" || c.category === "bbq")) w *= 1.25;
  if (request.style_preference === "creative" && (c.category === "viral" || c.category === "gourmet")) w *= 1.3;
  return w;
}

function weightedPick(pool: PizzaConceptMeta[], request: PizzaRequest): string {
  const weights = pool.map((c) => scoreConcept(c, request));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i].id;
  }
  return pool[pool.length - 1].id;
}

export function pickPizzaConcept(request: PizzaRequest): string {
  const mode = request.generation_mode ?? "standard";
  let pool = filterEligible(request);

  if (mode === "fridge") {
    const fridge = pool.filter((c) => c.category === "fridge" || c.id === "leftovers_pizza");
    if (fridge.length) pool = fridge;
  } else if (mode === "build_your_own") {
    const custom = pool.filter((c) => c.id === "build_your_own");
    if (custom.length) return "build_your_own";
  } else if (mode === "wheel" || mode === "specialty_slice") {
    const featured = pool.filter((c) => c.featured);
    if (featured.length >= 3) pool = featured;
  } else if (mode === "spin_again") {
    /* wider pool — only exclude last id */
    pool = PIZZA_CONCEPT_REGISTRY.filter((c) => {
      if (c.id === request.last_pizza_style_id) return false;
      if (!c.styles.includes(request.style_preference)) return false;
      if (!c.heat.includes(request.heat_level)) return false;
      for (const a of request.allergens_to_avoid) {
        if (c.excludesAllergens?.includes(a)) return false;
      }
      return true;
    });
  }

  if (pool.length === 0) {
    pool = PIZZA_CONCEPT_REGISTRY.filter((c) => {
      if (c.id === request.last_pizza_style_id) return false;
      for (const a of request.allergens_to_avoid) {
        if (c.excludesAllergens?.includes(a)) return false;
      }
      return true;
    });
  }

  if (pool.length === 0) {
    log("[pizza] variety pool empty — fallback pepperoni_classic", "pizza");
    return "pepperoni_classic";
  }

  const id = weightedPick(pool, request);
  log(`[pizza] picked ${id} mode=${mode} pool=${pool.length}`, "pizza");
  return id;
}

/** Rotating featured IDs for UI spotlight */
export function getFeaturedPizzaIds(count = 6): string[] {
  const month = monthNow();
  const featured = PIZZA_CONCEPT_REGISTRY.filter(
    (c) => c.featured || c.seasonalMonth === month,
  );
  const shuffled = [...featured].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((c) => c.id);
}
