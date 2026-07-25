import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Plus } from "lucide-react";
import { HallShell } from "@/components/hall/hall-shell";
import { HallPermissionGate } from "@/components/hall-membership/hall-permission-gate";
import { HallStapleRow } from "@/components/hall-canteen/hall-staple-row";
import { HallCanteenPaymentTrackerSection } from "@/components/hall-canteen/hall-canteen-payment-tracker-section";
import { CanteenCountStrip } from "@/components/hall-canteen/canteen-count-strip";
import { CanteenNeedsAttentionSection } from "@/components/hall-canteen/canteen-needs-attention-section";
import { CanteenWeeklyOrderSection } from "@/components/hall-canteen/canteen-weekly-order-section";
import { CanteenRecentDeliveriesSection } from "@/components/hall-canteen/canteen-recent-deliveries-section";
import { HallNotesSection } from "@/components/hall-notes/hall-notes-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHallMembership } from "@/lib/hall-membership/context";
import { useAuth } from "@/lib/auth/context";
import { useToast } from "@/hooks/use-toast";
import {
  addCanteenItem,
  addToWeeklyOrder,
  claimWeeklyOrderItem,
  completeCanteenDelivery,
  createCanteenManagerNote,
  deleteCanteenManagerNote,
  fetchCostcoHandoff,
  fetchHallCanteen,
  manageCanteenItem,
  receiveWeeklyOrderItem,
  releaseWeeklyOrderItem,
  reportCanteenItem,
  reviewCanteenSuggestion,
  setCanteenItemStatus,
  suggestCanteenStaple,
  updateWeeklyOrderItem,
} from "@/lib/hall-canteen/api";
import type { HallCanteenMemberStatus, HallCanteenPayload, HallCanteenStatus } from "@shared/hall-canteen/types";
import {
  applyCanteenStatusChange,
  groupItemsByCategory,
  HALL_CANTEEN_CATEGORY_EMOJI,
  HALL_CANTEEN_CATEGORY_LABELS,
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
  const { authenticated, user } = useAuth();
  const { activeHallId } = useHallMembership();
  const { toast } = useToast();
  const [data, setData] = useState<HallCanteenPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [suggestName, setSuggestName] = useState("");
  const [shortageNote, setShortageNote] = useState("");
  const [managerNote, setManagerNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [receivingMode, setReceivingMode] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffText, setHandoffText] = useState("");
  const [handoffCsv, setHandoffCsv] = useState("");

  const load = useCallback(async () => {
    if (!activeHallId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await fetchHallCanteen(activeHallId));
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

  const run = async (id: string, fn: () => Promise<HallCanteenPayload>) => {
    const previous = data;
    setBusyId(id);
    try {
      setData(await fn());
    } catch {
      setData(previous);
      toast({ title: "Could not update canteen", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleStatus = async (itemId: string, status: HallCanteenStatus) => {
    if (!activeHallId || !data?.can_update) return;
    const previous = data;
    setBusyId(itemId);
    setData(applyCanteenStatusChange(data, itemId, status));
    try {
      const note =
        (status === "out" || status === "running_low") && shortageNote.trim()
          ? shortageNote.trim()
          : undefined;
      const next = note
        ? await reportCanteenItem(activeHallId, {
            item_id: itemId,
            status: status as HallCanteenMemberStatus,
            note,
          })
        : await setCanteenItemStatus(activeHallId, itemId, status);
      setData(next);
      if (note) setShortageNote("");
    } catch {
      setData(previous);
      toast({ title: "Could not update item", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const groups = useMemo(() => (data ? groupItemsByCategory(data.items) : []), [data]);

  return (
    <HallShell title={HALL_CANTEEN.title} testId="hall-canteen-page">
      <HallPermissionGate
        permission="view_hall_dashboard"
        allowGuest
        fallback={authenticated ? <CanteenLocked /> : null}
      >
        <div className="space-y-6 pb-24">
          <div className="px-0.5 space-y-1">
            <p className="text-sm text-muted-foreground">{HALL_CANTEEN.subtitle}</p>
            {data ? (
              <p className="text-xs text-muted-foreground">
                {data.active_staple_count} active staples
                {data.staple_limit != null ? ` · Free limit ${data.staple_limit}` : " · Hall Pro unlimited"}
              </p>
            ) : null}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground px-1">Loading canteen…</p>
          ) : !data ? (
            <p className="text-sm text-muted-foreground px-1">No canteen data available.</p>
          ) : (
            <>
              <CanteenCountStrip data={data} />

              <CanteenNeedsAttentionSection
                items={data.needs_attention}
                suggestions={data.suggestions}
                canManage={data.can_manage_list}
                busyId={busyId}
                onAddToOrder={(itemId) => {
                  if (!activeHallId) return;
                  void run(itemId, () => addToWeeklyOrder(activeHallId, { item_id: itemId }));
                }}
                onMarkResolved={(itemId) => void handleStatus(itemId, "good")}
                onApproveSuggestion={(id) => {
                  if (!activeHallId) return;
                  void run(id, () => reviewCanteenSuggestion(activeHallId, id, "approve"));
                }}
                onRejectSuggestion={(id) => {
                  if (!activeHallId) return;
                  void run(id, () => reviewCanteenSuggestion(activeHallId, id, "reject"));
                }}
              />

              <CanteenWeeklyOrderSection
                order={data.current_order}
                canManage={data.can_manage_list}
                canExportCsv={data.can_export_csv}
                canUseProductUrls={data.can_use_product_urls}
                currentUserId={user?.user_id}
                busyId={busyId}
                receivingMode={receivingMode}
                onClaim={(id) => {
                  if (!activeHallId) return;
                  void run(id, () => claimWeeklyOrderItem(activeHallId, id));
                }}
                onRelease={(id) => {
                  if (!activeHallId) return;
                  void run(id, () => releaseWeeklyOrderItem(activeHallId, id));
                }}
                onMarkAddedToCostco={(id) => {
                  if (!activeHallId) return;
                  void run(id, () => updateWeeklyOrderItem(activeHallId, id, { status: "added_to_costco" }));
                }}
                onMarkUnavailable={(id) => {
                  if (!activeHallId) return;
                  void run(id, () => updateWeeklyOrderItem(activeHallId, id, { status: "unavailable" }));
                }}
                onReceive={(id, status) => {
                  if (!activeHallId) return;
                  void run(id, () => receiveWeeklyOrderItem(activeHallId, id, { receive_status: status }));
                }}
                onBuildCostco={() => {
                  if (!activeHallId) return;
                  void (async () => {
                    try {
                      const handoff = await fetchCostcoHandoff(activeHallId);
                      setHandoffText(handoff.text);
                      setHandoffCsv(handoff.csv);
                      setHandoffOpen(true);
                      setReceivingMode(false);
                    } catch {
                      toast({ title: "Could not build Costco list", variant: "destructive" });
                    }
                  })();
                }}
                onCompleteDelivery={() => {
                  if (!activeHallId) return;
                  void (async () => {
                    await run("complete", () => completeCanteenDelivery(activeHallId));
                    setReceivingMode(false);
                    toast({ title: "Delivery completed — new draft order ready" });
                  })();
                }}
              />

              {data.can_manage_list && data.current_order ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-h-12"
                  onClick={() => setReceivingMode((v) => !v)}
                >
                  {receivingMode ? "Hide Receive Delivery" : "Receive Delivery"}
                </Button>
              ) : null}

              {handoffOpen ? (
                <section className="rounded-2xl border border-border/45 bg-card/60 p-4 space-y-3">
                  <h3 className="font-heading text-base">Costco handoff list</h3>
                  <p className="text-xs text-muted-foreground">
                    Copy this list, then open Costco in a new tab. Check items off here as you add them on Costco —
                    carts are not synced.
                  </p>
                  <textarea
                    readOnly
                    className="w-full min-h-[160px] rounded-xl border border-border/40 bg-background px-3 py-2 text-xs font-mono"
                    value={handoffText}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="min-h-11"
                      onClick={() => void navigator.clipboard.writeText(handoffText)}
                    >
                      Copy Order List
                    </Button>
                    {data.can_export_csv ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => {
                          const blob = new Blob([handoffCsv], { type: "text/csv" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "firehall-costco-handoff.csv";
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Export CSV
                      </Button>
                    ) : null}
                    <Button type="button" variant="outline" className="min-h-11" asChild>
                      <a href="https://www.costco.com/" target="_blank" rel="noopener noreferrer">
                        Open Costco Same-Day
                      </a>
                    </Button>
                    <Button type="button" variant="ghost" className="min-h-11" onClick={() => setHandoffOpen(false)}>
                      Close
                    </Button>
                  </div>
                </section>
              ) : null}

              <CanteenRecentDeliveriesSection
                deliveries={data.recent_deliveries}
                isHallPro={data.is_hall_pro}
              />

              <HallCanteenPaymentTrackerSection activeHallId={activeHallId} />

              <section className="space-y-3" data-testid="canteen-hall-staples">
                <h2 className="font-heading text-lg tracking-wide px-0.5">Hall Staples</h2>
                <label className="block px-0.5">
                  <span className="text-xs text-muted-foreground">Optional shortage note (next Out / Running Low)</span>
                  <Input
                    className="mt-1 min-h-11"
                    value={shortageNote}
                    onChange={(e) => setShortageNote(e.target.value)}
                    placeholder='e.g. "Only one box left"'
                    maxLength={280}
                  />
                </label>

                {groups.map((group) => (
                  <div key={group.category} className="space-y-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
                      <span className="mr-1.5" aria-hidden>
                        {HALL_CANTEEN_CATEGORY_EMOJI[group.category]}
                      </span>
                      {HALL_CANTEEN_CATEGORY_LABELS[group.category]}
                    </h3>
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <HallStapleRow
                          key={item.item_id}
                          item={item}
                          busy={busyId === item.item_id}
                          readOnly={!data.can_update}
                          canManage={data.can_manage_list}
                          onStatus={(status) => void handleStatus(item.item_id, status)}
                          onRemove={
                            data.can_manage_list
                              ? () => {
                                  if (!activeHallId) return;
                                  void run(item.item_id, () =>
                                    manageCanteenItem(activeHallId, item.item_id, { archived: true }),
                                  );
                                }
                              : undefined
                          }
                        />
                      ))}
                    </ul>
                  </div>
                ))}

                {data.can_manage_list ? (
                  <form
                    className="flex gap-2 pt-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!activeHallId || !customName.trim()) return;
                      setAdding(true);
                      void addCanteenItem(activeHallId, { name: customName.trim(), category: "other" })
                        .then((next) => {
                          setData(next);
                          setCustomName("");
                          toast({ title: "Staple added" });
                        })
                        .catch(() =>
                          toast({
                            title: "Could not add — limit reached or duplicate name",
                            variant: "destructive",
                          }),
                        )
                        .finally(() => setAdding(false));
                    }}
                  >
                    <Input
                      className="min-h-12"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Add staple (managers)"
                      maxLength={120}
                    />
                    <Button type="submit" className="min-h-12 shrink-0" disabled={adding || !customName.trim()}>
                      <Plus className="w-4 h-4" aria-hidden />
                    </Button>
                  </form>
                ) : (
                  <form
                    className="flex gap-2 pt-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!activeHallId || !suggestName.trim()) return;
                      setAdding(true);
                      void suggestCanteenStaple(activeHallId, { name: suggestName.trim() })
                        .then((next) => {
                          setData(next);
                          setSuggestName("");
                          toast({ title: "Suggestion sent to Canteen Manager" });
                        })
                        .catch(() => toast({ title: "Could not suggest staple", variant: "destructive" }))
                        .finally(() => setAdding(false));
                    }}
                  >
                    <Input
                      className="min-h-12"
                      value={suggestName}
                      onChange={(e) => setSuggestName(e.target.value)}
                      placeholder="Suggest a new staple"
                      maxLength={120}
                    />
                    <Button type="submit" className="min-h-12 shrink-0" disabled={adding || !suggestName.trim()}>
                      Suggest
                    </Button>
                  </form>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="font-heading text-lg tracking-wide px-0.5">Canteen Notes</h2>
                <ul className="space-y-2">
                  {data.manager_notes.map((note) => (
                    <li
                      key={note.note_id}
                      className="rounded-2xl border border-border/40 bg-muted/20 px-3 py-3 text-sm flex justify-between gap-2"
                    >
                      <span>{note.body}</span>
                      {data.can_manage_list ? (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                          onClick={() => {
                            if (!activeHallId) return;
                            void run(note.note_id, () => deleteCanteenManagerNote(activeHallId, note.note_id));
                          }}
                        >
                          Remove
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {data.can_manage_list ? (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!activeHallId || !managerNote.trim()) return;
                      void run("note", () => createCanteenManagerNote(activeHallId, managerNote.trim())).then(() =>
                        setManagerNote(""),
                      );
                    }}
                  >
                    <Input
                      className="min-h-11"
                      value={managerNote}
                      onChange={(e) => setManagerNote(e.target.value)}
                      placeholder="e.g. Use the hall Costco membership"
                      maxLength={500}
                    />
                    <Button type="submit" className="min-h-11 shrink-0">
                      Save
                    </Button>
                  </form>
                ) : null}
              </section>

              {data.can_manage_list && data.activity.length > 0 ? (
                <section className="space-y-2">
                  <h2 className="font-heading text-lg tracking-wide px-0.5">Recent activity</h2>
                  <ul className="space-y-1.5">
                    {data.activity.slice(0, 12).map((entry) => (
                      <li key={entry.activity_id} className="text-xs text-muted-foreground px-0.5">
                        <span className="text-foreground font-medium">
                          {entry.actor_display_name ?? "System"}
                        </span>{" "}
                        {entry.summary}
                        <span className="opacity-70">
                          {" "}
                          · {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <HallNotesSection activeHallId={activeHallId} />
            </>
          )}
        </div>

        {data ? (
          <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 px-4 sm:left-auto sm:right-4 sm:w-auto pointer-events-none">
            <a
              href="#this-weeks-order"
              className="pointer-events-auto mx-auto flex max-w-lg min-h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg"
            >
              View This Week’s Order ({data.counts.in_weeks_order})
            </a>
          </div>
        ) : null}
      </HallPermissionGate>
    </HallShell>
  );
}
