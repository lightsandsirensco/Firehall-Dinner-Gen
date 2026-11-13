import { useEffect, useState } from "react";
import { CREW_BUCKET_TO_SIZE } from "@shared/generator-simplified";
import { resolvePreferredCrewSize } from "@shared/recipe/crew-scaling-config";
import { useAuth } from "@/lib/auth/context";
import { readPersonalGeneratorPrefs } from "@/lib/generator-personalization";
import { getHallProfile, HALL_PROFILE_CHANGED_EVENT } from "@/lib/hall-profile-store";

function readDeviceSizes(): { generatorCrewSize: number | null; deviceCrewSize: number } {
  const bucket = readPersonalGeneratorPrefs()?.crew_bucket;
  return {
    generatorCrewSize: bucket ? CREW_BUCKET_TO_SIZE[bucket] : null,
    deviceCrewSize: getHallProfile().defaultCrewSize,
  };
}

/** The crew size recipe pages, Explore, and planner setup start from (see resolvePreferredCrewSize). */
export function usePreferredCrewSize(): number {
  const { profile } = useAuth();
  const [device, setDevice] = useState(readDeviceSizes);

  useEffect(() => {
    const refresh = () => setDevice(readDeviceSizes());
    window.addEventListener(HALL_PROFILE_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(HALL_PROFILE_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return resolvePreferredCrewSize({ ...device, accountCrewSize: profile?.crew_size ?? null });
}
