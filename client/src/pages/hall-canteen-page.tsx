import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Plus } from "lucide-react";
import { HallShell } from "@/components/hall/hall-shell";
import { HallPermissionGate } from "@/components/hall-membership/hall-permission-gate";
import { HallStapleRow } from "@/components/hall-canteen/hall-staple-row";
import { HallShoppingThisWeekSection } from "@/components/hall-canteen/hall-shopping-this-week-section";
import { HallCanteenPaymentTrackerSection } from "@/components/hall-canteen/hall-canteen-payment-tracker-section";
import { HallNotesSection } from "@/components/hall-notes/hall-notes-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHallMembership } from "@/lib/hall-membership/context";
import { useAuth } from "@/lib/auth/context";
import { useToast } from "@/hooks/use-toast";
import {
  addCanteenItem,
  claimCanteenPickup,
  fetchHallCanteen,
  manageCanteenItem,
  releaseCanteenPickup,
  setCanteenItemStatus,
} from "@/lib/hall-canteen/api";
import type { HallCanteenPayload, HallCanteenStatus } from "@shared/hall-canteen/types";
import {
  groupItemsByCategory,
  HALL_CANTEEN_CATEGORY_EMOJI,
  HALL_CANTEEN_CATEGORY_LABELS,
  applyCanteenStatusChange,
} from "@shared/hall-canteen/types";
import { HALL_CANTEEN, HALL_LINKED } from "@/lib/brand-copy";

function CanteenLocked() {
  return (
    <div
      className="rounded-2xl border border-dashed border-border/50 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground"
      data-testid="hall-canteen-locked"
    >
      {HALL_LINKED.connect} to track Hall Staples.{" "}
      <Link href="/hall/join" className="text-primary hover:underline font-medium">
        {HALL_LINKED.join}
      </Link>
    </div>
  );
}

export default function HallCanteenPage() {
  const { authenticated } = useAuth();
  const { activeHallId } = useHallMembership();
  const { toast } = useToast();
  const [data, setData] = useState<HallCanteenPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!activeHallId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const payload = await fetchHallCanteen(activeHallId);
      setData(payload);
    } catch {
      setData(null);
      toast({ title: "Could not load staples list", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeHallId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatus = async (itemId: string, status: HallCanteenStatus) => {
    if (!activeHallId || !data?.can_update) return;
    const previous = data;
    setBusyId(itemId);
    setData(applyCanteenStatusChange(data, itemId, status));
    try {
      const next = await setCanteenItemStatus(activeHallId, itemId, status);
      setData(next);
    } catch {
      setData(previous);
      toast({ title: "Could not update item", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (itemId: string) => {
    if (!activeHallId || !data?.can_manage_list) return;
    setBusyId(itemId);
    try {
      const next = await manageCanteenItem(activeHallId, itemId, { archived: true });
      setData(next);
    } catch {
      toast({ title: "Could not remove item", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHallId || !customName.trim() || !data?.can_manage_list) return;
    setAdding(true);
    try {
      const next = await addCanteenItem(activeHallId, { name: customName.trim(), category: "custom" });
      setData(next);
      setCustomName("");
      toast({ title: "Added to staples" });
    } catch {
      toast({ title: "Could not add item — it may already exist", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handlePurchased = async (itemId: string) => {
    await handleStatus(itemId, "good");
  };

  const handleClaim = async (itemId: string) => {
    if (!activeHallId || !data?.can_update) return;
    const previous = data;
    setBusyId(itemId);
    try {
      const next = await claimCanteenPickup(activeHallId, itemId);
      setData(next);
    } catch {
      setData(previous);
      toast({ title: "Could not claim item", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleRelease = async (itemId: string) => {
    if (!activeHallId || !data?.can_manage_list) return;
    const previous = data;
    setBusyId(itemId);
    try {
      const next = await releaseCanteenPickup(activeHallId, itemId);
      setData(next);
    } catch {
      setData(previous);
      toast({ title: "Could not release claim", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const groups = data ? groupItemsByCategory(data.items) : [];

  return (
    <HallShell title={HALL_CANTEEN.title} testId="hall-canteen-page">
      <HallPermissionGate
        permission="view_hall_dashboard"
        allowGuest
        fallback={authenticated ? <CanteenLocked /> : null}
      >
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground px-0.5">{HALL_CANTEEN.subtitle}</p>

          {loading ? (
            <p className="text-sm text-muted-foreground px-1">Loading staples…</p>
          ) : !data ? (
            <p className="text-sm text-muted-foreground px-1">No staples data available.</p>
          ) : (
            <div className="space-y-6">
              <HallShoppingThisWeekSection
                data={data}
                busyId={busyId}
                onClaim={(itemId) => void handleClaim(itemId)}
                onPurchased={(itemId) => void handlePurchased(itemId)}
                onRelease={(itemId) => void handleRelease(itemId)}
              />

              <HallCanteenPaymentTrackerSection activeHallId={activeHallId} />

              {groups.map((group) => (
                <section key={group.category} className="space-y-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
                    <span className="mr-1.5" aria-hidden>
                      {HALL_CANTEEN_CATEGORY_EMOJI[group.category]}
                    </span>
                    {HALL_CANTEEN_CATEGORY_LABELS[group.category]}
                  </h2>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <HallStapleRow
                        key={item.item_id}
                        item={item}
                        busy={busyId === item.item_id}
                        readOnly={!data.can_update}
                        canManage={data.can_manage_list}
                        onStatus={(status) => void handleStatus(item.item_id, status)}
                        onClaim={() => void handleClaim(item.item_id)}
                        onPurchased={() => void handlePurchased(item.item_id)}
                        onRelease={() => void handleRelease(item.item_id)}
                        onRemove={
                          data.can_manage_list
                            ? () => void handleRemove(item.item_id)
                            : undefined
                        }
                      />
                    ))}
                  </ul>
                </section>
              ))}

              {data.can_manage_list ? (
                <section className="rounded-2xl border border-dashed border-border/50 bg-muted/10 px-4 py-4 space-y-3">
                  <h2 className="text-sm font-semibold">Add staple</h2>
                  <form onSubmit={handleAddCustom} className="flex gap-2">
                    <Input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Paper towels"
                      className="min-h-[44px]"
                      maxLength={120}
                    />
                    <Button type="submit" disabled={adding || !customName.trim()} className="min-h-[44px] shrink-0">
                      <Plus className="w-4 h-4" aria-hidden />
                      <span className="sr-only">Add</span>
                    </Button>
                  </form>
                </section>
              ) : null}
            </div>
          )}

          <HallNotesSection activeHallId={activeHallId} limit={20} showComposer />
        </div>
      </HallPermissionGate>
    </HallShell>
  );
}
