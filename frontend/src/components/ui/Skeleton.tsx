import React from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  octagon?: boolean; // clip to octagon (avatars)
  circle?: boolean; // clip to circle
  style?: React.CSSProperties;
}

// A single shimmering placeholder block. The gradient + keyframes live in
// index.css (`.skeleton`). Compose these into row/list skeletons below.
const Skeleton: React.FC<SkeletonProps> = ({ width, height, octagon, circle, style }) => {
  const clip = octagon
    ? 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
    : circle
    ? 'circle(50%)'
    : undefined;
  return (
    <span
      className="skeleton"
      aria-hidden="true"
      style={{ width, height, display: 'block', clipPath: clip, ...style }}
    />
  );
};

export default Skeleton;

// ── Composed skeletons ──────────────────────────────────────────

// 5 fake message rows while a channel's history loads.
export const MessageListSkeleton: React.FC = () => (
  <div style={{ padding: '8px 0' }}>
    {[
      { avatar: true, name: 100, lines: ['70%', '40%'] },
      { avatar: false, lines: ['55%'] },
      { avatar: true, name: 80, lines: ['80%'] },
      { avatar: false, lines: ['65%', '30%'] },
      { avatar: true, name: 120, lines: ['45%'] },
    ].map((row, i) => (
      <div
        key={i}
        style={{
          display: 'flex',
          gap: '12px',
          padding: `8px 16px`,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ width: '36px', flexShrink: 0 }}>
          {row.avatar ? <Skeleton width={36} height={36} octagon /> : null}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {row.avatar && <Skeleton width={row.name} height={12} />}
          {row.lines.map((w, j) => (
            <Skeleton key={j} width={w} height={14} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// 5 fake channel rows while servers load.
export const ChannelListSkeleton: React.FC = () => (
  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {[0.6, 0.75, 0.65, 0.8, 0.7].map((w, i) => (
      <Skeleton key={i} width={`${w * 100}%`} height={12} />
    ))}
  </div>
);

// 6 fake member rows while the member list loads.
export const MemberListSkeleton: React.FC = () => (
  <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <Skeleton width={28} height={28} octagon />
        <Skeleton width={i % 2 ? 70 : 100} height={12} />
      </div>
    ))}
  </div>
);
