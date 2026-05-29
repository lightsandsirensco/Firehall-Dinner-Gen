import { AnimatePresence, motion } from "framer-motion";
import { Flame } from "lucide-react";
import type { GoldenCatalogIndexEntry } from "@shared/golden-100/recipe-page-schema";
import { MealHeroImage } from "@/components/meal-hero-image";

export function DinnerWheelReveal({
  recipe,
  sliceLabel,
  onOpenRecipe,
  onSpinAgain,
}: {
  recipe: GoldenCatalogIndexEntry;
  sliceLabel: string;
  onOpenRecipe: () => void;
  onSpinAgain: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-xl mx-auto shrink-0"
        data-testid="wheel-reveal"
      >
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/40 bg-card shadow-2xl shadow-primary/20 ring-1 ring-primary/30">
          <MealHeroImage
            src={recipe.heroImage}
            alt={recipe.title}
            heldLabel="Hall Pick"
            title={recipe.title}
            variant="cinematic"
            className="w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent pointer-events-none" />
          <motion.div
            className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary/25 blur-3xl"
            animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <div className="relative p-6 sm:p-8 text-center -mt-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.12 }}
              className="text-xs uppercase tracking-[0.35em] text-primary font-semibold mb-3 drop-shadow-sm"
            >
              Tonight’s wheel pick
            </motion.p>
            <h2
              className="font-heading text-2xl sm:text-3xl tracking-wide text-foreground mb-2"
              data-testid="text-wheel-winner"
            >
              {recipe.title}
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              {sliceLabel} · {recipe.cuisine} · {recipe.protein}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onOpenRecipe}
                className="col-span-1 sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-heading tracking-wider uppercase text-sm py-3.5 px-4 min-h-[52px] hover:bg-primary/90 active:scale-[0.98] transition-all touch-manipulation"
                data-testid="button-wheel-cook"
              >
                <Flame className="w-4 h-4" />
                Open recipe
              </button>
              <button
                type="button"
                onClick={onSpinAgain}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/50 bg-transparent text-foreground font-medium text-sm py-3 px-3 min-h-11 hover:bg-white/[0.04] transition-colors touch-manipulation active:scale-[0.98] sm:col-span-2"
                data-testid="button-wheel-spin-again"
              >
                Spin again
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

