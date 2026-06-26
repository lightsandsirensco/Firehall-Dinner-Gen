import { useCallback, useEffect, useState } from "react";

import { Link, useRoute } from "wouter";

import { ArrowLeft, Package, Shield, ShoppingCart, Vote } from "lucide-react";

import { SiteHeader } from "@/components/site-header";

import { AppPageHeader } from "@/components/mobile/app-page-header";

import { SiteFooter } from "@/components/site-footer";

import { Button } from "@/components/ui/button";

import { HallSuppliesPanel } from "@/components/hall-supplies/hall-supplies-panel";

import { HallSharedShoppingListPanel } from "@/components/hall-shopping-list/hall-shared-shopping-list-panel";

import { HallProAdminPanel } from "@/components/billing/hall-pro-admin-panel";
import { PaywallGate } from "@/components/billing/paywall-gate";
import { HallInvitePanel } from "@/components/hall-membership/hall-invite-panel";

import { HallMembersList } from "@/components/hall-membership/hall-members-list";

import { HallSettingsForm } from "@/components/hall-membership/hall-settings-form";
import { HALL_LINKED } from "@/lib/brand-copy";

import { useAuth } from "@/lib/auth/context";

import { useHallMembership } from "@/lib/hall-membership/context";

import { fetchHallDetail } from "@/lib/hall-membership/api";

import type { HallDetailPayload } from "@shared/hall-membership/types";

import { hallRoleHasPermission } from "@shared/hall-membership/types";

import { app } from "@/lib/design-tokens";

import { cn } from "@/lib/utils";



export default function HallDetailPage() {

  const { authenticated, user, openSignIn } = useAuth();

  const { setActiveHallId, activeHallId } = useHallMembership();

  const [, params] = useRoute("/halls/:hallId");
  const [onSettings] = useRoute("/hall/settings");

  const hallId = params?.hallId ?? (onSettings ? activeHallId ?? "" : "");

  const [detail, setDetail] = useState<HallDetailPayload | null>(null);

  const [loading, setLoading] = useState(true);



  const load = useCallback(async () => {

    if (!hallId || !authenticated) return;

    setLoading(true);

    try {

      const data = await fetchHallDetail(hallId);

      setDetail(data);

      setActiveHallId(hallId);

    } catch {

      setDetail(null);

    } finally {

      setLoading(false);

    }

  }, [hallId, authenticated, setActiveHallId]);



  useEffect(() => {

    void load();

  }, [load]);

  useEffect(() => {
    if (loading || !detail) return;
    const hash = window.location.hash?.slice(1);
    if (!hash) return;
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [loading, detail]);



  const canManageMembers = Boolean(

    detail && hallRoleHasPermission(detail.my_role, "manage_members"),

  );

  const canManageSettings = Boolean(

    detail && hallRoleHasPermission(detail.my_role, "manage_settings"),

  );

  const canViewDashboard = Boolean(

    detail && hallRoleHasPermission(detail.my_role, "view_hall_dashboard"),

  );



  const departmentLabel =

    detail?.hall.department_name ?? detail?.hall.department ?? null;



  return (

    <div className={app.page}>

      <SiteHeader activePage="hall" />



      <AppPageHeader

        variant="minimal"

        title={detail?.hall.hall_name ?? "Hall"}

        subtitle={

          detail

            ? [detail.hall.station_number && `Station ${detail.hall.station_number}`, departmentLabel]

                .filter(Boolean)

                .join(" · ")

            : "Shared hall identity"

        }

      />



      <main className={cn(app.main, "py-6 sm:py-8 pb-safe-nav max-w-[800px]")}>

        <div className="flex flex-wrap gap-2 mb-4">

          <Button asChild variant="ghost" size="sm" className="-ml-2">

            <Link href="/hall">

              <ArrowLeft className="w-4 h-4 mr-1.5" />

              {HALL_LINKED.linked}

            </Link>

          </Button>

          <Button asChild variant="ghost" size="sm">

            <Link href="/account">Account</Link>

          </Button>

        </div>



        {!authenticated ? (

          <div className="rounded-xl border border-border/40 p-6 text-center space-y-3">

            <p className="text-sm text-muted-foreground">Sign in to view this hall.</p>

            <Button onClick={() => openSignIn()}>Sign in</Button>

          </div>

        ) : loading ? (

          <p className="text-sm text-muted-foreground">Loading hall…</p>

        ) : !detail ? (

          <p className="text-sm text-destructive">Hall not found or you are not a member.</p>

        ) : (

          <div className="space-y-8">

            <HallProAdminPanel
              hallId={hallId}
              detail={detail}
              onUpdated={() => void load()}
            />

            <div className="grid gap-3 sm:grid-cols-3">

              <PermissionCard

                icon={Vote}

                label="Hall Vote"

                active={hallRoleHasPermission(detail.my_role, "participate_votes")}

              />

              <PermissionCard

                icon={Package}

                label="Hall Staples"

                active={canViewDashboard}

              />

              <PermissionCard

                icon={Shield}

                label={HALL_LINKED.manage}

                active={canManageMembers || canManageSettings}

              />

            </div>



            {canViewDashboard ? (

              <p className="text-sm text-muted-foreground">

                {[

                  [detail.hall.city, detail.hall.province_state].filter(Boolean).join(", ") || null,

                  `Crew size: ${detail.hall.crew_size ?? "—"}`,

                  `Shifts: ${detail.hall.shift_names.length > 0 ? detail.hall.shift_names.join(", ") : "Not set"}`,

                ]

                  .filter(Boolean)

                  .join(" · ")}

              </p>

            ) : null}



            <section id="hall-settings">

              <h2 className="font-heading text-lg tracking-wide mb-4">{HALL_LINKED.manage}</h2>

              <HallSettingsForm

                hallId={hallId}

                hall={detail.hall}

                members={detail.members}

                canEdit={canManageSettings}

                onUpdated={() => void load()}

              />

            </section>



            {canViewDashboard ? (
              <HallSuppliesPanel hallId={hallId} />
            ) : null}

            {canViewDashboard ? (
              <PaywallGate feature="shared_shopping_lists" hallId={hallId} surface="hall_detail">
                <HallSharedShoppingListPanel
                  hallId={hallId}
                  hallName={detail.hall.hall_name}
                  members={detail.members}
                />
              </PaywallGate>
            ) : null}



            <section>

              <h2 className="font-heading text-lg tracking-wide mb-4">

                Members ({detail.members.length})

              </h2>

              <HallMembersList

                hallId={hallId}

                members={detail.members}

                shifts={detail.shifts}

                myUserId={user?.user_id ?? ""}

                canManage={canManageMembers}

                onChanged={() => void load()}

              />

            </section>



            <section>

              <h2 className="font-heading text-lg tracking-wide mb-4">Invite crew</h2>

              <HallInvitePanel

                hallId={hallId}

                joinCode={detail.hall.join_code}

                canManage={canManageMembers}

              />

            </section>

          </div>

        )}

      </main>



      <SiteFooter />

    </div>

  );

}



function PermissionCard({

  icon: Icon,

  label,

  active,

}: {

  icon: typeof Vote;

  label: string;

  active: boolean;

}) {

  return (

    <div

      className={cn(

        "rounded-xl border px-3 py-3 flex items-center gap-2 text-sm",

        active ? "border-primary/30 bg-primary/5" : "border-border/40 opacity-60",

      )}

    >

      <Icon className="w-4 h-4" />

      <span>{label}</span>

    </div>

  );

}


