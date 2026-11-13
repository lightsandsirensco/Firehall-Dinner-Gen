/**
 * "Not for us" meals — hidden from Pick Tonight and Shift Planner auto-picks,
 * still browsable in Explore. Free for every signed-in user; Unhide restores.
 */
import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { fetchRecipeDislikes, RECIPE_DISLIKES_QUERY_KEY, unhideRecipe } from "@/lib/recipe-dislikes";

export function HiddenMealsSection() {
  const { authenticated } = useAuth();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const query = useQuery({
    queryKey: RECIPE_DISLIKES_QUERY_KEY,
    queryFn: fetchRecipeDislikes,
    enabled: authenticated,
    staleTime: 30_000,
  });

  if (!authenticated) return null;
  const dislikes = query.data ?? [];

  const handleUnhide = async (slug: string) => {
    setPending(slug);
    try {
      await unhideRecipe(slug);
      await queryClient.invalidateQueries({ queryKey: RECIPE_DISLIKES_QUERY_KEY });
    } catch {
      /* leave it listed so the user can retry */
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border/40 bg-card/25 p-4 space-y-3" data-testid="hidden-meals-section">
      <div>
        <h2 className="font-heading text-sm tracking-wide flex items-center gap-1.5">
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          Hidden meals
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Meals you marked "Not for us". We never pick them for you — they're still in Explore.
        </p>
      </div>
      {query.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : dislikes.length === 0 ? (
        <p className="text-xs text-muted-foreground" data-testid="hidden-meals-empty">
          Nothing hidden. Tap "Not feeling it?" on a pick to hide a meal your crew won't eat.
        </p>
      ) : (
        <ul className="divide-y divide-border/30">
          {dislikes.map((d) => (
            <li key={d.slug} className="flex items-center justify-between gap-3 py-2" data-testid={`hidden-meal-${d.slug}`}>
              <Link href={d.path} className="min-w-0 truncate text-sm hover:underline">
                {d.title}
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="min-h-10 shrink-0 touch-manipulation"
                disabled={pending === d.slug}
                onClick={() => void handleUnhide(d.slug)}
                data-testid={`button-unhide-${d.slug}`}
              >
                Unhide
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
