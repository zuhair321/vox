import { useState, useCallback, useEffect, useRef } from 'react';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
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
