import React, { Component, type ReactNode } from 'react';
import { useUiStore } from '../../stores/uiStore';

interface Props { children: ReactNode; fallback?: ReactNode; panelName?: string; }
interface State { hasError: boolean; error?: Error; }

export default class PanelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[PanelErrorBoundary:${this.props.panelName}]`, error, info);
    try {
      useUiStore.getState().addToast(
        `Error in ${this.props.panelName || 'panel'}: ${error.message}`,
        'error'
      );
    } catch {}
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          padding: '20px',
          color: 'var(--blood)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{ fontSize: '24px' }}>⚠</div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>This panel hit an error.</div>
          <button
            className="angular-button"
            style={{ fontSize: '11px', padding: '6px 16px' }}
            onClick={() => this.setState({ hasError: false })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
