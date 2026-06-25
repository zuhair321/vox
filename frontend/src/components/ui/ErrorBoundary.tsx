import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Custom fallback UI — when provided, renders instead of the default error screen */
  fallback?: ReactNode;
  /** Called after an error is caught. Useful for logging services. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  /** True when the stack trace is expanded */
  expanded: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    expanded: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('VOX Error Boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, expanded: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopyReport = async () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const report = [
      '═══ VOX ERROR REPORT ═══',
      '',
      `Message: ${error.message}`,
      `Name: ${error.name}`,
      error.stack ? `Stack:\n${error.stack}` : '',
      '',
      'Component Stack:',
      errorInfo?.componentStack ?? 'Not available',
      '',
      `Timestamp: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `User Agent: ${navigator.userAgent}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(report);
      this.setState({ expanded: false });
      // Brief visual feedback via DOM
      const btn = document.querySelector('[data-copy-feedback]');
      if (btn) {
        (btn as HTMLElement).textContent = '✓ COPIED';
        setTimeout(() => { (btn as HTMLElement).textContent = '📋 COPY REPORT'; }, 1500);
      }
    } catch {
      // Fallback: select in a temporary textarea
      const ta = document.createElement('textarea');
      ta.value = report;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  private toggleStack = () => {
    this.setState((prev) => ({ expanded: !prev.expanded }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, expanded } = this.state;

      return (
        <div className="error-boundary-screen">
          {/* Ambient glow background */}
          <div className="error-boundary-glow" />

          {/* Animated skull */}
          <div className="error-boundary-icon">💀</div>

          <h1 className="error-boundary-title">SYSTEM FAILURE</h1>
          <p className="error-boundary-subtitle">
            The void encountered an error
          </p>

          {/* Error summary */}
          {error && (
            <div className="error-boundary-summary">
              <span style={{ color: 'var(--blood)' }}>{error.name}</span>
              <span style={{ color: 'var(--ash)' }}>{': '}{error.message}</span>
            </div>
          )}

          {/* Expandable stack trace */}
          {error && (
            <div className="error-boundary-stack-section">
              <button
                type="button"
                className="error-boundary-toggle"
                onClick={this.toggleStack}
              >
                {expanded ? '▾' : '▸'}{' '}
                {expanded ? 'HIDE DETAILS' : 'SHOW DETAILS'}
              </button>

              {expanded && (
                <pre className="error-boundary-stack">
                  <code>{error.stack}</code>
                  {errorInfo?.componentStack && (
                    <>
                      {'\n\n─── Component Stack ───\n'}
                      {errorInfo.componentStack}
                    </>
                  )}
                </pre>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="error-boundary-actions">
            <button className="angular-button error-boundary-reload" onClick={this.handleReload}>
              ⚡ RELOAD VOX
            </button>
            <button
              className="angular-button error-boundary-copy"
              data-copy-feedback
              onClick={this.handleCopyReport}
            >
              📋 COPY REPORT
            </button>
            <button className="angular-button error-boundary-reset" onClick={this.handleReset}>
              ↩ TRY AGAIN
            </button>
          </div>

          <p className="error-boundary-footer">
            VOX Dark Matter Protocol v1.0
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
