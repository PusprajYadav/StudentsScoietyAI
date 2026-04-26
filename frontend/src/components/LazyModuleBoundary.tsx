import { RefreshCw, TriangleAlert } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface LazyModuleBoundaryProps {
  children: ReactNode;
  resetKey?: string;
  title?: string;
}

interface LazyModuleBoundaryState {
  hasError: boolean;
  message: string | null;
}

function resolveHint(message: string | null) {
  if (!message) {
    return "A lazy-loaded module did not finish loading. Reloading the page usually restores the route during local development.";
  }

  if (
    message.includes("Outdated Optimize Dep") ||
    message.includes("Importing a module script failed")
  ) {
    return "This usually happens when Vite serves a stale optimized dependency after a restart. Reload the page to fetch the fresh bundle.";
  }

  return "A lazy-loaded module did not finish loading. Reload the page to try again.";
}

export class LazyModuleBoundary extends Component<
  LazyModuleBoundaryProps,
  LazyModuleBoundaryState
> {
  state: LazyModuleBoundaryState = {
    hasError: false,
    message: null,
  };

  static getDerivedStateFromError(error: Error): LazyModuleBoundaryState {
    return {
      hasError: true,
      message: error.message || "This module could not be loaded.",
    };
  }

  componentDidUpdate(prevProps: LazyModuleBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({
        hasError: false,
        message: null,
      });
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[LazyModuleBoundary] lazy module load failed", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="rounded-[30px] border border-app-border bg-app-card px-5 py-6 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.22)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-500">
            <TriangleAlert className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="font-display text-lg font-semibold text-app-text">
              {this.props.title || "This section could not load."}
            </p>
            <p className="mt-2 text-sm leading-6 text-app-muted">{resolveHint(this.state.message)}</p>
            {this.state.message ? (
              <p className="mt-3 rounded-2xl border border-app-border/70 bg-app-secondary/70 px-3 py-2 text-xs text-app-muted">
                {this.state.message}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-primary gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reload page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
