import { Component, type ReactNode } from "react";
import { MissingRecipeImagePlaceholder } from "@/components/missing-recipe-image-placeholder";
import type { ApprovedCatalogGridEntry } from "@shared/approved-catalog";

interface Props {
  entry: ApprovedCatalogGridEntry;
  onClick: () => void;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** One bad card image/render must not take down the Explore grid. */
export class ExploreCatalogCardBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn(`[Explore] card failed slug=${this.props.entry.slug}`, error);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.entry.slug !== this.props.entry.slug && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      const { entry, onClick } = this.props;
      return (
        <article
          className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-card/30 ring-1 ring-border/15"
          onClick={onClick}
          role="button"
          tabIndex={0}
          data-testid={`explore-catalog-card-fallback-${entry.slug}`}
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-zinc-950">
            <MissingRecipeImagePlaceholder title={entry.title} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5 p-3">
            <h3 className="line-clamp-2 text-sm font-medium leading-snug">{entry.title}</h3>
            <p className="mt-auto text-xs text-muted-foreground">Tap to open recipe</p>
          </div>
        </article>
      );
    }

    return this.props.children;
  }
}
