import { useEffect } from "react";
import { useAuth } from "@/lib/auth/context";

const HINT_KEY = "firehall_nav_signed_in_v1";

function readHint(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Which navigation the chrome should render. While /api/auth/me is in flight
 * the last known answer is used, so a returning signed-in user never sees the
 * signed-out tabs flash. The hint only ever chooses tabs — never access.
 */
export function useSignedInNav(): boolean {
  const { authenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    try {
      if (authenticated) localStorage.setItem(HINT_KEY, "1");
      else localStorage.removeItem(HINT_KEY);
    } catch {
      /* private mode */
    }
  }, [authenticated, loading]);

  return loading ? readHint() : authenticated;
}
