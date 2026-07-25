import { useCallback, useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Package, ShoppingCart, Vote } from "lucide-react";
import { MalteseCross } from "@/components/icons/maltese-cross";
import { HallShell } from "@/components/hall/hall-shell";
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
    <HallShell title="Settings" testId="hall-settings-page">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl tracking-wide">
          {detail?.hall.hall_name ?? "Hall settings"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {detail
            ? [detail.hall.station_number && `Station ${detail.hall.station_number}`, departmentLabel]
                .filter(Boolean)
                .join(" · ")
            : "Members, invites, and hall preferences"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" className="min-h-10">
          <Link href="/hall">Hall overview</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-10">
          <Link href="/tonight">Recipes</Link>
        </Button>
      </div>

      {!authenticated ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          Sign in to manage this hall.{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => openSignIn()}
          >
            Sign in
          </button>
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
            <PermissionCard icon={Package} label="Hall Staples" active={canViewDashboard} />
            <PermissionCard
              icon={MalteseCross}
              label={HALL_LINKED.manage}
              active={canManageMembers || canManageSettings}
            />
          </div>

          {canViewDashboard ? (
            <p className="text-sm text-muted-foreground">
              {[
                [detail.hall.city, detail.hall.province_state].filter(Boolean).join(", ") || null,
                `Crew size: ${detail.hall.crew_size ?? "—"}`,
                `Shifts: ${
                  detail.hall.shift_names.length > 0
                    ? detail.hall.shift_names.join(", ")
                    : "Not set"
                }`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="min-h-10">
              <Link href="/hall">
                <Vote className="mr-1.5 h-3.5 w-3.5" />
                Hall Home
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="min-h-10">
              <Link href="/hall/canteen">
                <Package className="mr-1.5 h-3.5 w-3.5" />
                Canteen
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="min-h-10">
              <Link href={`/halls/${hallId}#hall-shared-shopping-list`}>
                <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                Shopping
              </Link>
            </Button>
          </div>

          <section id="hall-settings">
            <h2 className="mb-4 font-heading text-lg tracking-wide">{HALL_LINKED.manage}</h2>
            <HallSettingsForm
              hallId={hallId}
              hall={detail.hall}
              members={detail.members}
              canEdit={canManageSettings}
              onUpdated={() => void load()}
            />
          </section>

          {canViewDashboard ? <HallSuppliesPanel hallId={hallId} /> : null}

          {canViewDashboard ? (
            <PaywallGate feature="shared_shopping_lists" hallId={hallId} surface="hall_detail">
              <div id="hall-shared-shopping-list">
                <HallSharedShoppingListPanel
                  hallId={hallId}
                  hallName={detail.hall.hall_name}
                  members={detail.members}
                />
              </div>
            </PaywallGate>
          ) : null}

          <section>
            <h2 className="mb-4 font-heading text-lg tracking-wide">
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
            <h2 className="mb-4 font-heading text-lg tracking-wide">Invite crew</h2>
            <HallInvitePanel
              hallId={hallId}
              joinCode={detail.hall.join_code}
              canManage={canManageMembers}
            />
          </section>
        </div>
      )}
    </HallShell>
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
        "flex items-center gap-2 rounded-xl border px-3 py-3 text-sm",
        active ? "border-primary/30 bg-primary/5" : "border-border/40 opacity-60",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}
