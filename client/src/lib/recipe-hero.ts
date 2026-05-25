import { useEffect, useMemo, useRef, useState } from "react";
import type { ClientRecipeResponse, HeroImageStatus, PizzaResponse } from "@shared/schema";

const POLL_BASE_MS = 2000;
const POLL_MAX_MS = 8000;
const MAX_POLLS = 24;

export interface HeroPollState {
  hero_image?: string;
  hero_image_alt?: string;
  hero_image_status: HeroImageStatus;
}

const inflightHero = new Map<string, Promise<HeroPollState>>();

function pollDelayMs(pollIndex: number): number {
  return Math.min(Math.round(POLL_BASE_MS * 1.2 ** Math.max(0, pollIndex - 1)), POLL_MAX_MS);
}

async function fetchJsonHero(url: string): Promise<HeroPollState> {
  const existing = inflightHero.get(url);
  if (existing) return existing;

  const promise = (async () => {
    const res = await fetch(url);
    if (!res.ok) return { hero_image_status: "unavailable" as const };
    return res.json() as Promise<HeroPollState>;
  })().finally(() => {
    inflightHero.delete(url);
  });

  inflightHero.set(url, promise);
  return promise;
}

async function fetchMealHero(
  recipeId: string,
  signature?: string,
  title?: string,
  mealFormat?: string,
  protein?: string,
): Promise<HeroPollState> {
  const params = new URLSearchParams();
  if (signature) params.set("signature", signature);
  if (title) params.set("title", title);
  if (mealFormat) params.set("meal_format", mealFormat);
  if (protein) params.set("protein", protein);
  const qs = params.toString();
  const url = `/api/recipe-hero/meal/${encodeURIComponent(recipeId)}${qs ? `?${qs}` : ""}`;
  return fetchJsonHero(url);
}

async function fetchPizzaHero(styleId: string, title?: string): Promise<HeroPollState> {
  const params = title ? `?title=${encodeURIComponent(title)}` : "";
  const url = `/api/recipe-hero/pizza/${encodeURIComponent(styleId)}${params}`;
  return fetchJsonHero(url);
}

function useHeroPollEffect(
  enabled: boolean,
  tickFn: () => Promise<HeroPollState | null>,
  deps: unknown[],
): HeroPollState | null {
  const [hero, setHero] = useState<HeroPollState | null>(null);
  const polls = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setHero(null);
      return;
    }

    polls.current = 0;
    let cancelled = false;
    let timeoutId = 0;

    const schedule = (ms: number) => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        if (document.hidden) {
          schedule(1200);
          return;
        }
        void runTick();
      }, ms);
    };

    const runTick = async () => {
      if (cancelled || polls.current >= MAX_POLLS) return;
      polls.current += 1;
      const next = await tickFn();
      if (cancelled || !next) return;
      setHero(next);
      if (next.hero_image_status === "ready") return;
      if (polls.current >= MAX_POLLS) {
        setHero({ hero_image_status: "unavailable" });
        return;
      }
      schedule(pollDelayMs(polls.current));
    };

    void runTick();

    const onVisible = () => {
      if (!document.hidden && polls.current > 0 && polls.current < MAX_POLLS) {
        schedule(0);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls deps
  }, deps);

  return hero;
}

/** Poll until cinematic hero is ready (non-blocking generation). */
export function useMealHeroPoll(
  recipe: ClientRecipeResponse | null,
): ClientRecipeResponse | null {
  const status = recipe?.hero_image_status ?? (recipe?.hero_image ? "ready" : "unavailable");
  const needsPoll = Boolean(recipe && status === "pending" && recipe._id);

  const hero = useHeroPollEffect(
    needsPoll,
    async () => {
      if (!recipe?._id) return null;
      const sig = (recipe as ClientRecipeResponse & { _signature?: string })._signature;
      return fetchMealHero(
        String(recipe._id),
        sig,
        recipe.title,
        recipe.meal_style,
        recipe.chosen_protein,
      );
    },
    [recipe?._id, recipe?.title, recipe?.hero_image_status, recipe?.meal_style, recipe?.chosen_protein],
  );

  return useMemo(() => {
    if (!recipe) return null;
    const resolvedStatus = recipe.hero_image_status ?? (recipe.hero_image ? "ready" : "unavailable");
    if (resolvedStatus === "ready" && recipe.hero_image) return recipe;
    if (hero?.hero_image_status === "ready" && hero.hero_image) {
      return {
        ...recipe,
        hero_image: hero.hero_image,
        hero_image_alt: hero.hero_image_alt ?? recipe.hero_image_alt,
        hero_image_status: "ready" as const,
      };
    }
    return recipe;
  }, [recipe, hero]);
}

export function usePizzaHeroPoll(recipe: PizzaResponse | null): PizzaResponse | null {
  const status = recipe?.hero_image_status ?? (recipe?.hero_image ? "ready" : "unavailable");
  const needsPoll = Boolean(recipe && status === "pending" && recipe.pizza_style_id);

  const hero = useHeroPollEffect(
    needsPoll,
    async () => {
      if (!recipe?.pizza_style_id) return null;
      return fetchPizzaHero(recipe.pizza_style_id, recipe.title);
    },
    [recipe?.pizza_style_id, recipe?.title, recipe?.hero_image_status],
  );

  return useMemo(() => {
    if (!recipe) return null;
    const resolvedStatus = recipe.hero_image_status ?? (recipe.hero_image ? "ready" : "unavailable");
    if (resolvedStatus === "ready" && recipe.hero_image) return recipe;
    if (hero?.hero_image_status === "ready" && hero.hero_image) {
      return {
        ...recipe,
        hero_image: hero.hero_image,
        hero_image_alt: hero.hero_image_alt ?? recipe.hero_image_alt,
        hero_image_status: "ready" as const,
      };
    }
    return recipe;
  }, [recipe, hero]);
}
