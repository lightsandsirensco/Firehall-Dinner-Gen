import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ShoppingCart } from "lucide-react";
import { HallDashboardSection } from "@/components/hall-dashboard/v2/hall-dashboard-section";
import { fetchHallShoppingList } from "@/lib/hall-shopping-list/api";
import { SHIFT_DASHBOARD } from "@/lib/brand-copy";
import type { HallShoppingListItem } from "@shared/hall-shopping-list/types";
import { cn } from "@/lib/utils";

interface ShiftShoppingListCardProps {
  hallId: string;
  className?: string;
}

export function ShiftShoppingListCard({ hallId, className }: ShiftShoppingListCardProps) {
  const [items, setItems] = useState<HallShoppingListItem[]>([]);
  const [listTitle, setListTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchHallShoppingList(hallId)
      .then((payload) => {
        if (cancelled) return;
        setListTitle(payload.list.title);
        setItems(payload.items.filter((item) => !item.purchased).slice(0, 6));
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setListTitle(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hallId]);

  const listHref = `/halls/${hallId}#hall-shared-shopping-list`;

  return (
    <HallDashboardSection
      id="shift-shopping-list"
      title={SHIFT_DASHBOARD.currentShoppingList}
      icon={<ShoppingCart className="w-4 h-4" />}
      action={{ label: SHIFT_DASHBOARD.openShoppingList, href: listHref }}
      className={className}
      testId="shift-shopping-list-section"
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading list…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{SHIFT_DASHBOARD.emptyShoppingList}</p>
      ) : (
        <div className="space-y-2">
          {listTitle ? (
            <p className="text-xs font-medium text-muted-foreground">{listTitle}</p>
          ) : null}
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li
                key={item.item_id}
                className="flex items-center justify-between gap-2 text-sm rounded-lg border border-border/30 bg-background/40 px-3 py-2"
              >
                <span className="font-medium truncate">{item.name}</span>
                {item.quantity ? (
                  <span className="text-xs text-muted-foreground shrink-0">{item.quantity}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <Link href={listHref} className="inline-block text-sm font-medium text-primary hover:underline">
            View full list →
          </Link>
        </div>
      )}
    </HallDashboardSection>
  );
}
