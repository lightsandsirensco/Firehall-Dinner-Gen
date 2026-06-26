import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Tag } from "lucide-react";
import { HallDashboardSection } from "./hall-dashboard-section";
import { ProteinDealRowCard } from "@/components/protein-deals/protein-deal-row";
import { fetchHallProteinDeals } from "@/lib/protein-deals/api";
import { useHallFeature } from "@/lib/billing/hooks";
import { PROTEIN_DEALS, HALL_LINKED } from "@/lib/brand-copy";
import type { ProteinDealRow } from "@shared/protein-deals/types";
import { isProteinDealV1Type } from "@shared/protein-deals/types";

interface HallProteinDealsCardProps {
  activeHallId: string | null;
  className?: string;
}

function v1Deals(deals: ProteinDealRow[]): ProteinDealRow[] {
  return deals.filter((deal) => isProteinDealV1Type(deal.protein_type));
}

export function HallProteinDealsCard({ activeHallId, className }: HallProteinDealsCardProps) {
  const hallPro = useHallFeature("hall_grocery_planning", activeHallId);
  const [topDeals, setTopDeals] = useState<ProteinDealRow[]>([]);
  const [setupComplete, setSetupComplete] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!activeHallId) {
      setTopDeals([]);
      return;
    }
    void fetchHallProteinDeals(activeHallId)
      .then((data) => {
        setSetupComplete(data.setup_complete);
        setLocked(data.hall_pro_locked);
        const source = data.hall_pro_locked ? (data.teaser?.top_deals ?? []) : data.top_deals;
        setTopDeals(v1Deals(source));
      })
      .catch(() => setTopDeals([]));
  }, [activeHallId]);

  const ctaHref = setupComplete ? "/hall/protein-deals" : "/hall/protein-deals/setup";

  return (
    <HallDashboardSection
      id="hall-protein-deals"
      title={PROTEIN_DEALS.question}
      icon={<Tag className="w-4 h-4" />}
      action={
        activeHallId
          ? {
              label: setupComplete ? PROTEIN_DEALS.actions.viewAll : PROTEIN_DEALS.setupTitle,
              href: ctaHref,
            }
          : undefined
      }
      className={className}
      testId="hall-protein-deals-section"
    >
      {!activeHallId ? (
        <p className="text-sm text-muted-foreground leading-relaxed">{HALL_LINKED.connect} to see local protein deals.</p>
      ) : !setupComplete ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{PROTEIN_DEALS.emptySetup}</p>
          <Link
            href="/hall/protein-deals/setup"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 min-h-11 touch-manipulation"
          >
            {PROTEIN_DEALS.setupTitle}
          </Link>
        </div>
      ) : topDeals.length > 0 ? (
        <div className="space-y-3">
          {topDeals.slice(0, 2).map((deal) => (
            <ProteinDealRowCard
              key={deal.id}
              deal={deal}
              hallId={activeHallId}
              canAct={hallPro && !locked}
              compact
              onRecipes={() => {
                window.location.assign(`/hall/protein-deals?deal=${encodeURIComponent(deal.id)}`);
              }}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground leading-relaxed">{PROTEIN_DEALS.emptyDeals}</p>
      )}
      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{PROTEIN_DEALS.proteinOnlyNote}</p>
    </HallDashboardSection>
  );
}

/** @deprecated */
export const HallGroceryDealsCard = HallProteinDealsCard;
