import React from 'react';
import type { QualityLevel } from '../../utils/connectionQuality';

/**
 * Discord-style 4-bar connection quality indicator.
 * Visual: 4 vertical bars; level 1 lights just 1, level 4 lights all 4.
 * Optional tooltip overlays the underlying numbers.
 */
interface Props {
  level: QualityLevel;
  score?: number;
  tooltip?: string;
  size?: 'xs' | 'sm' | 'md';
}

export const QualityBars: React.FC<Props> = ({ level, score, tooltip, size = 'sm' }) => {
  const activeCount = level === 'excellent' ? 4 : level === 'good' ? 3 : level === 'fair' ? 2 : 1;
  const dim = size === 'xs' ? 8 : size === 'sm' ? 12 : 16;
  const gap = size === 'xs' ? 1 : 2;
  return (
    <span
      title={tooltip ?? `${level.toUpperCase()}${typeof score === 'number' ? ` · ${score}/100` : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        gap,
        height: dim,
        flexShrink: 0,
        lineHeight: 0,
      }}
      aria-label={`Connection quality: ${level}`}
    >
      {[0, 1, 2, 3].map((i) => {
        const filled = i < activeCount;
        const barH = Math.round((dim * 0.45) + (i / 3) * (dim * 0.55));
        const color = filled
          ? (level === 'excellent' ? 'var(--toxic, #4ac252)'
             : level === 'good' ? 'var(--chaos, #d9c98d)'
             : level === 'fair' ? 'var(--ash, #d99355)'
             : 'var(--blood, #d84a5a)')
          : 'rgba(255,255,255,0.18)';
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: Math.max(2, dim / 3),
              height: barH,
              background: color,
              borderRadius: 1,
              transition: 'background 0.2s ease',
            }}
          />
        );
      })}
    </span>
  );
};

export default QualityBars;
