import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../stores/themeStore';

interface ThemeSwitcherProps {
  open: boolean;
  onClose: () => void;
}

// Small floating panel that lets the user pick one of the 8 VOX themes.
// Triggered from the sidebar user panel / settings. Pure variable swap — no
// reload, instant.
const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ open, onClose }) => {
  const { current, themes, setTheme } = useThemeStore();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="theme-switcher-backdrop"
          onClick={onClose}
          aria-hidden="true"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="theme-switcher-panel"
            role="dialog"
            aria-label="Select theme"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="theme-switcher-title">SELECT THEME</h3>

            <div className="theme-switcher-grid">
              {themes.map((theme) => {
                const selected = current === theme.id;
                return (
                  <motion.button
                    key={theme.id}
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => setTheme(theme.id)}
                    className={`theme-swatch ${selected ? 'selected' : ''}`}
                    style={{
                      background: `linear-gradient(135deg, ${theme.swatchBg} 0%, ${theme.swatchAccent} 140%)`,
                    }}
                    aria-label={`Theme: ${theme.label}`}
                    aria-pressed={selected}
                  >
                    {selected && <span className="theme-swatch-check">✓</span>}
                    <span className="theme-swatch-label">{theme.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ThemeSwitcher;
