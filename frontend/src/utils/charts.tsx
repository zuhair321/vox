// Tiny chart helpers used by the ServerInsights page.
// All SVG; no external library; sized in px by the parent.
import React from 'react';

export const LineChart: React.FC<{
  series: Array<{ label: string; values: number[]; color?: string }>;
  labels: string[];
  height?: number;
  width?: number;
  padTop?: number;
}> = ({ series, labels, height = 180, width = 600, padTop = 16 }) => {
  const padX = 36;
  if (!series.length || !series[0].values.length) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--shadow)' }}>No data yet.</div>;
  }
  const n = series[0].values.length;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const stepX = (width - padX * 2) / Math.max(1, n - 1);
  const yScale = (v: number) => padTop + (height - padTop - 8) * (1 - v / max);
  const xScale = (i: number) => padX + i * stepX;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height, maxWidth: width }} preserveAspectRatio="none">
      {/* Y gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const y = padTop + (height - padTop - 8) * (1 - p);
        return (
          <g key={i}>
            <line x1={padX} x2={width - padX} y1={y} y2={y} stroke="var(--rim)" strokeWidth="1" strokeDasharray="2,3" />
            <text x={padX - 6} y={y + 3} textAnchor="end" fontSize="9" fill="var(--shadow)">{Math.round(max * p)}</text>
          </g>
        );
      })}
      {/* X axis labels */}
      {labels.map((lab, i) => i % Math.max(1, Math.floor(n / 8)) === 0 ? (
        <text key={i} x={xScale(i)} y={height - 2} fontSize="9" textAnchor="middle" fill="var(--shadow)">{lab}</text>
      ) : null)}
      {series.map((s) => {
        const path = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`).join(' ');
        return (
          <g key={s.label}>
            <path d={path} fill="none" stroke={s.color || 'var(--gold)'} strokeWidth="2" />
            {s.values.map((v, i) => (
              <circle key={i} cx={xScale(i)} cy={yScale(v)} r={2} fill={s.color || 'var(--gold)'} />
            ))}
          </g>
        );
      })}
    </svg>
  );
};

export const BarChart: React.FC<{
  bars: Array<{ label: string; value: number; color?: string }>;
  height?: number;
  width?: number;
}> = ({ bars, height = 180, width = 600 }) => {
  if (!bars.length) return <div style={{ height, color: 'var(--shadow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No data yet.</div>;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const colWidth = (width - 24) / Math.max(1, bars.length);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height, maxWidth: width }} preserveAspectRatio="none">
      {bars.map((b, i) => {
        const h = (height - 30) * (b.value / max);
        const x = 12 + i * colWidth + 4;
        const y = height - 20 - h;
        return (
          <g key={b.label}>
            <rect x={x} y={y} width={Math.max(4, colWidth - 8)} height={h} fill={b.color || 'var(--gold)'} rx={2} ry={2} />
            <text x={x + (colWidth - 8) / 2} y={height - 8} fontSize="9" textAnchor="middle" fill="var(--shadow)">{b.label}</text>
            <text x={x + (colWidth - 8) / 2} y={y - 3} fontSize="9" textAnchor="middle" fill="var(--ghost-white)">{b.value}</text>
          </g>
        );
      })}
    </svg>
  );
};
