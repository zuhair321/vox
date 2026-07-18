import React, { useState, useEffect, useCallback, forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { ToastMessage } from '../../stores/uiStore';

const TOAST_ICONS: Record<string, string> = {
  success: '⚡',
  error: '☠',
  info: 'ℹ',
  warning: '⚠',
  pin: '📌',
  mention: '@',
};

const TOAST_COLORS: Record<string, string> = {
  success: 'var(--chaos)',
  error: 'var(--blood)',
  info: 'var(--void-purple)',
  warning: 'var(--gold)',
  pin: 'var(--gold)',
  mention: 'var(--chaos)',
};

const TOAST_VARIANT_CLASSES: Record<string, string> = {
  success: 'toast-success',
  error: 'toast-error',
  info: 'toast-info',
  warning: 'toast-warning',
  pin: 'toast-pin',
  mention: 'toast-mention',
};

interface ToastProps {
  toast: ToastMessage;
  onDismiss: () => void;
}

const Toast = forwardRef<HTMLDivElement, ToastProps>(({ toast, onDismiss }, ref) => {
  const [hovered, setHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const type = toast.type || 'info';
  const color = TOAST_COLORS[type] || 'var(--void-purple)';
  const icon = TOAST_ICONS[type] || 'ℹ';
  const variantClass = TOAST_VARIANT_CLASSES[type] || 'toast-info';
  const duration = toast.duration ?? 3000;
  const isPersistent = duration === 0;

  // Progress bar driven by interval so it stays in sync with hover pause
  useEffect(() => {
    if (isPersistent || hovered) return;
    setProgress(100);
    const tick = 50; // update every 50ms for smooth bar
    const step = (tick / duration) * 100;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - step;
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, tick);
    return () => clearInterval(interval);
  }, [duration, hovered, isPersistent, onDismiss]);

  // Auto-dismiss when progress reaches 0
  useEffect(() => {
    if (progress <= 0 && !isPersistent) {
      onDismiss();
    }
  }, [progress, isPersistent, onDismiss]);

  const handleAction = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toast.onAction?.();
    onDismiss();
  }, [toast.onAction, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.92, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onDismiss}
      ref={ref}
      className={`angular-cut toast-item ${variantClass} ${type === 'mention' ? 'toast-pulse' : ''}`}
      style={{
        backgroundColor: 'var(--obsidian)',
        color: 'var(--ghost-white)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        pointerEvents: 'auto',
        position: 'relative',
        minWidth: '260px',
        maxWidth: '380px',
        overflow: 'hidden',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <span style={{ fontSize: '16px', color, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: '13px', fontFamily: "'Share Tech Mono', monospace", flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {toast.message}
      </span>

      {/* Action button */}
      {toast.actionLabel && (
        <button
          type="button"
          onClick={handleAction}
          style={{
            background: 'none',
            border: '1px solid var(--rim)',
            color: color,
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.1em',
            padding: '2px 8px',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = `${color}22`;
            (e.currentTarget as HTMLElement).style.boxShadow = `0 0 8px ${color}44`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'none';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          {toast.actionLabel}
        </button>
      )}

      {/* Dismiss × */}
      {!isPersistent && (
        <span
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          style={{
            color: 'var(--shadow)',
            fontSize: '14px',
            cursor: 'pointer',
            flexShrink: 0,
            lineHeight: 1,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ghost-white)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--shadow)'; }}
          aria-label="Dismiss"
        >
          ✕
        </span>
      )}

      {/* Timer Bar — JS-driven progress instead of CSS animation for accurate hover pause */}
      {!isPersistent && (
        <div className="toast-timer-bar" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'rgba(255,255,255,0.06)' }}>
          <div
            style={{
              height: '100%',
              backgroundColor: color,
              width: `${progress}%`,
              transition: hovered ? 'none' : 'width 50ms linear',
              borderRadius: 0,
            }}
          />
        </div>
      )}
    </motion.div>
  );
});

export default Toast;
