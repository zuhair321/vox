import React, { useEffect, useState } from 'react';

const VERSION = '1.0.3';

/**
 * Status Bar — the slim strip grounding the bottom edge of the window.
 * Signal indicator on the left, a rotating flavor line in the center,
 * and sync/version on the right. Low-contrast until hovered.
 */
const StatusBar: React.FC = () => {
  const [ping, setPing] = useState<number | null>(null);
  const [flavor, setFlavor] = useState(0);

  const FLAVORS = [
    'the network breathes',
    'cipher rotated',
    'wax seals verified',
    'no logs. no traces.',
    'the dark matter is listening',
  ];

  useEffect(() => {
    const t = setInterval(() => setFlavor((f) => (f + 1) % FLAVORS.length), 11000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    const probe = async () => {
      try {
        const start = performance.now();
        await fetch(`${window.location.origin}/health`, { cache: 'no-store' });
        if (alive) setPing(Math.max(1, Math.round(performance.now() - start)));
      } catch {
        if (alive) setPing(null);
      }
    };
    probe();
    const t = setInterval(probe, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <div className="vox-status-bar">
      <span className="vox-status-signal">
        signal: {ping !== null && ping < 60 ? 'strong' : ping !== null && ping < 200 ? 'stable' : 'weak'}
      </span>
      <span className="vox-status-flavor">{FLAVORS[flavor]}</span>
      <span className="vox-status-meta">
        <span>sync <span className="dot">◆</span> {ping !== null ? `${ping}ms` : '—'}</span>
        <span>v{VERSION}</span>
      </span>
    </div>
  );
};

export default StatusBar;
