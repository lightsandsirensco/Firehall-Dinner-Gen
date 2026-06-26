import { useEffect } from "react";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { HallHistoryTimeline } from "@/components/hall-history/hall-history-timeline";
import { RecentlyCookedStrip } from "@/components/hall-history/recently-cooked-strip";
import { useHallHistory } from "@/hooks/use-hall-history";
import { ME_HISTORY } from "@/lib/brand-copy";
import { trackHallHistoryViewed } from "@/lib/analytics";

export default function MeHistoryPage() {
  const { entries } = useHallHistory();

  useEffect(() => {
    trackHallHistoryViewed({ entry_count: entries.length });
  }, [entries.length]);

  return (
    <MeSubpageShell
      title={ME_HISTORY.title}
      subtitle={ME_HISTORY.subtitle}
      testId="me-history-page"
    >
      <RecentlyCookedStrip showSeeAll={false} source="me_history" />

      <HallHistoryTimeline
        entries={entries}
        emptyMessage="No meals logged yet. Cook a recipe or spin the wheel to start your timeline."
      />
    </MeSubpageShell>
  );
}
