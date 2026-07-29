import { Link } from "wouter";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HALL_DASHBOARD, HALL_IDENTITY, HALL_LINKED } from "@/lib/brand-copy";
import { useAuth } from "@/lib/auth/context";
import {
  formatMemberCountLabel,
  formatStationLabel,
  getHallPhotoUrl,
} from "@shared/hall-identity/display";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";

interface HallIdentityHeaderProps {
  hallName: string;
  stationNumber: string | null;
  department: string | null;
  city: string | null;
  hallPhotoUrl: string | null;
  motto: string | null;
  memberCount: number;
  canteenManagerName: string | null;
  shiftName: string | null;
  myShiftId?: string | null;
  authenticated: boolean;
  activeHallId: string | null;
  canManageSettings?: boolean;
  identityLoading?: boolean;
  className?: string;
}

function EmptyIdentityValue({
  children,
  canEdit,
  settingsHref,
}: {
  children: string;
  canEdit?: boolean;
  settingsHref?: string | null;
}) {
  return (
    <p className="text-sm text-muted-foreground italic">
      {children}
      {canEdit && settingsHref ? (
        <>
          {" — "}
          <Link href={settingsHref} className="text-primary font-medium not-italic hover:underline">
            {HALL_IDENTITY.addIdentityInSettings}
          </Link>
        </>
      ) : null}
    </p>
  );
}

export function HallIdentityHeader({
  hallName,
  stationNumber,
  department,
  city,
  hallPhotoUrl,
  motto,
  memberCount,
  canteenManagerName,
  shiftName,
  myShiftId,
  authenticated,
  activeHallId,
  canManageSettings,
  identityLoading,
  className,
}: HallIdentityHeaderProps) {
  const { openSignIn } = useAuth();
  const photoSrc = getHallPhotoUrl(hallPhotoUrl);
  const stationLabel = formatStationLabel(stationNumber);
  const settingsHref = activeHallId ? `/halls/${activeHallId}#hall-settings` : null;

  return (
    <header
      className={cn(
        "overflow-hidden rounded-2xl sm:rounded-3xl ring-1 ring-white/[0.08] bg-card",
        className,
      )}
      data-testid="hall-dashboard-header"
    >
      <div className="relative aspect-[16/9] max-h-44 w-full bg-muted">
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={`${hallName} hall photo`}
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/60 text-muted-foreground">
            <Building2 className="h-10 w-10 opacity-40" aria-hidden />
            <p className="text-xs font-medium">{HALL_IDENTITY.noHallPhoto}</p>
            {canManageSettings && settingsHref ? (
              <Link href={settingsHref} className={cn(app.label, "text-primary hover:underline")}>
                {HALL_IDENTITY.addIdentityInSettings}
              </Link>
            ) : null}
          </div>
        )}
        {photoSrc ? (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
        ) : null}
        <div className="absolute left-4 top-4">
          <p
            className={cn(
              "text-[11px] font-bold uppercase tracking-[0.18em]",
              photoSrc ? "text-white/90 drop-shadow-sm" : "text-primary",
            )}
          >
            {HALL_IDENTITY.myHall}
          </p>
        </div>
        {motto?.trim() ? (
          <p
            className={cn(
              "absolute bottom-3 left-4 right-4 text-sm italic line-clamp-2 drop-shadow-sm",
              photoSrc ? "text-white/95" : "text-muted-foreground",
            )}
          >
            “{motto.trim()}”
          </p>
        ) : null}
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-5">
        <div className="space-y-1">
          {stationLabel ? (
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{stationLabel}</p>
          ) : (
            <EmptyIdentityValue canEdit={canManageSettings} settingsHref={settingsHref}>
              {HALL_IDENTITY.stationNotSet}
            </EmptyIdentityValue>
          )}
          {department ? (
            <p className="text-base font-semibold text-foreground leading-snug">{department}</p>
          ) : (
            <EmptyIdentityValue canEdit={canManageSettings} settingsHref={settingsHref}>
              {HALL_IDENTITY.departmentNotSet}
            </EmptyIdentityValue>
          )}
          {city ? (
            <p className="text-sm text-muted-foreground">{city}</p>
          ) : (
            <EmptyIdentityValue canEdit={canManageSettings} settingsHref={settingsHref}>
              {HALL_IDENTITY.cityNotSet}
            </EmptyIdentityValue>
          )}
          <h1 className={cn(app.titleSection, "pt-1")}>
            {hallName}
          </h1>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {HALL_IDENTITY.members}
            </dt>
            <dd className="font-semibold mt-0.5">
              {identityLoading ? (
                <span className="inline-block h-4 w-12 rounded skeleton-shimmer align-middle" aria-hidden />
              ) : (
                formatMemberCountLabel(memberCount)
              )}
            </dd>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {HALL_IDENTITY.canteenManager}
            </dt>
            <dd className="font-semibold mt-0.5 leading-snug">
              {identityLoading ? (
                <span className="inline-block h-4 w-20 rounded skeleton-shimmer align-middle" aria-hidden />
              ) : canteenManagerName ? (
                canteenManagerName
              ) : (
                <span className="block space-y-1">
                  <span className="font-normal italic text-muted-foreground">
                    {HALL_IDENTITY.unassignedManager}
                  </span>
                  {canManageSettings && settingsHref ? (
                    <Link href={settingsHref} className={cn(app.label, "block text-primary not-italic hover:underline")}>
                      {HALL_IDENTITY.assignManagerInSettings}
                    </Link>
                  ) : null}
                </span>
              )}
            </dd>
          </div>
        </dl>

        {shiftName ? (
          myShiftId && activeHallId ? (
            <Link
              href={`/hall/${activeHallId}/shift/${myShiftId}`}
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              {shiftName}
            </Link>
          ) : (
            <p className="text-sm font-medium text-primary">{shiftName}</p>
          )
        ) : (
          <p className="text-sm text-muted-foreground italic">{HALL_DASHBOARD.tagline}</p>
        )}

        {!authenticated ? (
          <div className="pt-2 border-t border-border/30 flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-sm text-muted-foreground flex-1">{HALL_DASHBOARD.deviceNote}</p>
            <Button className="min-h-11" onClick={() => openSignIn()}>
              Sign in
            </Button>
          </div>
        ) : !activeHallId ? (
          <div className="pt-2 border-t border-border/30 flex flex-wrap gap-2">
            <Button asChild className="min-h-11">
              <Link href="/me/profile?create_hall=1">{HALL_LINKED.create}</Link>
            </Button>
            <Button asChild className="min-h-11" variant="outline">
              <Link href="/hall/join">{HALL_LINKED.join}</Link>
            </Button>
          </div>
        ) : (
          <Button asChild variant="ghost" className="min-h-11 px-0 text-sm text-muted-foreground">
            <Link href={settingsHref ?? `/halls/${activeHallId}`}>{HALL_LINKED.manage}</Link>
          </Button>
        )}
      </div>
    </header>
  );
}

/** @deprecated Use HallIdentityHeader */
export const HallDashboardHeader = HallIdentityHeader;
