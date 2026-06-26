import { BookOpen, Plus, Users } from "lucide-react";
import { Link } from "wouter";
import { HubTile } from "@/components/app-shell/hub-tile";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { HALL_EMPTY } from "@/lib/brand-copy";

export function HallEmptyState() {
  const { authenticated, openSignIn } = useAuth();

  const createHref = authenticated ? "/me/profile?create_hall=1" : undefined;
  const joinHref = "/hall/join";

  const onCreate = () => {
    if (!authenticated) openSignIn();
  };

  return (
    <div className="space-y-5" data-testid="hall-empty-state">
      <header className="space-y-1 px-0.5">
        <h1 className="font-heading text-2xl tracking-wide">{HALL_EMPTY.title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{HALL_EMPTY.subtitle}</p>
      </header>

      <div className="space-y-2.5">
        <HubTile
          href={joinHref}
          icon={Users}
          title={HALL_EMPTY.joinTitle}
          description={HALL_EMPTY.joinDescription}
          testId="hall-empty-join"
        />

        {createHref ? (
          <HubTile
            href={createHref}
            icon={Plus}
            title={HALL_EMPTY.createTitle}
            description={HALL_EMPTY.createDescription}
            testId="hall-empty-create"
          />
        ) : (
          <HubTile
            onClick={onCreate}
            icon={Plus}
            title={HALL_EMPTY.createTitle}
            description={HALL_EMPTY.createSignIn}
            testId="hall-empty-create"
          />
        )}

        <HubTile
          href="/hall/features"
          icon={BookOpen}
          title={HALL_EMPTY.learnTitle}
          description={HALL_EMPTY.learnDescription}
          secondary
          testId="hall-empty-learn"
        />
      </div>

      {!authenticated ? (
        <Button type="button" variant="outline" className="w-full min-h-11" onClick={openSignIn}>
          Sign in to sync with your crew
        </Button>
      ) : null}
    </div>
  );
}
