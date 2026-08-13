import React, { useState } from 'react';
import { Mic, Camera, AlertTriangle, RefreshCw, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MediaErrorInfo } from '../../utils/mediaErrors';
import { openOSDeviceSettings } from '../../utils/mediaErrors';
import './CameraPermissionPanel.css';

/**
 * Pass 'microphone' or 'camera' to pick the right icon and OS deep-link.
 * The two kinds are rendered with a single component + a single CSS file
 * so the UX stays in lockstep across the toolbar.
 */
export type MediaKind = 'microphone' | 'camera';

interface MediaPermissionPanelProps {
  open: boolean;
  error: MediaErrorInfo | null;
  /** Which device kind triggered this error. */
  kind: MediaKind;
  /** Called when the user clicks \"Try again\" — re-runs the relevant acquire path. */
  onRetry: () => void | Promise<void>;
  /** Called to dismiss the panel without action. */
  onDismiss: () => void;
}

/**
 * Inline error panel that slides in below the voice toolbar when a
 * microphone or camera permission is denied / blocked / device-in-use.
 * Shows short error, fix steps, and two recovery actions:
 * \"Try again\" and \"Open system {kind} settings\" (deep-links to
 * Windows Settings → Privacy, macOS System Settings, or gnome-control-center).
 */
export const MediaPermissionPanel: React.FC<MediaPermissionPanelProps> = ({
  open,
  error,
  kind,
  onRetry,
  onDismiss,
}) => {
  const [retrying, setRetrying] = useState(false);
  const [openingSettings, setOpeningSettings] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setTimeout(() => setRetrying(false), 400);
    }
  };

  const handleOpenSettings = async () => {
    setOpeningSettings(true);
    try {
      await openOSDeviceSettings(kind);
    } finally {
      setTimeout(() => setOpeningSettings(false), 600);
    }
  };

  if (!open || !error) return null;

  const Icon = kind === 'camera' ? Camera : Mic;
  const kindLabel = kind === 'camera' ? 'camera' : 'microphone';

  return (
    <AnimatePresence>
      <motion.div
        key={`media-permission-panel-${kind}`}
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="vox-camera-permission-panel vox-camera-permission-panel--mic"
        role="alertdialog"
        aria-label={`${kindLabel} permission required`}
        data-kind={kind}
      >
        <div className="vox-camera-permission-panel__head">
          <span className="vox-camera-permission-panel__icon" aria-hidden="true">
            {error.kind === 'permission_denied' ? (
              <Icon size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
          </span>
          <div className="vox-camera-permission-panel__titleBlock">
            <div className="vox-camera-permission-panel__title">{error.title}</div>
            <div className="vox-camera-permission-panel__fix">{error.fix}</div>
          </div>
          <button
            type="button"
            className="vox-camera-permission-panel__close"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
        {error.steps.length > 0 && (
          <ol className="vox-camera-permission-panel__steps">
            {error.steps.slice(0, 3).map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        )}
        <div className="vox-camera-permission-panel__actions">
          <button
            type="button"
            className="vox-camera-permission-panel__retry"
            onClick={handleRetry}
            disabled={retrying || openingSettings}
          >
            <RefreshCw size={13} className={retrying ? 'vox-spin' : ''} />
            Try again
          </button>
          <button
            type="button"
            className="vox-camera-permission-panel__settings"
            onClick={handleOpenSettings}
            disabled={retrying || openingSettings}
            title={`Open the OS ${kindLabel} privacy settings (requires Electron desktop app)`}
          >
            <ExternalLink size={13} className={openingSettings ? 'vox-spin' : ''} />
            Open system {kindLabel} settings
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MediaPermissionPanel;
