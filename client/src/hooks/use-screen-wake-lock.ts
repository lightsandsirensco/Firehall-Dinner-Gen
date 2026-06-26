import { useCallback, useEffect, useRef, useState } from "react";

interface UseScreenWakeLockResult {
  supported: boolean;
  active: boolean;
  error: string | null;
  request: () => Promise<void>;
  release: () => Promise<void>;
}

export function useScreenWakeLock(enabled: boolean): UseScreenWakeLockResult {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && "wakeLock" in navigator);
  }, []);

  const release = useCallback(async () => {
    if (!sentinelRef.current) return;
    try {
      await sentinelRef.current.release();
    } catch {
      /* ignore */
    }
    sentinelRef.current = null;
    setActive(false);
  }, []);

  const request = useCallback(async () => {
    if (!supported || typeof navigator === "undefined") return;
    try {
      await release();
      const sentinel = await navigator.wakeLock.request("screen");
      sentinelRef.current = sentinel;
      setActive(true);
      setError(null);
      sentinel.addEventListener("release", () => {
        sentinelRef.current = null;
        setActive(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wake lock unavailable");
      setActive(false);
    }
  }, [supported, release]);

  useEffect(() => {
    if (!enabled || !supported) {
      void release();
      return;
    }
    void request();

    const onVisibility = () => {
      if (document.visibilityState === "visible" && enabled) {
        void request();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void release();
    };
  }, [enabled, supported, request, release]);

  return { supported, active, error, request, release };
}
