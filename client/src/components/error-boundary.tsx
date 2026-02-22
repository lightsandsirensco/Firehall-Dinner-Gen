import { Component, type ReactNode } from "react";

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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#141414",
            color: "#ededed",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, sans-serif",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "2rem",
              color: "#e53935",
              marginBottom: "1rem",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ color: "#999", marginBottom: "1.5rem", maxWidth: "400px" }}>
            The app encountered an unexpected error. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#e53935",
              color: "#fff",
              border: "none",
              padding: "0.75rem 2rem",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "1.1rem",
              letterSpacing: "0.05em",
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
