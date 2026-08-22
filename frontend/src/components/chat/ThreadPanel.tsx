import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useMessageStore } from '../../stores/messageStore';
import { useSocketStore } from '../../stores/socketStore';
import { useUiStore } from '../../stores/uiStore';
import { useServerStore } from '../../stores/serverStore';
import {
  fetchThreadReplies,
  fetchThreadSummary,
  markThreadRead,
} from '../../api/messages';
import MessageBubble from './MessageBubble';
import RichText from './RichText';
import { API_BASE } from '../../api/client';

/** Discord-style thread: dedicated replies endpoint, live socket push,
 *  unread tracking, typing dots, mark-as-read on open. */
const ThreadPanel: React.FC = () => {
  const { threadMessageId, setThreadMessageId, threadUnread, clearThreadUnread, threadTyping } = useUiStore();
  const { selectedChannel, selectedServer } = useServerStore();
  const safeSelected = (selectedChannel as any) || { id: '', name: 'thread', serverId: '' };
  const selectedChannelSafeId = safeSelected.id;
  const selectedChannelSafeName = safeSelected.name;
  const { messages, setMessages } = useMessageStore();
  const socket = useSocketStore((s) => s.socket);
  const threadServerId = selectedServer?.id ?? selectedChannel?.serverId;
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const threadKey = threadMessageId ? `thread-${threadMessageId}` : '';
  const threadMessages = threadKey ? messages[threadKey] || [] : [];
  const channelMsgs = selectedChannel ? messages[selectedChannel.id] || [] : [];
  const parentMsg = threadMessageId
    ? channelMsgs.find((m) => m.id === threadMessageId)
    : undefined;

  const typingKey = selectedChannel && threadMessageId
    ? `${selectedChannel.id}:${threadMessageId}`
    : '';
  const typingUsers = typingKey ? threadTyping[typingKey] || {} : {};
  const anyTyping = Object.keys(typingUsers).length > 0;
  const unreadHere = threadMessageId ? threadUnread[threadMessageId] || 0 : 0;

  useEffect(() => {
    if (!threadMessageId || !selectedChannel) return;
    let alive = true;
    setLoading(true);
    fetchThreadReplies(threadMessageId, undefined, 50)
      .then((data) => {
        if (!alive) return;
        setMessages(threadKey, data.replies || []);
        const last = (data.replies || []).slice(-1)[0];
        if (last) markThreadRead(threadMessageId, last.id).catch(() => {});
        clearThreadUnread(threadMessageId);
      })
      .catch(() => { if (alive) setMessages(threadKey, []); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [threadMessageId, threadKey, setMessages, clearThreadUnread, selectedChannel]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threadMessages.length, threadMessageId]);

  const emitTyping = (typing: boolean) => {
    if (!socket || !selectedChannel || !threadMessageId) return;
    socket.emit('thread:typing', {
      channelId: selectedChannelSafeId,
      parentId: threadMessageId,
      typing,
    });
  };
  const onTextChange = (v: string) => {
    setReplyText(v);
    if (!selectedChannel || !threadMessageId) return;
    emitTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 4000);
  };

  const myId = (() => {
    try { return JSON.parse(localStorage.getItem('vox_user') || '{}')?.id; } catch { return undefined; }
  })();

  const handleSend = async () => {
    if (!replyText.trim() || !selectedChannel) return;
    const text = replyText.trim();
    setReplyText('');
    emitTyping(false);
    if (!threadMessageId) return;
    try {
      const mod = await import('../../api/messages');
      const data = await mod.sendMessageHTTP(
        selectedChannelSafeId,
        text,
        threadMessageId,
      );
      if (data && data.message) {
        useMessageStore.getState().addMessage(threadKey, data.message);
        markThreadRead(threadMessageId, data.message.id).catch(() => {});
      }
    } catch {
      // Error handled in sendMessageHTTP; nothing more to do here.
    }
  };

  useEffect(() => {
    if (!threadMessageId) return;
    fetchThreadSummary(threadMessageId).catch(() => {});
  }, [threadMessageId]);

  return (
    <AnimatePresence>
      {threadMessageId && (
      <motion.div
        initial={{ x: 48, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 48, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 30, mass: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(360px, 100%)',
          zIndex: 45,
          borderLeft: '1px solid var(--rim)',
          background: 'var(--abyss)',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.55)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div className="top-bar"
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
              #{selectedChannelSafeName}
            </span>
            {unreadHere > 0 && (
              <span title={unreadHere + ' new ' + (unreadHere === 1 ? 'reply' : 'replies')}
                style={{
                  marginLeft: '10px',
                  background: 'var(--chaos)',
                  color: '#0b0d11',
                  fontWeight: 800,
                  fontSize: '10px',
                  padding: '2px 7px',
                  borderRadius: '8px',
                  letterSpacing: '0.05em',
                  fontFamily: "'Share Tech Mono', monospace",
                }}
              >
                {unreadHere} NEW
              </span>
            )}
          </div>
          <button type="button" onClick={() => setThreadMessageId(null)} aria-label="Close thread"
            style={{
              background: 'none', border: 'none', color: 'var(--shadow)',
              cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {parentMsg && (
            <div style={{
              background: 'var(--obsidian)', border: '1px solid var(--rim)',
              padding: '12px', marginBottom: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div className="octagon" style={{
                  width: '32px', height: '32px', overflow: 'hidden',
                  background: 'linear-gradient(135deg, #2a3038, #4a535f, #dce4ee)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
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

          <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0 12px' }}>
            <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, var(--rim), transparent)' }} />
            <span style={{ fontSize: '10px', color: 'var(--shadow)', padding: '0 12px', fontFamily: "'Share Tech Mono', monospace", letterSpacing: '0.15em' }}>THREAD REPLIES</span>
            <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, var(--rim), transparent)' }} />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '12px', color: 'var(--chaos)', letterSpacing: '0.1em' }}>{threadMessages.length} REPLY{threadMessages.length !== 1 ? 'IES' : ''}</span>
          </div>

          {threadMessages.map((msg, idx) => {
            const prev = threadMessages[idx - 1];
            const isGrouped = prev && prev.userId === msg.userId && new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
            return (
              <div key={msg.id} style={{ marginLeft: '8px' }}>
                <MessageBubble message={msg} isGrouped={isGrouped} isOwn={msg.userId === myId} />
              </div>
            );
          })}

          {loading && threadMessages.length === 0 && <div style={{ textAlign: 'center', color: 'var(--shadow)', fontSize: '12px', padding: '24px 0' }}>loading replies…</div>}
          {!loading && threadMessages.length === 0 && <div style={{ textAlign: 'center', color: 'var(--shadow)', fontSize: '12px', padding: '24px 0' }}>No replies yet. Be the first.</div>}

          {anyTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--shadow)', fontSize: '11px', fontStyle: 'italic', padding: '6px 0 2px 12px' }}>
              <span style={{ display: 'inline-flex', gap: '2px' }}>
                <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0 }} style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--chaos)', display: 'inline-block' }} />
                <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0.15 }} style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--chaos)', display: 'inline-block' }} />
                <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0.3 }} style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--chaos)', display: 'inline-block' }} />
              </span>
              <span>someone is typing…</span>
            </div>
          )}
        </div>

        <div style={{ padding: '0 12px 12px' }}>
          <input type='text' className='angular-input' placeholder='Reply in thread…' value={replyText} onChange={(e) => onTextChange(e.target.value)} onBlur={() => emitTyping(false)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ThreadPanel;
