import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useMessageStore } from '../../stores/messageStore';
import { useSocketStore } from '../../stores/socketStore';
import { useUiStore } from '../../stores/uiStore';
import { useServerStore } from '../../stores/serverStore';
import { fetchMessages } from '../../api/messages';
import { sendMessageHTTP } from '../../api/messages';
import MessageBubble from './MessageBubble';
import RichText from './RichText';
import { API_BASE } from '../../api/client';

const ThreadPanel: React.FC = () => {
  const { threadMessageId, setThreadMessageId } = useUiStore();
  const { selectedChannel, selectedServer } = useServerStore();
  const { messages, setMessages, addMessage } = useMessageStore();
  const threadServerId = selectedServer?.id ?? selectedChannel?.serverId;
  const [replyText, setReplyText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const threadKey = threadMessageId ? `thread-${threadMessageId}` : '';
  const threadMessages = threadKey ? messages[threadKey] || [] : [];
  const channelMsgs = selectedChannel ? messages[selectedChannel.id] || [] : [];
  const parentMsg = threadMessageId
    ? channelMsgs.find((m) => m.id === threadMessageId)
    : undefined;

  useEffect(() => {
    if (!threadMessageId || !selectedChannel) return;
    let alive = true;
    fetchMessages(selectedChannel.id)
      .then((loaded: any[]) => {
        if (!alive) return;
        // We need to fetch replies. The backend doesn't have a dedicated thread
        // endpoint yet, so we pull all messages and filter client-side.
        // In a future iteration this becomes a /api/messages/:id/replies call.
        const replies = (Array.isArray(loaded) ? loaded : []).filter(
          (m: any) => m.parentId === threadMessageId,
        );
        setMessages(threadKey, replies);
      })
      .catch(() => {
        if (alive) setMessages(threadKey, []);
      });
    return () => { alive = false; };
  }, [threadMessageId, threadKey, setMessages, selectedChannel]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threadMessages.length]);

  // Hooks must run on every render (Rules of Hooks). Guard the actual render
  // output below instead of returning early before the hooks above — returning
  // early here previously caused "Rendered more hooks than during the previous
  // render" (React #310 / internal-server crash) when the thread panel opened.
  if (!threadMessageId || !selectedChannel) return null;

  const handleSend = async () => {
    if (!replyText.trim() || !selectedChannel) return;
    try {
      const data = await sendMessageHTTP(selectedChannel.id, replyText, threadMessageId);
      if (data?.message) {
        useMessageStore.getState().addMessage(threadKey, data.message);
      }
      setReplyText('');
    } catch {
      // Error handled in sendMessageHTTP
    }
  };

  const myId = (() => {
    try { return JSON.parse(localStorage.getItem('vox_user') || '{}')?.id; } catch { return undefined; }
  })();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 320, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          borderLeft: '1px solid var(--rim)',
          background: 'var(--abyss)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* Header */}
        <div
          className="top-bar"
          style={{
            justifyContent: 'space-between',
            background: 'var(--obsidian)',
            borderLeft: 'none',
            borderBottom: '1px solid var(--rim)',
          }}
        >
          <div>
            <span style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '14px', color: 'var(--ghost-white)' }}>
              THREAD
            </span>
            <span style={{ fontSize: '12px', color: 'var(--shadow)', marginLeft: '8px' }}>
              #{selectedChannel.name}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setThreadMessageId(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--shadow)',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {/* Original message */}
          {parentMsg && (
            <div
              style={{
                background: 'var(--obsidian)',
                border: '1px solid var(--rim)',
                padding: '12px',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div
                  className="octagon"
                  style={{
                    width: '32px',
                    height: '32px',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #2a3038, #4a535f, #dce4ee)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {(() => {
                    const url = parentMsg.author?.avatarUrl;
                    if (url) {
                      const full = url.startsWith('http') ? url : `${API_BASE}${url}`;
                      return <img src={full} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />;
                    }
                    const name = parentMsg.author?.username || parentMsg.authorOverride || '?';
                    return <span style={{ color: '#0b0d11', fontWeight: 800, fontSize: '14px' }}>{name[0].toUpperCase()}</span>;
                  })()}
                </div>
                <span style={{ color: 'var(--ghost-white)', fontWeight: 'bold', fontSize: '13px' }}>
                  {parentMsg.author?.username || parentMsg.authorOverride || 'Unknown'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--shadow)' }}>
                  {format(new Date(parentMsg.createdAt), 'h:mm a')}
                </span>
              </div>
              <div style={{ color: 'var(--ash)', fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word' }}>
                <RichText text={parentMsg.body} serverId={threadServerId} />
              </div>
            </div>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0 12px' }}>
            <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, var(--rim), transparent)' }} />
            <span style={{ fontSize: '10px', color: 'var(--shadow)', padding: '0 12px', fontFamily: "'Share Tech Mono', monospace", letterSpacing: '0.15em' }}>
              THREAD REPLIES
            </span>
            <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, var(--rim), transparent)' }} />
          </div>

          {/* Reply count in header */}
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', color: 'var(--chaos)', letterSpacing: '0.1em' }}>
              {threadMessages.length} REPLY{threadMessages.length !== 1 ? 'IES' : ''}
            </span>
          </div>

          {/* Thread replies */}
          {threadMessages.map((msg, idx) => {
            const prev = threadMessages[idx - 1];
            const isGrouped =
              prev && prev.userId === msg.userId &&
              new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
            return (
              <div key={msg.id} style={{ marginLeft: '8px' }}>
                <MessageBubble message={msg} isGrouped={isGrouped} isOwn={msg.userId === myId} />
              </div>
            );
          })}

          {threadMessages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--shadow)', fontSize: '12px', padding: '24px 0' }}>
              No replies yet. Be the first.
            </div>
          )}
        </div>

        {/* Reply input */}
        <div style={{ padding: '0 12px 12px' }}>
          <input
            type="text"
            className="angular-input"
            placeholder="Reply in thread..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ThreadPanel;
