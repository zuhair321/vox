import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchQuarantine, type ModerationLogEntry } from '../../api/moderation';

interface Props {
  serverId: string;
}

const QuarantineQueue: React.FC<Props> = ({ serverId }) => {
  const [items, setItems] = useState<ModerationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchQuarantine(serverId)
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [serverId]);

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading quarantine queue...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ color: 'var(--ghost-white)', margin: 0, fontSize: '16px' }}>Quarantine Queue</h3>
      <p style={{ color: 'var(--ash)', fontSize: '12px', margin: 0 }}>
        Messages held for review by AutoMod (QUARANTINE action). Review the evidence to approve or remove.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.length === 0 && <p style={{ color: 'var(--ash)', fontSize: '13px' }}>Queue is empty.</p>}
        {items.map((item) => (
          <motion.div key={item.id} className="vox-card" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                background: 'var(--chaos)', color: '#fff',
              }}>QUARANTINE</span>
              <span style={{ color: 'var(--shadow)', fontSize: '11px' }}>{new Date(item.createdAt).toLocaleString()}</span>
            </div>
            {item.evidence?.messageContent && (
              <div style={{ color: 'var(--ghost-white)', fontSize: '13px', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                {String(item.evidence.messageContent)}
              </div>
            )}
            {item.reason && <div style={{ color: 'var(--ash)', fontSize: '12px', marginTop: '4px' }}>Reason: {item.reason}</div>}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default QuarantineQueue;
