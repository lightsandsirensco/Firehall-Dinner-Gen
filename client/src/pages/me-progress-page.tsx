import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { GoalsProgressSection } from "@/components/goals/goals-progress-section";
import { ME_PROGRESS } from "@/lib/brand-copy";

export default function MeProgressPage() {
  return (
    <MeSubpageShell title={ME_PROGRESS.title} subtitle={ME_PROGRESS.subtitle} testId="me-progress-page">
      <div className="space-y-6">
        <GoalsProgressSection />
      </div>
    </MeSubpageShell>
  );
}
