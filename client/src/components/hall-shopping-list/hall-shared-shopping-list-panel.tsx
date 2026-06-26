import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  MessageSquare,
  Plus,
  Printer,
  Share2,
  ShoppingCart,
  Trash2,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { HallMemberRecord } from "@shared/hall-membership/types";
import type { HallShoppingListPayload } from "@shared/hall-shopping-list/types";
import {
  addHallShoppingListItem,
  completeHallShoppingList,
  deleteHallShoppingListItem,
  fetchHallShoppingList,
  startNewHallShoppingList,
  trackHallShoppingListExport,
  updateHallShoppingListItem,
  updateHallShoppingListMeta,
} from "@/lib/hall-shopping-list/api";
import {
  hallShoppingListToText,
  openHallShoppingListPdf,
  openHallShoppingListSms,
  shareHallShoppingListText,
} from "@/lib/hall-shopping-list/export";
import { cn } from "@/lib/utils";

interface HallSharedShoppingListPanelProps {
  hallId: string;
  hallName?: string;
  members?: HallMemberRecord[];
  className?: string;
}

export function HallSharedShoppingListPanel({
  hallId,
  hallName,
  members = [],
  className,
}: HallSharedShoppingListPanelProps) {
  const { toast } = useToast();
  const [data, setData] = useState<HallShoppingListPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualQty, setManualQty] = useState("");
  const [runnerId, setRunnerId] = useState<string>("none");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchHallShoppingList(hallId);
      setData(payload);
      setRunnerId(payload.list.runner_user_id ?? "none");
    } catch {
      setData(null);
      toast({ title: "Could not load shared list", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [hallId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, typeof data.items>();
    for (const item of data.items) {
      const key = item.section || "Other";
      const batch = map.get(key) ?? [];
      batch.push(item);
      map.set(key, batch);
    }
    return [...map.entries()];
  }, [data]);

  const pendingCount = data?.items.filter((i) => !i.purchased).length ?? 0;

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !data?.can_contribute) return;
    setBusy(true);
    try {
      const next = await addHallShoppingListItem(hallId, {
        name: manualName.trim(),
        quantity: manualQty.trim(),
      });
      setData(next);
      setManualName("");
      setManualQty("");
      toast({ title: "Added to hall list" });
    } catch {
      toast({ title: "Could not add item", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const togglePurchased = async (itemId: string, purchased: boolean) => {
    if (!data?.can_complete) return;
    try {
      const next = await updateHallShoppingListItem(hallId, itemId, { purchased });
      setData(next);
    } catch {
      toast({ title: "Could not update item", variant: "destructive" });
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const next = await deleteHallShoppingListItem(hallId, itemId);
      setData(next);
    } catch {
      toast({ title: "Could not remove item", variant: "destructive" });
    }
  };

  const assignRunner = async (userId: string) => {
    if (!data?.can_complete) return;
    setRunnerId(userId);
    const member = members.find((m) => m.user_id === userId);
    try {
      const next = await updateHallShoppingListMeta(hallId, {
        runner_user_id: userId === "none" ? null : userId,
        runner_name: member?.display_name ?? member?.email ?? null,
      });
      setData(next);
    } catch {
      toast({ title: "Could not assign runner", variant: "destructive" });
    }
  };

  const handleExportPdf = async () => {
    if (!data) return;
    openHallShoppingListPdf(data.list, data.items, hallName);
    await trackHallShoppingListExport(hallId, "pdf");
  };

  const handleExportText = async () => {
    if (!data) return;
    const ok = await shareHallShoppingListText(data.list, data.items, hallName);
    await trackHallShoppingListExport(hallId, "text");
    toast({ title: ok ? "List copied / shared" : "Could not share list", variant: ok ? "default" : "destructive" });
  };

  const handleSms = async () => {
    if (!data) return;
    openHallShoppingListSms(data.list, data.items);
    await trackHallShoppingListExport(hallId, "text");
  };

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(hallShoppingListToText(data.list, data.items, hallName));
      await trackHallShoppingListExport(hallId, "text");
      toast({ title: "List copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleComplete = async () => {
    if (!data?.can_complete) return;
    setBusy(true);
    try {
      const next = await completeHallShoppingList(hallId);
      setData(next);
      toast({ title: "Grocery run marked complete" });
    } catch {
      toast({ title: "Could not complete list", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleNewList = async () => {
    if (!data?.can_complete) return;
    setBusy(true);
    try {
      const next = await startNewHallShoppingList(hallId);
      setData(next);
      toast({ title: "New hall list started" });
    } catch {
      toast({ title: "Could not start new list", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("flex justify-center py-10", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const isCompleted = data.list.status === "completed";

  return (
    <section
      id="hall-shared-shopping-list"
      className={cn("scroll-mt-24 rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-5 space-y-4", className)}
      data-testid="hall-shared-shopping-list"
      aria-labelledby="hall-shared-list-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="hall-shared-list-heading"
            className="font-heading text-lg tracking-wide flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4 text-primary" />
            Shared grocery list
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            One list for the whole hall — {pendingCount} item{pendingCount === 1 ? "" : "s"} left
          </p>
        </div>
        {isCompleted && (
          <span className="text-xs font-medium uppercase tracking-wide text-primary bg-primary/10 px-2 py-1 rounded">
            Completed
          </span>
        )}
      </div>

      {data.can_complete && (
        <div id="hall-list-runner" className="grid gap-2 sm:grid-cols-2 scroll-mt-24">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <UserCircle className="w-3.5 h-3.5" />
              Grocery runner
            </Label>
            <Select value={runnerId} onValueChange={(v) => void assignRunner(v)} disabled={isCompleted}>
              <SelectTrigger data-testid="hall-list-runner-select">
                <SelectValue placeholder="Assign runner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.display_name || m.email || m.user_id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <Button type="button" variant="outline" className="min-h-11 touch-manipulation" onClick={() => void handleExportPdf()}>
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              PDF
            </Button>
            <Button type="button" variant="outline" className="min-h-11 touch-manipulation" onClick={() => void handleExportText()}>
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              Share
            </Button>
            <Button type="button" variant="outline" className="min-h-11 touch-manipulation" onClick={() => void handleSms()}>
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              Text
            </Button>
            <Button type="button" variant="outline" className="min-h-11 touch-manipulation" onClick={() => void handleCopy()}>
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy
            </Button>
          </div>
        </div>
      )}

      {data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No items yet — add from a recipe or type a manual item below.
        </p>
      ) : (
        <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
          {grouped.map(([section, items]) => (
            <div key={section}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {section}
              </p>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li
                    key={item.item_id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-3 text-sm min-h-[52px]",
                      item.purchased ? "border-border/30 bg-muted/20 opacity-60" : "border-border/50 bg-card",
                    )}
                    data-testid={`hall-list-item-${item.item_id}`}
                  >
                    {data.can_complete && !isCompleted ? (
                      <button
                        type="button"
                        className="shrink-0 min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-border/60 touch-manipulation"
                        onClick={() => void togglePurchased(item.item_id, !item.purchased)}
                        aria-label={item.purchased ? "Mark not purchased" : "Mark purchased"}
                      >
                        {item.purchased ? (
                          <Check className="w-4 h-4 text-primary" />
                        ) : (
                          <span className="w-4 h-4 rounded-sm border border-muted-foreground/40" />
                        )}
                      </button>
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium leading-snug break-words", item.purchased && "line-through")}>
                        {item.name}
                      </p>
                      {item.quantity ? (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.quantity}</p>
                      ) : null}
                    </div>
                    {data.can_contribute && !isCompleted ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-11 w-11 touch-manipulation"
                        onClick={() => void handleDelete(item.item_id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {data.can_contribute && !isCompleted && (
        <form onSubmit={(e) => void handleAddManual(e)} className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Add item (e.g. Ground beef)"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className="min-h-11"
            data-testid="hall-list-manual-name"
          />
          <Input
            placeholder="Qty"
            value={manualQty}
            onChange={(e) => setManualQty(e.target.value)}
            className="sm:max-w-[120px] min-h-11"
          />
          <Button type="submit" disabled={busy || !manualName.trim()} className="sm:shrink-0 min-h-11">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Add
          </Button>
        </form>
      )}

      {data.can_complete && (
        <div className="flex flex-wrap gap-2 pt-1">
          {!isCompleted ? (
            <Button
              type="button"
              variant="default"
              disabled={busy || data.items.length === 0}
              onClick={() => void handleComplete()}
              data-testid="hall-list-complete"
            >
              Mark run complete
            </Button>
          ) : (
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void handleNewList()}>
              Start new list
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
