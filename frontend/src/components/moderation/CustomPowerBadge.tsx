import React from 'react';

interface Props {
  powers: { name: string; icon?: string; description?: string }[];
}

const CustomPowerBadge: React.FC<Props> = ({ powers }) => {
  if (!powers || powers.length === 0) return null;
  return (
    <span style={{ display: 'inline-flex', gap: '4px', flexWrap: 'wrap' }}>
      {powers.map((p) => (
        <span
          key={p.name}
          title={p.description || p.name}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 600,
            background: 'rgba(88,101,242,0.18)',
            color: 'var(--text-muted)',
            border: '1px solid rgba(88,101,242,0.35)',
          }}
        >
          {p.icon ? <span>{p.icon}</span> : null}
          {p.name}
        </span>
      ))}
    </span>
  );
};

export default CustomPowerBadge;
