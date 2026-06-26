import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Loader2, RefreshCw, Settings2, Tag } from "lucide-react";
import { HallShell } from "@/components/hall/hall-shell";
import { HallDealsSetupPanel } from "@/components/grocery-deals/hall-deals-setup-panel";
import { PaywallGate } from "@/components/billing/paywall-gate";
import { ProteinDealRecipeMatches, ProteinDealRowCard } from "@/components/protein-deals/protein-deal-row";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHallMembership } from "@/lib/hall-membership/context";
import { useAuth } from "@/lib/auth/context";
import { useHallFeature } from "@/lib/billing/hooks";
import { useToast } from "@/hooks/use-toast";
import { fetchHallProteinDeals, fetchProteinDealRecipes, refreshHallProteinDeals } from "@/lib/protein-deals/api";
import { PROTEIN_DEALS, HALL_LINKED } from "@/lib/brand-copy";
import type { ProteinDealMatchedRecipe, ProteinDealRow, ProteinDealsResponse } from "@shared/protein-deals/types";
import { isProteinDealV1Type } from "@shared/protein-deals/types";

export default function HallProteinDealsPage() {
  const { authenticated } = useAuth();
  const { activeHallId } = useHallMembership();
  const hallPro = useHallFeature("hall_grocery_planning", activeHallId);
  const { toast } = useToast();
  const [data, setData] = useState<ProteinDealsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<ProteinDealRow | null>(null);
  const [matchedRecipes, setMatchedRecipes] = useState<ProteinDealMatchedRecipe[]>([]);

  const focusDealId = useMemo(
    () => new URLSearchParams(window.location.search).get("deal"),
    [],
  );

  const load = useCallback(async () => {
    if (!activeHallId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await fetchHallProteinDeals(activeHallId));
    } catch {
      setData(null);
      toast({ title: "Could not load protein deals", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeHallId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!activeHallId || !focusDealId || !data?.setup_complete || data.hall_pro_locked) return;
    const deal = data.deals.find((row) => row.id === focusDealId);
    if (!deal) return;
    void fetchProteinDealRecipes(activeHallId, deal.id)
      .then(({ recipes }) => {
        setSelectedDeal(deal);
        setMatchedRecipes(recipes);
      })
      .catch(() => undefined);
  }, [activeHallId, focusDealId, data]);

  const handleRefresh = async () => {
    if (!activeHallId || !hallPro) return;
    setRefreshing(true);
    try {
      setData(await refreshHallProteinDeals(activeHallId));
      toast({ title: "Protein deals refreshed" });
    } catch (err: unknown) {
      toast({
        title: err instanceof Error ? err.message : "Refresh failed",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const hallId = activeHallId ?? "";
  const displayDeals = useMemo(() => {
    if (!data) return [];
    const source = data.hall_pro_locked ? (data.teaser?.top_deals ?? []) : data.deals;
    return source.filter((deal) => isProteinDealV1Type(deal.protein_type));
  }, [data]);
  const canAct = Boolean(hallPro && data && !data.hall_pro_locked);

  return (
    <HallShell title={PROTEIN_DEALS.title} testId="hall-protein-deals-page">
      <header className="space-y-1 px-0.5">
        <div className="flex items-start gap-2">
          <Tag className="w-5 h-5 text-primary shrink-0 mt-1" aria-hidden />
          <div>
            <h1 className="font-heading text-2xl tracking-wide">{PROTEIN_DEALS.question}</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{PROTEIN_DEALS.tagline}</p>
          </div>
        </div>
      </header>

      {!authenticated || !hallId ? (
        <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
          Sign in and {HALL_LINKED.join.toLowerCase()} to see protein deals.
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.setup_complete ? (
        <HallDealsSetupPanel hallId={hallId} onComplete={() => void load()} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {data.postal_code ? (
              <span>
                {PROTEIN_DEALS.setupPostal}:{" "}
                <strong className="text-foreground">{data.postal_code}</strong>
              </span>
            ) : null}
            <Link
              href="/hall/protein-deals/setup"
              className="inline-flex items-center gap-1 text-primary font-medium min-h-11 px-2 touch-manipulation"
            >
              <Settings2 className="w-3.5 h-3.5" aria-hidden />
              {PROTEIN_DEALS.editStores}
            </Link>
            {hallPro ? (
              <Button
                variant="outline"
                size="sm"
                className="ml-auto min-h-11 touch-manipulation"
                disabled={refreshing}
                onClick={() => void handleRefresh()}
              >
                {refreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                )}
                Refresh
              </Button>
            ) : null}
          </div>

          {data.preferred_stores.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.preferred_stores.map((store) => (
                <Badge key={store.store_id} variant="outline">
                  {store.banner}
                </Badge>
              ))}
            </div>
          ) : null}

          {data.integration_coming_soon ? (
            <div className="rounded-xl border border-border/40 bg-muted/30 p-4 text-sm text-muted-foreground leading-relaxed">
              {PROTEIN_DEALS.integrationSoon}
            </div>
          ) : null}

          {data.hall_pro_locked && data.teaser ? (
            <div className="space-y-4">
              {displayDeals.length > 0 ? (
                <div className="space-y-3">
                  {displayDeals.map((deal) => (
                    <ProteinDealRowCard key={deal.id} deal={deal} hallId={hallId} canAct={false} />
                  ))}
                </div>
              ) : null}
              <PaywallGate feature="hall_grocery_planning" hallId={hallId} surface="hall_grocery_planning">
                <p className="text-sm text-muted-foreground leading-relaxed">{PROTEIN_DEALS.proTeaser}</p>
              </PaywallGate>
            </div>
          ) : displayDeals.length > 0 ? (
            <section className="grid gap-3">
              {displayDeals.map((deal) => (
                <ProteinDealRowCard
                  key={deal.id}
                  deal={deal}
                  hallId={hallId}
                  canAct={canAct}
                  onRecipes={(d, recipes) => {
                    setSelectedDeal(d);
                    setMatchedRecipes(recipes);
                  }}
                />
              ))}
            </section>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.unavailable_message ?? PROTEIN_DEALS.emptyDeals}
            </p>
          )}

          {selectedDeal ? (
            <ProteinDealRecipeMatches deal={selectedDeal} recipes={matchedRecipes} />
          ) : null}

          <p className="text-xs text-muted-foreground leading-relaxed">{PROTEIN_DEALS.proteinOnlyNote}</p>
        </>
      )}
    </HallShell>
  );
}
