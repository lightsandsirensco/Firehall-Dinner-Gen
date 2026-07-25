import { useEffect } from "react";

const ROBOTS_MANAGED = "data-seo-noindex";

/**
 * Mark authenticated / app-shell pages as non-indexable.
 * Complements robots.txt Disallow and server X-Robots-Tag.
 */
export function useNoIndex(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let el = document.querySelector<HTMLMetaElement>(`meta[name="robots"][${ROBOTS_MANAGED}]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "robots");
      el.setAttribute(ROBOTS_MANAGED, "true");
      document.head.appendChild(el);
    }
    el.setAttribute("content", "noindex, nofollow");
    return () => {
      el?.remove();
    };
  }, [enabled]);
}
