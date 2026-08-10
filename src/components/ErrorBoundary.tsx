import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, FolderOpen } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught application error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-stone-50 dark:bg-stone-900 p-6 text-stone-900 dark:text-stone-100 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/50 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold">
                {this.props.fallbackTitle || "Something went wrong"}
              </h2>
            </div>

            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              An unexpected display error occurred in this workspace component. Your data remains safely stored on disk.
            </p>

            {this.state.error && (
              <div className="p-3 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-mono text-stone-700 dark:text-stone-300 max-h-32 overflow-y-auto">
                {this.state.error.message || "Unknown runtime exception"}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={this.handleResetState}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Retry View</span>
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                <FolderOpen className="h-4 w-4" />
                <span>Reload App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
