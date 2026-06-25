import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutDef {
  keys: string[];
  desc: string;
}

const SECTIONS: { title: string; items: ShortcutDef[] }[] = [
  {
    title: 'Navigation',
    items: [
      { keys: ['Ctrl', 'K'], desc: 'Open quick switcher' },
      { keys: ['Alt', '↑'], desc: 'Previous channel' },
      { keys: ['Alt', '↓'], desc: 'Next channel' },
      { keys: ['Ctrl', 'Tab'], desc: 'Next server' },
      { keys: ['Ctrl', 'Shift', 'Tab'], desc: 'Previous server' },
    ],
  },
  {
    title: 'Messaging',
    items: [
      { keys: ['Enter'], desc: 'Send message' },
      { keys: ['Shift', 'Enter'], desc: 'New line' },
      { keys: ['↑'], desc: 'Edit last message (empty input)' },
      { keys: ['Esc'], desc: 'Cancel edit / close popup' },
    ],
  },
  {
    title: 'Voice',
    items: [{ keys: ['`'], desc: 'Push to talk' }],
  },
  {
    title: 'Other',
    items: [
      { keys: ['Ctrl', ','], desc: 'Open settings' },
      { keys: ['Ctrl', '/'], desc: 'Show this help' },
    ],
  },
];

// Reference modal listing every keyboard shortcut. Triggered by Ctrl+/.
const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ open, onClose }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="shortcuts-backdrop"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="shortcuts-modal"
            role="dialog"
            aria-label="Keyboard shortcuts"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="shortcuts-title">KEYBOARD SHORTCUTS</h2>
            <div className="shortcuts-grid">
              {SECTIONS.map((section) => (
                <div key={section.title} className="shortcuts-section">
                  <h3 className="shortcuts-section-title">{section.title}</h3>
                  {section.items.map((item) => (
                    <div key={item.desc} className="shortcuts-row">
                      <span className="shortcuts-keys">
                        {item.keys.map((k, i) => (
                          <React.Fragment key={k}>
                            {i > 0 && <span className="kbd-plus">+</span>}
                            <kbd className="kbd">{k}</kbd>
                          </React.Fragment>
                        ))}
                      </span>
                      <span className="shortcuts-desc">{item.desc}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <button className="angular-button shortcuts-close" onClick={onClose}>
              CLOSE
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShortcutsModal;
