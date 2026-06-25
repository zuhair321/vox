import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useServerStore } from '../../stores/serverStore';

interface QuickSwitcherProps {
  open: boolean;
  onClose: () => void;
}

interface SwitchItem {
  type: 'channel' | 'server';
  id: string;
  label: string;
  serverName?: string;
  path: string;
}

// Ctrl+K quick switcher. Searches channels + servers across all joined servers,
// keyboard-navigable, Enter navigates. Fetches its data from the server store
// so it always reflects what the user actually has access to.
const QuickSwitcher: React.FC<QuickSwitcherProps> = ({ open, onClose }) => {
  const { servers } = useServerStore();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Flatten all channels + servers into one searchable list.
  const items: SwitchItem[] = useMemo(() => {
    const list: SwitchItem[] = [];
    for (const server of servers) {
      list.push({
        type: 'server',
        id: server.id,
        label: server.name,
        path: `/channels/${server.id}/${server.channels[0]?.id || ''}`,
      });
      for (const channel of server.channels) {
        if (channel.type === 'VOICE') continue;
        list.push({
          type: 'channel',
          id: `${server.id}:${channel.id}`,
          label: channel.name,
          serverName: server.name,
          path: `/channels/${server.id}/${channel.id}`,
        });
      }
    }
    return list;
  }, [servers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    return items
      .filter((it) => it.label.toLowerCase().includes(q))
      .slice(0, 12);
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Focus after the panel mounts.
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keyboard nav while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (item) {
          navigate(item.path);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIndex, navigate, onClose]);

  const go = (item: SwitchItem) => {
    navigate(item.path);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="quick-switcher-backdrop"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="quick-switcher"
            role="dialog"
            aria-label="Quick switcher"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              className="quick-switcher-input"
              placeholder="Jump to a channel or conversation..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search channels and servers"
            />

            <div className="quick-switcher-results">
              {filtered.length === 0 && (
                <div className="quick-switcher-empty">No matches.</div>
              )}
              {filtered.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  className={`quick-switcher-item ${i === activeIndex ? 'active' : ''}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => go(item)}
                >
                  <span className="quick-switcher-icon">
                    {item.type === 'channel' ? '#' : '⬢'}
                  </span>
                  <span className="quick-switcher-label">{item.label}</span>
                  {item.serverName && (
                    <span className="quick-switcher-meta">{item.serverName}</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuickSwitcher;
