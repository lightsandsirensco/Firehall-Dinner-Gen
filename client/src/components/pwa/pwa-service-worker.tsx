import { useRegisterSW } from "virtual:pwa-register/react";
import { useEffect } from "react";

/** Registers the service worker and reloads when a new build is ready. */
export function PwaServiceWorker() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (registration) {
        registration.update().catch(() => {
          /* ignore */
        });
      }
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    void updateServiceWorker(true);
  }, [needRefresh, updateServiceWorker]);

  return null;
}
