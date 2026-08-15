import React from 'react';
import { motion } from 'framer-motion';
import { useServerStore } from '../../stores/serverStore';
import { useUiStore } from '../../stores/uiStore';
import MessageArea from '../chat/MessageArea';
import MessageInput from '../chat/MessageInput';
import ThreadPanel from '../chat/ThreadPanel';
import PinnedMessages from '../chat/PinnedMessages';
import SearchPanel from '../search/SearchPanel';
import NotificationBell from './NotificationBell';
import NotificationLevelPicker from '../chat/NotificationLevelPicker';

const MainContent: React.FC<{ messageId?: string }> = ({ messageId }) => {
  const { selectedChannel } = useServerStore();
  const {
    setShowPinnedPanel,
    showPinnedPanel,
    setShowSearchPanel,
    showSearchPanel,
    threadMessageId,
    setThreadMessageId,
  } = useUiStore();

  if (!selectedChannel) {
  return (
    <div className="main-content main-content-enter" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--ash)' }}>
        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.2 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ fontSize: '48px' }}
        >#</motion.h1>
        <motion.h2
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ color: 'var(--ghost-white)', marginTop: '16px' }}
        >DARKNESS AWAITS</motion.h2>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >Be the first to send a message.</motion.p>
      </div>
    </div>
  );
  }

  return (
    <div className="main-content">
      <div className={`top-bar top-bar-shine`} style={{ justifyContent: 'space-between' }}>
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{ fontSize: '20px', color: 'var(--shadow)' }}
          >#</motion.span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--ghost-white)', fontFamily: "'Share Tech Mono', monospace", margin: 0, lineHeight: 1.2 }}>
              {selectedChannel.name}
            </h2>
            {selectedChannel.topic && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                style={{ fontSize: '11px', color: 'var(--ash)', lineHeight: 1.2, marginTop: '2px' }}
              >
                {selectedChannel.topic}
              </motion.span>
            )}
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          {threadMessageId && (
            <button
              type="button"
              className="vox-panel-icon panel-toggle-btn active"
              title="Thread open"
              style={{ cursor: 'default' }}
            >
              🧵
            </button>
          )}
          <button
            type="button"
            className={`vox-panel-icon panel-toggle-btn ${showSearchPanel ? 'active' : ''}`}
            onClick={() => {
              setShowSearchPanel(!showSearchPanel);
              if (!showSearchPanel) { setThreadMessageId(null); setShowPinnedPanel(false); }
            }}
            title="Search (Ctrl+F)"
            aria-label="Search messages"
          >
            🔍
          </button>
          <NotificationLevelPicker serverId={selectedChannel?.serverId} channelId={selectedChannel?.id} />
          <NotificationBell />
          <button
            type="button"
            className={`vox-panel-icon panel-toggle-btn ${showPinnedPanel ? 'active' : ''}`}
            onClick={() => {
              setShowPinnedPanel(!showPinnedPanel);
              if (!showPinnedPanel) { setThreadMessageId(null); setShowSearchPanel(false); }
            }}
            title="Pinned messages"
            aria-label="Pinned messages"
          >
            📌
          </button>
        </motion.div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
          <MessageArea channelId={selectedChannel.id} messageId={messageId} />
          <div style={{ flexShrink: 0, padding: '0 16px 24px 16px' }}>
            <MessageInput channelId={selectedChannel.id} />
          </div>
        </div>

        {/* Right-side panels: thread / search / pinned */}
        <ThreadPanel />
        {showSearchPanel && <SearchPanel />}
        {showPinnedPanel && <PinnedMessages />}
      </div>
    </div>
  );
};

export default MainContent;
