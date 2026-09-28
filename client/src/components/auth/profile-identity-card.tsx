import { useState } from "react";
import { MapPin, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EditIdentitySheet } from "@/components/auth/edit-identity-sheet";
import { useAuth } from "@/lib/auth/context";
import { useBilling } from "@/lib/billing/hooks";
import { PLAN_DISPLAY } from "@shared/billing/types";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export function ProfileIdentityCard() {
  const { profile, user } = useAuth();
  const billing = useBilling();
  const [editing, setEditing] = useState(false);

  const displayName = profile?.display_name || profile?.first_name || "Firefighter";
  const initial = displayName.trim().charAt(0).toUpperCase() || "F";
  const email = profile?.email ?? user?.email ?? "";
  const location = [profile?.city, profile?.province_state].filter(Boolean).join(", ") || profile?.country || null;
  const isPro = billing.effective_plan_id === "firefighter_plus";
  const planLabel = PLAN_DISPLAY[billing.effective_plan_id]?.display_name ?? "Firehall Meals";

  return (
    <>
      <section className={cn(app.cardSurface, "p-5 sm:p-6 relative")}>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-muted/20 hover-elevate active-elevate-2 touch-manipulation"
          aria-label="Edit your identity"
          data-testid="button-edit-identity"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>

        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-1 ring-primary/25 shrink-0">
            {profile?.profile_photo_url ? <AvatarImage src={profile.profile_photo_url} alt={displayName} /> : null}
            <AvatarFallback className="bg-primary/10 text-primary font-heading text-2xl">{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="font-heading text-xl leading-snug tracking-tight text-foreground truncate">
              {displayName}
            </p>
            {profile?.username && (
              <p className="text-sm text-primary/90 truncate">@{profile.username}</p>
            )}
            <p className="text-sm text-muted-foreground truncate">{email}</p>
            {location && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground/90 truncate">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                {location}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide",
              isPro ? "border-primary/40 bg-primary/10 text-primary" : "border-border/40 bg-muted/20 text-muted-foreground",
            )}
            data-testid="badge-subscription-status"
          >
            {planLabel}
          </span>
        </div>
      </section>

      <EditIdentitySheet open={editing} onOpenChange={setEditing} />
    </>
  );
}
