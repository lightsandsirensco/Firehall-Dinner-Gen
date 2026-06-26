import { Redirect, useLocation } from "wouter";
import { BROWSE_CANONICAL_PATH } from "@shared/browse-canonical";

/** Client-side fallback when /recipes is reached via in-app navigation. */
export default function ExploreBrowseRedirect() {
  const [location] = useLocation();
  const q = location.includes("?") ? location.slice(location.indexOf("?")) : "";
  return <Redirect to={`${BROWSE_CANONICAL_PATH}${q}`} replace />;
}
