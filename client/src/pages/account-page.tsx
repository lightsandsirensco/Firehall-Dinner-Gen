import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Check, Cloud, ChevronRight, LogOut, User, Users } from "lucide-react";
import { MalteseCross } from "@/components/icons/maltese-cross";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { Button } from "@/components/ui/button";
import { AccountProfileForm } from "@/components/auth/account-profile-form";
import { OnboardingBanner } from "@/components/onboarding/onboarding-banner";
import { isOnboardingMode } from "@/lib/onboarding/state";
import { CreateHallForm } from "@/components/hall-membership/create-hall-form";
import { JoinHallForm } from "@/components/hall-membership/join-hall-form";
import { useAuth } from "@/lib/auth/context";
import { useHallMembership } from "@/lib/hall-membership/context";
import { writeActivationProgress } from "@/lib/hall-activation/state";
import { HALL_LINKED } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  captain: "Captain",
  canteen_manager: "Canteen Manager",
  member: "Member",
};

export default function AccountPage() {
  const { authenticated, loading, capabilities, halls, openSignIn, logout, refresh, user } = useAuth();
  const { setActiveHallId } = useHallMembership();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const onboardingMode = useMemo(() => isOnboardingMode(), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create_hall") === "1") {
      setShowCreate(true);
    }
  }, []);

  return (
    <MeSubpageShell
      title="Your account"
      subtitle={
        authenticated
          ? "Profile, preferences, and hall membership"
          : "Sign in to sync saves and join your crew online"
      }
      testId="account-page"
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading account…</p>
      ) : !authenticated ? (
        <div className="rounded-2xl border border-border/40 bg-muted/20 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Cooking as guest</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Generator, wheel, recipes, and temporary hall profiles work without an account.
                Sign in when you want saves synced or to connect to a hall.
              </p>
            </div>
          </div>
          <Button onClick={() => openSignIn()} className="w-full min-h-11 touch-manipulation">
            Sign in
          </Button>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Magic link · Google · Apple · or continue as guest
          </p>
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
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-heading text-lg tracking-wide">{HALL_LINKED.linkedHalls}</h2>
                <Button type="button" variant="outline" size="sm" asChild className="min-h-11 touch-manipulation">
                  <Link href="/hall/join">{HALL_LINKED.join}</Link>
                </Button>
              </div>

              {halls.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No linked halls yet — {HALL_LINKED.create.toLowerCase()} or {HALL_LINKED.join.toLowerCase()} with a code.
                </p>
              ) : (
                <ul className="space-y-2">
                  {halls.map((hall) => (
                    <li key={hall.hall_id}>
                      <Link
                        href={`/hall/settings`}
                        className="flex items-center justify-between rounded-xl border border-border/40 px-4 py-3.5 text-sm min-h-[52px] hover:bg-muted/30 transition-colors touch-manipulation"
                      >
                        <div>
                          <span className="font-medium">{hall.hall_name}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ROLE_LABELS[hall.role] ?? hall.role} · {hall.member_count} members
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-border/40 p-4">
                  <p className="text-sm font-medium mb-3">Create a hall</p>
                  {showCreate ? (
                    <CreateHallForm
                      onCreated={async (hallId) => {
                        setActiveHallId(hallId);
                        await refresh();
                        setShowCreate(false);
                        if (user?.user_id) {
                          writeActivationProgress(user.user_id, {
                            hall_id: hallId,
                            welcome_seen: false,
                            status: "pending",
                          });
                        }
                        navigate(`/hall/welcome`);
                      }}
                    />
                  ) : (
                    <Button type="button" variant="secondary" onClick={() => setShowCreate(true)}>
                      Set up your station
                    </Button>
                  )}
                </div>
                <div className="rounded-xl border border-border/40 p-4">
                  <p className="text-sm font-medium mb-3">Join with code</p>
                  <JoinHallForm
                    compact
                    onJoined={async (hallId) => {
                      setActiveHallId(hallId);
                      await refresh();
                      if (user?.user_id) {
                        writeActivationProgress(user.user_id, {
                          hall_id: hallId,
                          welcome_seen: false,
                          status: "pending",
                        });
                      }
                      navigate(`/hall/welcome`);
                    }}
                  />
                </div>
              </div>
            </section>
            )}

            <div className="flex flex-wrap gap-3 pt-2 border-t border-border/30">
              <Button type="button" variant="outline" className="min-h-11 touch-manipulation" onClick={() => navigate("/plans")}>
                View plans
              </Button>
              <Button type="button" variant="outline" className="min-h-11 touch-manipulation" onClick={() => navigate("/hall")}>
                Back to {HALL_LINKED.linked}
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
