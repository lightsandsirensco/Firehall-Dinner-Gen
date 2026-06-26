import { useState } from "react";
import type { ClientRecipeResponse } from "@shared/schema";
import { HallVoteModal } from "@/components/hall-vote-modal";
import { HallVotePromoBanner } from "@/components/hall-vote-promo-banner";
import { HallVoteCta, type HallVoteCtaLabel } from "@/components/hall-vote-cta";

export type HallVoteFlowVariant = "banner" | "button" | "compact";

interface HallVoteFlowProps {
  recipes: ClientRecipeResponse[];
  source: string;
  variant?: HallVoteFlowVariant;
  label?: HallVoteCtaLabel;
  className?: string;
  bannerRef?: React.RefObject<HTMLDivElement | null>;
  onGenerateAnother?: () => void;
  isGenerating?: boolean;
}

export function HallVoteFlow({
  recipes,
  source,
  variant = "banner",
  label = "crew",
  className,
  bannerRef,
  onGenerateAnother,
  isGenerating,
}: HallVoteFlowProps) {
  const [open, setOpen] = useState(false);
  const optionCount = recipes.filter(Boolean).length;

  const handleStart = () => setOpen(true);

  return (
    <>
      {variant === "banner" ? (
        <HallVotePromoBanner
          onStartVote={handleStart}
          optionCount={optionCount}
          bannerRef={bannerRef}
          className={className}
        />
      ) : (
        <HallVoteCta
          onClick={handleStart}
          label={label}
          variant={variant === "compact" ? "compact" : "outline"}
          className={className}
        />
      )}
      <HallVoteModal
        open={open}
        onOpenChange={setOpen}
        recipes={recipes}
        source={source}
        onGenerateAnother={onGenerateAnother}
        isGenerating={isGenerating}
      />
    </>
  );
}
