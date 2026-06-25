import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useNotificationStore } from '../../stores/notificationStore';
import { API_BASE } from '../../api/client';
import type { NotificationType } from '../../stores/notificationStore';

const TYPE_BORDER: Record<NotificationType, string> = {
  mention: 'var(--chaos)',
  dm: 'var(--void-purple)',
  join: 'var(--toxic)',
  system: 'var(--gold)',
  warning: 'var(--blood)',
};

function resolveAvatar(url?: string | null) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

const NotificationCenter: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isOpen,
    filter,
    addNotification,
    markRead,
    markAllRead,
    toggle,
    setOpen,
    setFilter,
  } = useNotificationStore();

  const filtered = useMemo(() => {
    if (filter === 'mentions') return notifications.filter((n) => n.type === 'mention');
    if (filter === 'unreads') return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, filter]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '48px',
              right: '16px',
              width: '360px',
              maxHeight: '480px',
              zIndex: 1000,
              background: 'var(--dark-matter)',
              border: '1px solid var(--rim)',
              clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(216,74,90,0.1)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--rim)',
              }}
            >
              <span
                style={{
                  fontFamily: "'Cinzel Decorative', serif",
                  fontSize: '14px',
                  color: 'var(--ghost-white)',
                  letterSpacing: '0.1em',
                }}
              >
                NOTIFICATIONS
              </span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={markAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--chaos)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontFamily: "'Share Tech Mono', monospace",
                  }}
                >
                  MARK ALL READ
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                padding: '8px 16px',
                borderBottom: '1px solid var(--rim)',
              }}
            >
              {(['all', 'mentions', 'unreads'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '4px 12px',
                    fontSize: '11px',
                    fontFamily: "'Bebas Neue', sans-serif",
                    letterSpacing: '0.1em',
                    background: filter === f ? 'var(--chaos)' : 'var(--phantom)',
                    color: filter === f ? '#ffffff' : 'var(--shadow)',
                    border: 'none',
                    cursor: 'pointer',
                    clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)',
                    textTransform: 'uppercase',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Notification list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <div style={{ fontSize: '36px', opacity: 0.3, marginBottom: '12px' }}>🔔</div>
                  <div
                    style={{
                      fontFamily: "'Cinzel Decorative', serif",
                      fontSize: '14px',
                      color: 'var(--shadow)',
                      marginBottom: '8px',
                    }}
                  >
                    THE VOID IS SILENT
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--shadow)', opacity: 0.7 }}>
                    No new notifications.
                  </div>
                </div>
              )}

              {filtered.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '12px 16px',
                    background: n.read ? 'transparent' : 'var(--obsidian)',
                    borderLeft: n.read ? 'none' : `3px solid ${TYPE_BORDER[n.type]}`,
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = n.read
                      ? 'rgba(216,74,90,0.06)'
                      : 'var(--obsidian)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = n.read
                      ? 'transparent'
                      : 'var(--obsidian)';
                  }}
                >
                  <div
                    className="octagon"
                    style={{
                      width: '32px',
                      height: '32px',
                      overflow: 'hidden',
                      background: 'var(--rim)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '16px',
                    }}
                  >
                    {n.type === 'mention' ? '💬' : n.type === 'dm' ? '✉️' : n.type === 'join' ? '👋' : n.type === 'system' ? '⚙️' : '⚠️'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: 'var(--ghost-white)',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {n.title}
                    </div>
                    {n.preview && (
                      <div
                        style={{
                          color: 'var(--ash)',
                          fontSize: '12px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '2px',
                        }}
                      >
                        {n.preview}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--shadow)', marginTop: '4px' }}>
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  {!n.read && (
                    <div
                      className="octagon"
                      style={{
                        width: '8px',
                        height: '8px',
                        background: 'var(--chaos)',
                        flexShrink: 0,
                        alignSelf: 'center',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;
