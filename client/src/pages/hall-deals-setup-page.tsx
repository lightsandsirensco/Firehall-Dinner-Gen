import { Link } from "wouter";
import { ArrowLeft, Store } from "lucide-react";
import { HallShell } from "@/components/hall/hall-shell";
import { Button } from "@/components/ui/button";
import { HallDealsSetupPanel } from "@/components/grocery-deals/hall-deals-setup-panel";
import { useHallMembership } from "@/lib/hall-membership/context";
import { useAuth } from "@/lib/auth/context";
import { PROTEIN_DEALS, HALL_LINKED } from "@/lib/brand-copy";

export default function HallDealsSetupPage() {
  const { authenticated } = useAuth();
  const { activeHallId } = useHallMembership();
  const hallId = activeHallId ?? "";

  return (
    <HallShell title={PROTEIN_DEALS.setupTitle} testId="hall-protein-deals-setup-page">
      <Link href="/hall/protein-deals">
        <Button variant="ghost" size="sm" className="min-h-11 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to deals
        </Button>
      </Link>

      <header className="space-y-1 px-0.5">
        <div className="flex items-start gap-2">
          <Store className="w-5 h-5 text-primary shrink-0 mt-1" aria-hidden />
          <div>
            <h1 className="font-heading text-2xl tracking-wide">{PROTEIN_DEALS.setupTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{PROTEIN_DEALS.setupLead}</p>
          </div>
        </div>
      </header>

      {!authenticated || !hallId ? (
        <p className="text-sm text-muted-foreground">Sign in and {HALL_LINKED.join.toLowerCase()} to continue.</p>
      ) : (
        <HallDealsSetupPanel
          hallId={hallId}
          onComplete={() => {
            window.location.assign("/hall/protein-deals");
          }}
        />
      )}
    </HallShell>
  );
}
