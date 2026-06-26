import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Users, Vote, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HALL_VOTE } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

interface HallVotePromoBannerProps {
  onStartVote: () => void;
  optionCount: number;
  /** Ref for smooth scroll on first reveal */
  bannerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export function HallVotePromoBanner({
  onStartVote,
  optionCount,
  bannerRef,
  className,
}: HallVotePromoBannerProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const setRef = (el: HTMLDivElement | null) => {
    (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (bannerRef && "current" in bannerRef) {
      (bannerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    }
  };

  useEffect(() => {
    innerRef.current?.focus({ preventScroll: true });
  }, []);

  const subline =
    optionCount >= 2
      ? `${optionCount} meals on the board — ${HALL_VOTE.sendToCrew.toLowerCase()} in the group chat or scan the QR.`
      : `${HALL_VOTE.sendToCrew} in the group chat or scan the QR when you're ready.`;

  return (
    <motion.div
      ref={setRef}
      tabIndex={-1}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      className={cn("outline-none", className)}
      data-testid="hall-vote-promo-banner"
      aria-label="Hall Vote promotion"
    >
      <div className="relative overflow-hidden rounded-2xl border border-primary/35 bg-gradient-to-br from-zinc-950 via-card to-zinc-900 shadow-xl shadow-primary/10 ring-1 ring-primary/20">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(198,40,40,0.35), transparent 55%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(198,40,40,0.12), transparent 50%)",
          }}
        />
        <motion.div
          className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
          animate={{ opacity: [0.35, 0.6, 0.35], scale: [1, 1.08, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative flex flex-col sm:flex-row sm:items-stretch gap-4 sm:gap-6 p-5 sm:p-6">
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/90">
                Station ritual
              </span>
            </div>
            <h3 className="font-heading text-xl sm:text-2xl tracking-wide text-foreground leading-tight mb-2">
              {HALL_VOTE.letCrewVote}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-md">
              {subline}
            </p>
            <Button
              type="button"
              size="lg"
              onClick={onStartVote}
              className="w-full sm:w-auto min-h-[48px] font-heading text-base tracking-wider uppercase shadow-lg shadow-primary/25"
              data-testid="button-start-hall-vote"
            >
              <Vote className="w-5 h-5 mr-2" />
              {HALL_VOTE.startVote}
            </Button>
          </div>

          <div className="flex sm:flex-col items-center justify-center sm:justify-center gap-3 sm:w-[140px] shrink-0">
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-xl bg-primary/30 blur-md"
                animate={{ opacity: [0.4, 0.75, 0.4], scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative flex flex-col items-center justify-center rounded-xl border border-primary/40 bg-black/50 backdrop-blur-sm p-4 w-[120px] h-[120px] sm:w-[130px] sm:h-[130px]">
                <QrCode className="w-14 h-14 sm:w-16 sm:h-16 text-primary drop-shadow-[0_0_12px_rgba(198,40,40,0.5)]" strokeWidth={1.25} />
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground mt-2 text-center leading-tight">
                  QR ready
                  <br />
                  when you start
                </span>
              </div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground/80 max-w-[120px] hidden sm:block">
              Big enough to scan from across the kitchen table
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
