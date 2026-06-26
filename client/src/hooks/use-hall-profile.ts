import { useCallback, useEffect, useState } from "react";
import type { HallProfile } from "@shared/hall-profile/types";
import {
  getHallProfile,
  updateHallProfile,
  HALL_PROFILE_CHANGED_EVENT,
} from "@/lib/hall-profile-store";

export function useHallProfile() {
  const [profile, setProfile] = useState<HallProfile>(() => getHallProfile());

  useEffect(() => {
    const onChange = () => setProfile(getHallProfile());
    window.addEventListener(HALL_PROFILE_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(HALL_PROFILE_CHANGED_EVENT, onChange);
  }, []);

  const update = useCallback(
    (patch: Partial<Pick<HallProfile, "hallName" | "shiftLabel" | "defaultCrewSize">>) => {
      const next = updateHallProfile(patch);
      setProfile(next);
      return next;
    },
    [],
  );

  return { profile, updateProfile: update };
}
