import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  preview?: string; // Optional message preview for delete
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  title, 
  body, 
  confirmLabel, 
  onCancel, 
  onConfirm,
  preview 
}) => (
  <AnimatePresence>
    <motion.div 
      className="confirm-backdrop" 
      role="dialog" 
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <motion.div 
        className="confirm-panel"
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px',
        }}>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(216, 74, 90, 0.2), rgba(216, 74, 90, 0.1))',
              border: '1px solid var(--blood)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            ⚠️
          </motion.div>
          <h2 style={{ 
            margin: 0, 
            fontFamily: "'Cinzel', serif",
            fontSize: '16px',
            color: 'var(--ghost-white)',
          }}>{title}</h2>
        </div>
        
        <p style={{ 
          margin: '0 0 16px 0', 
          fontSize: '13px', 
          color: 'var(--ash)',
          fontFamily: "'Share Tech Mono', monospace",
          lineHeight: 1.5,
        }}>{body}</p>
        
        {preview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.05 }}
            style={{
              padding: '10px 12px',
              background: 'var(--void)',
              border: '1px solid var(--rim)',
              borderRadius: '4px',
              marginBottom: '16px',
              maxHeight: '80px',
              overflow: 'hidden',
            }}
          >
            <div style={{
              fontSize: '11px',
              color: 'var(--shadow)',
              marginBottom: '4px',
              fontFamily: "'Share Tech Mono', monospace",
            }}>MESSAGE PREVIEW:</div>
            <div style={{
              fontSize: '12px',
              color: 'var(--ash)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {preview}
            </div>
          </motion.div>
        )}
        
        <div className="confirm-actions">
          <motion.button 
            type="button" 
            className="angular-button" 
            onClick={onCancel}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            CANCEL
          </motion.button>
          <motion.button 
            type="button" 
            className="angular-button danger" 
            onClick={onConfirm}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {confirmLabel}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

export default ConfirmDialog;
