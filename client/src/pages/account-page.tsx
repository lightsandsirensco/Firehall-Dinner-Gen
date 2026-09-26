import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Check, ChevronRight, Cloud, Heart, LogOut, Users } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { SiApple } from "react-icons/si";
import { Mail } from "lucide-react";
import { MalteseCross } from "@/components/icons/maltese-cross";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AccountProfileForm } from "@/components/auth/account-profile-form";
import { DeleteAccountSection } from "@/components/auth/delete-account-section";
import { SignInMethodsSection } from "@/components/auth/sign-in-methods-section";
import { RequireAccountAuth } from "@/components/auth/require-account-auth";
import { HallPrivateBetaNotice } from "@/components/hall/hall-private-beta-notice";
import { OnboardingBanner } from "@/components/onboarding/onboarding-banner";
import { isOnboardingMode } from "@/lib/onboarding/state";
import { useAuth } from "@/lib/auth/context";
import { useBilling, useOpenBillingPortal } from "@/lib/billing/hooks";
import { getHallFavoritesCount } from "@/lib/hall-favorites-store";
import { HALL_LINKED } from "@/lib/brand-copy";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const PROVIDER_META = {
  email: { label: "Email", Icon: Mail },
  google: { label: "Google", Icon: FcGoogle },
  apple: { label: "Apple", Icon: SiApple },
} as const;

// Real account data (profile, billing/plan status, linked sign-in methods,
// delete account) lives below RequireAccountAuth — signed-out visitors never
// reach AccountPageContent's render at all; see
// components/auth/require-account-auth.tsx for the gate + redirect/return-to
// behavior, and server/auth/auth-middleware.ts requireAuth for the matching
// API-side enforcement every call below actually depends on.
export default function AccountPage() {
  return (
    <RequireAccountAuth>
      <AccountPageContent />
    </RequireAccountAuth>
  );
}

function AccountPageContent() {
  const { user, profile, linkedProviders, capabilities, logout } = useAuth();
  const billing = useBilling();
  const openBillingPortal = useOpenBillingPortal();
  const [, navigate] = useLocation();
  const onboardingMode = useMemo(() => isOnboardingMode(), []);
  const [openingPortal, setOpeningPortal] = useState(false);
  const savedCount = useMemo(() => getHallFavoritesCount(), []);

  const displayName = profile?.display_name || profile?.first_name || "Firefighter";
  const initial = displayName.trim().charAt(0).toUpperCase() || "F";
  const primaryProvider = user?.auth_provider && user.auth_provider !== "guest" ? user.auth_provider : linkedProviders[0];
  const providerMeta = primaryProvider ? PROVIDER_META[primaryProvider as keyof typeof PROVIDER_META] : null;

  return (
    <MeSubpageShell
      title="Your Profile"
      subtitle="Profile, preferences, and hall membership"
      testId="account-page"
    >
      <div className="space-y-6">
        {onboardingMode && <OnboardingBanner />}

        {!onboardingMode && (
          <section className={cn(app.cardSurface, "p-5 flex items-center gap-4")}>
            <Avatar className="h-14 w-14 ring-1 ring-primary/25">
              {profile?.profile_photo_url ? <AvatarImage src={profile.profile_photo_url} alt={displayName} /> : null}
              <AvatarFallback className="bg-primary/10 text-primary font-heading text-xl">{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-lg leading-snug tracking-tight text-foreground truncate">
                {displayName}
              </p>
              <p className="text-sm text-muted-foreground truncate">{profile?.email ?? user?.email ?? ""}</p>
              {providerMeta && (
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/20 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  <providerMeta.Icon className="h-3 w-3 shrink-0" />
                  Signed in with {providerMeta.label}
                </span>
              )}
            </div>
          </section>
        )}

        {!onboardingMode && (
          <div className="grid gap-3 sm:grid-cols-3">
            <FeaturePill icon={Cloud} label="Sync saves" active={capabilities.sync_saves} />
            <FeaturePill icon={Users} label={HALL_LINKED.linkedHalls} active={capabilities.join_halls} />
            <FeaturePill
              icon={MalteseCross}
              label="Hall Pro"
              active={capabilities.hall_pro}
              hint={capabilities.hall_pro ? "Active" : "Invite only"}
            />
          </div>
        )}

        {!onboardingMode && (
          <Link
            href="/me/saved"
            className={cn(
              app.cardSurface,
              "flex items-center gap-3 p-4 hover-elevate active-elevate-2 touch-manipulation min-h-[52px]",
            )}
            data-testid="link-saved-meals-entry"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Heart className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Saved Meals</p>
              <p className="text-xs text-muted-foreground">
                {savedCount > 0 ? `${savedCount} recipe${savedCount === 1 ? "" : "s"} saved` : "Nothing saved yet"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          </Link>
        )}

        <section className={cn(app.cardSurface, "p-5")}>
          <h2 className={cn(app.titleCard, "mb-4")}>Profile &amp; preferences</h2>
          <AccountProfileForm
            onboarding={onboardingMode}
            onOnboardingSaved={() => navigate("/onboarding/hall")}
          />
        </section>

        {!onboardingMode && (
          <section className="space-y-4">
            <HallPrivateBetaNotice compact />
          </section>
        )}

        {!onboardingMode && (
          <section className={cn(app.cardSurface, "p-5 space-y-5")}>
            <h2 className={app.titleCard}>Account</h2>
            <SignInMethodsSection />

            <div className="flex flex-wrap gap-3 pt-2 border-t border-border/30">
              <Button type="button" variant="outline" className="min-h-11 touch-manipulation" onClick={() => navigate("/plans")}>
                View plans
              </Button>
              {billing.manage_billing_available ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 touch-manipulation"
                  disabled={openingPortal}
                  onClick={async () => {
                    setOpeningPortal(true);
                    const result = await openBillingPortal();
                    if (!result.ok) setOpeningPortal(false);
                  }}
                >
                  {openingPortal ? "Opening…" : "Manage billing"}
                </Button>
              ) : null}
              <Button type="button" variant="ghost" className="min-h-11 touch-manipulation" onClick={() => void logout()}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </div>

            <div className="pt-2 border-t border-border/30">
              <DeleteAccountSection />
            </div>
          </section>
        )}

        <p className="text-xs text-muted-foreground/80 text-center">
          <Link href="/privacy" className="hover:text-primary hover:underline underline-offset-4">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/terms" className="hover:text-primary hover:underline underline-offset-4">
            Terms of Service
          </Link>
        </p>
      </div>
    </MeSubpageShell>
  );
}

function FeaturePill({
  icon: Icon,
  label,
  active,
  hint,
}: {
  icon: typeof Cloud;
  label: string;
  active: boolean;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3.5 flex items-center gap-2 text-sm min-h-[52px]",
        active ? "border-primary/30 bg-primary/5" : "border-border/40 bg-muted/20 opacity-80",
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-medium break-words">{label}</p>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </div>
      {active && <Check className="w-4 h-4 text-primary ml-auto shrink-0" />}
    </div>
  );
}
