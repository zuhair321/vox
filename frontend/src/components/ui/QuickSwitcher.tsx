import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Moon,
  Sun,
  Bell,
  BellOff,
  Plus,
  Hash,
  Users,
  LogOut,
  User,
  Zap,
  MessageSquare,
  Layers,
} from 'lucide-react';
import { useServerStore } from '../../stores/serverStore';
import { useThemeStore } from '../../stores/themeStore';
import { useUiStore } from '../../stores/uiStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { soundManager } from '../../utils/soundManager';

// ── Command registry ─────────────────────────────────────────────────────────
type CommandId =
  | 'theme-void' | 'theme-crimson' | 'theme-ocean' | 'theme-matrix'
  | 'theme-gold' | 'theme-specter' | 'theme-inferno' | 'theme-cherry'
  | 'toggle-sounds' | 'toggle-notifications' | 'clear-notifications'
  | 'open-settings' | 'open-account' | 'create-server' | 'create-channel'
  | 'jump-friends' | 'jump-dms';

interface Command {
  id: CommandId;
  label: string;
  keywords: string[];
  icon: React.ReactNode;
  /** 'action' = executes without nav; 'nav' = navigates */
  type: 'action' | 'nav';
  /** For type=nav */
  path?: string;
  /** For type=action */
  action?: () => void;
  section: 'Themes' | 'Settings' | 'Actions' | 'Navigation';
}

// Build the command list from current app state so it always reflects live values.
function buildCommands(themeStore: any, uiStore: any): Command[] {
  const soundsEnabled = soundManager.isEnabled();
  const notifications = useNotificationStore.getState();

  return [
    // ── Navigation ──────────────────────────────────────────────
    { id: 'jump-friends', label: 'Go to Friends', keywords: ['friends', 'dm', 'direct'], icon: <Users size={14} />, type: 'nav', path: '/friends', section: 'Navigation' },
    { id: 'jump-dms', label: 'Go to DMs', keywords: ['dms', 'messages', 'chat'], icon: <MessageSquare size={14} />, type: 'nav', path: '/friends', section: 'Navigation' },
    // ── Settings actions ────────────────────────────────────────
    { id: 'open-settings', label: 'Open Settings', keywords: ['settings', 'preferences', 'config'], icon: <Settings size={14} />, type: 'nav', path: '/settings', section: 'Settings' },
    { id: 'open-account', label: 'Account Settings', keywords: ['account', 'profile', 'user'], icon: <User size={14} />, type: 'nav', path: '/settings/account', section: 'Settings' },
    // ── Theme actions ─────────────────────────────────────────────
    { id: 'theme-void', label: 'Theme: Void', keywords: ['theme', 'dark', 'void', 'purple'], icon: <Moon size={14} />, type: 'action', action: () => themeStore.setTheme('void'), section: 'Themes' },
    { id: 'theme-crimson', label: 'Theme: Crimson', keywords: ['theme', 'red', 'blood', 'crimson'], icon: <Moon size={14} />, type: 'action', action: () => themeStore.setTheme('crimson-blood'), section: 'Themes' },
    { id: 'theme-ocean', label: 'Theme: Ocean', keywords: ['theme', 'blue', 'ocean', 'abyss'], icon: <Moon size={14} />, type: 'action', action: () => themeStore.setTheme('ocean-abyss'), section: 'Themes' },
    { id: 'theme-matrix', label: 'Theme: Matrix', keywords: ['theme', 'green', 'matrix', 'toxic'], icon: <Moon size={14} />, type: 'action', action: () => themeStore.setTheme('toxic-matrix'), section: 'Themes' },
    { id: 'theme-gold', label: 'Theme: Gold', keywords: ['theme', 'gold', 'sovereign', 'yellow'], icon: <Moon size={14} />, type: 'action', action: () => themeStore.setTheme('gold-sovereign'), section: 'Themes' },
    { id: 'theme-specter', label: 'Theme: Specter', keywords: ['theme', 'gray', 'grey', 'specter'], icon: <Moon size={14} />, type: 'action', action: () => themeStore.setTheme('specter-gray'), section: 'Themes' },
    { id: 'theme-inferno', label: 'Theme: Inferno', keywords: ['theme', 'orange', 'fire', 'inferno'], icon: <Moon size={14} />, type: 'action', action: () => themeStore.setTheme('sunset-inferno'), section: 'Themes' },
    { id: 'theme-cherry', label: 'Theme: Cherry', keywords: ['theme', 'pink', 'cherry', 'midnight'], icon: <Moon size={14} />, type: 'action', action: () => themeStore.setTheme('midnight-cherry'), section: 'Themes' },
    // ── App actions ───────────────────────────────────────────────
    { id: 'toggle-sounds', label: soundsEnabled ? 'Disable Sound Effects' : 'Enable Sound Effects', keywords: ['sound', 'audio', 'effects', 'sfx', 'ambient'], icon: soundsEnabled ? <BellOff size={14} /> : <Bell size={14} />, type: 'action', action: () => soundManager.setEnabled(!soundsEnabled), section: 'Actions' },
    { id: 'clear-notifications', label: 'Clear All Notifications', keywords: ['clear', 'notifications', 'toast', 'dismiss'], icon: <BellOff size={14} />, type: 'action', action: () => { notifications.clearAll(); uiStore.addToast('Notifications cleared.', 'info'); }, section: 'Actions' },
    { id: 'create-server', label: 'Create a Server', keywords: ['create', 'server', 'new', 'add'], icon: <Plus size={14} />, type: 'action', action: () => uiStore.setCreateServerOpen(true), section: 'Actions' },
    { id: 'create-channel', label: 'Create a Channel', keywords: ['create', 'channel', 'new', 'add'], icon: <Hash size={14} />, type: 'action', action: () => uiStore.setCreateChannelOpen(true), section: 'Actions' },
  ];
}

