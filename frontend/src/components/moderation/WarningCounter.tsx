import React from 'react';
import { fetchModerationLog } from '../../api/moderation';

interface Props {
  serverId: string;
  targetId: string;
}

const WarningCounter: React.FC<Props> = ({ serverId, targetId }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <WarningCountBadge serverId={serverId} targetId={targetId} />
    </div>
  );
};

const WarningCountBadge: React.FC<Props> = ({ serverId, targetId }) => {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    fetchModerationLog(serverId, { targetId, action: 'WARN' })
      .then((d) => setCount(d.logs.length))
      .catch(() => {});
  }, [serverId, targetId]);

  const color = count >= 4 ? 'var(--chaos)' : count >= 2 ? '#d4a017' : 'var(--rim)';

  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '11px',
      fontWeight: 700,
      background: color,
      color: '#fff',
    }}>
      {count} warning{count !== 1 ? 's' : ''}
    </span>
  );
};

export default WarningCounter;
