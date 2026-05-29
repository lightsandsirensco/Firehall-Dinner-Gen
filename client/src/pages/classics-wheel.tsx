import { useCallback, useState } from "react";
import { Link, useLocation } from "wouter";
import { Users, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { AppPageHeader } from "@/components/mobile/app-page-header";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { ClassicsWheel, WHEEL_LAYOUT, WheelReveal } from "@/components/classics-wheel";
import { getSavedCount } from "@/lib/saved-meals";
import {
  WHEEL_CLASSICS,
  type WheelClassic,
  buildPackageUrl,
  buildExplorePackageUrl,
  isClassicPinned,
  toggleClassicPin,
} from "@/lib/firehall-classics-wheel";
import { AnimatePresence, motion } from "framer-motion";
import { hapticSuccess } from "@/lib/haptics";
import { CLASSICS_WHEEL } from "@/lib/brand-copy";
import { LIGHTS_COPY } from "@/lib/lights-and-sirens";
import { LightsAndSirensCredit } from "@/components/brand/lights-and-sirens-credit";
import { SiteFooter } from "@/components/site-footer";

type Phase = "ready" | "spinning" | "reveal";

export default function ClassicsWheelPage() {
  const [, navigate] = useLocation();
  const [favCount] = useState(() => getSavedCount());
  const [phase, setPhase] = useState<Phase>("ready");
  const [winner, setWinner] = useState<WheelClassic | null>(null);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [pinned, setPinned] = useState(false);
  const [wheelSession, setWheelSession] = useState(0);
  const [suspenseLine, setSuspenseLine] = useState<string>(CLASSICS_WHEEL.suspense);
  const [subtitle] = useState(
    () => CLASSICS_WHEEL.subtitles[Math.floor(Math.random() * CLASSICS_WHEEL.subtitles.length)]!,
  );

  const handleSpinStart = useCallback((line: string) => {
    setSuspenseLine(line);
    setPhase("spinning");
    setWinner(null);
    setWinnerIndex(null);
  }, []);

  const handleLanded = useCallback((classic: WheelClassic) => {
    hapticSuccess();
    const idx = WHEEL_CLASSICS.findIndex((c) => c.slug === classic.slug);
    setWinner(classic);
    setWinnerIndex(idx >= 0 ? idx : null);
    setPinned(isClassicPinned(classic.slug));
    setPhase("reveal");
  }, []);

  const handleSpinAgain = useCallback(() => {
    setWinner(null);
    setWinnerIndex(null);
    setPhase("ready");
    setWheelSession((n) => n + 1);
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

      <AppPageHeader
        variant="minimal"
        title={CLASSICS_WHEEL.title}
        subtitle={subtitle}
        eyebrow={
          <span className={cn(app.eyebrowMuted, "inline-flex items-center gap-1.5")}>
            <Users className="w-3 h-3" aria-hidden />
            {CLASSICS_WHEEL.eyebrow}
          </span>
        }
      />

      <main className={cn(app.mainDetail, "flex-1 py-8 sm:py-12 pb-safe-nav max-w-[900px] hall-surface rounded-t-3xl")}>
        <LightsAndSirensCredit variant="block" className="mb-8" showFirefighterOwned />
        <p className="mb-8 text-sm text-muted-foreground leading-relaxed max-w-lg">
          {LIGHTS_COPY.wheelLine}
        </p>

        <section
          className="flex flex-col items-center w-full"
          aria-label="Classics wheel"
        >
          {/* Fixed-size slot — prevents flex collapse when reveal mounts below */}
          <div
            className="wheel-stage shrink-0 grow-0 flex w-full justify-center items-center"
            style={{
              width: `min(100%, ${WHEEL_LAYOUT.widthSm})`,
              minHeight: `min(92vw, ${WHEEL_LAYOUT.widthSm})`,
            }}
          >
            <ClassicsWheel
              key={wheelSession}
              disabled={phase === "spinning" || phase === "reveal"}
              winnerIndex={winnerIndex}
              onSpinStart={handleSpinStart}
              onLanded={handleLanded}
            />
          </div>

          <AnimatePresence mode="sync">
            {phase === "spinning" && (
              <motion.p
                key="suspense"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 text-sm font-medium text-primary flex items-center gap-2 shrink-0"
                data-testid="text-wheel-suspense"
              >
                <Sparkles className="w-4 h-4 animate-pulse shrink-0" />
                {suspenseLine}
              </motion.p>
            )}

            {phase === "ready" && (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-6 text-xs text-muted-foreground/70 max-w-xs text-center shrink-0"
              >
                {CLASSICS_WHEEL.hint}
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase === "reveal" && winner && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full mt-8 shrink-0"
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
        </section>

        <div className="mt-12 pt-8 border-t border-border/30 text-center">
          <p className="text-xs text-muted-foreground mb-3 max-w-sm mx-auto leading-relaxed">
            The meals every hall ends up making eventually — chili, burgers, tacos, and the rest.
            Spin when the crew is stuck.
          </p>
          <Link
            href="/explore"
            className="text-sm font-medium text-primary hover:underline"
            data-testid="link-explore-from-wheel"
          >
            {CLASSICS_WHEEL.browseLink}
          </Link>
        </div>
      </main>

      <SiteFooter variant="compact" className="mt-8" pbSafe />
    </div>
  );
}