// ── Fuzzy match: returns 0-1 score (higher = better match) ───────────────────
function score(query: string, label: string, keywords: string[]): number {
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  const haystack = [label.toLowerCase(), ...keywords.map(k => k.toLowerCase())].join(' ');
  if (haystack === q) return 1.0;
  if (haystack.startsWith(q)) return 0.95;
  if (haystack.includes(q)) return 0.8;
  // Prefix match on each word
  const words = q.split(/\s+/);
  const matched = words.filter(w => haystack.includes(w));
  if (matched.length === words.length) return 0.7;
  if (matched.length > 0) return matched.length / words.length * 0.6;
  // Substring scan
  let idx = 0;
  for (const ch of q) {
    const pos = haystack.indexOf(ch, idx);
    if (pos === -1) return 0;
    idx = pos + 1;
  }
  return 0.1;
}

// ─────────────────────────────────────────────────────────────────────────────

interface SwitchItem {
  type: 'command' | 'channel' | 'server';
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  path?: string;
  action?: () => void;
  section: string;
}

const QuickSwitcher: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { servers } = useServerStore();
  const themeStore = useThemeStore();
  const uiStore = useUiStore();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Build live command list.
  const commands = useMemo(() => buildCommands(themeStore, uiStore), [themeStore, uiStore]);

  // Flatten channels + servers + commands into one list.
  const items: SwitchItem[] = useMemo(() => {
    const list: SwitchItem[] = commands.map(cmd => ({
      type: 'command' as const,
      id: cmd.id,
      label: cmd.label,
      icon: cmd.icon,
      action: cmd.action,
      section: cmd.section,
    }));
    for (const server of servers) {
      list.push({
        type: 'server',
        id: server.id,
        label: server.name,
        icon: <Zap size={14} />,
        path: `/channels/${server.id}/${server.channels[0]?.id || ''}`,
        section: 'Servers',
      });
      for (const channel of server.channels) {
        if (channel.type === 'VOICE') continue;
        list.push({
          type: 'channel',
          id: `${server.id}:${channel.id}`,
          label: channel.name,
          sublabel: server.name,
          icon: <Hash size={14} />,
          path: `/channels/${server.id}/${channel.id}`,
          section: 'Channels',
        });
      }
    }
    return list;
  }, [commands, servers]);

  // Fuzzy filter.
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return items.slice(0, 20);
    return items
      .map(item => {
        const cmdMatch = commands.find(c => c.id === item.id);
        const score_val = score(q, item.label, cmdMatch?.keywords || []);
        return { item, score: score_val };
      })
      .filter(({ score }) => score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ item }) => item);
  }, [items, query, commands]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  // Execute the selected item.
  const execute = (item: SwitchItem) => {
    if (item.action) { item.action(); onClose(); return; }
    if (item.path) { navigate(item.path); onClose(); return; }
  };

  // Group filtered items by section.
  const grouped = useMemo(() => {
    const map = new Map<string, SwitchItem[]>();
    for (const item of filtered) {
      const key = item.section;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [filtered]);

  let globalIdx = 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '15vh',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              width: '560px',
              maxWidth: '90vw',
              background: 'var(--dark-matter)',
              border: '1px solid var(--rim)',
              clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 16px',
              borderBottom: '1px solid var(--rim)',
            }}>
              <Zap size={16} style={{ color: 'var(--discord-blurple)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--ghost-white)', fontSize: '15px',
                  fontFamily: "'Share Tech Mono', monospace",
                }}
                placeholder="Search commands, channels, servers..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label="Search commands and channels"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  style={{ background: 'none', border: 'none', color: 'var(--ash)', cursor: 'pointer', padding: '0' }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {/* Results */}
            <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '6px 0' }}>
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--ash)', fontSize: '13px' }}>
                  No results for "{query}"
                </div>
              )}
              {Array.from(grouped.entries()).map(([section, sectionItems]) => (
                <div key={section}>
                  <div style={{
                    padding: '6px 16px 4px',
                    fontSize: '10px', fontWeight: 700,
                    color: 'var(--ash)',
                    letterSpacing: '0.12em',
                    fontFamily: "'Share Tech Mono', monospace",
                  }}>
                    {section.toUpperCase()}
                  </div>
                  {sectionItems.map(item => {
                    const idx = globalIdx++;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => execute(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '8px 16px', background: idx === activeIndex ? 'var(--bg-modifier-hover)' : 'transparent',
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                          color: 'var(--ghost-white)', fontSize: '14px',
                          transition: 'background 0.1s',
                        }}
                      >
                        <span style={{ color: 'var(--ash)', flexShrink: 0 }}>{item.icon}</span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.sublabel && (
                          <span style={{ color: 'var(--ash)', fontSize: '12px' }}>{item.sublabel}</span>
                        )}
                        {item.type === 'command' && (
                          <span style={{ color: 'var(--discord-blurple)', fontSize: '10px', opacity: 0.7 }}>action</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding: '8px 16px', borderTop: '1px solid var(--rim)',
              display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--ash)',
              fontFamily: "'Share Tech Mono', monospace",
            }}>
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span>esc close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuickSwitcher;
