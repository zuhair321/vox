import React, { useEffect, useState } from 'react';

interface VoiceTimerProps {
  /** Epoch ms when the connection started. Defaults to mount time. */
  startedAt?: number;
  /** Tick style; 'panel' = bigger with pulse dot, 'member' = plain. */
  variant?: 'panel' | 'member';
  channelName?: string;
}

// Counts up from `startedAt`. Renders MM:SS under an hour, H:MM:SS over. Used
// in the voice channel header / user panel (variant='panel') and per-member in
// the voice list (variant='member').
function format(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const VoiceTimer: React.FC<VoiceTimerProps> = ({
  startedAt,
  variant = 'panel',
  channelName,
}) => {
  const [now, setNow] = useState(() => Date.now());
  const start = startedAt ?? now;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = format(now - start);

  if (variant === 'member') {
    return (
      <span
        className="voice-timer-member"
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '11px',
          color: 'var(--shadow)',
          marginLeft: 'auto',
        }}
        aria-label={`Connected for ${elapsed}`}
      >
        {elapsed}
      </span>
    );
  }

  return (
    <span
      className="voice-timer-panel"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '12px',
        color: 'var(--accent)',
      }}
    >
      {channelName && <span aria-hidden="true">🔊</span>}
      {channelName && <span>{channelName}</span>}
      {channelName && <span style={{ opacity: 0.6 }}>·</span>}
      <span
        className="voice-timer-dot"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: 0,
          background: 'var(--toxic)',
          display: 'inline-block',
          animation: 'voiceTimerPulse 1.6s ease-in-out infinite',
        }}
        aria-hidden="true"
      />
      <span>{elapsed}</span>
    </span>
  );
};

export default VoiceTimer;
