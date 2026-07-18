import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  fetchEscalationRules,
  saveEscalationRules,
  type EscalationRule,
} from '../../api/moderation';
import { useUiStore } from '../../stores/uiStore';

interface Props {
  serverId: string;
}

const ACTION_OPTIONS = ['TIMEOUT', 'KICK', 'BAN', 'MUTE', 'DEAFEN'];

const EscalationRules: React.FC<Props> = ({ serverId }) => {
  const { addToast } = useUiStore();
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEscalationRules(serverId)
      .then((d) => setRules(d.rules || []))
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  }, [serverId]);

  const update = (idx: number, patch: Partial<EscalationRule>) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRule = () => setRules((prev) => [...prev, { warningThreshold: prev.length + 2, action: 'TIMEOUT', duration: 60 }]);
  const removeRule = (idx: number) => setRules((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    try {
      const sorted = [...rules].sort((a, b) => a.warningThreshold - b.warningThreshold);
      await saveEscalationRules(serverId, sorted);
      addToast('Escalation rules saved.', 'success');
    } catch (e: any) {
      addToast(e?.message || 'Failed to save.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading escalation rules...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: 'var(--ghost-white)', margin: 0, fontSize: '16px' }}>Warning Escalation</h3>
        <button className="angular-button" onClick={addRule} style={{ padding: '6px 14px', fontSize: '12px' }}>+ Rule</button>
      </div>
      <p style={{ color: 'var(--ash)', fontSize: '12px', margin: 0 }}>
        Automatically apply an action when a member reaches the warning threshold.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {rules.length === 0 && <p style={{ color: 'var(--ash)', fontSize: '13px' }}>No escalation rules configured.</p>}
        {rules.map((r, idx) => (
          <motion.div key={idx} className="vox-card" style={{ padding: '10px 12px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--shadow)', fontSize: '12px' }}>≥</span>
            <input
              className="angular-input"
              type="number"
              min={1}
              value={r.warningThreshold}
              onChange={(e) => update(idx, { warningThreshold: Number(e.target.value) })}
              style={{ width: '60px', fontSize: '12px', padding: '6px 8px' }}
            />
            <span style={{ color: 'var(--shadow)', fontSize: '12px' }}>warnings →</span>
            <select
              className="angular-input"
              value={r.action}
              onChange={(e) => update(idx, { action: e.target.value })}
              style={{ fontSize: '12px', padding: '6px 8px' }}
            >
              {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            {r.action === 'TIMEOUT' && (
              <input
                className="angular-input"
                type="number"
                min={1}
                placeholder="min"
                value={r.duration ?? 60}
                onChange={(e) => update(idx, { duration: Number(e.target.value) })}
                style={{ width: '70px', fontSize: '12px', padding: '6px 8px' }}
              />
            )}
            <button className="angular-button" onClick={() => removeRule(idx)} style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--chaos)' }}>Remove</button>
          </motion.div>
        ))}
      </div>
      <button className="angular-button primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '12px' }}>
        {saving ? 'Saving...' : 'Save Rules'}
      </button>
    </div>
  );
};

export default EscalationRules;
