import { Link } from "wouter";
import { LogOut } from "lucide-react";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { Button } from "@/components/ui/button";
import { DeleteAccountSection } from "@/components/auth/delete-account-section";
import { SignInMethodsSection } from "@/components/auth/sign-in-methods-section";
import { RequireAccountAuth } from "@/components/auth/require-account-auth";
import { ProfileIdentityCard } from "@/components/auth/profile-identity-card";
import { HallCrewCard } from "@/components/auth/hall-crew-card";
import { CrewFoodProfileCard } from "@/components/auth/crew-food-profile-card";
import { YourFoodCard } from "@/components/auth/your-food-card";
import { MealHistoryPreviewCard } from "@/components/auth/meal-history-preview-card";
import { ProgressPreviewCard } from "@/components/auth/progress-preview-card";
import { InsightsPreviewCard } from "@/components/auth/insights-preview-card";
import { MembershipCard } from "@/components/auth/membership-card";
import { useAuth } from "@/lib/auth/context";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

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
  const { logout } = useAuth();

  return (
    <MeSubpageShell title="Your Profile" subtitle="This is your Firehall Meals." testId="account-page">
      <div className="space-y-5">
        {/* 1. Identity — strongest visual weight */}
        <ProfileIdentityCard />

        {/* 2. Hall / Crew — second strongest */}
        <HallCrewCard />

        {/* 3. Crew Food Profile */}
        <CrewFoodProfileCard />

        {/* 4. Your Food */}
        <YourFoodCard />
        <MealHistoryPreviewCard />
        <ProgressPreviewCard />
        <InsightsPreviewCard />

        {/* 5. Membership */}
        <MembershipCard />

        {/* 6. Account & Security — quietest section */}
        <section className={cn(app.cardSurface, "p-5 space-y-5")}>
          <h2 className={app.titleCard}>Account &amp; security</h2>
          <SignInMethodsSection />

          <div className="flex flex-wrap gap-3 pt-2 border-t border-border/30">
            <Button type="button" variant="ghost" className="min-h-11 touch-manipulation" onClick={() => void logout()}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>

          <div className="pt-2 border-t border-border/30">
            <DeleteAccountSection />
          </div>
        </section>

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
