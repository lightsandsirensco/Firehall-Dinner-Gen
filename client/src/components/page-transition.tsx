import { type ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { rememberLastRoute } from "@/lib/app-session";

interface PageTransitionProps {
  children: ReactNode;
}

/** Subtle route enter + session route memory — no layout change */
export function PageTransition({ children }: PageTransitionProps) {
  const [location] = useLocation();

  useEffect(() => {
    rememberLastRoute(location);
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div key={location} className="page-enter min-h-[100dvh] scroll-momentum">
      {children}
    </div>
  );
}
