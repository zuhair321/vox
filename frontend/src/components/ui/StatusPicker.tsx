import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '../../stores/profileStore';
import { useUiStore } from '../../stores/uiStore';

const STATUS_OPTIONS = [
  { id: 'online', icon: '🟢', label: 'Online' },
  { id: 'idle', icon: '🟡', label: 'Idle' },
  { id: 'dnd', icon: '🔴', label: 'Do Not Disturb' },
  { id: 'offline', icon: '⚫', label: 'Invisible' },
] as const;

const StatusPicker: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { userStatus, updateUserStatus } = useProfileStore();
  const { setShowCustomStatus } = useUiStore();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: '100%',
          left: '8px',
          marginBottom: '8px',
          width: '220px',
          zIndex: 50,
          background: 'var(--dark-matter)',
          border: '1px solid var(--rim)',
          clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(216,74,90,0.1)',
          overflow: 'hidden',
        }}
      >
        {/* User card */}
        <div
          style={{
            background: 'var(--obsidian)',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            className="octagon"
            style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #3b0a12, #0f0f13, #2a1520)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 800,
              fontSize: '16px',
            }}
          >
            Z
          </div>
          <div>
            <div style={{ color: 'var(--ghost-white)', fontSize: '13px', fontWeight: 'bold' }}>
              {useProfileStore.getState().displayName}
            </div>
            <div style={{ color: 'var(--shadow)', fontSize: '11px', textTransform: 'capitalize' }}>
              {userStatus}
            </div>
          </div>
        </div>

        {/* Status options */}
        <div style={{ padding: '4px 0' }}>
          {STATUS_OPTIONS.map((opt) => {
            const active = userStatus === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => {
                  updateUserStatus(opt.id);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  height: '36px',
                  padding: '0 12px',
                  cursor: 'pointer',
                  color: active ? 'var(--chaos)' : 'var(--ash)',
                  background: 'transparent',
                  transition: 'background 0.15s',
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: '13px',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(216,74,90,0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: '14px' }}>{opt.icon}</span>
                <span style={{ flex: 1 }}>{opt.label}</span>
                {active && <span style={{ fontSize: '12px' }}>✓</span>}
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--rim), transparent)',
            margin: '4px 0',
          }}
        />

        {/* Custom Status */}
        <div
          onClick={() => {
            onClose();
            setShowCustomStatus(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            height: '36px',
            padding: '0 12px',
            cursor: 'pointer',
            color: 'var(--ash)',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '13px',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(216,74,90,0.08)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <span>😊</span>
          <span>Set Custom Status</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StatusPicker;
