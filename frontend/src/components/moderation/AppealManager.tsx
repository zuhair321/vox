import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchModerationLog, reviewAppeal, type ModerationLogEntry } from '../../api/moderation';
import { useUiStore } from '../../stores/uiStore';

interface Props {
  serverId: string;
}

const AppealManager: React.FC<Props> = ({ serverId }) => {
  const { addToast } = useUiStore();
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModerationLog(serverId, {})
      .then((d) => {
        const pending = d.logs.filter((l: ModerationLogEntry) => l.appealStatus === 'PENDING');
        setAppeals(pending);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [serverId]);

  const review = async (logId: string, decision: 'APPROVED' | 'DENIED', notes: string) => {
    try {
      await reviewAppeal(serverId, logId, { decision, notes });
      addToast(`Appeal ${decision.toLowerCase()}`, 'success');
      setAppeals((prev) => prev.filter((a) => a.id !== logId));
    } catch (e: any) {
      addToast(e?.message || 'Failed to review appeal', 'error');
    }
  };

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading appeals...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {appeals.length === 0 && <p style={{ color: 'var(--ash)', fontSize: '13px' }}>No pending appeals.</p>}
      {appeals.map((a) => (
        <motion.div key={a.id} className="vox-card" style={{ padding: '14px' }}>
          <div style={{ color: 'var(--ghost-white)', fontWeight: 600, fontSize: '13px' }}>
            {a.action} — {a.targetId.slice(0, 8)}
          </div>
          {a.appealReason && (
            <div style={{ color: 'var(--ash)', fontSize: '12px', marginTop: '4px' }}>
              Reason: {a.appealReason}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button className="angular-button" onClick={() => review(a.id, 'APPROVED', '')} style={{ padding: '6px 12px', fontSize: '12px', background: '#4caf50' }}>
              Approve
            </button>
            <button className="angular-button" onClick={() => review(a.id, 'DENIED', '')} style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--chaos)' }}>
              Deny
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default AppealManager;
