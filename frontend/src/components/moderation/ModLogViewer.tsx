import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchModerationLog, type ModerationLogEntry } from '../../api/moderation';

interface Props {
  serverId: string;
}

const ModLogViewer: React.FC<Props> = ({ serverId }) => {
  const [logs, setLogs] = useState<ModerationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterTarget, setFilterTarget] = useState('');

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filterAction) params.action = filterAction;
    if (filterTarget) params.targetId = filterTarget;
    fetchModerationLog(serverId, params)
      .then((d) => setLogs(d.logs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [serverId, filterAction, filterTarget]);

  const actionColor: Record<string, string> = {
    KICK: '#a33030',
    BAN: '#8b0000',
    TIMEOUT: '#d4a017',
    MUTE: '#5a3d8a',
    DEAFEN: '#4a6d5a',
    WARN: '#2d7dd2',
    UNBAN: '#4caf50',
    UNTIMEOUT: '#4caf50',
    UNMUTE: '#4caf50',
    UNDEAFEN: '#4caf50',
  };

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading moderation log...</p>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          className="angular-input"
          placeholder="Filter by action..."
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          style={{ fontSize: '12px', padding: '6px 10px' }}
        />
        <input
          className="angular-input"
          placeholder="Filter by target ID..."
          value={filterTarget}
          onChange={(e) => setFilterTarget(e.target.value)}
          style={{ fontSize: '12px', padding: '6px 10px' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {logs.length === 0 && <p style={{ color: 'var(--ash)', fontSize: '13px' }}>No moderation actions found.</p>}
        {logs.map((log) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="vox-card"
            style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <span style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 700,
              background: actionColor[log.action] || 'var(--rim)',
              color: '#fff',
              textTransform: 'uppercase',
            }}>
              {log.action}
            </span>
            <span style={{ color: 'var(--ghost-white)', fontSize: '13px', flex: 1 }}>
              {log.moderator?.username || 'system'} → {log.targetId.slice(0, 8)}...
              {log.reason ? <span style={{ color: 'var(--shadow)', marginLeft: '8px' }}>• {log.reason}</span> : ''}
            </span>
            <span style={{ color: 'var(--shadow)', fontSize: '11px', whiteSpace: 'nowrap' }}>
              {new Date(log.createdAt).toLocaleString()}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ModLogViewer;
