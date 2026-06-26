import { useEffect, type ReactNode } from "react";

interface AdminPageShellProps {
  title: string;
  children: ReactNode;
}

/** Founder-only admin pages — noindex, not linked from public nav. */
export function AdminPageShell({ title, children }: AdminPageShellProps) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} · Admin`;

    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const created = !robots;
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    const previousRobots = robots.content;
    robots.content = "noindex, nofollow";

    return () => {
      document.title = previousTitle;
      if (created && robots?.parentNode) {
        robots.parentNode.removeChild(robots);
      } else if (robots) {
        robots.content = previousRobots;
      }
    };
  }, [title]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6" data-admin-page>
      <div className="mx-auto max-w-[90rem] space-y-6">{children}</div>
    </div>
  );
}
