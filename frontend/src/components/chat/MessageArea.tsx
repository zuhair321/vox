import React, { useEffect, useMemo, useRef, useState } from 'react';
import NotificationLevelPicker from './NotificationLevelPicker';
import { AnimatePresence, motion } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { useMessageStore } from '../../stores/messageStore';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { fetchMessages } from '../../api/messages';
import { useSocketStore } from '../../stores/socketStore';
import { MessageListSkeleton } from '../ui/Skeleton';
import { analyzeMood, applyMoodShift } from '../../utils/moodShift';

const SCROLL_THRESHOLD = 300;

const MessageArea: React.FC<{ channelId: string; messageId?: string }> = ({ channelId, messageId }) => {
  const { messages, setMessages, loading } = useMessageStore();
  const { joinChannel, leaveChannel } = useSocketStore();
  const channelMessages = messages[channelId] || [];
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const myId = (() => {
    try { return JSON.parse(localStorage.getItem('vox_user') || '{}')?.id; } catch { return undefined; }
  })();
  const myUsername = (() => {
    try { return JSON.parse(localStorage.getItem('vox_user') || '{}')?.username; } catch { return undefined; }
  })();

  useEffect(() => {
    let alive = true;
    fetchMessages(channelId)
      .then((loaded) => { if (alive && Array.isArray(loaded)) setMessages(channelId, loaded); })
      .catch(() => { if (alive) setMessages(channelId, []); });
    return () => { alive = false; };
  }, [channelId, setMessages]);

  useEffect(() => {
    joinChannel(channelId);
    return () => leaveChannel(channelId);
  }, [channelId, joinChannel, leaveChannel]);

  // Ambient mood shift — analyze recent messages and shift background glow
  useEffect(() => {
    if (channelMessages.length === 0) return;
    const result = analyzeMood(channelMessages);
    applyMoodShift(result);
    return () => {
      // Reset on unmount
      document.documentElement.style.removeProperty('--mood-glow');
      document.documentElement.style.removeProperty('--mood-intensity');
      document.documentElement.style.removeProperty('--mood-size');
    };
  }, [channelMessages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distance < SCROLL_THRESHOLD;
    setShowJump(!nearBottom);
    if (nearBottom) setNewCount(0);
  };

  useEffect(() => { if (showJump) setNewCount((c) => c + 1); }, [channelMessages.length, showJump]);

   useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [channelId]);

   useEffect(() => {
     if (!messageId) return;
     const timer = setTimeout(() => {
       const el = document.querySelector(`[data-message-id="${messageId}"]`);
       if (el) {
         el.scrollIntoView({ behavior: 'smooth', block: 'center' });
       }
     }, 300);
     return () => clearTimeout(timer);
   }, [channelId, messageId, channelMessages.length]);

  const prevMessageCount = useRef(channelMessages.length);
  useEffect(() => { prevMessageCount.current = 0; }, [channelId]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distance < SCROLL_THRESHOLD;
    if (channelMessages.length > prevMessageCount.current && nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCount.current = channelMessages.length;
  }, [channelMessages.length]);

  const jumpToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowJump(false);
    setNewCount(0);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Trigger upload via custom event
      window.dispatchEvent(new CustomEvent('vox:upload-files', { detail: { files, channelId } }));
    }
  };

  const rows = useMemo(() => {
    const out: Array<{ type: 'sep'; key: string; label: string } | { type: 'msg'; key: string; index: number }> = [];
    let lastDay = '';
    channelMessages.forEach((msg, index) => {
      const d = new Date(msg.createdAt);
      const dayKey = format(d, 'yyyy-MM-dd');
      if (dayKey !== lastDay) {
        lastDay = dayKey;
        const label = isToday(d) ? 'TODAY' : isYesterday(d) ? 'YESTERDAY' : format(d, 'EEE, MMM d').toUpperCase();
        out.push({ type: 'sep', key: `sep-${dayKey}`, label });
      }
      out.push({ type: 'msg', key: msg.id, index });
    });
    return out;
  }, [channelMessages]);

  const isLoading = !!loading[channelId] && channelMessages.length === 0;

  return (
    <div
      style={{ position: 'relative', flex: '1 1 auto', display: 'flex', minHeight: 0, overflow: 'hidden' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(16, 185, 129, 0.1)',
          border: '2px dashed var(--toxic)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ color: 'var(--toxic)', fontSize: 18, fontWeight: 'bold', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.1em' }}>
            DROP FILES TO UPLOAD
          </div>
        </div>
      )}
      <div ref={scrollRef} onScroll={onScroll} className="messages-container">
        {isLoading ? (
          <MessageListSkeleton />
        ) : rows.length === 0 ? (
          <div className="vox-empty-state" style={{ flex: 1 }}>
            <div className="vox-empty-icon">💬</div>
            <div className="vox-empty-title">THE CHANNEL IS SILENT</div>
            <div className="vox-empty-desc">Send the first transmission.</div>
          </div>
        ) : (
          rows.map((row) => {
            if (row.type === 'sep') {
              return (
                <div className="date-separator" key={row.key}>
                  <span className="date-separator-line" />
                  <span className="date-separator-text">{row.label}</span>
                  <span className="date-separator-line" />
                </div>
              );
            }
            const msg = channelMessages[row.index];
            const prevMsg = channelMessages[row.index - 1];
            let isGrouped = false;
            if (prevMsg && prevMsg.userId === msg.userId) {
              const prevDay = format(new Date(prevMsg.createdAt), 'yyyy-MM-dd');
              const thisDay = format(new Date(msg.createdAt), 'yyyy-MM-dd');
              if (prevDay === thisDay) {
                const timeDiff = new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
                if (timeDiff < 5 * 60 * 1000) isGrouped = true;
              }
            }
            return (
              <MessageBubble
                key={row.key}
                message={msg}
                isGrouped={isGrouped}
                isOwn={msg.userId === myId || (!msg.userId && msg.authorOverride === myUsername)}
                myUsername={myUsername}
                myId={myId}
                myRole={(() => {
                  try { return (JSON.parse(localStorage.getItem('vox_user') || '{}')?.role || '').toUpperCase(); } catch { return ''; }
                })()}
              />
            );
          })
        )}
        <TypingIndicator channelId={channelId} />
        <div ref={bottomRef} />
      </div>

      <AnimatePresence>
        {showJump && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.18 }}
            onClick={jumpToBottom}
            className="vox-jump-pill"
            aria-label="Jump to most recent messages"
          >
            <span>↓</span>
            {newCount > 0 ? `${newCount} new transmissions` : 'new transmissions'}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageArea;
