import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  castRecipeCrewRatingVote,
  crewRatingQueryKey,
  fetchRecipeCrewRating,
  topRatedRecipesQueryKey,
} from "@/lib/recipe-crew-ratings-api";
import { trackRecipeDownvote, trackRecipeUpvote } from "@/lib/analytics";
import type { CrewRatingComplaintCategory } from "@shared/recipe-crew-ratings/types";
import { RecipeCrewRatingBadges } from "./recipe-crew-rating-badges";
import { NegativeFeedbackSheet } from "./negative-feedback-sheet";

interface RecipeCrewRatingPanelProps {
  slug: string;
  category?: string;
  className?: string;
}

export function RecipeCrewRatingPanel({ slug, category, className }: RecipeCrewRatingPanelProps) {
  const queryClient = useQueryClient();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const votingRef = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: crewRatingQueryKey(slug),
    queryFn: () => fetchRecipeCrewRating(slug, category),
    staleTime: 30_000,
  });

  const voteMutation = useMutation({
    mutationFn: (payload: { vote: "up" | "down"; complaint?: CrewRatingComplaintCategory }) =>
      castRecipeCrewRatingVote(slug, { vote: payload.vote, complaint: payload.complaint, category }),
    onSuccess: (view) => {
      queryClient.setQueryData(crewRatingQueryKey(slug), view);
      queryClient.invalidateQueries({ queryKey: ["recipe-crew-rating-collections"] });
      queryClient.invalidateQueries({ queryKey: topRatedRecipesQueryKey });
    },
  });

  const submitVote = useCallback(
    async (vote: "up" | "down", complaint?: CrewRatingComplaintCategory) => {
      if (votingRef.current || data?.userVote) return;
      votingRef.current = true;
      try {
        await voteMutation.mutateAsync({ vote, complaint });
        if (vote === "up") {
          trackRecipeUpvote(slug);
        } else {
          trackRecipeDownvote(slug);
        }
      } finally {
        window.setTimeout(() => {
          votingRef.current = false;
        }, 800);
      }
    },
    [data?.userVote, slug, voteMutation],
  );

  const handleUp = () => {
    void submitVote("up");
  };

  const handleDown = () => {
    if (data?.userVote) return;
    setFeedbackOpen(true);
  };

  const handleComplaint = (complaint: CrewRatingComplaintCategory) => {
    setFeedbackOpen(false);
    void submitVote("down", complaint);
  };

  const disabled = Boolean(data?.userVote) || voteMutation.isPending || isLoading;

  return (
    <section
      className={cn(
        "rounded-2xl border border-border/25 bg-card/30 p-5 sm:p-6 space-y-4",
        className,
      )}
      aria-label="Crew rating"
      data-testid="recipe-crew-rating-panel"
    >
      {data && data.badges.length > 0 && <RecipeCrewRatingBadges badges={data.badges} />}

      <div>
        <p className="font-heading text-xl sm:text-2xl tracking-wide text-foreground">
          {data?.approvalLabel ?? "Be the first crew to rate this meal"}
        </p>
        {data?.ratingsLabel && (
          <p className="mt-1 text-sm text-muted-foreground">{data.ratingsLabel}</p>
        )}
      </div>

      <div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            disabled={disabled}
            onClick={handleUp}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3.5 min-h-[52px] text-sm font-semibold touch-manipulation transition-colors",
              data?.userVote === "up"
                ? "border-primary bg-primary/15 text-primary"
                : "border-border/40 bg-background/40 hover:bg-primary/10 hover:border-primary/30",
              disabled && data?.userVote !== "up" && "opacity-60 cursor-not-allowed",
            )}
            data-testid="crew-rating-up"
          >
            <span aria-hidden>👍</span>
            Would Cook Again
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleDown}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3.5 min-h-[52px] text-sm font-semibold touch-manipulation transition-colors",
              data?.userVote === "down"
                ? "border-muted-foreground/40 bg-muted/30 text-foreground"
                : "border-border/40 bg-background/40 hover:bg-muted/30",
              disabled && data?.userVote !== "down" && "opacity-60 cursor-not-allowed",
            )}
            data-testid="crew-rating-down"
          >
            <span aria-hidden>👎</span>
            Not For Our Crew
          </button>
        </div>
        {data?.userVote && (
          <p className="mt-2 text-xs text-muted-foreground">Thanks — your crew rating is recorded.</p>
        )}
      </div>

      <NegativeFeedbackSheet
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSelect={handleComplaint}
      />
    </section>
  );
}
