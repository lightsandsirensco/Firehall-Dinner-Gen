import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";

/** Legacy Performance Fuel URLs → unified hall recipe catalog. */
export default function PerformanceFuelRedirect() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/performance-fuel/:slug");

  useEffect(() => {
    const slug = params?.slug?.trim();
    setLocation(slug ? `/recipes/${slug}` : "/recipes", { replace: true });
  }, [params?.slug, setLocation]);

  return null;
}
