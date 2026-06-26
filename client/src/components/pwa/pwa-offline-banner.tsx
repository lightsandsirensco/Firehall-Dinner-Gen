import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { PWA_COPY } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

export function PwaOfflineBanner() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-[80] flex items-center justify-center gap-2 px-4 py-2",
        "bg-amber-500/95 text-amber-950 text-xs font-medium",
        "pt-[max(0.5rem,env(safe-area-inset-top))]",
      )}
      role="status"
      data-testid="pwa-offline-banner"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {PWA_COPY.offlineBanner}
    </div>
  );
}
