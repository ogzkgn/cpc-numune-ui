import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  fallback?: ReactNode;
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Intentionally silent to avoid leaking details; hook in monitoring here if needed.
    void error;
    void info;
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center text-slate-700">
            <div className="text-lg font-semibold text-slate-900">Bir şeyler ters gitti</div>
            <p className="max-w-md text-sm text-slate-600">
              Sayfa yüklenemedi. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-brand-primary/90"
            >
              Yenile
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
