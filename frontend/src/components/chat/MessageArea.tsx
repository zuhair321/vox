import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { useMessageStore } from '../../stores/messageStore';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { fetchMessages } from '../../api/messages';
import { useSocketStore } from '../../stores/socketStore';
import { MessageListSkeleton } from '../ui/Skeleton';

const SCROLL_THRESHOLD = 300; // px from bottom before the jump button shows

const MessageArea: React.FC<{ channelId: string }> = ({ channelId }) => {
  const { messages, setMessages, loading } = useMessageStore();
  const { joinChannel, leaveChannel } = useSocketStore();
  const channelMessages = messages[channelId] || [];
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const myId = (() => {
    try {
      return JSON.parse(localStorage.getItem('vox_user') || '{}')?.id;
    } catch {
      return undefined;
    }
  })();

  useEffect(() => {
    let alive = true;
    fetchMessages(channelId)
      .then((loaded) => {
        if (alive && Array.isArray(loaded)) setMessages(channelId, loaded);
      })
      .catch(() => {
        if (alive) setMessages(channelId, []);
      });
    return () => {
      alive = false;
    };
  }, [channelId, setMessages]);

  useEffect(() => {
    joinChannel(channelId);
    return () => leaveChannel(channelId);
  }, [channelId, joinChannel, leaveChannel]);

  // Track whether the user is near the bottom; if not, count new messages for
  // the jump-to-bottom pill.
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distance < SCROLL_THRESHOLD;
    setShowJump(!nearBottom);
    if (nearBottom) setNewCount(0);
  };

  // When new messages arrive and the user is scrolled up, bump the unread count.
  useEffect(() => {
    if (showJump) setNewCount((c) => c + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelMessages.length]);

  // Auto-scroll to bottom when near it (or when the channel changes).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelId]);

  // Auto-scroll to bottom when new messages arrive and user is near bottom.
  const prevMessageCount = useRef(channelMessages.length);
  useEffect(() => {
    prevMessageCount.current = 0; // reset when channel changes
  }, [channelId]);

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

  // Build a flat render list with date separators interleaved between days.
  const rows = useMemo(() => {
    const out: Array<{ type: 'sep'; key: string; label: string } | { type: 'msg'; key: string; index: number }> = [];
    let lastDay = '';
    channelMessages.forEach((msg, index) => {
      const d = new Date(msg.createdAt);
      const dayKey = format(d, 'yyyy-MM-dd');
      if (dayKey !== lastDay) {
        lastDay = dayKey;
        const label = isToday(d)
          ? 'TODAY'
          : isYesterday(d)
          ? 'YESTERDAY'
          : format(d, 'EEE, MMM d').toUpperCase();
        out.push({ type: 'sep', key: `sep-${dayKey}`, label });
      }
      out.push({ type: 'msg', key: msg.id, index });
    });
    return out;
  }, [channelMessages]);

  const isLoading = !!loading[channelId] && channelMessages.length === 0;

  return (
    <div style={{ position: 'relative', flex: '1 1 auto', display: 'flex', minHeight: 0, overflow: 'hidden' }}>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="messages-container"
      >
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
            // Group same-author messages within 5 minutes, but never across a
            // date separator.
            let isGrouped = false;
            if (prevMsg && prevMsg.userId === msg.userId) {
              const prevDay = format(new Date(prevMsg.createdAt), 'yyyy-MM-dd');
              const thisDay = format(new Date(msg.createdAt), 'yyyy-MM-dd');
              if (prevDay === thisDay) {
                const timeDiff =
                  new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
                if (timeDiff < 5 * 60 * 1000) isGrouped = true;
              }
            }
            return (
              <MessageBubble
                key={row.key}
                message={msg}
                isGrouped={isGrouped}
                isOwn={msg.userId === myId}
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
            className="jump-to-bottom"
            aria-label="Jump to most recent messages"
          >
            ↓{newCount > 0 ? ` (${newCount} NEW)` : ''}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageArea;
