import type { HallCanteenItem, HallCanteenSuggestion } from "@shared/hall-canteen/types";
import {
  HALL_CANTEEN_CATEGORY_LABELS,
  HALL_CANTEEN_STATUS_ICONS,
  HALL_CANTEEN_STATUS_LABELS,
  normalizeCanteenCategory,
} from "@shared/hall-canteen/types";
import { Button } from "@/components/ui/button";

interface NeedsAttentionSectionProps {
  items: HallCanteenItem[];
  suggestions: HallCanteenSuggestion[];
  canManage: boolean;
  busyId: string | null;
  onAddToOrder: (itemId: string) => void;
  onMarkResolved: (itemId: string) => void;
  onApproveSuggestion: (suggestionId: string) => void;
  onRejectSuggestion: (suggestionId: string) => void;
}

export function CanteenNeedsAttentionSection({
  items,
  suggestions,
  canManage,
  busyId,
  onAddToOrder,
  onMarkResolved,
  onApproveSuggestion,
  onRejectSuggestion,
}: NeedsAttentionSectionProps) {
  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");
  if (items.length === 0 && pendingSuggestions.length === 0) {
    return (
      <section className="rounded-2xl border border-border/40 bg-muted/15 px-4 py-5" data-testid="canteen-needs-attention">
        <h2 className="font-heading text-lg tracking-wide">Needs Attention</h2>
        <p className="mt-2 text-sm text-muted-foreground">Nothing urgent — staples look covered.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3" data-testid="canteen-needs-attention">
      <h2 className="font-heading text-lg tracking-wide px-0.5">Needs Attention</h2>
      <ul className="space-y-2">
        {items.map((item) => {
          const cat = normalizeCanteenCategory(item.category);
          return (
            <li
              key={item.item_id}
              className="rounded-2xl border border-border/45 bg-card/50 px-3 py-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-base leading-snug">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {HALL_CANTEEN_CATEGORY_LABELS[cat]} ·{" "}
                    <span className="font-medium text-foreground">
                      {HALL_CANTEEN_STATUS_ICONS[item.status]} {HALL_CANTEEN_STATUS_LABELS[item.status]}
                    </span>
                    {item.report_count > 0 ? ` · ${item.report_count} report${item.report_count === 1 ? "" : "s"}` : ""}
                  </p>
                  {item.latest_report_note ? (
                    <p className="text-sm text-muted-foreground mt-1 italic">“{item.latest_report_note}”</p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Reorder qty: {item.reorder_qty}
                    {item.last_restocked_at
                      ? ` · Last restocked ${new Date(item.last_restocked_at).toLocaleDateString()}`
                      : " · Never restocked"}
                  </p>
                </div>
              </div>
              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11"
                    disabled={busyId === item.item_id}
                    onClick={() => onAddToOrder(item.item_id)}
                  >
                    Add to This Week’s Order
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-11"
                    disabled={busyId === item.item_id}
                    onClick={() => onMarkResolved(item.item_id)}
                  >
                    Mark Resolved
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {pendingSuggestions.length > 0 ? (
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-semibold px-0.5">Suggested staples</h3>
          <ul className="space-y-2">
            {pendingSuggestions.map((s) => (
              <li key={s.suggestion_id} className="rounded-2xl border border-dashed border-border/50 bg-muted/20 px-3 py-3">
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Suggested by {s.suggested_by_display_name}
                  {s.note ? ` — “${s.note}”` : ""}
                </p>
                {canManage ? (
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="min-h-11"
                      onClick={() => onApproveSuggestion(s.suggestion_id)}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => onRejectSuggestion(s.suggestion_id)}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
