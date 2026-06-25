import { useEffect } from 'react';
import { useServerStore } from '../stores/serverStore';
import { useUiStore } from '../stores/uiStore';

interface ShortcutCallbacks {
  openQuickSwitcher: () => void;
  closeAll: () => void; // Escape: close any open modal/popup
}

type Combo = {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  key: string; // normalized (lowercase, e.g. 'k', ',', '/', 'arrowup')
};

function matches(e: KeyboardEvent, combo: Combo): boolean {
  const key = e.key.toLowerCase();
  if (combo.key !== key) return false;
  if (!!combo.ctrl !== (e.ctrlKey || e.metaKey)) return false;
  if (!!combo.shift !== e.shiftKey) return false;
  if (!!combo.alt !== e.altKey) return false;
  return true;
}

// Global keyboard shortcuts. Wired once at the app root. Avoids hijacking keys
// while the user is typing in an input/textarea, except for combos that are
// globally meaningful (Ctrl+K, Ctrl+/, Ctrl+,).
export function useKeyboardShortcuts(callbacks: ShortcutCallbacks) {
  const { servers, selectedServer, selectedChannel, setSelectedServer, setSelectedChannel } = useServerStore();
  const ui = useUiStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // ── Global combos (work even while typing) ──
      if (matches(e, { ctrl: true, key: 'k' })) {
        e.preventDefault();
        callbacks.openQuickSwitcher();
        return;
      }
      if (matches(e, { ctrl: true, key: '/' })) {
        e.preventDefault();
        // Toggle shortcuts help via the UI store flag.
        ui.setCreateServerOpen(false);
        (ui as any).setShortcutsOpen?.(true);
        return;
      }
      if (matches(e, { ctrl: true, key: ',' })) {
        e.preventDefault();
        window.location.hash = '#/settings';
        return;
      }

      // Escape closes modals/popups globally.
      if (e.key === 'Escape') {
        callbacks.closeAll();
        return;
      }

      // Everything below is navigation — skip while typing.
      if (typing) return;

      // ── Channel navigation (Alt+Up/Down) ──
      if (matches(e, { alt: true, key: 'arrowup' })) {
        e.preventDefault();
        const channels = selectedServer?.channels.filter((c) => c.type === 'TEXT') || [];
        const idx = channels.findIndex((c) => c.id === selectedChannel?.id);
        if (idx > 0) setSelectedChannel(channels[idx - 1]);
        return;
      }
      if (matches(e, { alt: true, key: 'arrowdown' })) {
        e.preventDefault();
        const channels = selectedServer?.channels.filter((c) => c.type === 'TEXT') || [];
        const idx = channels.findIndex((c) => c.id === selectedChannel?.id);
        if (idx >= 0 && idx < channels.length - 1) setSelectedChannel(channels[idx + 1]);
        return;
      }

      // ── Server navigation (Ctrl+Tab / Ctrl+Shift+Tab) ──
      if (matches(e, { ctrl: true, key: 'tab' })) {
        e.preventDefault();
        if (!servers.length) return;
        const idx = servers.findIndex((s) => s.id === selectedServer?.id);
        const next = e.shiftKey
          ? (idx - 1 + servers.length) % servers.length
          : (idx + 1) % servers.length;
        setSelectedServer(servers[next]);
        if (servers[next].channels[0]) setSelectedChannel(servers[next].channels[0]);
        return;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    callbacks,
    servers,
    selectedServer,
    selectedChannel,
    setSelectedServer,
    setSelectedChannel,
    ui,
  ]);
}
