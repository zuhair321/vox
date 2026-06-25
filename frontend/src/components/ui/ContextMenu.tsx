import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MenuItem } from '../../hooks/useContextMenu';

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

function MenuItemRow({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const [hovered, setHovered] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const [submenuPos, setSubmenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  if (item.divider) {
    return (
      <div
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--rim), transparent)',
          margin: '4px 0',
          pointerEvents: 'none',
        }}
      />
    );
  }

  const dangerColor = item.danger ? 'var(--blood)' : undefined;
  const hoverBg = item.danger
    ? 'rgba(216, 74, 90, 0.12)'
    : 'rgba(216, 74, 90, 0.08)';

  const handleMouseEnter = () => {
    setHovered(true);
    if (item.submenu && item.submenu.length > 0 && rowRef.current) {
      const rect = rowRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      setSubmenuPos({
        x: rect.right + 4 > vw ? rect.left - 180 : rect.right + 4,
        y: rect.top,
      });
    }
  };

  return (
    <div ref={rowRef}>
      <div
        className="vox-context-menu-item"
        onClick={(e) => {
          e.stopPropagation();
          if (item.disabled) return;
          item.onClick?.();
          onClose();
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '36px',
          padding: '0 12px',
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '13px',
          color: item.danger ? 'var(--blood)' : 'var(--ash)',
          cursor: item.disabled ? 'not-allowed' : 'pointer',
          opacity: item.disabled ? 0.4 : 1,
          background: hovered && !item.disabled ? hoverBg : 'transparent',
          transition: 'background 0.1s',
          userSelect: 'none',
        }}
      >
        {item.icon && (
          <span
            style={{
              fontSize: '14px',
              width: '16px',
              textAlign: 'center',
              color: hovered && !item.disabled
                ? item.danger
                  ? 'var(--crimson)'
                  : 'var(--chaos)'
                : 'var(--shadow)',
              flexShrink: 0,
            }}
          >
            {item.icon}
          </span>
        )}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.label}
        </span>
        {item.shortcut && (
          <span style={{ fontSize: '11px', color: 'var(--shadow)', marginLeft: 'auto' }}>
            {item.shortcut}
          </span>
        )}
        {item.submenu && item.submenu.length > 0 && (
          <span style={{ fontSize: '10px', color: 'var(--shadow)', marginLeft: 'auto' }}>▶</span>
        )}
      </div>

      {/* Submenu */}
      <AnimatePresence>
        {hovered && item.submenu && item.submenu.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            data-vox-context-menu
            style={{
              position: 'fixed',
              left: submenuPos.x,
              top: submenuPos.y,
              zIndex: 1001,
              background: 'var(--dark-matter)',
              border: '1px solid var(--rim)',
              minWidth: '180px',
              clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(216,74,90,0.1)',
              padding: '4px 0',
              overflow: 'hidden',
            }}
            onMouseLeave={() => setHovered(false)}
          >
            {item.submenu.map((sub) => (
              <MenuItemRow key={sub.id} item={sub} onClose={onClose} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ContextMenu: React.FC<Props> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const position = useMemo(() => {
    const menuW = 200;
    const menuH = items.length * 40;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      left: x + menuW > vw ? Math.max(4, x - menuW) : x,
      top: y + menuH > vh ? Math.max(4, y - menuH) : y,
    };
  }, [x, y, items.length]);

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        data-vox-context-menu
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          left: position.left,
          top: position.top,
          zIndex: 1000,
          background: 'var(--dark-matter)',
          border: '1px solid var(--rim)',
          minWidth: '200px',
          maxWidth: '280px',
          clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(216,74,90,0.1)',
          padding: '4px 0',
          overflow: 'hidden',
          transformOrigin: 'top left',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item) => (
          <MenuItemRow key={item.id} item={item} onClose={onClose} />
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default ContextMenu;
