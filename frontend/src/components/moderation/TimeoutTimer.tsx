import React, { useState, useEffect } from 'react';
import { fetchMemberModState } from '../../api/moderation';

interface Props {
  serverId: string;
  targetId: string;
}

const TimeoutTimer: React.FC<Props> = ({ serverId, targetId }) => {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    let timer: any;
    const tick = async () => {
      try {
        const data = await fetchMemberModState(serverId, targetId);
        const until = data.timeoutUntil || data.mutedUntil;
        if (until) {
          setRemaining(Math.max(0, new Date(until).getTime() - Date.now()));
        } else {
          setRemaining(null);
        }
      } catch {
        setRemaining(null);
      }
    };
    tick();
    timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [serverId, targetId]);

  if (remaining === null) return null;

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 600,
      background: 'var(--chaos)',
      color: '#fff',
      fontFamily: 'monospace',
    }}>
      {mins}m {secs}s
    </span>
  );
};

export default TimeoutTimer;
