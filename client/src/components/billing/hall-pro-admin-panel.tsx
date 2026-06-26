import { useState } from "react";

import { Crown, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useToast } from "@/hooks/use-toast";

import { useHallBillingAction } from "@/lib/billing/hooks";

import type { HallDetailPayload } from "@shared/hall-membership/types";

import { hallRoleHasPermission } from "@shared/hall-membership/types";

import { cn } from "@/lib/utils";



import { HALL_PRO_FEATURE_LABELS } from "@shared/billing/hall-pro";
import { HALL_PRO_FEATURES } from "@shared/billing/types";



interface HallProAdminPanelProps {

  hallId: string;

  detail: HallDetailPayload;

  onUpdated: () => void;

  className?: string;

}



export function HallProAdminPanel({ hallId, detail, onUpdated, className }: HallProAdminPanelProps) {

  const { toast } = useToast();

  const runBillingAction = useHallBillingAction(hallId);

  const [busy, setBusy] = useState<string | null>(null);



  const canManageBilling = hallRoleHasPermission(detail.my_role, "manage_billing");

  const canManageMembers = hallRoleHasPermission(detail.my_role, "manage_members");

  const { hall_pro: hallPro } = detail;



  const handleAction = async (action: "start_trial" | "enable" | "convert") => {

    setBusy(action);

    try {

      const result = await runBillingAction(action);

      if (!result.ok) {

        toast({ title: "Could not update Hall Pro", variant: "destructive" });

        return;

      }

      toast({

        title: "Hall Pro updated",

        description: result.message ?? "No charge during preview",

      });

      onUpdated();

    } catch {

      toast({ title: "Could not update Hall Pro", variant: "destructive" });

    } finally {

      setBusy(null);

    }

  };



  return (

    <section className={cn("rounded-2xl border border-primary/25 bg-primary/5 p-5 space-y-4", className)}>

      <div className="flex items-start gap-3">

        <Crown className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />

        <div className="min-w-0">

          <h2 className="font-heading text-lg tracking-wide">Hall Pro</h2>

          <p className="text-sm text-muted-foreground mt-1">

            Hall Pro is enabled for <strong className="font-medium text-foreground">{detail.hall.hall_name}</strong>
            — one subscription covers the linked crew.

          </p>

        </div>

      </div>



      <ul className="grid gap-1.5 sm:grid-cols-2 text-sm">

        {HALL_PRO_FEATURES.map((key) => (
          <li key={key} className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
            {HALL_PRO_FEATURE_LABELS[key]}
          </li>
        ))}

      </ul>



      <div className="rounded-xl border border-border/40 bg-background/60 px-4 py-3 text-sm">

        <p className="font-medium">

          Status:{" "}

          {hallPro.active

            ? hallPro.status === "trialing"

              ? "Trial active"

              : "Active"

            : "Not enabled"}

        </p>

        {hallPro.trial_started_at ? (

          <p className="text-xs text-muted-foreground mt-1">

            Trial started {new Date(hallPro.trial_started_at).toLocaleDateString()}

          </p>

        ) : null}

      </div>



      {canManageBilling ? (

        <div className="flex flex-wrap gap-2">

          {!hallPro.active ? (

            <Button

              type="button"

              size="sm"

              disabled={busy != null}

              onClick={() => void handleAction("start_trial")}

            >

              {busy === "start_trial" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Hall Pro trial"}

            </Button>

          ) : null}

          {hallPro.status === "trialing" ? (

            <Button

              type="button"

              size="sm"

              variant="secondary"

              disabled={busy != null}

              onClick={() => void handleAction("convert")}

            >

              {busy === "convert" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activate paid Hall Pro"}

            </Button>

          ) : null}

          {!hallPro.active || hallPro.status === "cancelled" ? (

            <Button

              type="button"

              size="sm"

              variant="outline"

              disabled={busy != null}

              onClick={() => void handleAction("enable")}

            >

              {busy === "enable" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enable Hall Pro"}

            </Button>

          ) : null}

        </div>

      ) : (

        <p className="text-xs text-muted-foreground">

          {canManageMembers

            ? "Captains manage the Hall Pro subscription and assign roles."

            : "Ask your captain to enable Hall Pro for this hall."}

        </p>

      )}

    </section>

  );

}

