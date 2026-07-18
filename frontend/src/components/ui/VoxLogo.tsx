import React from 'react';

interface VoxLogoProps {
  size?: number;
  className?: string;
  onClick?: () => void;
  title?: string;
}

/**
 * Animated VOX mark.
 * A bold neon "V" sigil inside a glowing octagonal core, wrapped by a bright
 * rotating energy ring and crackling electric arcs, with a strong breathing
 * glow so it reads clearly even at small sizes. Colors are theme-driven CSS
 * vars so it adapts to every VOX theme automatically.
 */
const VoxLogo: React.FC<VoxLogoProps> = ({
  size = 48,
  className = '',
  onClick,
  title = 'VOX',
}) => {
  const uid = React.useMemo(() => `voxl-${Math.random().toString(36).slice(2, 9)}`, []);
  return (
    <div
      className={`vox-logo ${className}`}
      onClick={onClick}
      title={title}
      role={onClick ? 'button' : undefined}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* ambient halo behind the mark for visibility on any background */}
      <span
        className="vox-logo-halo"
        style={{
          position: 'absolute',
          inset: '6%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(216,74,90,0.35) 0%, rgba(125,31,43,0.18) 45%, transparent 72%)',
        }}
      />
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ display: 'block', overflow: 'visible', position: 'relative' }}
      >
        <defs>
          <linearGradient id={`${uid}-grad`} x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="22%" stopColor="var(--chaos)" />
            <stop offset="60%" stopColor="var(--crimson)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
          <linearGradient id={`${uid}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gold)" />
            <stop offset="50%" stopColor="var(--chaos)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.4" result="b1" />
            <feGaussianBlur stdDeviation="5" result="b2" />
            <feMerge>
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* bright rotating energy ring */}
        <circle
          className="vox-logo-ring"
          cx="50" cy="50" r="45"
          fill="none"
          stroke={`url(#${uid}-ring)`}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeDasharray="58 110"
          opacity="0.95"
          filter={`url(#${uid}-glow)`}
          style={{ transformOrigin: '50px 50px' }}
        />

        {/* glowing octagonal core */}
        <polygon
          className="vox-logo-core"
          points="50,7 85,25 93,60 71,92 29,92 7,60 15,25"
          fill="var(--obsidian)"
          stroke={`url(#${uid}-grad)`}
          strokeWidth="3"
          filter={`url(#${uid}-glow)`}
          style={{ transformOrigin: '50px 50px' }}
        />

        {/* bold neon "V" sigil */}
        <path
          className="vox-logo-v"
          d="M30 32 L50 72 L70 32"
          fill="none"
          stroke={`url(#${uid}-grad)`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${uid}-glow)`}
          style={{ transformOrigin: '50px 52px' }}
        />

        {/* crackling electric spark at the V apex */}
        <circle
          className="vox-logo-spark"
          cx="50" cy="72" r="3.4"
          fill="#ffffff"
          filter={`url(#${uid}-glow)`}
        />
      </svg>
    </div>
  );
};

export default VoxLogo;
