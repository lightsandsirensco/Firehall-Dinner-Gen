import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Isolates Explore grid failures so one bad card does not crash the route. */
export class ExploreErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string | null }) {
    console.error("[Explore] render error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4"
          data-testid="explore-error-boundary"
        >
          <h2 className="font-heading text-xl tracking-wide text-foreground">
            Explore hit a snag
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Something went wrong loading the recipe catalog. Try refreshing — your filters are safe.
          </p>
          <Button type="button" onClick={() => window.location.reload()}>
            Refresh Explore
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
