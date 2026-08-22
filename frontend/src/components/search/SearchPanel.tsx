import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useUiStore } from '../../stores/uiStore';
import { useServerStore } from '../../stores/serverStore';
import { searchMessages, SearchResultMessage } from '../../api/search';
import { API_BASE } from '../../api/client';

const SearchPanel: React.FC = () => {
  const { showSearchPanel, setShowSearchPanel } = useUiStore();
  const { selectedChannel, selectedServer } = useServerStore();
  const [query, setQuery] = useState('');
  const [fromUser, setFromUser] = useState('');
  const [results, setResults] = useState<SearchResultMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearchPanel) {
      setQuery('');
      setResults([]);
      setHasSearched(false);
      setShowFilters(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showSearchPanel]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const data = await searchMessages({
        q,
        channelId: selectedChannel?.id,
        serverId: selectedServer?.id,
        userId: fromUser || undefined,
      });
      setResults(data?.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }, [selectedChannel, selectedServer, fromUser]);

  // Debounced search
  useEffect(() => {
    if (!showSearchPanel) return;
    const timer = setTimeout(() => {
      if (query.trim()) doSearch(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, showSearchPanel, doSearch]);

  const handleJump = (msg: SearchResultMessage) => {
    const el = document.querySelector(`[data-message-id="${msg.id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('vox-message-highlight');
      setTimeout(() => el.classList.remove('vox-message-highlight'), 2500);
    }
    setShowSearchPanel(false);
  };

  const highlightText = (text: string, term: string) => {
    if (!term) return text;
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <mark key={i} className="vox-search-highlight">{part}</mark>
      ) : (
        part
      ),
    );
  };

  return (
    <AnimatePresence>
      {showSearchPanel && (
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
            width: 'min(320px, 100%)',
            zIndex: 44,
            boxShadow: '-12px 0 40px rgba(0,0,0,0.55)',
            borderLeft: '1px solid var(--rim)',
            background: 'var(--obsidian)',
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
              background: 'var(--dark-matter)',
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
              SEARCH MESSAGES
            </span>
            <button
              type="button"
              onClick={() => setShowSearchPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--shadow)',
                cursor: 'pointer',
                fontSize: '18px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Search input */}
          <div style={{ padding: '12px', borderBottom: '1px solid var(--rim)' }}>
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                type="text"
                className="angular-input"
                placeholder={`Search in #${selectedChannel?.name || 'channel'}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ paddingLeft: '32px', paddingRight: query ? '28px' : '12px' }}
              />
              <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted, #8b8790)", display: "flex" }}><Search size={14} strokeWidth={1.5} /></span>
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setResults([]); setHasSearched(false); }}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--shadow)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filters toggle */}
          <div
            style={{
              padding: '4px 12px',
              borderBottom: showFilters ? '1px solid var(--rim)' : 'none',
            }}
          >
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--shadow)',
                fontSize: '11px',
                fontFamily: "'Bebas Neue', sans-serif",
                letterSpacing: '0.2em',
                cursor: 'pointer',
                padding: '4px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              FILTERS
              <span style={{ fontSize: '10px' }}>{showFilters ? '▲' : '▼'}</span>
            </button>
          </div>

          {showFilters && (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--rim)' }}>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--shadow)', marginBottom: '4px', letterSpacing: '0.15em' }}>
                  FROM
                </label>
                <input
                  type="text"
                  className="angular-input"
                  placeholder="@username"
                  value={fromUser}
                  onChange={(e) => setFromUser(e.target.value)}
                  style={{ height: '32px', fontSize: '12px' }}
                />
              </div>
            </div>
          )}

          {/* Results */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton" style={{ height: '70px' }} />
                ))}
              </div>
            )}

            {!loading && hasSearched && results.length > 0 && (
              <div style={{ padding: '6px 16px 0', marginBottom: '4px' }}>
                <span
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '11px',
                    color: 'var(--shadow)',
                    letterSpacing: '0.1em',
                  }}
                >
                  {results.length} RESULT{results.length !== 1 ? 'S' : ''}
                </span>
              </div>
            )}

            {!loading && hasSearched && results.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                <div style={{ color: "var(--text-faint, #5a5660)", marginBottom: "12px" }}><Search size={36} strokeWidth={1} /></div>
                <div
                  style={{
                    fontFamily: "'Cinzel Decorative', serif",
                    fontSize: '14px',
                    color: 'var(--shadow)',
                    marginBottom: '8px',
                  }}
                >
                  NOTHING FOUND IN THE VOID
                </div>
                <div style={{ fontSize: '12px', color: 'var(--shadow)', opacity: 0.7 }}>
                  Try different keywords.
                </div>
              </div>
            )}

            {results.map((msg) => {
              const authorName = msg.author?.displayName || msg.author?.username || 'Unknown';
              const avatarUrl = resolveAvatar(msg.author?.avatarUrl);
              const serverName = msg.channel?.server?.name;
              const channelName = msg.channel?.name;

              return (
                <div
                  key={msg.id}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onClick={() => handleJump(msg)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(216,74,90,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {/* Breadcrumb */}
                  {(serverName || channelName) && (
                    <div
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '9px',
                        color: 'var(--shadow)',
                        letterSpacing: '0.1em',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {[serverName, channelName ? `#${channelName}` : null].filter(Boolean).join(' › ')}
                    </div>
                  )}

                  {/* Message row */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ color: 'var(--ghost-white)', fontSize: '12px', fontWeight: 'bold' }}>
                          {authorName}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--shadow)' }}>
                          {format(new Date(msg.createdAt), 'h:mm a')}
                        </span>
                      </div>
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
                        {highlightText(msg.body, query)}
                      </div>
                    </div>
                  </div>

                  {/* Jump */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJump(msg);
                    }}
                    style={{
                      marginTop: '6px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--chaos)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontFamily: "'Share Tech Mono', monospace",
                      padding: 0,
                    }}
                  >
                    Jump to Message
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function resolveAvatar(url?: string | null) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

export default SearchPanel;
