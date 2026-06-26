import type { ReactNode } from "react";
import type { HallPermission } from "@shared/hall-membership/types";
import { useAuth } from "@/lib/auth/context";
import { useHallMembership } from "@/lib/hall-membership/context";

interface HallPermissionGateProps {
  permission: HallPermission;
  children: ReactNode;
  fallback?: ReactNode;
  /** When true, guests without a shared hall still see children (device-local mode). */
  allowGuest?: boolean;
}

export function HallPermissionGate({
  permission,
  children,
  fallback = null,
  allowGuest = true,
}: HallPermissionGateProps) {
  const { authenticated } = useAuth();
  const { activeHallId, hasPermission } = useHallMembership();

  if (!authenticated || !activeHallId) {
    return allowGuest ? children : fallback;
  }

  return hasPermission(permission) ? children : fallback;
}
