import React from 'react';
import { motion } from 'framer-motion';
import type { AuraType } from '../../stores/profileStore';

interface ProfileAuraProps {
  auraType: AuraType;
  size?: number;
  children: React.ReactNode;
}

// CSS class names defined in animations.css / polish.css
const AURA_CONFIG: Record<AuraType, { className: string; style?: React.CSSProperties }> = {
  none: { className: '' },
  void: {
    className: 'aura-void',
    style: { '--aura-color': 'rgba(138, 43, 226, 0.6)', '--aura-color-2': 'rgba(75, 0, 130, 0.3)' } as React.CSSProperties,
  },
  crimson: {
    className: 'aura-crimson',
    style: { '--aura-color': 'rgba(220, 20, 60, 0.55)', '--aura-color-2': 'rgba(139, 0, 0, 0.25)' } as React.CSSProperties,
  },
  ocean: {
    className: 'aura-ocean',
    style: { '--aura-color': 'rgba(0, 105, 148, 0.55)', '--aura-color-2': 'rgba(0, 30, 80, 0.3)' } as React.CSSProperties,
  },
  toxic: {
    className: 'aura-toxic',
    style: { '--aura-color': 'rgba(0, 255, 100, 0.5)', '--aura-color-2': 'rgba(0, 180, 60, 0.2)' } as React.CSSProperties,
  },
  gold: {
    className: 'aura-gold',
    style: { '--aura-color': 'rgba(255, 200, 0, 0.5)', '--aura-color-2': 'rgba(255, 140, 0, 0.2)' } as React.CSSProperties,
  },
  solar: {
    className: 'aura-solar',
    style: { '--aura-color': 'rgba(255, 80, 0, 0.5)', '--aura-color-2': 'rgba(255, 180, 0, 0.25)' } as React.CSSProperties,
  },
  aurora: {
    className: 'aura-aurora',
    style: { '--aura-color': 'rgba(0, 255, 160, 0.4)', '--aura-color-2': 'rgba(180, 0, 255, 0.2)' } as React.CSSProperties,
  },
};

const ProfileAura: React.FC<ProfileAuraProps> = ({ auraType, size = 96, children }) => {
  if (auraType === 'none') {
    return <>{children}</>;
  }

  const config = AURA_CONFIG[auraType];
  const auraSize = size * 2.2;

  return (
    <div
      className={`profile-aura-container ${config.className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: auraSize,
        height: auraSize,
        borderRadius: '50%',
        flexShrink: 0,
        ...config.style,
      }}
      aria-hidden="true"
    >
      {/* Animated aura rings */}
      <motion.div
        className="aura-ring aura-ring-outer"
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.3, 0.6] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--aura-color) 0%, transparent 70%)',
          filter: 'blur(12px)',
        }}
      />
      <motion.div
        className="aura-ring aura-ring-inner"
        animate={{ scale: [1, 1.08, 1], opacity: [0.8, 0.5, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        style={{
          position: 'absolute',
          inset: '15%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--aura-color-2) 0%, transparent 80%)',
          filter: 'blur(8px)',
        }}
      />
      {/* Core glow */}
      <motion.div
        className="aura-core"
        animate={{ opacity: [0.9, 1, 0.9] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: '30%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--aura-color) 0%, transparent 100%)',
          filter: 'blur(4px)',
        }}
      />
      {/* Avatar layer */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
};

export default ProfileAura;
