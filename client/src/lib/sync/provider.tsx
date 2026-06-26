import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth/context";
import { runCloudSync, scheduleCloudSync } from "@/lib/sync/coordinator";
import { SYNC_CHANGE_EVENTS } from "@/lib/sync/local-snapshots";

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const initialSyncDone = useRef(false);

  useEffect(() => {
    if (loading || !authenticated) {
      initialSyncDone.current = false;
      return;
    }

    if (!initialSyncDone.current) {
      initialSyncDone.current = true;
      void runCloudSync("sign_in");
    }
  }, [authenticated, loading]);

  useEffect(() => {
    if (!authenticated) return;

    const onChange = () => scheduleCloudSync("change");
    for (const eventName of SYNC_CHANGE_EVENTS) {
      window.addEventListener(eventName, onChange);
    }
    return () => {
      for (const eventName of SYNC_CHANGE_EVENTS) {
        window.removeEventListener(eventName, onChange);
      }
    };
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    const interval = window.setInterval(() => {
      scheduleCloudSync("background", 0);
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [authenticated]);

  return children;
}
