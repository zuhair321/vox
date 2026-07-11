// Octagon status indicator with per-state polish + animated status variants.
//   ONLINE  → toxic green + pulsing glow ring
//   IDLE    → idle gold, dimmed, with a crescent cutout + slow shimmer
//   DND     → danger crimson with a horizontal slash + slow pulse
//   OFFLINE → hollow (border only, no fill)
//   MOBILE  → small phone glyph (passed as status='mobile')
// Animated variant is driven by the `animated` prop — uses CSS keyframes and
// respects prefers-reduced-motion.
type Status = 'online' | 'idle' | 'dnd' | 'offline' | 'mobile';

interface StatusDotProps {
  status: Status | string;
  size?: number;
  /** Show subtle animation (shimmer for idle, pulse for DND) if true. */
  animated?: boolean;
}

export default function StatusDot({ status, size = 10, animated = false }: StatusDotProps) {
  const s = String(status || '').toLowerCase();

  // Mobile device indicator: small phone glyph instead of a dot.
  if (s === 'mobile') {
    return (
      <span
        aria-label="Status: on mobile"
        role="img"
        style={{
          fontSize: size + 4,
          lineHeight: 1,
          color: 'var(--ash)',
          display: 'inline-block',
        }}
      >
        📱
      </span>
    );
  }

  const base: React.CSSProperties = {
    display: 'inline-block',
    width: size,
    height: size,
    clipPath:
      'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
    flexShrink: 0,
    position: 'relative',
  };

  if (s === 'offline') {
    return (
      <span
        className="status-dot-offline"
        aria-label="Status: offline"
        style={{
          ...base,
          background: 'transparent',
          boxShadow: 'inset 0 0 0 2px var(--shadow)',
        }}
      />
    );
  }

  if (s === 'idle') {
    // Dimmed gold with a crescent (offset dark overlay).
    // When animated: add a slow shimmer sweep.
    return (
      <span
        aria-label="Status: idle"
        style={{
          ...base,
          background: '#d9c98d',
          opacity: 0.85,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: animated ? 'statusIdleShimmer 3s ease-in-out infinite' : undefined,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: size * 0.62,
            height: size * 0.62,
            background: 'var(--abyss, #05050f)',
            clipPath:
              'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
            transform: 'translate(28%, -28%)',
          }}
        />
      </span>
    );
  }

  if (s === 'dnd') {
    // Danger fill with a horizontal slash.
    // When animated: add a slow crimson pulse.
    return (
      <span
        aria-label="Status: do not disturb"
        style={{
          ...base,
          background: '#7d1f2b',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: animated ? 'statusDndPulse 2.5s ease-in-out infinite' : undefined,
          boxShadow: animated ? '0 0 4px rgba(125,31,43,0.6)' : undefined,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'block',
            width: size * 0.6,
            height: 2,
            background: 'var(--abyss, #05050f)',
          }}
        />
      </span>
    );
  }

  // ONLINE (default) — pulsing glow ring.
  return (
    <span
      className="status-dot-online"
      aria-label="Status: online"
      style={{
        ...base,
        background: '#8fcf9b',
        animation: animated ? 'statusDotPulse 2s ease-in-out infinite' : undefined,
      }}
    />
  );
}
