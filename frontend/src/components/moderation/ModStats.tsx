import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchModerationLog, type ModerationLogEntry } from '../../api/moderation';

interface Props {
  serverId: string;
}

const ModStats: React.FC<Props> = ({ serverId }) => {
  const [logs, setLogs] = useState<ModerationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params: Record<string, string> = { limit: '1000' };
    fetchModerationLog(serverId, params)
      .then((d) => setLogs(d.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [serverId]);

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading moderation stats...</p>;

  const byAction: Record<string, number> = {};
  const byModerator: Record<string, number> = {};
  for (const l of logs) {
    byAction[l.action] = (byAction[l.action] || 0) + 1;
    const key = l.moderator?.username || l.moderatorId || 'system';
    byModerator[key] = (byModerator[key] || 0) + 1;
  }

  const maxAction = Math.max(1, ...Object.values(byAction));
  const topModerators = Object.entries(byModerator).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ color: 'var(--ghost-white)', margin: 0, fontSize: '16px' }}>Moderation Stats</h3>
      <div style={{ color: 'var(--ash)', fontSize: '13px' }}>Total actions: <strong style={{ color: 'var(--ghost-white)' }}>{logs.length}</strong></div>

      <div>
        <div style={{ color: 'var(--shadow)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>By Action</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Object.entries(byAction).map(([action, count]) => (
            <div key={action} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--ghost-white)', fontSize: '12px', width: '110px' }}>{action}</span>
              <div style={{ flex: 1, height: '8px', background: 'var(--rim)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(count / maxAction) * 100}%`, height: '100%', background: 'var(--chaos)' }} />
              </div>
              <span style={{ color: 'var(--shadow)', fontSize: '12px', width: '30px', textAlign: 'right' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ color: 'var(--shadow)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Top Moderators</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {topModerators.length === 0 && <p style={{ color: 'var(--ash)', fontSize: '13px' }}>No moderator activity yet.</p>}
          {topModerators.map(([name, count]) => (
            <motion.div key={name} className="vox-card" style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ghost-white)', fontSize: '13px' }}>{name}</span>
              <span style={{ color: 'var(--shadow)', fontSize: '12px' }}>{count}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModStats;
