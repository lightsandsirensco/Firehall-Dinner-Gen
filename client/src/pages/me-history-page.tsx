import { useEffect } from "react";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { HallHistoryTimeline } from "@/components/hall-history/hall-history-timeline";
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
      <HallHistoryTimeline
        entries={entries}
        emptyMessage="No meals yet. Pick tonight's meal or spin the wheel to start your list."
      />
    </MeSubpageShell>
  );
}
