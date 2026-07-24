import { Component, ErrorInfo, ReactNode } from "react";
import { captureException } from "@/shared/lib/analytics";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Without this, a React render error currently just blanks the entire
 * app with no explanation and no way to recover short of a manual
 * reload. This catches it, reports it to PostHog (so we actually find
 * out), and gives the person a way back instead of a dead page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info);
    captureException(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper-50 px-6 text-center dark:bg-ink-950">
          <h1 className="font-display text-xl font-semibold">Something went wrong</h1>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            This has been reported automatically. Try reloading the page — if it keeps
            happening, let us know.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="h-10 rounded-xl bg-signal-500 px-5 text-sm font-medium text-white hover:bg-signal-600"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
