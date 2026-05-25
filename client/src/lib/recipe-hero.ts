import { useEffect, useRef, useState } from "react";
import type { ClientRecipeResponse, HeroImageStatus, PizzaResponse } from "@shared/schema";

const POLL_MS = 2500;
const MAX_POLLS = 24;

export interface HeroPollState {
  hero_image?: string;
  hero_image_alt?: string;
  hero_image_status: HeroImageStatus;
}

async function fetchMealHero(
  recipeId: string,
  signature?: string,
  title?: string,
): Promise<HeroPollState> {
  const params = new URLSearchParams();
  if (signature) params.set("signature", signature);
  if (title) params.set("title", title);
  const qs = params.toString();
  const res = await fetch(`/api/recipe-hero/meal/${encodeURIComponent(recipeId)}${qs ? `?${qs}` : ""}`);
  if (!res.ok) return { hero_image_status: "unavailable" };
  return res.json();
}

async function fetchPizzaHero(styleId: string, title?: string): Promise<HeroPollState> {
  const params = title ? `?title=${encodeURIComponent(title)}` : "";
  const res = await fetch(`/api/recipe-hero/pizza/${encodeURIComponent(styleId)}${params}`);
  if (!res.ok) return { hero_image_status: "unavailable" };
  return res.json();
}

/** Poll until cinematic hero is ready (non-blocking generation). */
export function useMealHeroPoll(
  recipe: ClientRecipeResponse | null,
): ClientRecipeResponse | null {
  const [hero, setHero] = useState<HeroPollState | null>(null);
  const polls = useRef(0);

  useEffect(() => {
    if (!recipe) {
      setHero(null);
      return;
    }
    const status = recipe.hero_image_status ?? (recipe.hero_image ? "ready" : "unavailable");
    if (status === "ready" && recipe.hero_image) {
      setHero({
        hero_image: recipe.hero_image,
        hero_image_alt: recipe.hero_image_alt,
        hero_image_status: "ready",
      });
      return;
    }
    if (status !== "pending" || !recipe._id) {
      setHero({
        hero_image_status: status,
      });
      return;
    }

    polls.current = 0;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || polls.current >= MAX_POLLS) return;
      polls.current += 1;
      const sig = (recipe as ClientRecipeResponse & { _signature?: string })._signature;
      const next = await fetchMealHero(String(recipe._id), sig, recipe.title);
      if (cancelled) return;
      setHero(next);
      if (next.hero_image_status === "ready") return;
      window.setTimeout(tick, POLL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
    };
  }, [recipe?._id, recipe?.title, recipe?.hero_image, recipe?.hero_image_status]);

  if (!recipe) return null;
  if (!hero || hero.hero_image_status !== "ready" || !hero.hero_image) {
    return recipe;
  }
  return {
    ...recipe,
    hero_image: hero.hero_image,
    hero_image_alt: hero.hero_image_alt ?? recipe.hero_image_alt,
    hero_image_status: "ready",
  };
}

export function usePizzaHeroPoll(recipe: PizzaResponse | null): PizzaResponse | null {
  const [hero, setHero] = useState<HeroPollState | null>(null);
  const polls = useRef(0);

  useEffect(() => {
    if (!recipe) {
      setHero(null);
      return;
    }
    const status = recipe.hero_image_status ?? (recipe.hero_image ? "ready" : "unavailable");
    if (status === "ready" && recipe.hero_image) {
      setHero({
        hero_image: recipe.hero_image,
        hero_image_alt: recipe.hero_image_alt,
        hero_image_status: "ready",
      });
      return;
    }
    if (status !== "pending" || !recipe.pizza_style_id) {
      setHero({ hero_image_status: status });
      return;
    }

    polls.current = 0;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || polls.current >= MAX_POLLS) return;
      polls.current += 1;
      const next = await fetchPizzaHero(recipe.pizza_style_id, recipe.title);
      if (cancelled) return;
      setHero(next);
      if (next.hero_image_status === "ready") return;
      window.setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [recipe?.pizza_style_id, recipe?.title, recipe?.hero_image, recipe?.hero_image_status]);

  if (!recipe) return null;
  if (!hero?.hero_image || hero.hero_image_status !== "ready") return recipe;
  return {
    ...recipe,
    hero_image: hero.hero_image,
    hero_image_alt: hero.hero_image_alt ?? recipe.hero_image_alt,
    hero_image_status: "ready",
  };
}
