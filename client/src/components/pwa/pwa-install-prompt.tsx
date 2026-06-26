import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PWA_COPY } from "@/lib/brand-copy";
import { trackPwaPromptShown } from "@/lib/analytics";
import {
  canShowPwaInstallPrompt,
  dismissPwaPrompt,
  initPwaInstallPrompt,
  promptPwaInstall,
  subscribePwaInstallPrompt,
} from "@/lib/pwa/install-prompt";
import { getPwaVisitCount, recordPwaSessionVisit } from "@/lib/pwa/visit-count";
import { cn } from "@/lib/utils";

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    recordPwaSessionVisit();
    initPwaInstallPrompt();

    const sync = () => setVisible(canShowPwaInstallPrompt());
    sync();
    const unsub = subscribePwaInstallPrompt(sync);
    return unsub;
  }, []);

  useEffect(() => {
    if (!visible) return;
    trackPwaPromptShown({ visit_count: getPwaVisitCount() });
  }, [visible]);

  if (!visible) return null;

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const outcome = await promptPwaInstall();
      setVisible(false);
      if (outcome === "dismissed") {
        /* dismissal tracked in promptPwaInstall */
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    dismissPwaPrompt();
    setVisible(false);
  };

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-[70] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none",
      )}
      role="region"
      aria-label={PWA_COPY.installTitle}
      data-testid="pwa-install-prompt"
    >
      <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl shadow-black/40 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Smartphone className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-base tracking-wide text-foreground">{PWA_COPY.installTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground leading-snug">{PWA_COPY.installBody}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="min-h-10 touch-manipulation"
                onClick={() => void handleInstall()}
                disabled={installing}
                data-testid="button-pwa-install"
              >
                <Download className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                {installing ? PWA_COPY.installing : PWA_COPY.installCta}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-10 touch-manipulation"
                onClick={handleDismiss}
                data-testid="button-pwa-dismiss"
              >
                {PWA_COPY.dismiss}
              </Button>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleDismiss}
            aria-label={PWA_COPY.dismissAria}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
