import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useUiStore } from '../../stores/uiStore';
import { useServerStore } from '../../stores/serverStore';
import { useSocketStore } from '../../stores/socketStore';
import { api } from '../../api/client';
import RichText from './RichText';
import { API_BASE } from '../../api/client';

interface PinnedMsg {
  id: string;
  channelId: string;
  body: string;
  createdAt: string;
  author?: { displayName?: string; username?: string; avatarUrl?: string | null } | null;
  authorOverride?: string;
}

const PinnedMessages: React.FC = () => {
  const { showPinnedPanel, setShowPinnedPanel } = useUiStore();
  const { selectedChannel, selectedServer } = useServerStore();
  const { deleteMessage } = useSocketStore();
  const serverId = selectedServer?.id ?? selectedChannel?.serverId;
  const [pinned, setPinned] = useState<PinnedMsg[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showPinnedPanel || !selectedChannel) return;
    let alive = true;
    setLoading(true);
    api(`/api/channels/${selectedChannel.id}/messages/pinned`)
      .then((data: any) => {
        if (alive) setPinned(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (alive) setPinned([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [showPinnedPanel, selectedChannel]);

  const handleJump = (messageId: string) => {
    const el = document.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('vox-message-highlight');
      setTimeout(() => el.classList.remove('vox-message-highlight'), 2500);
    }
    setShowPinnedPanel(false);
  };

  const myRole = (() => {
    try {
      return JSON.parse(localStorage.getItem('vox_user') || '{}')?.role || '';
    } catch { return ''; }
  })();
  const canUnpin = ['FOUNDER', 'ADMIN', 'MODERATOR'].includes(myRole.toUpperCase());

  return (
    <AnimatePresence>
      {showPinnedPanel && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            borderLeft: '1px solid var(--rim)',
            background:
              'linear-gradient(180deg, rgba(216, 74, 90, 0.03), transparent 26%), var(--abyss)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            className="top-bar"
            style={{
              justifyContent: 'space-between',
              background: 'var(--obsidian)',
              borderBottom: '1px solid var(--rim)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '14px', color: 'var(--ghost-white)' }}>
                PINNED MESSAGES
              </span>
              {pinned.length > 0 && (
                <span
                  style={{
                    fontFamily: "'Creepster', cursive",
                    fontSize: '12px',
                    color: 'var(--chaos)',
                  }}
                >
                  ({pinned.length})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowPinnedPanel(false)}
              className="pinned-close-btn"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--shadow)',
                cursor: 'pointer',
                fontSize: '16px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 0 }} />
                ))}
              </div>
            )}

            {!loading && pinned.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                <div style={{ fontSize: '36px', opacity: 0.3, marginBottom: '12px' }}>📌</div>
                <div
                  style={{
                    fontFamily: "'Cinzel Decorative', serif",
                    fontSize: '14px',
                    color: 'var(--shadow)',
                    marginBottom: '8px',
                  }}
                >
                  NO PINNED TRANSMISSIONS
                </div>
                <div style={{ fontSize: '12px', color: 'var(--shadow)', opacity: 0.7 }}>
                  Pin important messages to find them easily.
                </div>
              </div>
            )}

            {pinned.map((msg) => {
              const authorName =
                msg.author?.username || msg.author?.displayName || msg.authorOverride || 'Unknown';
              const avatarUrl = msg.author?.avatarUrl
                ? msg.author.avatarUrl.startsWith('http')
                  ? msg.author.avatarUrl
                  : `${API_BASE}${msg.author.avatarUrl}`
                : null;

              return (
                <div
                  key={msg.id}
                  className="pinned-msg-card"
                  style={{
                    background: 'var(--dark-matter)',
                    border: '1px solid var(--rim)',
                    borderLeft: '3px solid var(--gold)',
                    padding: '12px',
                    margin: '8px 0',
                    clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div
                      className="octagon"
                      style={{
                        width: '24px',
                        height: '24px',
                        overflow: 'hidden',
                        background: 'linear-gradient(135deg, #2a3038, #4a535f)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <span style={{ color: '#0b0d11', fontWeight: 800, fontSize: '11px' }}>
                          {authorName[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span style={{ color: 'var(--ghost-white)', fontSize: '13px', fontWeight: 600 }}>
                      {authorName}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--shadow)', marginLeft: 'auto' }}>
                      {format(new Date(msg.createdAt), 'h:mm a')}
                    </span>
                  </div>

                  {/* Message preview */}
                  <div
                    style={{
                      color: 'var(--ash)',
                      fontSize: '13px',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                    }}
                  >
                    <RichText text={msg.body} serverId={serverId} />
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleJump(msg.id)}
                      className="pinned-jump-link"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--chaos)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontFamily: "'Share Tech Mono', monospace",
                        padding: 0,
                      }}
                    >
                      Jump to message
                    </button>
                    {canUnpin && (
                      <button
                        type="button"
                        className="pinned-close-btn"
                        onClick={() => {
                          api(`/api/messages/${msg.id}/pin`, { method: 'POST' });
                          setPinned((prev) => prev.filter((p) => p.id !== msg.id));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--shadow)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '0 4px',
                          lineHeight: 1,
                        }}
                        title="Unpin"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PinnedMessages;
