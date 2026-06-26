import { Link } from "wouter";
import { Building2, ChevronRight, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth/context";
import { useHallMembership } from "@/lib/hall-membership/context";
import { HALL_LINKED } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

interface HallPlatformBannerProps {
  className?: string;
}

function roleLabel(role: string): string {
  if (role === "captain") return "Captain";
  if (role === "canteen_manager") return "Canteen Manager";
  return "Member";
}

export function HallPlatformBanner({ className }: HallPlatformBannerProps) {
  const { authenticated, openSignIn } = useAuth();
  const { halls, activeHallId, activeHall, setActiveHallId, loading } = useHallMembership();

  if (!authenticated) {
    return (
      <div
        className={cn(
          "mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3",
          className,
        )}
        data-testid="hall-platform-guest"
      >
        <Building2 className="w-5 h-5 shrink-0 text-primary" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{HALL_LINKED.connect}</p>
          <p className="text-sm text-muted-foreground">{HALL_LINKED.signInToConnect}</p>
        </div>
        <Button size="sm" onClick={() => openSignIn()}>
          Sign in
        </Button>
      </div>
    );
  }

  if (halls.length === 0) {
    return (
      <div
        className={cn(
          "mb-6 rounded-xl border border-border/50 bg-card/40 px-4 py-4",
          className,
        )}
        data-testid="hall-platform-empty"
      >
        <p className="text-sm font-medium mb-1">{HALL_LINKED.noLink}</p>
        <p className="text-sm text-muted-foreground mb-3">{HALL_LINKED.noLinkBody}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/me/profile?create_hall=1">
              <Plus className="w-4 h-4 mr-1.5" />
              {HALL_LINKED.create}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/hall/join">{HALL_LINKED.join}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-6 rounded-xl border border-border/50 bg-card/40 px-4 py-4",
        className,
      )}
      data-testid="hall-platform-active"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Building2 className="w-5 h-5 shrink-0 text-primary mt-0.5" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{HALL_LINKED.active}</p>
            <p className="font-medium truncate">{activeHall?.hall_name ?? "Hall"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeHall?.station_number ? `Station ${activeHall.station_number}` : null}
              {activeHall?.station_number && activeHall?.department ? " · " : null}
              {activeHall?.department_name ?? activeHall?.department}
              {activeHall ? ` · ${roleLabel(activeHall.role)}` : null}
              {activeHall ? ` · ${activeHall.member_count} members` : null}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {halls.length > 1 ? (
            <Select
              value={activeHallId ?? undefined}
              onValueChange={(value) => setActiveHallId(value)}
            >
              <SelectTrigger className="w-[180px] h-9" aria-label={HALL_LINKED.switch}>
                <SelectValue placeholder={HALL_LINKED.switch} />
              </SelectTrigger>
              <SelectContent>
                {halls.map((hall) => (
                  <SelectItem key={hall.hall_id} value={hall.hall_id}>
                    {hall.hall_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {activeHallId ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/halls/${activeHallId}`}>
                <Users className="w-4 h-4 mr-1.5" />
                {HALL_LINKED.manage}
                <ChevronRight className="w-4 h-4 ml-0.5" aria-hidden />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground mt-2">Loading linked hall…</p>
      ) : null}
    </div>
  );
}
