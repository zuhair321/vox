// Octagon status indicator with per-state polish.
//   ONLINE  → toxic (theme --online) + pulsing glow ring
//   IDLE    → idle gold, dimmed, with a crescent cutout
//   DND     → danger crimson with a horizontal slash
//   OFFLINE → hollow (border only, no fill)
//   MOBILE  → small 📱 glyph (passed as status='mobile')
type Status = 'online' | 'idle' | 'dnd' | 'offline' | 'mobile';

interface StatusDotProps {
  status: Status | string;
  size?: number;
}

export default function StatusDot({ status, size = 10 }: StatusDotProps) {
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
    return (
      <span
        aria-label="Status: idle"
        style={{
          ...base,
          background: 'var(--idle, var(--gold))',
          opacity: 0.85,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
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
    return (
      <span
        aria-label="Status: do not disturb"
        style={{
          ...base,
          background: 'var(--danger, var(--crimson))',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
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
        background: 'var(--online, var(--toxic))',
        animation: 'statusDotPulse 2s ease-in-out infinite',
      }}
    />
  );
}
