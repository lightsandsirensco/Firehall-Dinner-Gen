import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Check, Cloud, Heart, LogOut, ShoppingCart, Smartphone, User, Users, Vote } from "lucide-react";
import { MalteseCross } from "@/components/icons/maltese-cross";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { Button } from "@/components/ui/button";
import { AccountProfileForm } from "@/components/auth/account-profile-form";
import { DeleteAccountSection } from "@/components/auth/delete-account-section";
import { SignInMethodsSection } from "@/components/auth/sign-in-methods-section";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { HallPrivateBetaNotice } from "@/components/hall/hall-private-beta-notice";
import { OnboardingBanner } from "@/components/onboarding/onboarding-banner";
import { isOnboardingMode } from "@/lib/onboarding/state";
import { useAuth } from "@/lib/auth/context";
import { useBilling, useOpenBillingPortal } from "@/lib/billing/hooks";
import { HALL_LINKED } from "@/lib/brand-copy";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const GUEST_SIGN_IN_REASONS = [
  { icon: Heart, label: "Save recipes" },
  { icon: Smartphone, label: "Sync across devices" },
  { icon: MalteseCross, label: "Join your hall" },
  { icon: ShoppingCart, label: "Shared shopping" },
  { icon: Vote, label: "Hall voting" },
];

export default function AccountPage() {
  const { authenticated, loading, capabilities, logout } = useAuth();
  const billing = useBilling();
  const openBillingPortal = useOpenBillingPortal();
  const [, navigate] = useLocation();
  const onboardingMode = useMemo(() => isOnboardingMode(), []);
  const [openingPortal, setOpeningPortal] = useState(false);

  return (
    <MeSubpageShell
      title="Your account"
      subtitle={
        authenticated
          ? "Profile, preferences, and hall membership"
          : "Sign in to sync saves and join your crew online"
      }
      testId="account-page"
      hideWorkflowExit={!authenticated}
    >
      {loading ? (
        <div className="space-y-3" aria-busy aria-label="Loading account">
          <div className="h-20 rounded-2xl skeleton-shimmer" />
          <div className="h-12 rounded-xl skeleton-shimmer" />
          <div className="h-12 rounded-xl skeleton-shimmer" />
        </div>
      ) : !authenticated ? (
        <div className={cn(app.panel, "fade-up p-5 space-y-5")}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <User className="w-5 h-5" />
            </div>
            <p className="text-sm text-muted-foreground">You're using Firehall Meals as a guest.</p>
          </div>

          <div className="space-y-2.5 border-y border-border/30 py-4">
            <p className="text-sm font-medium">Sign in to:</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {GUEST_SIGN_IN_REASONS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <SignInPanel dismissLabel="Continue Cooking" onDismiss={() => navigate("/tonight")} />
        </div>
      ) : (
        <div className="space-y-8">
            {onboardingMode && <OnboardingBanner />}

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

            <section>
              <h2 className={cn(app.titleCard, "mb-4")}>Profile</h2>
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

            {!onboardingMode && <SignInMethodsSection />}

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

            <p className="text-xs text-muted-foreground/80">
              <Link href="/privacy" className="hover:text-primary hover:underline underline-offset-4">
                Privacy Policy
              </Link>
              {" · "}
              <Link href="/terms" className="hover:text-primary hover:underline underline-offset-4">
                Terms of Service
              </Link>
            </p>

            {!onboardingMode && (
              <div className="pt-2 border-t border-border/30">
                <DeleteAccountSection />
              </div>
            )}
          </div>
        )}
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
