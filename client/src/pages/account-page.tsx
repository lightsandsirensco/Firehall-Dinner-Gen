import { useMemo } from "react";
import { useLocation } from "wouter";
import { Check, Cloud, Heart, LogOut, ShoppingCart, Smartphone, User, Users, Vote } from "lucide-react";
import { MalteseCross } from "@/components/icons/maltese-cross";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { Button } from "@/components/ui/button";
import { AccountProfileForm } from "@/components/auth/account-profile-form";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { HallPrivateBetaNotice } from "@/components/hall/hall-private-beta-notice";
import { OnboardingBanner } from "@/components/onboarding/onboarding-banner";
import { isOnboardingMode } from "@/lib/onboarding/state";
import { useAuth } from "@/lib/auth/context";
import { HALL_LINKED } from "@/lib/brand-copy";
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
  const [, navigate] = useLocation();
  const onboardingMode = useMemo(() => isOnboardingMode(), []);

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
        <p className="text-sm text-muted-foreground">Loading account…</p>
      ) : !authenticated ? (
        <div className="rounded-2xl border border-border/40 bg-muted/20 p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
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
              <h2 className="font-heading text-lg tracking-wide mb-4">Profile</h2>
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

            <div className="flex flex-wrap gap-3 pt-2 border-t border-border/30">
              <Button type="button" variant="outline" className="min-h-11 touch-manipulation" onClick={() => navigate("/plans")}>
                View plans
              </Button>
              <Button type="button" variant="ghost" className="min-h-11 touch-manipulation" onClick={() => void logout()}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </div>
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
