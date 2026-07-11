import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MenuItem } from '../../hooks/useContextMenu';

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
  anchorRect?: DOMRect | null; // For positioning the dropdown arrow
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
      <motion.div
        className="vox-context-menu-item"
        onClick={(e) => {
          e.stopPropagation();
          if (item.disabled) return;
          item.onClick?.();
          onClose();
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHovered(false)}
        whileHover={{ x: 3 }}
        transition={{ duration: 0.1, ease: 'easeOut' }}
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
              width: '16px',
              height: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: hovered && !item.disabled
                ? item.danger
                  ? 'var(--blood)'
                  : 'var(--chaos)'
                : 'var(--shadow)',
              flexShrink: 0,
              transition: 'color 0.12s ease',
            }}
          >
            {item.icon}
          </span>
        )}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.label}
        </span>
        {item.shortcut && (
          <span style={{ fontSize: '11px', color: 'var(--shadow)', marginLeft: 'auto', flexShrink: 0 }}>
            {item.shortcut}
          </span>
        )}
        {item.submenu && item.submenu.length > 0 && (
          <span style={{ fontSize: '10px', color: 'var(--shadow)', marginLeft: item.shortcut ? '8px' : 'auto', flexShrink: 0 }}>▶</span>
        )}
      </motion.div>

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

const ContextMenu: React.FC<Props> = ({ x, y, items, onClose, anchorRect }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const position = useMemo(() => {
    const menuW = 200;
    const menuH = items.length * 40 + 12; // Extra space for arrow
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      left: x + menuW > vw ? Math.max(4, x - menuW) : x,
      top: y + menuH > vh ? Math.max(4, y - menuH) : y,
    };
  }, [x, y, items.length]);

  // Calculate arrow position to point at the trigger element
  const arrowStyle = useMemo(() => {
    if (!anchorRect || !menuRef.current) return null;
    const menuEl = menuRef.current;
    const menuRect = menuEl.getBoundingClientRect();
    
    // Center the arrow under the chevron
    const chevronCenter = anchorRect.left + anchorRect.width / 2;
    const arrowLeft = Math.max(8, Math.min(chevronCenter - position.left - 6, menuRect.width - 20));
    
    return {
      left: arrowLeft,
      opacity: 1,
    };
  }, [anchorRect, position.left]);

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        data-vox-context-menu
        initial={{ opacity: 0, scale: 0.95, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -8 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed',
          left: position.left,
          top: position.top,
          zIndex: 1000,
          background: 'var(--dark-matter)',
          border: '1px solid var(--rim)',
          minWidth: '200px',
          maxWidth: '280px',
          clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(216,74,90,0.15), inset 0 1px 0 rgba(255,255,255,0.03)',
          padding: '4px 0',
          overflow: 'visible',
          transformOrigin: 'top center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dropdown arrow pointing to trigger */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05, duration: 0.12 }}
          style={{
            position: 'absolute',
            top: -7,
            left: arrowStyle?.left ?? 12,
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid var(--rim)',
            filter: 'drop-shadow(0 -2px 2px rgba(0,0,0,0.3))',
            zIndex: 1,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 2,
              left: -7,
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderBottom: '7px solid var(--dark-matter)',
            }}
          />
        </motion.div>
        
        {items.map((item) => (
          <MenuItemRow key={item.id} item={item} onClose={onClose} />
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default ContextMenu;
