import React from 'react';
import { motion } from 'framer-motion';
import { API_BASE } from '../../api/client';

interface ThreadIndicatorProps {
  replyCount: number;
  lastReplyAvatar?: string | null;
  lastReplyTime: string;
  onClick: () => void;
}

const ThreadIndicator: React.FC<ThreadIndicatorProps> = ({
  replyCount,
  lastReplyAvatar,
  lastReplyTime,
  onClick,
}) => {
  if (replyCount <= 0) return null;

  const avatarUrl = lastReplyAvatar
    ? lastReplyAvatar.startsWith('http')
      ? lastReplyAvatar
      : `${API_BASE}${lastReplyAvatar}`
    : null;

  return (
    <motion.div
      className="vox-thread-indicator"
      onClick={onClick}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '4px',
        cursor: 'pointer',
        padding: '4px 8px',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(216,74,90,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <div
        style={{
          width: '2px',
          height: '20px',
          background: 'var(--chaos)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: '12px',
          color: 'var(--chaos)',
          fontFamily: "'Share Tech Mono', monospace",
        }}
      >
        {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
      </span>
      {avatarUrl && (
        <div
          className="octagon"
          style={{
            width: '16px',
            height: '16px',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <img
            src={avatarUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}
      <span style={{ fontSize: '11px', color: 'var(--shadow)' }}>{lastReplyTime}</span>
    </motion.div>
  );
};

export default ThreadIndicator;
