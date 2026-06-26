import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth/context";
import { fetchHallDetail } from "@/lib/hall-membership/api";
import type {
  HallDetailPayload,
  HallPermission,
  HallSummary,
} from "@shared/hall-membership/types";
import { hallRoleHasPermission } from "@shared/hall-membership/types";

const ACTIVE_HALL_STORAGE_KEY = "fh_active_hall_id";

interface HallMembershipContextValue {
  halls: HallSummary[];
  activeHallId: string | null;
  activeHall: HallSummary | null;
  detail: HallDetailPayload | null;
  loading: boolean;
  setActiveHallId: (hallId: string | null) => void;
  hasPermission: (permission: HallPermission) => boolean;
  refreshDetail: () => Promise<void>;
}

const HallMembershipContext = createContext<HallMembershipContextValue | null>(null);

export function HallMembershipProvider({ children }: { children: ReactNode }) {
  const { authenticated, halls, refresh } = useAuth();
  const [activeHallId, setActiveHallIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_HALL_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [detail, setDetail] = useState<HallDetailPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const setActiveHallId = useCallback((hallId: string | null) => {
    setActiveHallIdState(hallId);
    try {
      if (hallId) localStorage.setItem(ACTIVE_HALL_STORAGE_KEY, hallId);
      else localStorage.removeItem(ACTIVE_HALL_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!authenticated) {
      setDetail(null);
      return;
    }
    if (halls.length === 0) {
      setActiveHallId(null);
      setDetail(null);
      return;
    }
    const valid = activeHallId && halls.some((h) => h.hall_id === activeHallId);
    if (!valid) {
      setActiveHallId(halls[0].hall_id);
    }
  }, [authenticated, halls, activeHallId, setActiveHallId]);

  const activeHall = useMemo(
    () => halls.find((h) => h.hall_id === activeHallId) ?? null,
    [halls, activeHallId],
  );

  const refreshDetail = useCallback(async () => {
    if (!authenticated || !activeHallId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchHallDetail(activeHallId);
      setDetail(data);
    } catch {
      setDetail(null);
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [authenticated, activeHallId, refresh]);

  useEffect(() => {
    void refreshDetail();
  }, [refreshDetail]);

  const hasPermission = useCallback(
    (permission: HallPermission) => {
      if (!detail) return false;
      return hallRoleHasPermission(detail.my_role, permission);
    },
    [detail],
  );

  const value = useMemo(
    (): HallMembershipContextValue => ({
      halls,
      activeHallId,
      activeHall,
      detail,
      loading,
      setActiveHallId,
      hasPermission,
      refreshDetail,
    }),
    [halls, activeHallId, activeHall, detail, loading, setActiveHallId, hasPermission, refreshDetail],
  );

  return (
    <HallMembershipContext.Provider value={value}>{children}</HallMembershipContext.Provider>
  );
}

export function useHallMembership(): HallMembershipContextValue {
  const ctx = useContext(HallMembershipContext);
  if (!ctx) {
    throw new Error("useHallMembership must be used within HallMembershipProvider");
  }
  return ctx;
}

export function useHallPermission(permission: HallPermission): boolean {
  const { hasPermission } = useHallMembership();
  return hasPermission(permission);
}
