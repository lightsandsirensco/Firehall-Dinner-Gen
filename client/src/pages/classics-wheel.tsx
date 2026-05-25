import { useCallback, useState } from "react";
import { Link, useLocation } from "wouter";
import { Users, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { HeroHeader } from "@/components/hero-header";
import { ClassicsWheel, WheelReveal } from "@/components/classics-wheel";
import { getSavedCount } from "@/lib/saved-meals";
import {
  type WheelClassic,
  buildPackageUrl,
  buildExplorePackageUrl,
  isClassicPinned,
  toggleClassicPin,
} from "@/lib/firehall-classics-wheel";
import { AnimatePresence, motion } from "framer-motion";
import { hapticSuccess } from "@/lib/haptics";

type Phase = "ready" | "spinning" | "reveal";

export default function ClassicsWheelPage() {
  const [, navigate] = useLocation();
  const [favCount] = useState(() => getSavedCount());
  const [phase, setPhase] = useState<Phase>("ready");
  const [winner, setWinner] = useState<WheelClassic | null>(null);
  const [pinned, setPinned] = useState(false);

  const handleSpinStart = useCallback(() => {
    setPhase("spinning");
    setWinner(null);
  }, []);

  const handleLanded = useCallback((classic: WheelClassic) => {
    hapticSuccess();
    setWinner(classic);
    setPinned(isClassicPinned(classic.slug));
    setPhase("reveal");
  }, []);

  const handleSpinAgain = useCallback(() => {
    setWinner(null);
    setPhase("ready");
  }, []);

  const handleOpenPackage = useCallback(() => {
    if (!winner) return;
    navigate(buildPackageUrl(winner));
  }, [winner, navigate]);

  const handleExplore = useCallback(() => {
    if (!winner) return;
    navigate(buildExplorePackageUrl(winner));
  }, [winner, navigate]);

  const handleTogglePin = useCallback(() => {
    if (!winner) return;
    setPinned(toggleClassicPin(winner.slug));
  }, [winner]);

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background flex flex-col">
      <SiteHeader activePage="wheel" favCount={favCount} />

      <HeroHeader
        title="Classics Wheel"
        subtitle="Let the hall decide dinner"
        compact
      />

      <main className="flex-1 max-w-[900px] mx-auto w-full px-page py-8 sm:py-12 pb-safe-nav">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 text-primary/80 text-xs uppercase tracking-[0.3em] font-semibold mb-3">
            <Users className="w-3.5 h-3.5" />
            Crew tradition
          </div>
          <h2 className="font-heading text-xl sm:text-2xl tracking-wider uppercase text-foreground mb-2">
            Spin for tonight&apos;s classic
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Ten hall-tested dinners — no random AI roulette. Gather the crew, spin the wheel, and
            cook what lands.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {phase !== "reveal" && (
            <motion.div
              key="wheel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col items-center"
            >
              <ClassicsWheel
                disabled={phase === "spinning"}
                onSpinStart={handleSpinStart}
                onLanded={handleLanded}
              />

              {phase === "spinning" && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 text-sm font-medium text-primary flex items-center gap-2"
                  data-testid="text-wheel-suspense"
                >
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  The hall is deciding...
                </motion.p>
              )}

              {phase === "ready" && (
                <p className="mt-6 text-xs text-muted-foreground/70 max-w-xs text-center">
                  Tap <span className="text-foreground font-medium">Spin</span> or the center button.
                  What lands is what you cook.
                </p>
              )}
            </motion.div>
          )}

          {phase === "reveal" && winner && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center"
            >
              <WheelReveal
                classic={winner}
                pinned={pinned}
                onCook={handleOpenPackage}
                onSpinAgain={handleSpinAgain}
                onTogglePin={handleTogglePin}
                onExplore={handleExplore}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 pt-8 border-t border-border/30 text-center">
          <p className="text-xs text-muted-foreground mb-3">Prefer to browse?</p>
          <Link
            href="/explore"
            className="text-sm font-medium text-primary hover:underline"
            data-testid="link-explore-from-wheel"
          >
            Explore all recipes →
          </Link>
        </div>
      </main>

      <WheelFooter />
    </div>
  );
}

function WheelFooter() {
  return (
    <footer className="text-center py-6 mt-8 border-t border-border/20">
      <p className="text-xs text-muted-foreground/50">
        Powered by{" "}
        <a
          href="https://www.lightsandsirensco.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-muted-foreground transition-colors"
        >
          Lights &amp; Sirens Co.
        </a>
      </p>
    </footer>
  );
}
