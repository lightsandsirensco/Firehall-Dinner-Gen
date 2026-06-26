import { Link } from "wouter";
import { ChevronRight, Users } from "lucide-react";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useHallMembership } from "@/lib/hall-membership/context";
import { useMeasurementSystem } from "@/lib/measurement-preference";
import { ME_SETTINGS } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

export default function MeSettingsPage() {
  const { activeHallId } = useHallMembership();
  const [system, setSystem] = useMeasurementSystem();

  return (
    <MeSubpageShell
      title={ME_SETTINGS.title}
      subtitle={ME_SETTINGS.subtitle}
      testId="me-settings-page"
    >
      <section className="space-y-3 rounded-2xl border border-border/40 bg-card/30 p-4">
        <h2 className="text-sm font-semibold">{ME_SETTINGS.measurements}</h2>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={system === "us" ? "default" : "outline"}
            className="min-h-10 flex-1"
            onClick={() => setSystem("us")}
          >
            US
          </Button>
          <Button
            type="button"
            size="sm"
            variant={system === "metric" ? "default" : "outline"}
            className="min-h-10 flex-1"
            onClick={() => setSystem("metric")}
          >
            Metric
          </Button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{ME_SETTINGS.measurementsHint}</p>
      </section>

      <section className="space-y-2">
        <Label className="text-sm font-semibold">{ME_SETTINGS.account}</Label>
        <Link
          href="/me/profile"
          className={cn(
            "flex min-h-[52px] items-center justify-between gap-3 rounded-2xl border border-border/40 px-4 py-3",
            "hover:bg-muted/30 touch-manipulation",
          )}
        >
          <span className="text-sm font-medium">{ME_SETTINGS.editProfile}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </Link>
      </section>

      {activeHallId ? (
        <section className="space-y-2">
          <Label className="text-sm font-semibold">{ME_SETTINGS.crew}</Label>
          <Link
            href="/hall/settings"
            className={cn(
              "flex min-h-[52px] items-center gap-3 rounded-2xl border border-border/40 px-4 py-3",
              "hover:bg-muted/30 touch-manipulation",
            )}
          >
            <Users className="h-5 w-5 text-primary shrink-0" aria-hidden />
            <span className="flex-1 text-sm font-medium">{ME_SETTINGS.hallSettings}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>
        </section>
      ) : null}
    </MeSubpageShell>
  );
}
