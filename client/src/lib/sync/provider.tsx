import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { runCloudSync, scheduleCloudSync } from "@/lib/sync/coordinator";
import { SYNC_CHANGE_EVENTS } from "@/lib/sync/local-snapshots";
import { importLocalMealHistory } from "@/lib/meal-history-import";
import { importLegacyHallFavorites } from "@/lib/hall-favorites-store";

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, loading, user } = useAuth();
  const userId = user?.user_id ?? null;
  const initialSyncDone = useRef(false);

  // Before children render so first-paint saved counts already include legacy Hall Favorites. Idempotent.
  useState(() => importLegacyHallFavorites());

  useEffect(() => {
    if (loading || !authenticated) {
      initialSyncDone.current = false;
      return;
    }

    if (!initialSyncDone.current) {
      initialSyncDone.current = true;
      // Snapshot sync first so local history includes entries pulled from other devices.
      void runCloudSync("sign_in").finally(() => {
        if (userId) void importLocalMealHistory(userId);
      });
    }
  }, [authenticated, loading, userId]);

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
