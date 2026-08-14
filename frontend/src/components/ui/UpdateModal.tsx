import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, RotateCcw } from 'lucide-react';
import { useUpdateStore } from '../../stores/updateStore';
import type { UpdaterState } from '../../types/electron';
import { useUiStore } from '../../stores/uiStore';

const UpdateModal: React.FC = () => {
  const { state, setState, reset } = useUpdateStore();
  const { addToast } = useUiStore();

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.updater) return;

    const unsub = api.updater.onState((newState: UpdaterState) => {
      setState(newState);
      if (newState.available && !newState.downloaded) {
        addToast(`Update v${newState.version} is available`, 'info', { duration: 0 });
      }
      if (newState.downloaded) {
        addToast('Update ready — restart to install', 'success', { duration: 0 });
      }
      if (newState.error) {
        addToast(`Update error: ${newState.error}`, 'error', { duration: 5000 });
      }
    });

    return unsub;
  }, [setState, addToast]);

  const handleCheck = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.updater) return;
    const result = await api.updater.check();
    if (result.status === 'dev') {
      addToast('Updates are available in the desktop build', 'info');
    } else if (result.error) {
      addToast(`Check failed: ${result.error}`, 'error');
    }
  }, [addToast]);

  const handleDownload = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.updater) return;
    const result = await api.updater.download();
    if (result.status === 'dev') {
      addToast('Updates are available in the desktop build', 'info');
    } else if (result.error) {
      addToast(`Download failed: ${result.error}`, 'error');
    }
  }, [addToast]);

  const handleRestart = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.updater) return;
    await api.updater.quitAndInstall();
  }, []);

  const handleClose = useCallback(() => {
    reset();
  }, [reset]);

  const isOpen = state.available || state.error;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              width: 'min(420px, calc(100vw - 32px))',
              background: 'linear-gradient(145deg, rgba(216,74,90,0.04), transparent 22%), linear-gradient(180deg, rgba(12,10,10,0.98), rgba(5,3,3,0.96))',
              border: '1px solid rgba(216,74,90,0.15)',
              clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
              padding: '28px 24px',
              position: 'relative',
            }}
          >
            <style>{`
              .update-title {
                font-family: 'Cinzel Decorative', serif;
                font-size: 18px;
                font-weight: 700;
                color: var(--ghost-white, #f4f7fb);
                letter-spacing: 0.08em;
                margin: 0 0 6px;
              }
              .update-version {
                font-family: 'Share Tech Mono', monospace;
                font-size: 12px;
                color: rgba(216,74,90,0.8);
                letter-spacing: 0.12em;
                margin: 0 0 18px;
              }
              .update-desc {
                font-family: 'Share Tech Mono', monospace;
                font-size: 12px;
                color: var(--ash, #c7ced8);
                line-height: 1.6;
                margin: 0 0 18px;
                max-height: 120px;
                overflow-y: auto;
                white-space: pre-wrap;
              }
              .update-progress-track {
                width: 100%;
                height: 6px;
                background: rgba(216,74,90,0.1);
                margin: 12px 0;
                position: relative;
              }
              .update-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--void-purple, #3b0a12), var(--chaos, #d84a5a));
                transition: width 0.2s ease;
                box-shadow: 0 0 10px rgba(216,74,90,0.4);
              }
              .update-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 18px;
              }
              .update-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                font-family: 'Share Tech Mono', monospace;
                font-size: 12px;
                letter-spacing: 0.08em;
                cursor: pointer;
                border: 1px solid var(--rim, #2a2a38);
                background: transparent;
                color: var(--ghost-white, #f4f7fb);
                clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
                transition: all 0.2s ease;
              }
              .update-btn:hover:not(:disabled) {
                border-color: var(--chaos, #d84a5a);
                box-shadow: 0 0 14px rgba(216,74,90,0.25);
              }
              .update-btn.primary {
                background: linear-gradient(135deg, var(--void-purple, #3b0a12), var(--chaos, #d84a5a));
                border: none;
                box-shadow: 0 0 18px rgba(216,74,90,0.25);
              }
              .update-btn:disabled {
                opacity: 0.5;
                cursor: wait;
              }
              .update-close {
                position: absolute;
                top: 12px;
                right: 14px;
                background: none;
                border: none;
                color: var(--shadow, #8c95a3);
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                transition: color 0.15s ease;
              }
              .update-close:hover {
                color: var(--ghost-white, #f4f7fb);
              }
            `}</style>

            <button className="update-close" onClick={handleClose} aria-label="Close">
              <X size={18} />
            </button>

            <h2 className="update-title">
              {state.downloaded ? 'Update Ready' : state.available ? 'Update Available' : 'Update'}
            </h2>
            {state.version && (
              <p className="update-version">v{state.version}</p>
            )}

            {state.error && (
              <p className="update-desc" style={{ color: '#ff6b6b' }}>
                Error: {state.error}
              </p>
            )}

            {state.releaseNotes && !state.downloaded && (
              <p className="update-desc">What&apos;s new:\n{state.releaseNotes}</p>
            )}

            {state.available && !state.downloaded && (
              <div>
                <div className="update-progress-track">
                  <div
                    className="update-progress-fill"
                    style={{ width: `${Math.min(state.progress, 100)}%` }}
                  />
                </div>
                <p style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: '11px',
                  color: 'var(--ash, #c7ced8)',
                  margin: '0 0 6px',
                  textAlign: 'right',
                }}>
                  {state.progress.toFixed(1)}%
                </p>
              </div>
            )}

            <div className="update-actions">
              {state.downloaded ? (
                <button className="update-btn primary" onClick={handleRestart}>
                  <RotateCcw size={14} />
                  Restart & Update
                </button>
              ) : state.available ? (
                <button className="update-btn primary" onClick={handleDownload} disabled={state.progress > 0 && state.progress < 100}>
                  <Download size={14} />
                  {state.progress > 0 && state.progress < 100 ? 'Downloading...' : 'Download Update'}
                </button>
              ) : (
                <button className="update-btn" onClick={handleCheck}>
                  Check for Updates
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateModal;
