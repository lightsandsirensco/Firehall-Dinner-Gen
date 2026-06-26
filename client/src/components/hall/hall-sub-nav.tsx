import { History, ListChecks, ShoppingCart, Vote } from "lucide-react";
import { Link, useLocation } from "wouter";
import { HALL_CANTEEN, HALL_DASHBOARD, HALL_LINKED } from "@/lib/brand-copy";
import { useHallMembership } from "@/lib/hall-membership/context";
import { cn } from "@/lib/utils";

export function HallSubNav({ className }: { className?: string }) {
  const [location] = useLocation();
  const { activeHallId } = useHallMembership();

  const shoppingHref = activeHallId
    ? `/halls/${activeHallId}#hall-shared-shopping-list`
    : "/hall/shopping-list";

  const links = [
    { href: "/hall", label: HALL_LINKED.linked, exact: true, testId: "hall-nav-home", icon: null },
    {
      href: "/tonight",
      label: HALL_DASHBOARD.actions.hallVote,
      testId: "hall-nav-vote",
      icon: Vote,
    },
    {
      href: shoppingHref,
      label: HALL_DASHBOARD.actions.sharedList,
      testId: "hall-nav-shopping",
      icon: ShoppingCart,
    },
    {
      href: "/hall/history",
      label: HALL_DASHBOARD.actions.mealHistory,
      testId: "hall-nav-history",
      icon: History,
    },
    {
      href: "/hall/canteen",
      label: HALL_DASHBOARD.actions.staples,
      testId: "hall-nav-staples",
      icon: ListChecks,
    },
  ] as const;

  return (
    <nav
      className={cn(
        "flex gap-1 overflow-x-auto scroll-momentum rounded-2xl border border-border/40 bg-muted/20 p-1",
        className,
      )}
      aria-label="Hall collaboration"
      data-testid="hall-sub-nav"
    >
      {links.map((link) => {
        const active =
          link.href === "/hall"
            ? location === "/hall"
            : link.href.startsWith("/halls/")
              ? location.startsWith("/halls/")
              : location === link.href || location.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <Link
            key={link.testId}
            href={link.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors min-h-11 touch-manipulation",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60",
            )}
            data-testid={link.testId}
            aria-current={active ? "page" : undefined}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
            {link.href === "/hall/canteen" ? HALL_CANTEEN.title : link.label}
          </Link>
        );
      })}
    </nav>
  );
}
