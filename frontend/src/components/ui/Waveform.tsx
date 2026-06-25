import React from 'react';

interface WaveformProps {
  speaking: boolean;
  color?: string; // override; defaults to theme --accent
  bars?: number; // default 5
}

// 5 vertical bars that animate when someone is speaking. Used next to usernames
// in voice channels and in the user panel. Falls back to a flat dim row when
// silent. Color follows --accent so it recolors with the active theme.
const Waveform: React.FC<WaveformProps> = ({ speaking, color, bars = 5 }) => {
  const barColor = color || 'var(--accent)';
  // Stagger pattern from the spec: outer bars delayed least, center most.
  const delays = [0, 0.1, 0.2, 0.1, 0].slice(0, bars);

  return (
    <span
      className="waveform"
      role="img"
      aria-label={speaking ? 'Speaking' : 'Silent'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        height: '16px',
        opacity: speaking ? 1 : 0.3,
      }}
    >
      {delays.map((d, i) => (
        <span
          key={i}
          style={{
            width: '3px',
            background: barColor,
            borderRadius: 0,
            transformOrigin: 'bottom',
            height: speaking ? undefined : '3px',
            animation: speaking
              ? `waveBar 0.6s ease-in-out ${d}s infinite`
              : 'none',
          }}
        />
      ))}
    </span>
  );
};

export default Waveform;
