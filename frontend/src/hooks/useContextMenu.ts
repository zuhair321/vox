import { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export interface MenuItem {
  id: string;
  label: string;
  // `icon` accepts either a plain string (legacy emoji) or a ReactNode so
  // menu items can render SVG glyphs from `components/chat/Icons.tsx` for a
  // stroke-based look that matches the Vox aesthetic.
  icon?: ReactNode;
  color?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  shortcut?: string;
  submenu?: MenuItem[];
  onClick?: () => void;
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const show = useCallback((x: number, y: number, items: MenuItem[]) => {
    setContextMenu({ x, y, items });
  }, []);

  const hide = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Close on Escape and on any click outside.
  useEffect(() => {
    if (!contextMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    const onClick = () => setContextMenu(null);
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    // Close immediately on context-menu elsewhere.
    const onCtx = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-vox-context-menu]')) {
        setContextMenu(null);
      }
    };
    window.addEventListener('contextmenu', onCtx);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
      window.removeEventListener('contextmenu', onCtx);
    };
  }, [contextMenu]);

  return { show, hide, contextMenu };
}
