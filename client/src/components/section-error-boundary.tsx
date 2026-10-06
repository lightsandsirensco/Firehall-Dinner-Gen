import { Component, type ReactNode } from "react";

interface Props {
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Contains a failure inside one optional page section (e.g. a lazy
 * below-the-fold chunk that failed to load) so it renders `fallback` instead
 * of replacing the whole page with the global "Something went wrong" screen.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string | null }) {
    console.error(`[Section:${this.props.name}] render error`, error, errorInfo);
    try {
      void fetch("/api/client-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `[section:${this.props.name}] ${error.message}`,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          path: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
    } catch {
      /* ignore reporting failures */
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
