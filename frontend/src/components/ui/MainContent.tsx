import React from 'react';
import { useServerStore } from '../../stores/serverStore';
import { useUiStore } from '../../stores/uiStore';
import MessageArea from '../chat/MessageArea';
import MessageInput from '../chat/MessageInput';
import ThreadPanel from '../chat/ThreadPanel';
import PinnedMessages from '../chat/PinnedMessages';
import SearchPanel from '../search/SearchPanel';

const MainContent: React.FC = () => {
  const { selectedChannel } = useServerStore();
  const {
    setShowPinnedPanel,
    showPinnedPanel,
    setShowSearchPanel,
    showSearchPanel,
    threadMessageId,
  } = useUiStore();

  if (!selectedChannel) {
    return (
      <div className="main-content" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--ash)' }}>
          <h1 style={{ fontSize: '48px', opacity: 0.2 }}>#</h1>
          <h2 style={{ color: 'var(--ghost-white)', marginTop: '16px' }}>DARKNESS AWAITS</h2>
          <p>Be the first to send a message.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="top-bar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px', color: 'var(--shadow)' }}>#</span>
          <h2 style={{ fontSize: '18px', color: 'var(--ghost-white)', fontFamily: "'Share Tech Mono', monospace" }}>
            {selectedChannel.name}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
            onClick={() => setShowSearchPanel(!showSearchPanel)}
            title="Search (Ctrl+F)"
            aria-label="Search messages"
          >
            🔍
          </button>
          <button
            type="button"
            className={`vox-panel-icon panel-toggle-btn ${showPinnedPanel ? 'active' : ''}`}
            onClick={() => setShowPinnedPanel(!showPinnedPanel)}
            title="Pinned messages"
            aria-label="Pinned messages"
          >
            📌
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
          <MessageArea channelId={selectedChannel.id} />
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
