import { X, Flame } from "lucide-react";
import { dismissFirstShiftTip } from "@/lib/app-session";
import { hapticLight } from "@/lib/haptics";
import { CTA } from "@/lib/brand-copy";

interface FirstShiftTipProps {
  onDismiss: () => void;
}

export function FirstShiftTip({ onDismiss }: FirstShiftTipProps) {
  const handleDismiss = () => {
    hapticLight();
    dismissFirstShiftTip();
    onDismiss();
  };

  return (
    <div
      className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex gap-3 items-start animate-in fade-in slide-in-from-top-1 duration-300 motion-reduce:animate-none"
      data-testid="first-shift-tip"
      role="status"
    >
      <Flame className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0 text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">First time?</p>
        <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
          Crew size is already set. Tap{" "}
          <span className="text-foreground font-medium">{CTA.pickTonight}</span> or open More options
          if you need to tweak protein and time.
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 p-2 -m-1 rounded-lg text-muted-foreground hover:text-foreground touch-manipulation min-h-11 min-w-11 flex items-center justify-center"
        aria-label="Dismiss tip"
        data-testid="button-dismiss-first-shift-tip"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
