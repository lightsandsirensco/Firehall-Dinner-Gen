/**
 * Post-meal crew feedback — opens immediately after a "Made This" /
 * Cook Mode completion. Must feel fast, never like a survey: a star tap +
 * a make-again tap is a complete, saveable submission on its own. Tags and
 * the note are optional extras layered underneath, never required.
 */
import { useState } from "react";
import { Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FEEDBACK_TAG_LABELS,
  NEGATIVE_FEEDBACK_TAGS,
  POSITIVE_FEEDBACK_TAGS,
  type FeedbackTag,
} from "@shared/meal-history/types";
import { submitMealFeedback } from "@/lib/meal-history-api";
import { trackMealFeedbackTagSelected, trackMealMakeAgainSelected, trackMealRated } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface MealFeedbackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: number | null;
  recipeTitle?: string;
  recipeSlug?: string;
  mealOccasion?: string;
  /** Initial values when re-opening to edit an already-fed-back entry (History detail). */
  initialRating?: 1 | 2 | 3 | 4 | 5 | null;
  initialMakeAgain?: boolean | null;
  initialTags?: FeedbackTag[];
  initialNote?: string | null;
  onSaved?: () => void;
}

export function MealFeedbackSheet({
  open,
  onOpenChange,
  entryId,
  recipeTitle,
  recipeSlug,
  mealOccasion,
  initialRating = null,
  initialMakeAgain = null,
  initialTags = [],
  initialNote = "",
  onSaved,
}: MealFeedbackSheetProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [makeAgain, setMakeAgain] = useState<boolean | null>(initialMakeAgain);
  const [tags, setTags] = useState<FeedbackTag[]>(initialTags);
  const [note, setNote] = useState(initialNote ?? "");
  const [showMore, setShowMore] = useState(initialTags.length > 0 || !!initialNote);
  const [saving, setSaving] = useState(false);

  const toggleTag = (tag: FeedbackTag) => {
    setTags((prev) => {
      const next = prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag];
      trackMealFeedbackTagSelected({
        recipe_slug: recipeSlug,
        tag,
        selected: next.includes(tag),
        meal_occasion: mealOccasion,
      });
      return next;
    });
  };

  const handleRate = (value: number) => {
    setRating(value);
    trackMealRated({ recipe_slug: recipeSlug, rating: value, meal_occasion: mealOccasion });
  };

  const handleMakeAgain = (value: boolean) => {
    setMakeAgain(value);
    trackMealMakeAgainSelected({ recipe_slug: recipeSlug, make_again: value, meal_occasion: mealOccasion });
  };

  const handleDone = async () => {
    if (!entryId || saving) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      await submitMealFeedback(entryId, {
        rating: (rating as 1 | 2 | 3 | 4 | 5 | null) ?? undefined,
        make_again: makeAgain ?? undefined,
        feedback_tags: tags.length > 0 ? tags : undefined,
        note: note.trim() ? note.trim() : undefined,
      });
      onSaved?.();
    } catch {
      /* best-effort — the meal is already logged regardless of feedback save */
    } finally {
      setSaving(false);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading">
            {recipeTitle ? `How was ${recipeTitle}?` : "How did it go?"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-[env(safe-area-inset-bottom)]">
          {/* Q1 — star rating */}
          <div>
            <p className="text-sm font-medium mb-2">How did the crew like it?</p>
            <div className="flex gap-1" role="radiogroup" aria-label="Crew rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRate(value)}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  aria-checked={rating === value}
                  role="radio"
                  className="min-h-11 min-w-11 grid place-items-center rounded-md hover-elevate active-elevate-2 touch-manipulation"
                  data-testid={`button-rate-${value}`}
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors",
                      rating != null && value <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Q2 — make again */}
          <div>
            <p className="text-sm font-medium mb-2">Make it again?</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={makeAgain === true ? "default" : "outline"}
                className="flex-1 min-h-11 gap-2 touch-manipulation"
                onClick={() => handleMakeAgain(true)}
                data-testid="button-make-again-yes"
              >
                <ThumbsUp className="h-4 w-4" /> Yes
              </Button>
              <Button
                type="button"
                variant={makeAgain === false ? "default" : "outline"}
                className="flex-1 min-h-11 gap-2 touch-manipulation"
                onClick={() => handleMakeAgain(false)}
                data-testid="button-make-again-no"
              >
                <ThumbsDown className="h-4 w-4" /> No
              </Button>
            </div>
          </div>

          {!showMore ? (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="text-sm text-primary underline underline-offset-2 min-h-11"
              data-testid="button-show-more-feedback"
            >
              Add details (optional)
            </button>
          ) : (
            <>
              {/* Optional tags */}
              <div className="space-y-2">
                <p className="text-sm font-medium">What worked?</p>
                <div className="flex flex-wrap gap-2">
                  {POSITIVE_FEEDBACK_TAGS.map((tag) => (
                    <TagChip key={tag} tag={tag} active={tags.includes(tag)} onToggle={toggleTag} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">What didn't?</p>
                <div className="flex flex-wrap gap-2">
                  {NEGATIVE_FEEDBACK_TAGS.map((tag) => (
                    <TagChip key={tag} tag={tag} active={tags.includes(tag)} onToggle={toggleTag} />
                  ))}
                </div>
              </div>

              {/* Optional note */}
              <div className="space-y-2">
                <label htmlFor="meal-feedback-note" className="text-sm font-medium block">
                  Anything to remember for next time?
                </label>
                <Textarea
                  id="meal-feedback-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 280))}
                  placeholder="Double the sauce, use less spice…"
                  className="min-h-20 resize-none"
                  maxLength={280}
                  data-testid="input-feedback-note"
                />
              </div>
            </>
          )}

          <Button
            type="button"
            size="lg"
            className="w-full min-h-11 touch-manipulation"
            onClick={handleDone}
            disabled={saving}
            data-testid="button-feedback-done"
          >
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TagChip({
  tag,
  active,
  onToggle,
}: {
  tag: FeedbackTag;
  active: boolean;
  onToggle: (tag: FeedbackTag) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(tag)}
      aria-pressed={active}
      className={cn(
        "min-h-11 px-3 rounded-full border text-sm touch-manipulation hover-elevate active-elevate-2",
        active ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground/80",
      )}
      data-testid={`chip-tag-${tag}`}
    >
      {FEEDBACK_TAG_LABELS[tag]}
    </button>
  );
}
