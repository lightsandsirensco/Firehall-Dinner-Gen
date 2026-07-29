import { Component, type ReactNode } from "react";
import { Flame } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string | null }) {
    console.error("React ErrorBoundary caught:", error, errorInfo);
    try {
      void fetch("/api/client-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message,
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
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center px-8 py-16 text-center font-sans"
        >
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 rounded-full bg-destructive/5 animate-ping motion-reduce:animate-none" style={{ animationDuration: "3s" }} />
            <Flame className="w-10 h-10 text-destructive/70" aria-hidden />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl tracking-tight mb-2">
            Something went wrong
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-sm leading-relaxed mb-6">
            The app hit an unexpected snag. Refreshing usually clears it right up.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="min-h-11 rounded-md bg-primary text-primary-foreground border border-primary-border px-8 font-heading uppercase tracking-wide text-base hover-elevate active-elevate-2"
          >
            Refresh page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
